import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Logo from "./Logo";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/clients", label: "Clients" },
  { to: "/site-visits", label: "Site Visits" },
  { to: "/tasks", label: "Tasks" },
  { to: "/actions", label: "Actions" },
];

export default function Dock() {
  const go = useNavigate();
  const { session, isAdmin, signOut } = useAuth();
  const items = isAdmin ? [...navItems, { to: "/team", label: "Team" }] : navItems;

  return (
    <aside className="dock">
      <div className="dock-brand">
        <Logo size={34} />
        <span>ArchtApp</span>
      </div>

      <section>
        <h4 className="dock-heading">Quick actions</h4>
        <button className="quick" onClick={() => go("/projects/new")}>+ New Project</button>
        <button className="quick" onClick={() => go("/tasks/new")}>+ New Task</button>
        <button className="quick" onClick={() => go("/clients/new")}>+ New Client</button>
      </section>

      <nav>
        <h4 className="dock-heading">Navigate</h4>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="dock-footer">
        <div className="dock-user">Signed in as</div>
        <NavLink
          to="/account"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          {session.username} ({session.role})
        </NavLink>
        <button className="signout" onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}