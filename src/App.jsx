import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import Dock from "./components/Dock";
import AuthScreen from "./views/AuthScreen";
import Dashboard from "./views/Dashboard";
import Leads from "./views/Leads";
import NewLead from "./views/NewLead";
import LeadDetail from "./views/LeadDetail";
import Projects from "./views/Projects";
import ProjectDetail from "./views/ProjectDetail";
import Clients from "./views/Clients";
import ClientDetail from "./views/ClientDetail";
import WorkItems from "./views/WorkItems";
import NewWorkItem from "./views/NewWorkItem";
import Actions from "./views/Actions";
import Team from "./views/Team";
import Account from "./views/Account";

export default function App() {
  const { ready, session, isAdmin } = useAuth();

  if (!ready) return <p className="muted pad">Loading...</p>;
  if (!session) return <AuthScreen />;

  return (
    <div className="app">
      <Dock />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/new" element={<NewLead />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route
            path="/site-visits"
            element={
              <WorkItems
                type="site_visit"
                title="Site Visits"
                newPath="/site-visits/new"
                newLabel="+ Schedule site visit"
                empty="No site visits scheduled."
              />
            }
          />
          <Route path="/site-visits/new" element={<NewWorkItem type="site_visit" />} />
          <Route
            path="/tasks"
            element={
              <WorkItems
                type="task"
                title="Tasks"
                newPath="/tasks/new"
                newLabel="+ New task"
                empty="No tasks yet."
              />
            }
          />
          <Route path="/tasks/new" element={<NewWorkItem type="task" />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/account" element={<Account />} />
          <Route path="/team" element={isAdmin ? <Team /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}