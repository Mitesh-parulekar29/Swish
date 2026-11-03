const Post = require('../models/Post');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');
const { includesId, hasBlocked, getHiddenUserIds } = require('../utils/blockHelpers');

const serializePost = (post) => ({
  id: post._id,
  image: post.image || '',
  caption: post.caption || '',
  likesCount: post.likes?.length || 0,
  commentsCount: post.comments?.filter((c) => !c.parentId).length || 0,
  isLiked: false,
  createdAt: post.createdAt,
  user: post.user && {
    id: post.user._id,
    name: post.user.name,
    username: post.user.username,
    profileImage: post.user.profileImage,
  },
});

const serializeComment = (c, currentUserId) => ({
  _id: c._id,
  text: c.text,
  parentId: c.parentId || null,
  createdAt: c.createdAt,
  likesCount: c.likes?.length || 0,
  isLiked: currentUserId ? c.likes?.some((id) => id.equals(currentUserId)) : false,
  user: c.user && typeof c.user === 'object' && c.user.username
    ? {
        id: c.user._id,
        _id: c.user._id,
        name: c.user.name,
        username: c.user.username,
        profileImage: c.user.profileImage,
      }
    : null,
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
    const scope = req.query.scope === 'all' ? 'all' : 'following';
    const hiddenIds = await getHiddenUserIds(req.user._id); // blocked by me + blocked me
    const user = await User.findById(req.user._id).select('following');
    const followingIds = user.following || [];

    let authorFilter;
    if (scope === 'all') {
      // Campus Feed: verified, not suspended, not blocked, privacy respected
      const eligibleAuthors = await User.find({
        _id: { $nin: hiddenIds },
        isVerified: true,
        isSuspended: { $ne: true },
        $or: [
          { isPrivate: { $ne: true } },
          { _id: req.user._id },
          { _id: { $in: followingIds } },
        ],
      }).select('_id');

      authorFilter = { user: { $in: eligibleAuthors.map((author) => author._id) } };
    } else {
      const allowedIds = [req.user._id, ...followingIds];
      authorFilter = { user: { $in: allowedIds, $nin: hiddenIds } };
    }

    const posts = await Post.find(authorFilter)
      .populate('user', 'name username profileImage')
      .populate('comments.user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          ...serializePost(post),
          isLiked: post.likes.some((id) => id.equals(req.user._id)),
          comments: post.comments.map((c) => serializeComment(c, req.user._id)),
        })),
      },
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
      .populate('comments.user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          ...serializePost(post),
          isLiked: post.likes.some((id) => id.equals(req.user._id)),
          comments: post.comments.map((c) => serializeComment(c, req.user._id)),
        })),
        isPrivate: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
};


const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profileImage')
      .populate('comments.user', 'name username profileImage');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user?._id, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    const comments = post.comments.map((c) => serializeComment(c, req.user._id));
    return res.json({ success: true, data: { post: { ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)), comments } } });
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
    const parentId = req.body.parentId || null;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (await hasBlocked(post.user, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot interact with this post' });
    }

    // Validate parentId if provided
    if (parentId) {
      const parentComment = post.comments.id(parentId);
      if (!parentComment) return res.status(404).json({ success: false, message: 'Parent comment not found' });
      // Replies cannot have a parentId that is itself a reply (only 2 levels deep)
      // We allow replying to a reply but store parentId as the top-level comment's _id
      // (Instagram style: all replies in a thread share the same parent)
      const effectiveParentId = parentComment.parentId || parentComment._id;
      post.comments.push({ user: req.user._id, text, parentId: effectiveParentId });
    } else {
      post.comments.push({ user: req.user._id, text, parentId: null });
    }

    await post.save();

    // Populate all comment users
    await post.populate('comments.user', 'name username profileImage');
    const newComment = post.comments[post.comments.length - 1];

    // Comment count = only top-level comments
    const topLevelCount = post.comments.filter((c) => !c.parentId).length;

    if (!parentId) {
      await createNotification({ recipient: post.user, actor: req.user, type: 'comment', post: post._id, text });
    }

    return res.status(201).json({
      success: true,
      data: {
        commentsCount: topLevelCount,
        comment: serializeComment(newComment, req.user._id),
      },
    });
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

    const topLevelCount = post.comments.filter((c) => !c.parentId).length;
    return res.json({
      success: true,
      message: 'Comment deleted',
      data: { commentsCount: topLevelCount },
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


const toggleCommentLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const alreadyLiked = comment.likes.some((id) => id.equals(req.user._id));
    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => !id.equals(req.user._id));
    } else {
      comment.likes.push(req.user._id);
    }
    await post.save();

    return res.json({
      success: true,
      data: {
        liked: !alreadyLiked,
        likesCount: comment.likes.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle comment like' });
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
  getExplore,
  toggleCommentLike };