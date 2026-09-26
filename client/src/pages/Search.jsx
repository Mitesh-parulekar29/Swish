import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { searchUsers } from "../features/auth/usersApi";
import { getExplore } from "../features/posts/postsApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";

export default function Search() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = searchParams.get("tag") || "";

  const [activeTab, setActiveTab] = useState(initialTag ? "explore" : "explore"); // 'explore' | 'accounts'
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [users, setUsers] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load explore data
  const loadExplore = (searchQ = query, tag = selectedTag) => {
    setLoading(true);
    getExplore(token, searchQ, tag)
      .then((r) => {
        setExplorePosts(r?.data?.posts || []);
        if (r?.data?.popularTags?.length) {
          setPopularTags(r.data.popularTags);
        }
      })
      .catch(() => setExplorePosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExplore(query, selectedTag);
  }, [token, selectedTag]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      if (activeTab === "explore") {
        loadExplore("", selectedTag);
      }
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      if (activeTab === "accounts") {
        searchUsers(token, query)
          .then((r) => setUsers(r?.data?.users || []))
          .catch(() => setUsers([]))
          .finally(() => setLoading(false));
      } else {
        loadExplore(query, selectedTag);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const handleTagClick = (tag) => {
    const next = selectedTag === tag ? "" : tag;
    setSelectedTag(next);
    if (next) {
      setSearchParams({ tag: next });
    } else {
      setSearchParams({});
    }
  };

  return (
    <section className="page" style={{ maxWidth: 940 }}>
      <h1>Explore & Search</h1>

      {/* Search Input Bar */}
      <div className="search-box" style={{ marginBottom: 16 }}>
        <span>⌕</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === "explore" ? "Search campus topics, posts, or tags…" : "Search people by name or username…"}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ border: "none", background: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Explore vs Accounts Tab Switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 20, gap: 24 }}>
        <button
          onClick={() => setActiveTab("explore")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "explore" ? "2px solid var(--text)" : "2px solid transparent",
            padding: "10px 4px",
            fontWeight: activeTab === "explore" ? 700 : 500,
            color: activeTab === "explore" ? "var(--text)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Explore Posts
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "accounts" ? "2px solid var(--text)" : "2px solid transparent",
            padding: "10px 4px",
            fontWeight: activeTab === "accounts" ? 700 : 500,
            color: activeTab === "accounts" ? "var(--text)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Accounts
        </button>
      </div>

      {/* EXPLORE TAB CONTENT */}
      {activeTab === "explore" && (
        <div>
          {/* Trending Hashtag Pills */}
          {popularTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Trending:</span>
              {popularTags.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => handleTagClick(item.tag)}
                  style={{
                    background: selectedTag === item.tag ? "var(--accent)" : "var(--soft)",
                    color: selectedTag === item.tag ? "#fff" : "var(--text)",
                    border: "1px solid var(--line)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  #{item.tag}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="page-loading">Searching campus explore…</div>
          ) : explorePosts.length ? (
            <div className="post-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {explorePosts.map((post) => (
                <div key={post.id || post._id} className="grid-post" style={{ position: "relative" }}>
                  <Link to={`/post/${post.id || post._id}`}>
                    {post.image ? (
                      <img
                        src={post.image.startsWith("/") ? `http://localhost:5000${post.image}` : post.image}
                        alt={post.caption || "Campus post"}
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid-text" style={{ background: "var(--soft)", padding: 14 }}>
                        <p style={{ margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                          {post.caption}
                        </p>
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="page-empty">
              <h2>No explore posts found</h2>
              <p>{selectedTag ? `No posts tagged #${selectedTag}` : "Try searching for a different keyword or create a new post!"}</p>
            </div>
          )}
        </div>
      )}

      {/* ACCOUNTS TAB CONTENT */}
      {activeTab === "accounts" && (
        <div>
          {!query.trim() ? (
            <div className="page-empty">
              <h2>Find people on Swish</h2>
              <p>Type a name or username in the search bar above.</p>
            </div>
          ) : loading ? (
            <div className="page-loading">Searching accounts…</div>
          ) : users.length ? (
            <div className="user-results">
              {users.map((u) => (
                <Link key={u.id || u._id} to={`/profile/${u.username}`} className="user-result">
                  <Avatar user={u} size={48} />
                  <div>
                    <strong>{u.username}</strong>
                    <span>{u.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="page-empty">
              <h2>No users found</h2>
              <p>Try another name or username.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
