import React from "react";
import { BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import { ThemeProvider } from "./features/theme/ThemeContext.jsx";
import { ToastProvider } from "./features/toast/ToastContext.jsx";

import "./index.css";
import "./App.css";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);