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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    Promise.all([getFeed(token), getSuggestions(token)]).then(([feed, suggested]) => { setPosts(feed.data.posts); setSuggestions(suggested.data.users); }).catch(() => { setPosts([]); setSuggestions([]); }).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="home-layout">
      <section className="feed-column">
        {loading ? <div className="page-loading">Loading your feed…</div> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} onChange={(id) => setPosts((items) => items.filter((p) => p.id !== id))} />) : (
          <div className="feed-empty">
            <div className="empty-icon"><SocialIcon name="home" size={34} /></div>
            <h1>Your feed is empty</h1>
            <p>Posts from people you follow will appear here.</p>
            <Link className="primary-button" to="/search">Find people</Link>
          </div>
        )}
      </section>
      <aside className="home-aside">
        <Link to="/profile" className="account-row"><Avatar user={user} size={50} /><div><strong>{user?.username}</strong><span>{user?.name}</span></div></Link>
        {suggestions.length > 0 && <><div className="aside-heading"><span>Suggested for you</span></div><div className="suggestion-list">{suggestions.map((person) => <Link to={`/profile/${person.username}`} className="account-row suggestion" key={person.id}><Avatar user={person} size={38}/><div><strong>{person.username}</strong><span>{person.name}</span></div></Link>)}</div></>}
      </aside>
    </div>
  );
}
