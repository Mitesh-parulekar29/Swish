import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getUser, followUser, unfollowUser, blockUser, unblockUser } from "../features/auth/usersApi";
import { getUserPosts } from "../features/posts/postsApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";
import "./Privacy.css";

export default function Profile() {
  const { username } = useParams();
  const { token, user: me } = useAuth();
  const target = username || me?.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsHidden, setPostsHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false); // three-dot menu

  // Load the profile + posts whenever the visited user changes
  useEffect(() => {
    let active = true;
    setMenuOpen(false);

    Promise.all([getUser(token, target), getUserPosts(token, target)])
      .then(([userResult, postsResult]) => {
        if (!active) return;
        setProfile(userResult.data.user);
        setPosts(postsResult.data.posts);
        setPostsHidden(Boolean(postsResult.data.isPrivate));
      })
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [token, target]);

  if (loading) return <div className="page-loading">Loading profile…</div>;

  if (!profile) {
    return (
      <div className="page-empty">
        <h2>User not found</h2>
        <Link to="/search">Back to search</Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // The profile owner has BLOCKED me -> I can only see their name
  // ---------------------------------------------------------------------
  if (profile.isBlockedByThem) {
    return (
      <section className="profile-page-new">
        <div className="blocked-profile">
          <h1>{profile.name}</h1>
          <p>This profile isn't available to you.</p>
        </div>
      </section>
    );
  }

  // Reloads the profile from the server (used after block / unblock so the counts are correct)
  const refreshProfile = async () => {
    const result = await getUser(token, target);
    setProfile(result.data.user);
  };

  // Follow button: Follow -> Following  (public account)
  //                Follow -> Requested  (private account, waiting for approval)
  //                Requested / Following -> Follow (click again to cancel / unfollow)
  const toggleFollow = async () => {
    try {
      const wasFollowing = profile.isFollowing;
      const shouldUndo = wasFollowing || profile.isRequested; // unfollow, or cancel the request

      const result = shouldUndo ? await unfollowUser(token, profile.id) : await followUser(token, profile.id);
      const { isFollowing, isRequested } = result.data;

      // The followers count only changes when a real follow is added or removed
      let change = 0;
      if (isFollowing && !wasFollowing) change = 1;
      if (!isFollowing && wasFollowing) change = -1;

      setProfile((p) => ({ ...p, isFollowing, isRequested, followersCount: p.followersCount + change }));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const ok = window.confirm(`Block ${profile.username}? They won't be able to see your posts, followers or following.`);
    if (!ok) return;

    try {
      await blockUser(token, profile.id);
      await refreshProfile();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleUnblock = async () => {
    setMenuOpen(false);
    try {
      await unblockUser(token, profile.id);
      await refreshProfile();
    } catch (err) {
      window.alert(err.message);
    }
  };

  // Text shown on the follow button
  let followLabel = "Follow";
  if (profile.isFollowing) followLabel = "Following";
  else if (profile.isRequested) followLabel = "Requested";

  return (
    <section className="profile-page-new">
      <header className="profile-top">
        <Avatar user={profile} size={150} />

        <div className="profile-main-info">
          <div className="profile-title">
            <h1>{profile.username}</h1>

            {profile.isMe ? (
              <>
                <Link className="secondary-button" to="/settings">Edit profile</Link>
                <button className="secondary-button">View archive</button>
              </>
            ) : (
              <>
                {profile.isBlocked ? (
                  <button className="secondary-button" onClick={handleUnblock}>Unblock</button>
                ) : (
                  <button
                    className={profile.isFollowing || profile.isRequested ? "secondary-button" : "primary-button"}
                    onClick={toggleFollow}
                  >
                    {followLabel}
                  </button>
                )}

                {/* Three-dot menu (only on other people's profiles) */}
                <div className="profile-menu">
                  <button className="profile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="More options">
                    ⋯
                  </button>

                  {menuOpen && (
                    <>
                      <div className="profile-menu-backdrop" onClick={() => setMenuOpen(false)} />
                      <div className="profile-menu-popup">
                        {profile.isBlocked ? (
                          <button onClick={handleUnblock}>Unblock</button>
                        ) : (
                          <button className="danger" onClick={handleBlock}>Block</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="profile-name">{profile.name}</p>
          {profile.bio && <p className="profile-bio-new">{profile.bio}</p>}

          <div className="profile-counts">
            <span><b>{profile.postsCount}</b> posts</span>
            <span><b>{profile.followersCount}</b> followers</span>
            <span><b>{profile.followingCount}</b> following</span>
          </div>
        </div>
      </header>

      <div className="profile-tabs"><span>Posts</span></div>

      {postsHidden ? (
        <div className="profile-empty">
          <div className="empty-circle"><SocialIcon name="lock" size={22} /></div>
          <h2>This account is private</h2>
          <p>
            {profile.isRequested
              ? `Your follow request is waiting for ${profile.username} to accept.`
              : `Follow ${profile.username} to see their posts.`}
          </p>
        </div>
      ) : posts.length ? (
        <div className="post-grid">
          {posts.map((post) => (
            <article className="grid-post" key={post.id}>
              <Link to={`/post/${post.id}`}>
                {post.image ? <img src={post.image} alt="" /> : <div className="grid-text">{post.caption}</div>}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="profile-empty">
          <div className="empty-circle">+</div>
          <h2>No posts yet</h2>
          {profile.isMe && <p>Share your first post from <Link to="/create">Create</Link>.</p>}
        </div>
      )}
    </section>
  );
}
