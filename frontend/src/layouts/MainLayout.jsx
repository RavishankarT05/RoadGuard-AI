import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';

export function MainLayout() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataMutated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-950 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onDataMutated={handleDataMutated} />
        <main className="flex-1 overflow-y-auto">
          <Outlet key={refreshKey} />
        </main>
      </div>
    </div>
  );
}

