import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getUser, followUser, unfollowUser } from "../features/auth/usersApi";
import { getUserPosts } from "../features/posts/postsApi";
import Avatar from "../components/Avatar";

export default function Profile() {
  const { username } = useParams();
  const { token, user: me } = useAuth();
  const target = username || me?.username;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([getUser(token, target), getUserPosts(token, target)]).then(([u, p]) => { if (active) { setProfile(u.data.user); setPosts(p.data.posts); } }).catch(() => { if (active) setProfile(null); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token, target]);
  if (loading) return <div className="page-loading">Loading profile…</div>;
  if (!profile) return <div className="page-empty"><h2>User not found</h2><Link to="/search">Back to search</Link></div>;
  const toggleFollow = async () => {
    const result = profile.isFollowing ? await unfollowUser(token, profile.id) : await followUser(token, profile.id);
    setProfile((p) => ({ ...p, isFollowing: result.data.isFollowing, followersCount: p.followersCount + (result.data.isFollowing ? 1 : -1) }));
  };
  return <section className="profile-page-new">
    <header className="profile-top"><Avatar user={profile} size={150}/><div className="profile-main-info"><div className="profile-title"><h1>{profile.username}</h1>{profile.isMe ? <><Link className="secondary-button" to="/settings">Edit profile</Link><button className="secondary-button">View archive</button></> : <button className="primary-button" onClick={toggleFollow}>{profile.isFollowing ? "Following" : "Follow"}</button>}</div><p className="profile-name">{profile.name}</p>{profile.bio && <p className="profile-bio-new">{profile.bio}</p>}<div className="profile-counts"><span><b>{profile.postsCount}</b> posts</span><span><b>{profile.followersCount}</b> followers</span><span><b>{profile.followingCount}</b> following</span></div></div></header>
    <div className="profile-tabs"><span>Posts</span></div>
    {posts.length ? <div className="post-grid">{posts.map((post) => <article className="grid-post" key={post.id}><Link to={`/post/${post.id}`}>{post.image ? <img src={post.image} alt=""/> : <div className="grid-text">{post.caption}</div>}</Link></article>)}</div> : <div className="profile-empty"><div className="empty-circle">+</div><h2>No posts yet</h2>{profile.isMe && <p>Share your first post from <Link to="/create">Create</Link>.</p>}</div>}
  </section>;
}
