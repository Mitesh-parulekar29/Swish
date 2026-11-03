import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getPost } from "../features/posts/postsApi";
import PostCard from "../components/PostCard";
import SocialIcon from "../components/SocialIcon";

export default function PostDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    setError("");
    getPost(token, id)
      .then((r) => {
        setPost(r.data.post);
      })
      .catch((err) => {
        setError(err.message || "Failed to load post");
        setPost(null);
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="page-loading">Loading post…</div>;
  }

  if (error) {
    return (
      <div className="page-empty">
        <div className="empty-circle" style={{ fontSize: 26 }}>
          <SocialIcon name="image" size={28} />
        </div>
        <h2>Something went wrong</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{error}</p>
        <button className="primary-button" onClick={load} style={{ marginTop: 12 }}>
          Try again
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-empty">
        <div className="empty-circle" style={{ fontSize: 26 }}>
          <SocialIcon name="image" size={28} />
        </div>
        <h2>Post not found</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          This post may have been deleted or is no longer available.
        </p>
        <Link className="primary-button" to="/home" style={{ marginTop: 12 }}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <section className="detail-wrap">
      <PostCard post={post} />
    </section>
  );
}
