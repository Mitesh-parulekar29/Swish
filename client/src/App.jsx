import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthContext.jsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Create from "./pages/Create";
import Settings from "./pages/Settings";
import PostDetail from "./pages/PostDetail";
import Layout from "./components/Layout";

function ProtectedRoute({ user, children }) { return user ? children : <Navigate to="/login" replace />; }

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading Swish…</div>;
  return <Routes>
    <Route path="/" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
    <Route element={<ProtectedRoute user={user}><Layout /></ProtectedRoute>}>
      <Route path="/home" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/create" element={<Create />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/post/:id" element={<PostDetail />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
