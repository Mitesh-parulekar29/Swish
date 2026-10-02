import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "./authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("swish_token"));

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        const result = await getCurrentUser(token);
        setUser(result.data.user);
      } catch {
        localStorage.removeItem("swish_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem("swish_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("swish_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}