import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin';
import Buffer from './pages/Buffer';
import ClientIndex from './pages/ClientIndex';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/autopay" element={<Admin />} />
        <Route path="/buffer" element={<Buffer />} />
        <Route path="/index" element={<ClientIndex />} />
        <Route path="/" element={<Navigate to="/autopay" replace />} />
      </Routes>
    </HashRouter>
  );
};
export default App;