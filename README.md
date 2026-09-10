# Swish

Swish is a **private, campus-only social network** for verified students and faculty. It ships as a
production-ready MERN application: an Express/MongoDB REST API and a React + Tailwind client with
image posts, likes, comments, follows, notifications, reporting and a full moderation dashboard.

## Highlights

- **Campus-gated registration** - institutional email domains plus an admin-managed roster (`CampusMember`)
- **JWT auth with role-based access** - `student`, `faculty`, `admin`; bcrypt password hashing
- **Instagram-style feed** - following/all-campus scopes, optimistic likes, inline comments
- **Explore** - engagement-ranked trending posts, popular and suggested people
- **Notifications** - likes, comments, follows and moderation actions, with unread badge polling
- **Moderation** - report posts, admin dashboard with stats, report queue, user suspension, roster management
- **Secure image uploads** - magic-number validation, size/type limits, Cloudinary or local-disk driver
- **Responsive, accessible UI** - mobile-first layout, light/dark theme, keyboard-friendly controls
