import { createContext, useContext, useEffect, useState } from "react";
import { api, SESSION_KEY } from "./api";

const AuthContext = createContext(null);

function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s?.token && new Date(s.expiresAt) > new Date()) return s;
  } catch {
    // unreadable data is treated as "not signed in"
  }
  localStorage.removeItem(SESSION_KEY);
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState(null);

  // On startup: confirm the saved session is still good, or check if first-run setup is needed
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const saved = readSession();
      try {
        if (saved) {
          const me = await api("/api/auth/me");
          const next = { ...saved, username: me.username, role: me.role };
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          if (!cancelled) setSession(next);
        } else {
          const status = await api("/api/auth/status");
          if (!cancelled) setNeedsSetup(status.needsSetup);
        }
      } catch {
        // a 401 is handled by the "auth:expired" listener below
      }
      if (!cancelled) setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Any request that comes back 401 while signed in ends the session
  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setNotice("Your session has ended. Please sign in again.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  async function authenticate(path, username, password) {
    const res = await api(path, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const next = {
      token: res.token,
      expiresAt: res.expiresAt,
      username: res.username,
      role: res.role,
    };
    // Saved immediately so the very next request already has the token
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setNotice(null);
    setNeedsSetup(false);
    setSession(next);
  }

  const value = {
    session,
    ready,
    needsSetup,
    notice,
    isAdmin: session?.role === "admin",
    login: (username, password) => authenticate("/api/auth/login", username, password),
    setup: (username, password) => authenticate("/api/auth/setup", username, password),
    signOut: () => {
      localStorage.removeItem(SESSION_KEY);
      setNotice(null);
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);