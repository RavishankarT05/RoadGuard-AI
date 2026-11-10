import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { fetchHealth } from './services/api';

// Code-split route components to eliminate massive initial bundle & speed up homepage load
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DetectPage = lazy(() => import('./pages/DetectPage').then(m => ({ default: m.DetectPage })));
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const PotholesPage = lazy(() => import('./pages/PotholesPage').then(m => ({ default: m.PotholesPage })));
const RepairsPage = lazy(() => import('./pages/RepairsPage').then(m => ({ default: m.RepairsPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then(m => ({ default: m.AssistantPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function RouteLoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400" />
        <span className="font-mono text-xs text-slate-400">Loading Municipal Intelligence Module...</span>
      </div>
    </div>
  );
}

export default function App() {
  // Silent background pre-warm ping: wakes up cloud backend during dormancy
  useEffect(() => {
    fetchHealth().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingSkeleton />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

