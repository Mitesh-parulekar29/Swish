import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { createPost } from "../features/posts/postsApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export default function Create() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickImage = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ALLOWED_TYPES.has(picked.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      e.target.value = "";
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError("Image must be 5 MB or smaller");
      e.target.value = "";
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setError("");
    setSuccess("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    const trimmed = caption.trim();
    if (!trimmed && !file) {
      setError("Add an image or caption");
      return;
    }

    setLoading(true);
    try {
      await createPost(token, { caption: trimmed, image: file || undefined });
      setSuccess("Post shared");
      setCaption("");
      clearImage();
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page narrow-page">
      <h1>Create</h1>
      <form className="create-page-card" onSubmit={submit}>
        <div className="user-inline">
          <Avatar user={user} size={45} />
          <div>
            <strong>{user?.username}</strong>
            <span>{user?.name}</span>
          </div>
        </div>

        <div className="create-image-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <SocialIcon name="camera" size={16} /> {file ? "Change photo" : "Add photo"}
          </button>
          {file && (
            <button type="button" className="secondary-button" onClick={clearImage} disabled={loading}>
              Remove
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={onPickImage}
          />
        </div>
        <p className="field-hint">JPEG, PNG, or WebP. 5 MB or smaller. Caption-only posts are allowed.</p>

        {preview && (
          <img className="create-preview" src={preview} alt="Preview" />
        )}

        <label>
          Caption
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            rows={5}
            disabled={loading}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button className="primary-button full" disabled={loading}>
          {loading ? "Sharing…" : <><SocialIcon name="plus" size={18} /> Share post</>}
        </button>
      </form>
    </section>
  );
}
