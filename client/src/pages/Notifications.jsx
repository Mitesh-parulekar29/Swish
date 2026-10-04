import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getNotifications, markAllRead } from "../features/notifications/notificationsApi";
import { getFollowRequests, acceptFollowRequest, declineFollowRequest } from "../features/auth/usersApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";
import "./Privacy.css";

function timeAgo(value) {
  const diff = Math.max(1, Date.now() - new Date(value).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ICON_BY_TYPE = { follow: "user", like: "heart", comment: "message" };

function messageFor(n) {
  if (n.type === "follow") return "started following you";
  if (n.type === "like") return "liked your post";
  if (n.type === "comment") return `commented: "${n.text}"`;
  return "";
}

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]); // pending follow requests (private account)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getNotifications(token), getFollowRequests(token)])
      .then(([notificationResult, requestResult]) => {
        if (cancelled) return;
        // "follow_request" notifications only light up the bell badge.
        // The requests themselves are shown (with Accept / Decline) in their own section below.
        setNotifications(notificationResult.data.notifications.filter((n) => n.type !== "follow_request"));
        setRequests(requestResult.data.requests);
        markAllRead(token).catch(() => {});
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async (id) => {
    try {
      await acceptFollowRequest(token, id);
      setRequests((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineFollowRequest(token, id);
      setRequests((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      window.alert(err.message);
    }
  };

  if (loading) {
    return (
      <section className="page narrow-page">
        <h1>Notifications</h1>
        <p className="field-hint">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page narrow-page">
        <h1>Notifications</h1>
        <p className="form-error">{error}</p>
      </section>
    );
  }

  if (notifications.length === 0 && requests.length === 0) {
    return (
      <section className="center-empty">
        <div className="large-empty-icon">
          <SocialIcon name="bell" size={40} />
        </div>
        <h1>No notifications yet</h1>
        <p>When someone follows or interacts with you, it will appear here.</p>
      </section>
    );
  }

  return (
    <section className="page narrow-page">
      <h1>Notifications</h1>

      {requests.length > 0 && (
        <div className="follow-requests">
          <h2>Follow requests</h2>
          <ul className="notification-list">
            {requests.map((r) => (
              <li key={r.id} className="notification-item">
                <Link to={`/profile/${r.username}`}>
                  <Avatar user={r} size={44} />
                </Link>
                <div className="notification-body">
                  <p>
                    <Link to={`/profile/${r.username}`}>
                      <strong>{r.username}</strong>
                    </Link>{" "}
                    wants to follow you
                  </p>
                  <span className="notification-time">{r.name}</span>
                </div>
                <div className="request-actions">
                  <button className="primary-button" onClick={() => handleAccept(r.id)}>Accept</button>
                  <button className="secondary-button" onClick={() => handleDecline(r.id)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="notification-list">
        {notifications.map((n) => (
          <li key={n.id} className={`notification-item ${n.isRead ? "" : "unread"}`}>
            {n.actor && (
              <Link to={`/profile/${n.actor.username}`}>
                <Avatar user={n.actor} size={44} />
              </Link>
            )}
            <div className="notification-body">
              <p>
                {n.actor ? (
                  <Link to={`/profile/${n.actor.username}`}>
                    <strong>{n.actor.username}</strong>
                  </Link>
                ) : (
                  <strong>Someone</strong>
                )}{" "}
                {messageFor(n)}
              </p>
              <span className="notification-time">{timeAgo(n.createdAt)}</span>
            </div>
            <span className="notification-type-icon">
              <SocialIcon name={ICON_BY_TYPE[n.type] || "bell"} size={18} />
            </span>
            {n.post?.image && (
              <img className="notification-thumb" src={n.post.image} alt="" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}