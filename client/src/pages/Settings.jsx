import { useEffect, useRef, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { updateProfile, updatePrivacy, getBlockedUsers, unblockUser } from "../features/auth/usersApi";
import { changePassword } from "../features/auth/authApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";
import "./Privacy.css";

const TABS = [
  { id: "profile", label: "Edit profile", icon: "user" },
  { id: "password", label: "Change password", icon: "lock" },
  { id: "privacy", label: "Account privacy", icon: "globe" },
  { id: "blocked", label: "Blocked users", icon: "x" },
];

function EditProfileForm({ user, token, setUser }) {
  const fileInputRef = useRef(null);
  const [fields, setFields] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    department: user?.department || "",
    course: user?.course || "",
    batch: user?.batch || "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key) => (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const onPickImage = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!fields.name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...fields };
      if (file) payload.profileImage = file;
      const result = await updateProfile(token, payload);
      setUser(result.data.user);
      setSuccess("Profile updated");
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="settings-card" onSubmit={submit}>
      <div className="avatar-edit-row">
        <Avatar user={{ ...user, profileImage: preview }} size={72} />
        <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
          <SocialIcon name="camera" size={16} /> Change photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickImage} />
      </div>

      <label>
        Name
        <input value={fields.name} onChange={update("name")} maxLength={80} required />
      </label>
      <label>
        Bio
        <textarea value={fields.bio} onChange={update("bio")} maxLength={300} rows={3} placeholder="Tell people about yourself" />
      </label>
      <label>
        Department
        <input value={fields.department} onChange={update("department")} maxLength={80} placeholder="e.g. Computer Engineering" />
      </label>
      <label>
        Course
        <input value={fields.course} onChange={update("course")} maxLength={80} placeholder="e.g. B.E." />
      </label>
      <label>
        Batch
        <input value={fields.batch} onChange={update("batch")} maxLength={20} placeholder="e.g. 2023-27" />
      </label>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <button className="primary-button full" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

function ChangePasswordForm({ token }) {
  const [fields, setFields] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key) => (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (fields.newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }
    if (fields.newPassword !== fields.confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setLoading(true);
    try {
      await changePassword(token, fields);
      setSuccess("Password updated");
      setFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="settings-card" onSubmit={submit}>
      <label>
        Current password
        <input type="password" autoComplete="current-password" value={fields.currentPassword} onChange={update("currentPassword")} required />
      </label>
      <label>
        New password
        <input type="password" autoComplete="new-password" value={fields.newPassword} onChange={update("newPassword")} minLength={8} required />
      </label>
      <label>
        Re-enter new password
        <input type="password" autoComplete="new-password" value={fields.confirmPassword} onChange={update("confirmPassword")} minLength={8} required />
      </label>
      <p className="field-hint">At least 8 characters.</p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <button className="primary-button full" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
    </form>
  );
}

function PrivacySettings({ user, token, setUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const choose = async (isPrivate) => {
    if (loading || Boolean(user?.isPrivate) === isPrivate) return;
    setError("");
    setLoading(true);
    try {
      const result = await updatePrivacy(token, isPrivate);
      setUser(result.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <div className="privacy-options">
        <button
          type="button"
          className={`privacy-option ${!user?.isPrivate ? "active" : ""}`}
          onClick={() => choose(false)}
          disabled={loading}
        >
          <SocialIcon name="globe" size={20} />
          <div>
            <strong>Public</strong>
            <span>Anyone can see your posts and profile.</span>
          </div>
          {!user?.isPrivate && <SocialIcon name="check" size={18} />}
        </button>
        <button
          type="button"
          className={`privacy-option ${user?.isPrivate ? "active" : ""}`}
          onClick={() => choose(true)}
          disabled={loading}
        >
          <SocialIcon name="lock" size={20} />
          <div>
            <strong>Private</strong>
            <span>Only your followers can see your posts.</span>
          </div>
          {user?.isPrivate && <SocialIcon name="check" size={18} />}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function BlockedUsers({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the list of users I have blocked
  useEffect(() => {
    let active = true;
    getBlockedUsers(token)
      .then((result) => active && setUsers(result.data.users))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const handleUnblock = async (id) => {
    try {
      await unblockUser(token, id);
      setUsers((list) => list.filter((u) => u.id !== id)); // remove from the list
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="settings-card"><p className="field-hint">Loading…</p></div>;

  return (
    <div className="settings-card">
      {error && <p className="form-error">{error}</p>}
      {users.length === 0 ? (
        <p className="field-hint">You haven't blocked anyone.</p>
      ) : (
        <ul className="blocked-list">
          {users.map((u) => (
            <li key={u.id} className="blocked-row">
              <Avatar user={u} size={44} />
              <div className="blocked-info">
                <strong>{u.username}</strong>
                <span>{u.name}</span>
              </div>
              <button type="button" className="secondary-button" onClick={() => handleUnblock(u.id)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, token, setUser } = useAuth();
  const [tab, setTab] = useState("profile");

  return (
    <section className="page narrow-page">
      <h1>Settings</h1>
      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <SocialIcon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <EditProfileForm user={user} token={token} setUser={setUser} />}
      {tab === "password" && <ChangePasswordForm token={token} />}
      {tab === "privacy" && <PrivacySettings user={user} token={token} setUser={setUser} />}
      {tab === "blocked" && <BlockedUsers token={token} />}
    </section>
  );
}