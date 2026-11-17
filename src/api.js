import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export const SESSION_KEY = "archtapp.session";

// These calls happen before anyone is signed in, so they carry no token
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/status",
  "/api/auth/forgot-password",
];

function getToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.token ?? null;
  } catch {
    return null;
  }
}

function expired() {
  window.dispatchEvent(new Event("auth:expired"));
  return new Error("Your session has expired. Please sign in again.");
}

export async function api(path, options = {}) {
  const isPublic = PUBLIC_PATHS.includes(path);
  const token = isPublic ? null : getToken();
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      // For file uploads the browser sets the content type itself (it adds the boundary)
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !isPublic) throw expired();
  if (res.status === 403) throw new Error("You don't have permission to do that.");
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// Fetches a file with the login token and returns it as a Blob
export async function apiBlob(path) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw expired();
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.blob();
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