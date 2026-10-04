const API_URL = "http://localhost:5000/api/notifications";

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

export const getNotifications = (token) => request(token);
export const getUnreadCount = (token) => request(token, "/unread-count");
export const markAllRead = (token) => request(token, "/read-all", { method: "POST" });