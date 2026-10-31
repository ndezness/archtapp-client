import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import Logo from "../components/Logo";

export default function AuthScreen() {
  const { needsSetup, notice, login, setup } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | forgot | sent
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const forgot = !needsSetup && mode === "forgot";
  const sent = !needsSetup && mode === "sent";

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirm("");
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (forgot) {
      if (!username.trim()) {
        setError("Enter your username.");
        return;
      }
      setBusy(true);
      try {
        await api("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ username: username.trim() }),
        });
        setMode("sent");
      } catch (err) {
        setError(err.message);
      }
      setBusy(false);
      return;
    }

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

  const brand = (
    <div className="auth-brand">
      <Logo size={40} />
      <span>ArchtApp</span>
    </div>
  );

  if (sent) {
    return (
      <div className="auth-page">
        <div className="form auth-card">
          {brand}
          <h1>Request sent</h1>
          <p className="muted">
            If that account exists, your administrator has been notified. They'll set a
            temporary password for you, which you can change under Account after signing in.
          </p>
          <button type="button" className="primary" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="form auth-card" onSubmit={submit}>
        {brand}
        <h1>
          {needsSetup
            ? "Create the administrator account"
            : forgot
            ? "Forgot your password?"
            : "Sign in"}
        </h1>

        {needsSetup && (
          <p className="muted">
            There is no administrator yet. The account you create here becomes the
            administrator and can add everyone else from the Team page.
          </p>
        )}
        {forgot && (
          <p className="muted">
            Enter your username. Your administrator will be notified and can set a temporary
            password for you.
          </p>
        )}
        {notice && !needsSetup && !forgot && <p className="muted">{notice}</p>}

        <label>
          Username
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        {!forgot && (
          <label>
            Password
            <input
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
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
          {busy
            ? "Please wait..."
            : needsSetup
            ? "Create account"
            : forgot
            ? "Notify administrator"
            : "Sign in"}
        </button>

        {!needsSetup && (
          <button
            type="button"
            className="text-link"
            onClick={() => switchMode(forgot ? "signin" : "forgot")}
          >
            {forgot ? "Back to sign in" : "Forgot your password?"}
          </button>
        )}
      </form>
    </div>
  );
}