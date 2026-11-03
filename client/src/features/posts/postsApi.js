const API_URL = "http://localhost:5000/api/posts";
const API_ORIGIN = API_URL.replace(/\/api\/posts$/, "");

export function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
  return path;
}

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

export const getFeed = (token, scope = "following") =>
  request(token, `/feed?scope=${encodeURIComponent(scope)}`);

export const getExplore = (token, query = "", tag = "") => {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (tag) params.append("tag", tag);
  const qStr = params.toString();
  return request(token, `/explore${qStr ? `?${qStr}` : ""}`);
};

export const getPost = (token, id) => request(token, `/${id}`);
export const getPostLikes = (token, id) => request(token, `/${id}/likes`);
export const getUserPosts = (token, username) =>
  request(token, `/user/${encodeURIComponent(username)}`);

// Multipart create — do NOT set Content-Type; browser attaches the boundary.
export async function createPost(token, { caption = "", image } = {}) {
  const formData = new FormData();
  formData.append("caption", caption);
  if (image) formData.append("image", image);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Failed to create post");
  return result;
}

export const toggleLike = (token, id) =>
  request(token, `/${id}/like`, { method: "POST" });

/**
 * Add a comment or a reply.
 * @param {string} token
 * @param {string} postId
 * @param {string} text
 * @param {string|null} parentId  – null for top-level, comment _id for a reply
 */
export const addComment = (token, postId, text, parentId = null) =>
  request(token, `/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text, parentId }),
  });

export const deleteComment = (token, postId, commentId) =>
  request(token, `/${postId}/comments/${commentId}`, { method: "DELETE" });

export const deletePost = (token, id) =>
  request(token, `/${id}`, { method: "DELETE" });

/**
 * Toggle like on a comment or reply.
 */
export const toggleCommentLike = (token, postId, commentId) =>
  request(token, `/${postId}/comments/${commentId}/like`, { method: "POST" });
