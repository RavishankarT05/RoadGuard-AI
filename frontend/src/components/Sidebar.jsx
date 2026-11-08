import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  MapPin,
  ListFilter,
  Wrench,
  Bot,
  BarChart3,
  Settings,
  Shield,
  Activity
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/detect', label: 'AI Pothole Detection', icon: Camera, badge: 'YOLOv8' },
    { to: '/map', label: 'Interactive GIS Map', icon: MapPin },
    { to: '/potholes', label: 'Pothole Registry', icon: ListFilter },
    { to: '/repairs', label: 'Repair Operations', icon: Wrench },
    { to: '/assistant', label: 'Local AI Assistant', icon: Bot, badge: 'Offline' },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/settings', label: 'Settings & Model', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 flex flex-col justify-between shrink-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-navy-800 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-wide">RoadGuard</span>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">Smart City Road Monitoring</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-navy-800 text-cyan-300 border border-navy-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Status Footprint */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/40 m-2 rounded-xl border">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-medium text-slate-300">Local Neural Engine</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Ultralytics YOLO inference running on CPU/CUDA. Zero cloud reliance.
        </p>
      </div>
    </aside>
  );
}

