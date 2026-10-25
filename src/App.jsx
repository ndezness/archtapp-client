import { Routes, Route } from "react-router-dom";
import Dock from "./components/Dock";
import Projects from "./views/Projects";
import Clients from "./views/Clients";
import NewClient from "./views/NewClient";
import NewProject from "./views/NewProject";
import ProjectDetail from "./views/ProjectDetail";
import Dashboard from "./views/Dashboard";
import WorkItems from "./views/WorkItems";
import NewWorkItem from "./views/NewWorkItem";
import Actions from "./views/Actions";

export default function App() {
  return (
    <div className="app">
      <Dock />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/site-visits" element={<WorkItems type="site_visit" title="Site Visits" newPath="/site-visits/new" newLabel="+ Schedule site visit" empty="No site visits scheduled." />} />
          <Route path="/site-visits/new" element={<NewWorkItem type="site_visit" />} />
          <Route path="/tasks" element={<WorkItems type="task" title="Tasks" newPath="/tasks/new" newLabel="+ New task" empty="No tasks yet." />} />
          <Route path="/tasks/new" element={<NewWorkItem type="task" />} />
          <Route path="/actions" element={<Actions />} />
        </Routes>
      </main>
    </div>
  );
}