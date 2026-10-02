import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import SocialIcon from "./SocialIcon";
import { addComment, deleteComment, deletePost, getPostLikes, toggleLike } from "../features/posts/postsApi";
import { useAuth } from "../features/auth/AuthContext";

function timeAgo(value) {
  if (!value) return "just now";
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
  const [likes, setLikes] = useState(post.likesCount || 0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || (post.comments ? post.comments.length : 0));
  const [showComments, setShowComments] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likersList, setLikersList] = useState([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const commentInputRef = useRef(null);

  const like = async () => {
    if (busy) return;
    setBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    try {
      const result = await toggleLike(token, post.id || post._id);
      if (result?.data) {
        setLiked(result.data.liked);
        setLikes(result.data.likesCount);
      }
    } catch {
      setLiked(liked);
      setLikes(likes);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenLikers = async () => {
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      const res = await getPostLikes(token, post.id || post._id);
      setLikersList(res?.data?.users || []);
    } catch {
      setLikersList([]);
    } finally {
      setLoadingLikers(false);
    }
  };

  const commentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || submittingComment) return;
    setSubmittingComment(true);
    const textToSend = comment.trim();
    setComment("");
    try {
      const result = await addComment(token, post.id || post._id, textToSend);
      if (result?.data) {
        setCommentsCount(result.data.commentsCount);
        if (result.data.comment) {
          setComments((prev) => [...prev, result.data.comment]);
        } else if (result.data.comments) {
          setComments(result.data.comments);
        }
        setShowComments(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (username) => {
    setShowComments(true);
    setComment(`@${username} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveComment = async (commentId) => {
    try {
      await deleteComment(token, post.id || post._id, commentId);
      setComments((prev) => prev.filter((c) => (c.id || c._id) !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this post?")) return;
    await deletePost(token, post.id || post._id);
    onChange?.(post.id || post._id);
  };

  const renderCaption = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <Link
            key={index}
            to={`/search?tag=${encodeURIComponent(part.replace('#', ''))}`}
            style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {part}{" "}
          </Link>
        );
      }
      return part;
    });
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.user?.username}`} className="user-inline">
          <Avatar user={post.user} size={42} />
          <div>
            <strong>{post.user?.username || "member"}</strong>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        {user?.username === post.user?.username && (
          <button className="icon-button" onClick={remove} title="Delete">
            •••
          </button>
        )}
      </div>

      {post.image && (
        <img
          className="post-image"
          src={post.image.startsWith("/") ? `http://localhost:5000${post.image}` : post.image}
          alt="Post"
          onDoubleClick={like}
        />
      )}

      <div className="post-actions">
        <button
          className={`icon-button ${liked ? "liked" : ""}`}
          onClick={like}
          aria-label="Like"
          style={{ color: liked ? "#e11d48" : "inherit" }}
        >
          <SocialIcon name={liked ? "heart" : "heart"} />
        </button>
        <button
          className="icon-button"
          onClick={() => setShowComments((prev) => !prev)}
          aria-label="Comment"
        >
          <SocialIcon name="message" />
        </button>
        <span className="action-spacer" />
        <span className="post-time">{timeAgo(post.createdAt)}</span>
      </div>

      {/* Clickable Likes count opens Likers modal */}
      <div className="post-meta">
        <button
          onClick={handleOpenLikers}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            cursor: likes > 0 ? "pointer" : "default",
            fontWeight: 700,
            color: "var(--text)",
          }}
          disabled={likes === 0}
        >
          {likes} {likes === 1 ? "like" : "likes"}
        </button>
      </div>

      {post.caption && (
        <p className="post-caption">
          <Link
            to={`/profile/${post.user?.username}`}
            style={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}
          >
            {post.user?.username}{" "}
          </Link>
          {renderCaption(post.caption)}
        </p>
      )}

      {commentsCount > 0 && (
        <button
          className="comments-link"
          onClick={() => setShowComments((prev) => !prev)}
          style={{ cursor: "pointer", marginTop: 4, display: "block" }}
        >
          {showComments ? "Hide comments" : `View all ${commentsCount} comments`}
        </button>
      )}

      {/* Expanded Comments Thread with Reply and Delete */}
      {showComments && comments.length > 0 && (
        <div className="inline-comments-list" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((c) => {
            const commentUser = c.user;
            const isOwn = user?.username === commentUser?.username || user?.id === commentUser?.id || user?._id === commentUser?._id;
            return (
              <div
                key={c.id || c._id || Math.random()}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 13, padding: "2px 0" }}
              >
                <div>
                  <Link
                    to={`/profile/${commentUser?.username}`}
                    style={{ color: "inherit", textDecoration: "none", fontWeight: 700, marginRight: 6 }}
                  >
                    {commentUser?.username || "member"}
                  </Link>
                  <span>{c.text}</span>
                  <div style={{ display: "flex", gap: 10, marginTop: 2, alignItems: "center" }}>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>{timeAgo(c.createdAt)}</span>
                    <button
                      onClick={() => handleReply(commentUser?.username)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--muted)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
                {isOwn && (
                  <button
                    onClick={() => handleRemoveComment(c.id || c._id)}
                    style={{ border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: "0 4px" }}
                    title="Delete comment"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form className="comment-form" onSubmit={commentSubmit}>
        <input
          ref={commentInputRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment…"
          disabled={submittingComment}
        />
      </form>

      {/* Likers List Modal (#10) */}
      {showLikersModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowLikersModal(false)}
        >
          <div
            style={{
              background: "var(--bg)",
              color: "var(--text)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 380,
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              border: "1px solid var(--line)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <strong style={{ fontSize: 15 }}>Likes</strong>
              <button
                onClick={() => setShowLikersModal(false)}
                style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "10px 18px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {loadingLikers ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
                  Loading likers…
                </div>
              ) : likersList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
                  No likes yet.
                </div>
              ) : (
                likersList.map((liker) => (
                  <Link
                    key={liker.id || liker._id}
                    to={`/profile/${liker.username}`}
                    onClick={() => setShowLikersModal(false)}
                    style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
                  >
                    <Avatar user={liker} size={40} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: 14 }}>{liker.username}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{liker.name}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
