import { NavLink, useNavigate } from "react-router-dom";

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

  return (
    <aside className="dock">
      <div className="dock-brand">ArchtApp</div>

      <section>
        <h4 className="dock-heading">Quick actions</h4>
        <button className="quick" onClick={() => go("/projects/new")}>+ New Project</button>
        <button className="quick" onClick={() => go("/tasks/new")}>+ New Task</button>
        <button className="quick" onClick={() => go("/clients/new")}>+ New Client</button>
      </section>

      <nav>
        <h4 className="dock-heading">Navigate</h4>
        {navItems.map((item) => (
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
    </aside>
  );
}