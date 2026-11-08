import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit,
  Eye,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { fetchPotholes, deletePothole, updatePothole } from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/SeverityBadge';
import { PotholeDetailModal } from '../components/PotholeDetailModal';
import { RepairActionModal } from '../components/RepairActionModal';
import { PriorityOverrideModal } from '../components/PriorityOverrideModal';

export function PotholesPage() {
  const [potholes, setPotholes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [repairPothole, setRepairPothole] = useState(null);
  const [overridePothole, setOverridePothole] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [editCandidate, setEditCandidate] = useState(null);

  // Edit form state
  const [editRoadName, setEditRoadName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editTraffic, setEditTraffic] = useState('High');
  const [editFacility, setEditFacility] = useState('None');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPotholes({
        search,
        severity: severityFilter,
        priority: priorityFilter,
        status: statusFilter,
        sortBy,
        skip: (page - 1) * limit,
        limit
      });
      setPotholes(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [severityFilter, priorityFilter, statusFilter, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deletePothole(deleteCandidate.id);
      setDeleteCandidate(null);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleOpenEdit = (p) => {
    setEditCandidate(p);
    setEditRoadName(p.road_name);
    setEditLat(p.latitude);
    setEditLng(p.longitude);
    setEditTraffic(p.traffic_importance);
    setEditFacility(p.nearby_facility || 'None');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editCandidate) return;
    try {
      await updatePothole(editCandidate.id, {
        road_name: editRoadName,
        latitude: parseFloat(editLat),
        longitude: parseFloat(editLng),
        traffic_importance: editTraffic,
        nearby_facility: editFacility
      });
      setEditCandidate(null);
      loadData();
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls & Search Bar */}
      <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Pothole Defect Master Registry
            </h2>
            <p className="text-xs text-slate-400">
              Query, audit, edit, and manage detected road hazards across the municipal network
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-800/40 shrink-0">
            {total} Total Records Registered
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, road, facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </form>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Priority Tier */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Priority Tiers</option>
            <option value="Critical">Critical (80-100)</option>
            <option value="High">High (60-79)</option>
            <option value="Medium">Medium (40-59)</option>
            <option value="Low">Low (0-39)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Detected">Detected</option>
            <option value="Reported">Reported</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Repaired">Repaired</option>
            <option value="Verified">Verified</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
          >
            <option value="date_desc">Newest Detection First</option>
            <option value="date_asc">Oldest Detection First</option>
            <option value="priority_desc">Highest Priority First</option>
            <option value="priority_asc">Lowest Priority First</option>
            <option value="severity_desc">Highest Severity First</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Pothole Code</th>
                <th className="py-3.5 px-4 font-semibold">Road Corridor</th>
                <th className="py-3.5 px-4 font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Confidence</th>
                <th className="py-3.5 px-4 font-semibold">Coordinates (Lat, Lng)</th>
                <th className="py-3.5 px-4 font-semibold">Date Logged</th>
                <th className="py-3.5 px-4 font-semibold">Repair Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : potholes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No pothole records match the selected query criteria.
                  </td>
                </tr>
              ) : (
                potholes.map((item) => (
                  <tr key={item.id} className="hover:bg-navy-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                      {item.pothole_code}
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-[180px] truncate" title={item.road_name}>
                      {item.road_name}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={item.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge score={item.priority_score} category={item.priority_category} />
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {(item.detection_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(item.detection_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.repair_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPothole(item)}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Record"
                          className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          onClick={() => setRepairPothole(item)}
                          title="Repair Workflow"
                          className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(item)}
                          title="Delete Record"
                          className="p-1.5 rounded-lg bg-navy-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total potholes)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Record Modal */}
      {editCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-navy-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-navy-800 pb-3">
              <h3 className="font-semibold text-white text-sm">Edit Record: {editCandidate.pothole_code}</h3>
              <button onClick={() => setEditCandidate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Road Name</label>
                <input
                  type="text"
                  value={editRoadName}
                  onChange={(e) => setEditRoadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Traffic Importance</label>
                  <select
                    value={editTraffic}
                    onChange={(e) => setEditTraffic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nearby Facility</label>
                  <select
                    value={editFacility}
                    onChange={(e) => setEditFacility(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Hospital">Hospital</option>
                    <option value="School">School</option>
                    <option value="Transit Hub">Transit Hub</option>
                    <option value="Market">Market</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setEditCandidate(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-navy-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Confirm Deletion</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete defect <strong className="text-rose-400 font-mono">{deleteCandidate.pothole_code}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail, Repair, and Override Modals */}
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
          onSuccess={loadData}
        />
      )}

      {overridePothole && (
        <PriorityOverrideModal
          pothole={overridePothole}
          onClose={() => setOverridePothole(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

