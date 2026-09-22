import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getPost } from "../features/posts/postsApi";
import PostCard from "../components/PostCard";
export default function PostDetail() { const { id } = useParams(); const { token } = useAuth(); const [post,setPost]=useState(null); useEffect(()=>{getPost(token,id).then(r=>setPost(r.data.post)).catch(()=>setPost(null));},[token,id]); return post ? <section className="detail-wrap"><PostCard post={post}/></section> : <div className="page-empty"><h2>Post not found</h2></div>; }
