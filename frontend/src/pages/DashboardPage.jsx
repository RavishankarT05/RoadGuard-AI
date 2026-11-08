import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Layers,
  Wrench
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import { fetchDashboardStats, getImageUrl } from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/SeverityBadge';
import { PotholeDetailModal } from '../components/PotholeDetailModal';
import { RepairActionModal } from '../components/RepairActionModal';
import { PriorityOverrideModal } from '../components/PriorityOverrideModal';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [repairPothole, setRepairPothole] = useState(null);
  const [overridePothole, setOverridePothole] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load live dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Querying municipal road telemetry database...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl text-rose-300">
          <h3 className="font-semibold text-lg mb-2">Connection Error</h3>
          <p className="text-sm">{error || 'Could not connect to FastAPI backend server.'}</p>
          <button
            onClick={loadStats}
            className="mt-4 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Chart data formatting
  const severityColors = {
    Critical: '#f43f5e',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#10b981',
  };

  const severityChartData = Object.entries(stats.severity_distribution || {}).map(([key, val]) => ({
    name: key,
    value: val,
    color: severityColors[key] || '#94a3b8',
  }));

  const priorityChartData = Object.entries(stats.priority_distribution || {}).map(([key, val]) => ({
    category: key,
    count: val,
  }));

  const statusChartData = Object.entries(stats.status_distribution || {}).map(([key, val]) => ({
    status: key,
    count: val,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Municipal Road Health Score */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 p-6 rounded-2xl border border-navy-800 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Smart City Municipal Operations • Real-time SQLite Feed</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            City Road Pavement Quality & Defect Index
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Continuous surveillance monitoring powered by local YOLO vision inference.
            Real-time optical severity calculations, priority scoring, and municipal dispatch workflows.
          </p>
        </div>

        {/* Circular Pavement Health Gauge Card */}
        <div className="flex items-center gap-5 bg-navy-950/80 px-6 py-4 rounded-xl border border-navy-800/80 shrink-0">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-navy-800 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${stats.road_health_score >= 80 ? 'text-emerald-500' : stats.road_health_score >= 60 ? 'text-amber-500' : 'text-rose-500'
                  } stroke-current transition-all duration-1000 ease-out`}
                strokeDasharray={`${stats.road_health_score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-lg font-bold text-white font-mono">{stats.road_health_score}</span>
              <span className="text-[9px] text-slate-400 block -mt-1 font-mono">%</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Pavement Health Index</span>
            <span className={`text-sm font-bold ${stats.road_health_score >= 80 ? 'text-emerald-400' : stats.road_health_score >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
              {stats.road_health_score >= 80 ? 'Optimal Condition' : stats.road_health_score >= 60 ? 'Moderate Wear' : 'Urgent Repair Needed'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Across {stats.total_roads_monitored} corridors</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 col-span-2">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Defects</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.total_potholes}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Surveilled Potholes</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 col-span-2">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Critical Potholes</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{stats.critical_potholes}</div>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Immediate Hazard</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 col-span-2">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">High Priority</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-400">{stats.high_priority_potholes}</div>
          <span className="text-[11px] text-orange-400/80 mt-1 block">24-48h Dispatch</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 col-span-2">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Repaired & Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.repaired_potholes}</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Completed Patches</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Detection Trend */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Detection Activity Trend</h3>
              <p className="text-xs text-slate-400">Potholes identified by AI over past surveillance cycle</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-navy-800 text-cyan-400 text-xs font-mono border border-navy-700">
              Live Feed
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weekly_detections || []}>
                <defs>
                  <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" name="Detections" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDetections)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown Donut */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Defect Severity Ratio</h3>
            <p className="text-xs text-slate-400">Classified by relative surface area & confidence</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {severityChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Priority & Repair Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Tier Distribution */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Maintenance Priority Distribution</h3>
            <p className="text-xs text-slate-400">Weighted scores (Severity + Traffic + Hospital/School Risks)</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }} />
                <Bar dataKey="count" name="Potholes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repair Lifecycle Pipeline */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Operational Repair Pipeline</h3>
            <p className="text-xs text-slate-400">Pothole lifecycle stages from detection to engineering sign-off</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="status" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }} />
                <Bar dataKey="count" name="Potholes" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Detection Activity Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-navy-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Pothole Detections</h3>
            <p className="text-xs text-slate-400">Live surveillance log from SQLite database</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing top {stats.recent_activity?.length || 0} latest
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/50 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Pothole ID</th>
                <th className="py-3 px-4 font-semibold">Corridor</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Facility Risk</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {(stats.recent_activity || []).map((pothole) => (
                <tr key={pothole.id} className="hover:bg-navy-850/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                    {pothole.pothole_code}
                  </td>
                  <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                    {pothole.road_name}
                  </td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={pothole.severity} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge score={pothole.priority_score} category={pothole.priority_category} />
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {pothole.nearby_facility && pothole.nearby_facility !== 'None' ? (
                      <span className="text-amber-400">{pothole.nearby_facility}</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={pothole.repair_status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPothole(pothole)}
                      className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-slate-200 hover:text-white border border-navy-700 transition-colors font-medium text-[11px]"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialogs */}
      {selectedPothole && (
        <PotholeDetailModal
          pothole={selectedPothole}
          onClose={() => setSelectedPothole(null)}
          onOpenRepairModal={(p) => {
            setSelectedPothole(null);
            setRepairPothole(p);
          }}
          onOpenOverrideModal={(p) => {
            setSelectedPothole(null);
            setOverridePothole(p);
          }}
        />
      )}

      {repairPothole && (
        <RepairActionModal
          pothole={repairPothole}
          onClose={() => setRepairPothole(null)}
          onSuccess={loadStats}
        />
      )}

      {overridePothole && (
        <PriorityOverrideModal
          pothole={overridePothole}
          onClose={() => setOverridePothole(null)}
          onSuccess={loadStats}
        />
      )}
    </div>
  );
}

