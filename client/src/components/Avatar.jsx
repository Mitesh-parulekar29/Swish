export default function Avatar({ user, size = 42 }) {
  const label = user?.name || user?.username || "S";
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: Math.max(12, size * 0.34) }}>
      {user?.profileImage ? <img src={user.profileImage} alt="" /> : label.charAt(0).toUpperCase()}
    </div>
  );
}
