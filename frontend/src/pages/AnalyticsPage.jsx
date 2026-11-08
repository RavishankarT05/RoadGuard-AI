import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Building2,
  Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import { fetchAnalytics, fetchRoads, getExportUrl } from '../services/api';

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for report export
  const [selectedRoad, setSelectedRoad] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, roadsData] = await Promise.all([
        fetchAnalytics(),
        fetchRoads()
      ]);
      setData(analyticsData);
      setRoads(roadsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Aggregating municipal road analytics...</p>
      </div>
    );
  }

  const handleExport = (format) => {
    const url = getExportUrl(format, selectedRoad, selectedSeverity, selectedStatus);
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Export Suite */}
      <div className="bg-navy-900 p-6 rounded-2xl border border-navy-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Audit & Analytical Reporting Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Municipal Pavement Health Analytics & Reports
          </h2>
          <p className="text-xs text-slate-400 max-w-xl mt-1 leading-relaxed">
            Multi-corridor cross-sectional analysis, repair completion rates, and official PDF/CSV documentation exports.
          </p>
        </div>

        {/* Export Center Box */}
        <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official Export Center</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Live SQL Ingest</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRoad}
              onChange={(e) => setSelectedRoad(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Corridors</option>
              {roads.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800">
          <span className="text-xs text-slate-400 block mb-1">Total Potholes Tracked</span>
          <span className="text-2xl font-bold font-mono text-white">{data.total_potholes}</span>
          <span className="text-[11px] text-cyan-400 block mt-1">Across Monitored Roads</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800">
          <span className="text-xs text-slate-400 block mb-1">Repair Completion Rate</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{data.completion_rate}%</span>
          <span className="text-[11px] text-emerald-400/80 block mt-1">Patched or Verified</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800">
          <span className="text-xs text-slate-400 block mb-1">Corridors Analyzed</span>
          <span className="text-2xl font-bold font-mono text-cyan-400">{roads.length}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Highways & Arterials</span>
        </div>

        <div className="bg-navy-900 p-4 rounded-xl border border-navy-800">
          <span className="text-xs text-slate-400 block mb-1">Facility Risk Zones</span>
          <span className="text-2xl font-bold font-mono text-amber-400">{data.facility_risk_breakdown?.length || 0}</span>
          <span className="text-[11px] text-amber-400/80 block mt-1">Hospitals, Schools, Transit</span>
        </div>
      </div>

      {/* Road-wise Statistics Chart */}
      <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Corridor Defect & Repair Comparison</h3>
            <p className="text-xs text-slate-400">Total detected vs critical defects vs completed repairs by road</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-navy-950 px-2.5 py-1 rounded-lg border border-navy-800">
            Top 10 Corridors
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.road_statistics || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="road_name" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="total_defects" name="Total Defects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="critical_defects" name="Critical Defects" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="repaired_defects" name="Repaired" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Facility Risk Analysis & Road Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Facility Hazards */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Public Facility Risk Analysis</h3>
            <p className="text-xs text-slate-400">Potholes situated adjacent to high-vulnerability public hubs</p>
          </div>
          <div className="space-y-3">
            {(data.facility_risk_breakdown || []).map((f, i) => (
              <div key={i} className="bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{f.facility}</span>
                <span className="font-mono font-bold text-cyan-400 bg-navy-900 px-2 py-0.5 rounded border border-navy-700">
                  {f.count} defect(s)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Road Corridor Register */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Corridor Maintenance Priority Table</h3>
            <p className="text-xs text-slate-400">Ranked by pending defects and average priority index</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 bg-navy-950/60 text-slate-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Road Corridor</th>
                  <th className="py-2.5 px-3 text-center">Total</th>
                  <th className="py-2.5 px-3 text-center">Critical</th>
                  <th className="py-2.5 px-3 text-center">Pending</th>
                  <th className="py-2.5 px-3 text-center">Repaired</th>
                  <th className="py-2.5 px-3 text-right">Avg Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 text-slate-300">
                {(data.road_statistics || []).map((r, i) => (
                  <tr key={i} className="hover:bg-navy-850/60">
                    <td className="py-2.5 px-3 font-sans font-medium text-white max-w-[200px] truncate">
                      {r.road_name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{r.total_defects}</td>
                    <td className="py-2.5 px-3 text-center text-rose-400 font-bold">{r.critical_defects}</td>
                    <td className="py-2.5 px-3 text-center text-amber-400">{r.pending_defects}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{r.repaired_defects}</td>
                    <td className="py-2.5 px-3 text-right text-cyan-400 font-bold">{r.avg_priority} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

