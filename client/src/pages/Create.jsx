import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { createPost } from "../features/posts/postsApi";
import Avatar from "../components/Avatar";
import SocialIcon from "../components/SocialIcon";

export default function Create() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [image, setImage] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!image.trim() && !caption.trim()) return;
    setLoading(true);
    try { await createPost(token, { image, caption }); navigate("/home"); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <section className="page narrow-page"><h1>Create</h1><form className="create-page-card" onSubmit={submit}>
    <div className="user-inline"><Avatar user={user} size={45}/><div><strong>{user?.username}</strong><span>{user?.name}</span></div></div>
    <label>Image URL<input value={image} onChange={(e)=>setImage(e.target.value)} placeholder="Paste an image URL" /></label>
    {image && <img className="create-preview" src={image} alt="Preview" onError={(e)=>{e.currentTarget.style.display="none"}}/>}
    <label>Caption<textarea value={caption} onChange={(e)=>setCaption(e.target.value)} placeholder="Write a caption…" rows={5}/></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button full" disabled={loading}>{loading ? "Sharing…" : <><SocialIcon name="plus" size={18}/> Share post</>}</button>
  </form></section>;
}
