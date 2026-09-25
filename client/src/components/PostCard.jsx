import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import SocialIcon from "./SocialIcon";
import { addComment, deletePost, toggleLike } from "../features/posts/postsApi";
import { useAuth } from "../features/auth/AuthContext";

function timeAgo(value) {
  const diff = Math.max(1, Date.now() - new Date(value).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PostCard({ post, onChange }) {
  const { token, user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const [comment, setComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [busy, setBusy] = useState(false);

  const like = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await toggleLike(token, post.id);
      setLiked(result.data.liked);
      setLikes(result.data.likesCount);
    } finally { setBusy(false); }
  };

  const commentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const result = await addComment(token, post.id, comment);
    setCommentsCount(result.data.commentsCount);
    setComment("");
  };

  const remove = async () => {
    if (!window.confirm("Delete this post?")) return;
    await deletePost(token, post.id);
    onChange?.(post.id);
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.user.username}`} className="user-inline">
          <Avatar user={post.user} size={42} />
          <div><strong>{post.user.username}</strong><span>{timeAgo(post.createdAt)}</span></div>
        </Link>
        {user?.username === post.user.username && <button className="icon-button" onClick={remove} title="Delete">•••</button>}
      </div>

      {post.image && <img className="post-image" src={post.image} alt="Post" onDoubleClick={like} />}

      <div className="post-actions">
        <button className={`icon-button ${liked ? "liked" : ""}`} onClick={like} aria-label="Like"><SocialIcon name="heart" /></button>
        <button className="icon-button" aria-label="Comment"><SocialIcon name="message" /></button>
        <span className="action-spacer" />
        <span className="post-time">{timeAgo(post.createdAt)}</span>
      </div>

      <div className="post-meta"><strong>{likes} {likes === 1 ? "like" : "likes"}</strong></div>
      {post.caption && <p className="post-caption"><strong>{post.user.username}</strong> {post.caption}</p>}
      {commentsCount > 0 && <button className="comments-link">View all {commentsCount} comments</button>}
      <form className="comment-form" onSubmit={commentSubmit}>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
      </form>
    </article>
  );
}
