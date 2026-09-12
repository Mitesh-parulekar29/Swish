const Post = require('../models/Post');

// POST /api/posts
// Creates a post for the authenticated user. Relies on authMiddleware having
// already verified the JWT and attached req.user.
const createPost = async (req, res) => {
  try {
    const { caption } = req.body;

    if (caption !== undefined && caption !== null && typeof caption !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Caption must be a string',
      });
    }

    const post = await Post.create({
      user: req.user._id,
      caption: typeof caption === 'string' ? caption.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        post,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating the post',
    });
  }
};

module.exports = { createPost };
