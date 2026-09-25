import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { searchUsers } from "../features/auth/usersApi";
import Avatar from "../components/Avatar";

export default function Search() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query.trim()) { setUsers([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      searchUsers(token, query).then((r) => setUsers(r.data.users)).catch(() => setUsers([])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, token]);
  return <section className="page narrow-page">
    <h1>Search</h1>
    <div className="search-box"><span>⌕</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" /></div>
    {!query.trim() ? <div className="page-empty"><h2>Find people on Swish</h2><p>Search by name or username.</p></div> : loading ? <div className="page-loading">Searching…</div> : users.length ? <div className="user-results">{users.map((u) => <Link key={u.id} to={`/profile/${u.username}`} className="user-result"><Avatar user={u} size={48}/><div><strong>{u.username}</strong><span>{u.name}</span></div></Link>)}</div> : <div className="page-empty"><h2>No users found</h2><p>Try another name or username.</p></div>}
  </section>;
}
