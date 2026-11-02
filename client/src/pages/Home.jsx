import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getFeed } from "../features/posts/postsApi";
import { getSuggestions } from "../features/auth/usersApi";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";

export default function Home() {
  const { token, user } = useAuth();
  const [feedScope, setFeedScope] = useState("following"); // 'following' | 'all'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;
    getSuggestions(token)
      .then((suggested) => {
        if (active) setSuggestions(suggested?.data?.users || []);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getFeed(token, feedScope)
      .then((feed) => {
        if (!active) return;
        setPosts(feed?.data?.posts || []);
      })
      .catch((err) => {
        if (!active) return;
        setPosts([]);
        setError(err.message || "Failed to load feed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, feedScope, reloadKey]);

  return (
    <div className="home-layout">
      <section className="feed-column">
        {/* Feed Scope Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 20, gap: 20 }}>
          <button
            onClick={() => setFeedScope("following")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedScope === "following" ? "2px solid var(--text)" : "2px solid transparent",
              padding: "10px 4px",
              fontWeight: feedScope === "following" ? 700 : 500,
              color: feedScope === "following" ? "var(--text)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Following
          </button>
          <button
            onClick={() => setFeedScope("all")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedScope === "all" ? "2px solid var(--text)" : "2px solid transparent",
              padding: "10px 4px",
              fontWeight: feedScope === "all" ? 700 : 500,
              color: feedScope === "all" ? "var(--text)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Campus Feed
          </button>
        </div>

        {loading ? (
          <div className="page-loading">Loading feed…</div>
        ) : error ? (
          <div className="feed-empty">
            <div className="empty-icon">
              <SocialIcon name="home" size={34} />
            </div>
            <h1>Couldn’t load feed</h1>
            <p>{error}</p>
            <button className="primary-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </div>
        ) : posts.length ? (
          posts.map((post) => (
            <PostCard
              key={post.id || post._id}
              post={post}
              onChange={(id) =>
                setPosts((items) => items.filter((p) => (p.id || p._id) !== id))
              }
            />
          ))
        ) : (
          <div className="feed-empty">
            <div className="empty-icon">
              <SocialIcon name="home" size={34} />
            </div>
            <h1>Your feed is empty</h1>
            <p>
              {feedScope === "following"
                ? "Posts from people you follow will appear here. Switch to Campus Feed or find people!"
                : "No posts found on campus yet. Be the first to share!"}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {feedScope === "following" && (
                <button
                  className="secondary-button"
                  onClick={() => setFeedScope("all")}
                >
                  Explore Campus Feed
                </button>
              )}
              <Link className="primary-button" to="/create">
                Create Post
              </Link>
            </div>
          </div>
        )}
      </section>

      <aside className="home-aside">
        <Link to="/profile" className="account-row">
          <Avatar user={user} size={50} />
          <div>
            <strong>{user?.username}</strong>
            <span>{user?.name}</span>
          </div>
        </Link>
        {suggestions.length > 0 && (
          <>
            <div className="aside-heading">
              <span>Suggested for you</span>
            </div>
            <div className="suggestion-list">
              {suggestions.map((person) => (
                <Link
                  to={`/profile/${person.username}`}
                  className="account-row suggestion"
                  key={person.id || person._id}
                >
                  <Avatar user={person} size={38} />
                  <div>
                    <strong>{person.username}</strong>
                    <span>{person.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
