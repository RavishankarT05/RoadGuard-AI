import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DetectPage } from './pages/DetectPage';
import { MapPage } from './pages/MapPage';
import { PotholesPage } from './pages/PotholesPage';
import { RepairsPage } from './pages/RepairsPage';
import { AssistantPage } from './pages/AssistantPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="detect" element={<DetectPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="potholes" element={<PotholesPage />} />
          <Route path="repairs" element={<RepairsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

