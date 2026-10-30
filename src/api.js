import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export const SESSION_KEY = "archtapp.session";

// These calls happen before anyone is signed in, so they carry no token
const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/setup", "/api/auth/status"];

function getToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.token ?? null;
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const isPublic = PUBLIC_PATHS.includes(path);
  const token = isPublic ? null : getToken();

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !isPublic) {
    window.dispatchEvent(new Event("auth:expired"));
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (res.status === 403) throw new Error("You don't have permission to do that.");
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = () => setTick((t) => t + 1);

  return { data, error, loading, reload };
}