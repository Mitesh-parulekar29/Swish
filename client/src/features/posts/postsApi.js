const API_URL = "http://localhost:5000/api/posts";

async function request(token, path = "", options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Request failed");
  return result;
}

export const getFeed = (token, scope = "following") => request(token, `/feed?scope=${encodeURIComponent(scope)}`);
export const getExplore = (token, query = "", tag = "") => {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (tag) params.append("tag", tag);
  const qStr = params.toString();
  return request(token, `/explore${qStr ? `?${qStr}` : ""}`);
};
export const getPost = (token, id) => request(token, `/${id}`);
export const getPostLikes = (token, id) => request(token, `/${id}/likes`);
export const getUserPosts = (token, username) => request(token, `/user/${encodeURIComponent(username)}`);
export const createPost = (token, data) => request(token, "", { method: "POST", body: JSON.stringify(data) });
export const toggleLike = (token, id) => request(token, `/${id}/like`, { method: "POST" });
export const addComment = (token, id, text) => request(token, `/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) });
export const deleteComment = (token, id, commentId) => request(token, `/${id}/comments/${commentId}`, { method: "DELETE" });
export const deletePost = (token, id) => request(token, `/${id}`, { method: "DELETE" });
