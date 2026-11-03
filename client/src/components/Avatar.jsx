import { mediaUrl } from "../features/posts/postsApi";

export default function Avatar({ user, size = 42 }) {
  const label = user?.name || user?.username || "S";
  const src = mediaUrl(user?.profileImage);
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: Math.max(12, size * 0.34) }}>
      {src ? <img src={src} alt="" /> : label.charAt(0).toUpperCase()}
    </div>
  );
}
