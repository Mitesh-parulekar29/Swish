const Post = require('../models/Post');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');
const { includesId, hasBlocked, getHiddenUserIds } = require('../utils/blockHelpers');

const serializePost = (post) => ({
  id: post._id,
  image: post.image || '',
  caption: post.caption || '',
  likesCount: post.likes?.length || 0,
  commentsCount: post.comments?.length || 0,
  isLiked: false,
  createdAt: post.createdAt,
  user: post.user && {
    id: post.user._id,
    name: post.user.name,
    username: post.user.username,
    profileImage: post.user.profileImage,
  },
});

const createPost = async (req, res) => {
  try {
    const { caption = '', image = '' } = req.body;
    if (typeof caption !== 'string' || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid post data' });
    }

    const hasUploadedFile = Boolean(req.file);
    const hasImageString = Boolean(image.trim());
    const hasCaption = Boolean(caption.trim());

    if (!hasCaption && !hasUploadedFile && !hasImageString) {
      return res.status(400).json({ success: false, message: 'Add an image or caption' });
    }

    const post = await Post.create({
      user: req.user._id,
      caption: caption.trim(),
      image: hasUploadedFile ? `/uploads/posts/${req.file.filename}` : image.trim(),
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await post.populate('user', 'name username profileImage');

    return res.status(201).json({ success: true, data: { post: serializePost(post) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong while creating the post' });
  }
};

const getFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('following');
    const hiddenIds = await getHiddenUserIds(req.user._id); // blocked by me + blocked me
    const allowedIds = [req.user._id, ...(user.following || [])];
    const posts = await Post.find({ user: { $in: allowedIds, $nin: hiddenIds } })
      .populate('user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: { posts: posts.map((post) => ({ ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)) })) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load feed' });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMe = user._id.equals(req.user._id);

    // This user has blocked the viewer -> show no posts at all
    if (!isMe && includesId(user.blockedUsers, req.user._id)) {
      return res.json({ success: true, data: { posts: [], isPrivate: false, isBlockedByUser: true } });
    }

    const isFollowing = user.followers.some((id) => id.equals(req.user._id));
    if (user.isPrivate && !isMe && !isFollowing) {
      return res.json({ success: true, data: { posts: [], isPrivate: true } });
    }

    const posts = await Post.find({ user: user._id })
      .populate('user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({ ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)) })),
        isPrivate: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
};


const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'name username profileImage');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user?._id, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    return res.json({ success: true, data: { post: { ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)), comments: post.comments } } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load post' });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot interact with this post' });
    }
    const liked = post.likes.some((id) => id.equals(req.user._id));
    post.likes = liked ? post.likes.filter((id) => !id.equals(req.user._id)) : [...post.likes, req.user._id];
    await post.save();
    if (!liked) {
      await createNotification({ recipient: post.user, actor: req.user, type: 'like', post: post._id });
    }
    return res.json({ success: true, data: { liked: !liked, likesCount: post.likes.length } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update like' });
  }
};

const addComment = async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot interact with this post' });
    }
    post.comments.push({ user: req.user._id, text });
    await post.save();
    await createNotification({ recipient: post.user, actor: req.user, type: 'comment', post: post._id, text });
    return res.status(201).json({ success: true, data: { commentsCount: post.comments.length } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    await post.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });
    return res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

const getPostLikes = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'likes',
      'name username profileImage department role isVerified'
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    return res.json({
      success: true,
      data: {
        users: (post.likes || []).map((u) => ({
          id: u._id,
          _id: u._id,
          name: u.name,
          username: u.username,
          profileImage: u.profileImage,
          department: u.department,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch likers' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isCommentAuthor = comment.user.equals(req.user._id);
    const isPostOwner = post.user.equals(req.user._id);

    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    post.comments.pull(req.params.commentId);
    await post.save();

    return res.json({
      success: true,
      message: 'Comment deleted',
      data: { commentsCount: post.comments.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};

const getExplore = async (req, res) => {
  try {
    const { q, tag } = req.query;
    let filter = {};

    if (tag) {
      filter.tags = tag.toLowerCase().replace('#', '');
    } else if (q) {
      filter.$or = [
        { caption: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    // Hide posts of users I blocked and users who blocked me
    const hiddenIds = await getHiddenUserIds(req.user._id);
    filter.user = { $nin: hiddenIds };

    const posts = await Post.find(filter)
      .populate('user', 'name username profileImage')
      .populate('comments.user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(40);

    // Extract top tags
    const allPosts = await Post.find({}).select('tags').limit(100);
    const tagCounts = {};
    allPosts.forEach((p) => {
      (p.tags || []).forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ tag: name, count }));

    // Rank by engagement score (likes * 2 + comments * 3)
    const formattedPosts = posts.map((p) => {
      const likesCount = p.likes?.length || 0;
      const commentsCount = p.comments?.length || 0;
      return {
        ...serializePost(p),
        isLiked: p.likes.some((id) => id.equals(req.user._id)),
        score: likesCount * 2 + commentsCount * 3,
      };
    });

    formattedPosts.sort((a, b) => b.score - a.score);

    return res.json({
      success: true,
      data: {
        posts: formattedPosts,
        popularTags,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch explore posts' });
  }
};


module.exports = { createPost,
  getFeed,
  getUserPosts,
  getPost,
  likePost,
  getPostLikes,
  addComment,
  deleteComment,
  deletePost,
  getExplore };