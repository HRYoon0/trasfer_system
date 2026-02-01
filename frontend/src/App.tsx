import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Priority from './pages/Priority';
import Vacancies from './pages/Vacancies';
import ExternalIn from './pages/ExternalIn';
import Internal from './pages/Internal';
import Statistics from './pages/Statistics';
import DataEntry from './pages/DataEntry';
import Settings from './pages/Settings';
import Documents from './pages/Documents';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="schools" element={<Schools />} />
          <Route path="priority" element={<Priority />} />
          <Route path="vacancies" element={<Vacancies />} />
          <Route path="external-in" element={<ExternalIn />} />
          <Route path="internal" element={<Internal />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="documents" element={<Documents />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
