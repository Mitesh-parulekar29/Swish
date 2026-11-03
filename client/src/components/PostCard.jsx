import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import SocialIcon from "./SocialIcon";
import {
  addComment,
  deleteComment,
  deletePost,
  getPostLikes,
  mediaUrl,
  toggleLike,
  toggleCommentLike,
} from "../features/posts/postsApi";
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

/** A single comment row (works for both top-level and reply) */
function CommentRow({
  comment,
  postId,
  currentUser,
  token,
  isReply = false,
  onReply,
  onDelete,
  onLikeToggle,
}) {
  const [liking, setLiking] = useState(false);
  const commentUser = comment.user;
  const isOwn =
    currentUser?.username === commentUser?.username ||
    currentUser?.id === (commentUser?.id || commentUser?._id) ||
    currentUser?._id === (commentUser?.id || commentUser?._id);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await toggleCommentLike(token, postId, comment._id);
      if (res?.data) {
        onLikeToggle(comment._id, res.data.liked, res.data.likesCount);
      }
    } catch {
      // silent
    } finally {
      setLiking(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        fontSize: 13,
        padding: "4px 0",
        paddingLeft: isReply ? 36 : 0,
      }}
    >
      {/* Left: avatar + body */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
        <Link to={`/profile/${commentUser?.username}`} style={{ flexShrink: 0 }} tabIndex={-1}>
          <Avatar user={commentUser} size={isReply ? 24 : 28} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/profile/${commentUser?.username}`}
            style={{ color: "inherit", textDecoration: "none", fontWeight: 700, marginRight: 6 }}
          >
            {commentUser?.username || "member"}
          </Link>
          <span style={{ wordBreak: "break-word" }}>{comment.text}</span>

          {/* Actions row */}
          <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{timeAgo(comment.createdAt)}</span>

            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={liking}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: comment.isLiked ? "#e11d48" : "var(--muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: liking ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
              aria-label={comment.isLiked ? "Unlike" : "Like"}
            >
              <svg
                width={11}
                height={11}
                viewBox="0 0 24 24"
                fill={comment.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
              </svg>
              {comment.likesCount > 0 && (
                <span>{comment.likesCount}</span>
              )}
            </button>

            {/* Reply button */}
            <button
              onClick={() => onReply(commentUser?.username, comment._id, comment.parentId)}
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
      </div>

      {/* Right: delete */}
      {isOwn && (
        <button
          onClick={() => onDelete(comment._id)}
          style={{
            border: "none",
            background: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 12,
            padding: "0 4px",
            flexShrink: 0,
          }}
          title="Delete"
          aria-label="Delete comment"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function PostCard({ post, onChange }) {
  const { token, user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount || 0);

  // All comments (top-level + replies) as a flat list keyed by _id
  const [comments, setComments] = useState(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(
    post.commentsCount ||
      (post.comments ? post.comments.filter((c) => !c.parentId).length : 0)
  );
  const [showComments, setShowComments] = useState(false);

  // Reply state: { parentId: string, replyToUsername: string } | null
  const [replyTarget, setReplyTarget] = useState(null);

  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likersList, setLikersList] = useState([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [busy, setBusy] = useState(false);

  const inputRef = useRef(null);

  /* ---- Post like ---- */
  const likePost = async () => {
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

  /* ---- Likers modal ---- */
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

  /* ---- Comment like toggle (callback from CommentRow) ---- */
  const handleCommentLikeToggle = (commentId, liked, likesCount) => {
    setComments((prev) =>
      prev.map((c) =>
        (c._id || c.id) === commentId ? { ...c, isLiked: liked, likesCount } : c
      )
    );
  };

  /* ---- Reply click: set reply target and focus input ---- */
  const handleReplyClick = (username, commentId, commentParentId) => {
    // Always attach to the top-level parent (Instagram style: replies are flat under one thread)
    const effectiveParentId = commentParentId || commentId;
    setReplyTarget({ parentId: effectiveParentId, replyToUsername: username });
    setCommentText(`@${username} `);
    setShowComments(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  /* ---- Cancel reply ---- */
  const cancelReply = () => {
    setReplyTarget(null);
    setCommentText("");
  };

  /* ---- Submit comment or reply ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError("");
    const textToSend = commentText.trim();
    setCommentText("");
    const parentId = replyTarget?.parentId || null;
    setReplyTarget(null);

    try {
      const result = await addComment(token, post.id || post._id, textToSend, parentId);
      if (result?.data) {
        if (result.data.commentsCount !== undefined) {
          setCommentsCount(result.data.commentsCount);
        }
        if (result.data.comment) {
          setComments((prev) => [...prev, result.data.comment]);
        } else {
          // Fallback: build optimistic comment
          setComments((prev) => [
            ...prev,
            {
              _id: `temp-${Date.now()}`,
              text: textToSend,
              parentId: parentId || null,
              createdAt: new Date().toISOString(),
              likesCount: 0,
              isLiked: false,
              user: {
                id: user?.id || user?._id,
                _id: user?.id || user?._id,
                name: user?.name,
                username: user?.username,
                profileImage: user?.profileImage,
              },
            },
          ]);
        }
        setShowComments(true);
      }
    } catch (err) {
      setCommentError(err.message || "Failed to post comment");
      setCommentText(textToSend);
      setReplyTarget(parentId ? { parentId, replyToUsername: "" } : null);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Delete comment ---- */
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await deleteComment(token, post.id || post._id, commentId);
      // Remove the comment and all its replies
      setComments((prev) =>
        prev.filter((c) => {
          const id = c._id || c.id;
          return id !== commentId && String(c.parentId) !== String(commentId);
        })
      );
      if (res?.data?.commentsCount !== undefined) {
        setCommentsCount(res.data.commentsCount);
      } else {
        setCommentsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ---- Delete post ---- */
  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    await deletePost(token, post.id || post._id);
    onChange?.(post.id || post._id);
  };

  /* ---- Caption rendering (hashtag links) ---- */
  const renderCaption = (text) => {
    if (!text) return null;
    return text.split(/(#[a-zA-Z0-9_-]+)/g).map((part, i) =>
      part.startsWith("#") ? (
        <Link
          key={i}
          to={`/search?tag=${encodeURIComponent(part.replace("#", ""))}`}
          style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
        >
          {part}{" "}
        </Link>
      ) : (
        part
      )
    );
  };

  /* ---- Organize comments into top-level + replies ---- */
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesFor = (parentId) =>
    comments.filter((c) => c.parentId && String(c.parentId) === String(parentId));

  return (
    <article className="post-card">
      {/* ── Post header ── */}
      <div className="post-header">
        <Link to={`/profile/${post.user?.username}`} className="user-inline">
          <Avatar user={post.user} size={42} />
          <div>
            <strong>{post.user?.username || "member"}</strong>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        {user?.username === post.user?.username && (
          <button className="icon-button" onClick={handleDeletePost} title="Delete post">
            •••
          </button>
        )}
      </div>

      {/* ── Post image ── */}
      {post.image && (
        <img
          className="post-image"
          src={mediaUrl(post.image)}
          alt="Post"
          onDoubleClick={likePost}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}

      {/* ── Action buttons ── */}
      <div className="post-actions">
        <button
          className={`icon-button ${liked ? "liked" : ""}`}
          onClick={likePost}
          aria-label="Like"
          style={{ color: liked ? "#e11d48" : "inherit" }}
        >
          <SocialIcon name="heart" />
        </button>
        <button
          className="icon-button"
          onClick={() => setShowComments((prev) => !prev)}
          aria-label="Toggle comments"
        >
          <SocialIcon name="message" />
        </button>
        <span className="action-spacer" />
        <span className="post-time">{timeAgo(post.createdAt)}</span>
      </div>

      {/* ── Likes count (opens likers modal) ── */}
      <div className="post-meta">
        <button
          onClick={handleOpenLikers}
          disabled={likes === 0}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            cursor: likes > 0 ? "pointer" : "default",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {likes} {likes === 1 ? "like" : "likes"}
        </button>
      </div>

      {/* ── Caption ── */}
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

      {/* ── View / hide comments toggle ── */}
      {commentsCount > 0 && (
        <button
          className="comments-link"
          onClick={() => setShowComments((prev) => !prev)}
          style={{ cursor: "pointer", marginTop: 4, display: "block" }}
        >
          {showComments ? "Hide comments" : `View all ${commentsCount} comment${commentsCount !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* ── Comments thread ── */}
      {showComments && (
        <div
          className="inline-comments-list"
          style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {topLevel.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              No comments yet. Be the first!
            </p>
          ) : (
            topLevel.map((c) => (
              <div key={c._id || c.id}>
                {/* Top-level comment */}
                <CommentRow
                  comment={c}
                  postId={post.id || post._id}
                  currentUser={user}
                  token={token}
                  isReply={false}
                  onReply={handleReplyClick}
                  onDelete={handleDeleteComment}
                  onLikeToggle={handleCommentLikeToggle}
                />

                {/* Replies under this comment */}
                {repliesFor(c._id || c.id).map((reply) => (
                  <CommentRow
                    key={reply._id || reply.id}
                    comment={reply}
                    postId={post.id || post._id}
                    currentUser={user}
                    token={token}
                    isReply={true}
                    onReply={handleReplyClick}
                    onDelete={handleDeleteComment}
                    onLikeToggle={handleCommentLikeToggle}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Comment submission error ── */}
      {commentError && (
        <p style={{ color: "#c00", fontSize: 12, margin: "6px 0 0" }}>{commentError}</p>
      )}

      {/* ── Reply banner ── */}
      {replyTarget && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "var(--muted)",
            padding: "6px 0 0",
          }}
        >
          <span>
            Replying to{" "}
            <strong style={{ color: "var(--text)" }}>@{replyTarget.replyToUsername}</strong>
          </span>
          <button
            onClick={cancelReply}
            style={{
              border: "none",
              background: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 12,
              padding: 0,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Comment/reply input ── */}
      <form
        className="comment-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <input
          ref={inputRef}
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
            if (commentError) setCommentError("");
          }}
          placeholder={replyTarget ? `Reply to @${replyTarget.replyToUsername}…` : "Add a comment…"}
          disabled={submitting}
          style={{ flex: 1 }}
        />
        {commentText.trim() && (
          <button
            type="submit"
            disabled={submitting}
            style={{
              border: "none",
              background: "none",
              color: "#2563eb",
              fontWeight: 700,
              fontSize: 13,
              cursor: submitting ? "default" : "pointer",
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            {submitting ? "…" : "Post"}
          </button>
        )}
      </form>

      {/* ── Likers modal ── */}
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
