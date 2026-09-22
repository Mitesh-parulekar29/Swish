const Post = require('../models/Post');
const User = require('../models/User');

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
    if (!caption.trim() && !image.trim()) {
      return res.status(400).json({ success: false, message: 'Add an image or caption' });
    }

    const post = await Post.create({ user: req.user._id, caption: caption.trim(), image: image.trim() });
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await post.populate('user', 'name username profileImage');

    return res.status(201).json({ success: true, data: { post: serializePost(post) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong while creating the post' });
  }
};

const getFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('following blockedUsers');
    const allowedIds = [req.user._id, ...(user.following || [])];
    const posts = await Post.find({ $and: [{ user: { $in: allowedIds } }, { user: { $nin: user.blockedUsers || [] } }] })
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

    const posts = await Post.find({ user: user._id })
      .populate('user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: { posts: posts.map((post) => ({ ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)) })) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
};


const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'name username profileImage');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    return res.json({ success: true, data: { post: { ...serializePost(post), isLiked: post.likes.some((id) => id.equals(req.user._id)), comments: post.comments } } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load post' });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const liked = post.likes.some((id) => id.equals(req.user._id));
    post.likes = liked ? post.likes.filter((id) => !id.equals(req.user._id)) : [...post.likes, req.user._id];
    await post.save();
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
    post.comments.push({ user: req.user._id, text });
    await post.save();
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

module.exports = { createPost, getFeed, getUserPosts, getPost, likePost, addComment, deletePost };
