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

// Follow requests (for private accounts)
export const getFollowRequests = (token) => request(token, "/me/follow-requests");
export const acceptFollowRequest = (token, id) => request(token, `/me/follow-requests/${id}/accept`, { method: "POST" });
export const declineFollowRequest = (token, id) => request(token, `/me/follow-requests/${id}`, { method: "DELETE" });

// Block / unblock
export const blockUser = (token, id) => request(token, `/${id}/block`, { method: "POST" });
export const getBlockedUsers = (token) => request(token, "/me/blocked");
export const unblockUser = (token, id) => request(token, `/${id}/block`, { method: "DELETE" });
export const updatePrivacy = (token, isPrivate) =>
  request(token, "/me/privacy", { method: "PUT", body: JSON.stringify({ isPrivate }) });

// Profile updates may include a new picture, so this sends multipart/form-data
// instead of going through the JSON-only `request` helper above. The browser
// sets the multipart boundary itself, so Content-Type must NOT be set here.
export async function updateProfile(token, fields) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });

  const response = await fetch(`${API_URL}/me`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to update profile");
  return result;
}