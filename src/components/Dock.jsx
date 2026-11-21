import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Logo from "./Logo";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/projects", label: "Projects" },
  { to: "/clients", label: "Clients" },
  { to: "/site-visits", label: "Appointments" },
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
        <Logo size={40} tile />
        <span>ArchtApp</span>
      </div>

      <section>
        <h4 className="dock-heading">Quick actions</h4>
        <button className="quick" onClick={() => go("/leads/new")}>+ New Lead</button>
        <button className="quick" onClick={() => go("/tasks/new")}>+ New Task</button>
        <button className="quick" onClick={() => go("/site-visits/new")}>+ Site Visit</button>
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