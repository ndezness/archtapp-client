import { useState } from "react";
import { useAuth } from "../auth";

export default function AuthScreen() {
  const { needsSetup, notice, login, setup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    if (needsSetup) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("The passwords don't match.");
        return;
      }
    }

    setBusy(true);
    try {
      await (needsSetup ? setup : login)(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="form auth-card" onSubmit={submit}>
        <div className="auth-brand">ArchtApp</div>
        <h1>{needsSetup ? "Create the administrator account" : "Sign in"}</h1>

        {needsSetup && (
          <p className="muted">
            This is the first run. The account you create here becomes the administrator
            and can add everyone else from the Team page.
          </p>
        )}
        {notice && !needsSetup && <p className="muted">{notice}</p>}

        <label>
          Username
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={needsSetup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {needsSetup && (
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Please wait..." : needsSetup ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}