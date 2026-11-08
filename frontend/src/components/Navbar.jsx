import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, RefreshCw, Cpu, Database, CheckCircle2 } from 'lucide-react';
import { seedDemoData } from '../services/api';

export function Navbar({ onDataMutated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [timeStr, setTimeStr] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickSeed = async () => {
    try {
      setIsSeeding(true);
      await seedDemoData(true);
      setSeedSuccess(true);
      if (onDataMutated) onDataMutated();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Executive Pavement Intelligence Dashboard';
      case '/detect': return 'AI Vision Pothole Detection & Inference';
      case '/map': return 'Geographic Information System (GIS) Pothole Map';
      case '/potholes': return 'Municipal Road Defect & Pothole Registry';
      case '/repairs': return 'Pavement Repair Operations & SLA Tracking';
      case '/assistant': return 'RoadGuard Local Maintenance Assistant';
      case '/analytics': return 'Municipal Pavement Health Analytics & Reports';
      case '/settings': return 'System Architecture & YOLO Model Settings';
      default: return 'RoadGuard AI Operations';
    }
  };

  return (
    <header className="h-16 bg-navy-900 border-b border-navy-800 px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white tracking-wide">{getPageTitle()}</h1>
        <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40">
          <Database className="w-3 h-3" /> SQLite Local DB
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Municipal Clock */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-mono text-slate-300 font-medium">{timeStr}</span>
          <span className="text-[10px] text-slate-400">Municipal Traffic Command</span>
        </div>

        {/* Neural Engine Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-navy-800/90 border border-navy-700 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">YOLO:</span>
          <span className="text-cyan-300 font-medium">yolov8n.pt</span>
        </div>

        {/* Demo Seed Data Quick Action */}
        <button
          onClick={handleQuickSeed}
          disabled={isSeeding}
          title="Reset & populate realistic municipal pothole demo data"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Seeding...' : seedSuccess ? 'Data Seeded!' : 'Seed Demo Data'}</span>
        </button>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/detect')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Run AI Detection</span>
        </button>
      </div>
    </header>
  );
}

