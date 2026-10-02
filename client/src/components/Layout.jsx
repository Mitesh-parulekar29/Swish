import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import SocialIcon from "./SocialIcon";
import Avatar from "./Avatar";
import "./Social.css";

const links = [
  ["/home", "home", "Home"],
  ["/search", "search", "Search"],
  ["/messages", "message", "Messages"],
  ["/notifications", "bell", "Notifications"],
  ["/create", "plus", "Create"],
  ["/profile", "user", "Profile"],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <div className="social-app">
      <aside className="social-sidebar">
        <NavLink to="/home" className="brand">swish</NavLink>
        <nav>
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === "/profile"} className={({ isActive }) => `social-nav ${isActive ? "active" : ""}`}>
              <SocialIcon name={icon} size={23} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className="social-nav"><SocialIcon name="menu" size={23} /><span>Settings</span></NavLink>
          <button className="social-nav logout-button" onClick={logout}><Avatar user={user} size={25} /><span>Log out</span></button>
        </div>
      </aside>
      <main className="social-main">
        <header className="mobile-header">
          <NavLink to="/home" className="brand">swish</NavLink>
          <NavLink to="/profile"><Avatar user={user} size={30} /></NavLink>
        </header>
        <Outlet key={location.pathname} />
      </main>
      <nav className="mobile-nav">
        {links.slice(0, 5).map(([to, icon, label]) => <NavLink key={to} to={to} title={label}><SocialIcon name={icon} size={22} /></NavLink>)}
        <NavLink to="/profile"><Avatar user={user} size={25} /></NavLink>
      </nav>
    </div>
  );
}
