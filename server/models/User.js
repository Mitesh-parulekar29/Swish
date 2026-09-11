const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const ROLES = ['student', 'faculty', 'admin'];
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9._]+$/, 'Username may only contain letters, numbers, dots and underscores'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    bio: { type: String, default: '', maxlength: 300 },
    profileImage: { type: String, default: '' },
    profileImageId: { type: String, default: '' },
    department: { type: String, default: '', maxlength: 80 },
    course: { type: String, default: '', maxlength: 80 },
    batch: { type: String, default: '', maxlength: 20 },
    role: { type: String, enum: ROLES, default: 'student', index: true },
    isVerified: { type: Boolean, default: true },
    isPrivate: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    postsCount: { type: Number, default: 0, min: 0 },
    isSuspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('followersCount').get(function followersCount() {
  return this.followers?.length || 0;
});

userSchema.virtual('followingCount').get(function followingCount() {
  return this.following?.length || 0;
});

userSchema.index({ name: 'text', username: 'text', department: 'text' });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    username: this.username,
    email: this.email,
    bio: this.bio,
    profileImage: this.profileImage,
    department: this.department,
    course: this.course,
    batch: this.batch,
    role: this.role,
    isVerified: this.isVerified,
    isPrivate: this.isPrivate,
    followersCount: this.followers?.length || 0,
    followingCount: this.following?.length || 0,
    postsCount: this.postsCount,
    isSuspended: this.isSuspended,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;