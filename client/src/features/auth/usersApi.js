const API_URL = "http://localhost:5000/api/users";

async function request(token, path, options = {}) {
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

export const getSuggestions = (token) => request(token, "/suggestions");
export const searchUsers = (token, q) => request(token, `/search?q=${encodeURIComponent(q)}`);
export const getUser = (token, username) => request(token, `/${encodeURIComponent(username)}`);
export const followUser = (token, id) => request(token, `/${id}/follow`, { method: "POST" });
export const unfollowUser = (token, id) => request(token, `/${id}/follow`, { method: "DELETE" });
