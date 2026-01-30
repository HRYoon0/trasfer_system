import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Vacancies from './pages/Vacancies';
import External from './pages/External';
import Internal from './pages/Internal';
import Assignment from './pages/Assignment';
import Settings from './pages/Settings';
import Documents from './pages/Documents';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="schools" element={<Schools />} />
          <Route path="vacancies" element={<Vacancies />} />
          <Route path="external" element={<External />} />
          <Route path="internal" element={<Internal />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="documents" element={<Documents />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
