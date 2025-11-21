import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WidgetPage } from './pages/WidgetPage';
import { ThemeProvider } from './components/ui/theme-provider';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="widget">
      <HashRouter>
        <Routes>
          <Route path="/widget/:propertyId" element={<WidgetPage />} />
          {/* Default redirect to a sample property */}
          <Route path="/" element={<Navigate to="/widget/p1" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;