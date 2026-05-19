import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { FunctionalView } from './pages/FunctionalView';
import { DataView } from './pages/DataView';
import { InterfaceView } from './pages/InterfaceView';
import { ProcessFlowView } from './pages/ProcessFlowView';
import { QAView } from './pages/QAView';
import { SettingsView } from './pages/SettingsView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route path="functional" element={<FunctionalView />} />
          <Route path="data" element={<DataView />} />
          <Route path="interface" element={<InterfaceView />} />
          <Route path="process-flow" element={<ProcessFlowView />} />
          <Route path="qa" element={<QAView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
