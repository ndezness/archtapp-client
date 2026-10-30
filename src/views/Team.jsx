import { useState } from "react";
import { api, useApi } from "../api";
import { useAuth } from "../auth";

const send = (method, path, body) =>
  api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export default function Team() {
  const { session } = useAuth();
  const { data: users, error, loading, reload } = useApi("/api/users");
  const [form, setForm] = useState({ username: "", password: "", role: "staff" });
  const [resetId, setResetId] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);

  async function run(fn, success) {
    setActionError(null);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage(success);
      reload();
      return true;
    } catch (e) {
      setActionError(e.message);
      return false;
    }
  }

  async function add(e) {
    e.preventDefault();
    const name = form.username.trim().toLowerCase();
    const ok = await run(
      () =>
        send("POST", "/api/users", {
          username: form.username,
          password: form.password,
          role: form.role,
        }),
      `Added ${name}. Give them the temporary password; they can change it under Account.`
    );
    if (ok) setForm({ username: "", password: "", role: "staff" });
  }

  async function resetPassword(e, user) {
    e.preventDefault();
    const ok = await run(
      () => send("PUT", `/api/users/${user.userId}/password`, { newPassword: resetValue }),
      `Password reset for ${user.username}.`
    );
    if (ok) {
      setResetId(null);
      setResetValue("");
    }
  }

  const changeRole = (user, role) =>
    run(
      () => send("PUT", `/api/users/${user.userId}/role`, { role }),
      `${user.username} is now ${role}.`
    );

  const remove = (user) => {
    if (window.confirm(`Remove ${user.username}? They will be signed out immediately.`)) {
      run(() => send("DELETE", `/api/users/${user.userId}`), `Removed ${user.username}.`);
    }
  };

  if (loading) return <p className="muted">Loading team...</p>;
  if (error) return <p className="error">Could not load team: {error}</p>;

  return (
    <div>
      <h1>Team</h1>
      <p className="muted">Admins can manage the team. Staff can use everything else.</p>

      {actionError && <p className="error">{actionError}</p>}
      {message && <p className="success">{message}</p>}

      <section className="panel">
        <h2>Members</h2>
        {users.map((u) => {
          const isSelf = u.username === session.username;
          return (
            <div className="row" key={u.userId}>
              <div className="row-main">
                <strong>{u.username}</strong>
                {isSelf && <span className="chip">you</span>}
              </div>

              <div className="row-controls">
                {resetId === u.userId ? (
                  <form className="inline-form tight-form" onSubmit={(e) => resetPassword(e, u)}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="New temporary password"
                      value={resetValue}
                      onChange={(e) => setResetValue(e.target.value)}
                    />
                    <button type="submit" className="primary">Set password</button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setResetId(null);
                        setResetValue("");
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="admin">admin</option>
                      <option value="staff">staff</option>
                    </select>
                    <button
                      className="link-button"
                      onClick={() => {
                        setResetId(u.userId);
                        setResetValue("");
                      }}
                    >
                      Reset password
                    </button>
                    {!isSelf && (
                      <button className="link-button" onClick={() => remove(u)}>
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>Add a team member</h2>
        <form className="inline-form" onSubmit={add}>
          <input
            placeholder="Username"
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Temporary password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" className="primary">Add user</button>
        </form>
        <p className="muted hint">
          Usernames: 3-32 characters (letters, numbers, dot, dash, underscore). Passwords: at
          least 8 characters.
        </p>
      </section>
    </div>
  );
}