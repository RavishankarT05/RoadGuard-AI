import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Eye,
  Calendar,
  Building2
} from 'lucide-react';
import { fetchPotholes, getImageUrl } from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/SeverityBadge';
import { RepairActionModal } from '../components/RepairActionModal';
import { PotholeDetailModal } from '../components/PotholeDetailModal';
import { PriorityOverrideModal } from '../components/PriorityOverrideModal';

export function RepairsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Modals
  const [repairPothole, setRepairPothole] = useState(null);
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [overridePothole, setOverridePothole] = useState(null);

  const stages = [
    { key: 'all', label: 'All Operations' },
    { key: 'Detected', label: '1. Detected' },
    { key: 'Reported', label: '2. Reported' },
    { key: 'Assigned', label: '3. Assigned' },
    { key: 'In Progress', label: '4. In Progress' },
    { key: 'Repaired', label: '5. Repaired' },
    { key: 'Verified', label: '6. Verified' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPotholes({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50
      });
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Aggregate metrics
  const total = items.length;
  const inProgressCount = items.filter((i) => i.repair_status === 'In Progress').length;
  const assignedCount = items.filter((i) => i.repair_status === 'Assigned').length;
  const verifiedCount = items.filter((i) => i.repair_status === 'Verified').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & KPI Summary */}
      <div className="bg-navy-900 p-6 rounded-2xl border border-navy-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4" />
              <span>Civil Maintenance & Contract Operations</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pavement Repair Lifecycle & Contractor SLA Tracking
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Monitor work orders across the 6-stage municipal lifecycle:
              <span className="text-cyan-300 font-medium"> Detected → Reported → Assigned → In Progress → Repaired → Verified</span>.
            </p>
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-navy-800">
          {stages.map((stage) => (
            <button
              key={stage.key}
              onClick={() => setActiveTab(stage.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === stage.key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'bg-navy-950 text-slate-400 hover:text-slate-200 hover:bg-navy-800 border border-navy-800'
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Work Order Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Loading repair work orders...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-navy-900 p-12 rounded-2xl border border-navy-800 text-center text-slate-400">
          No repair tasks found in the <strong>{activeTab}</strong> stage.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-navy-900 rounded-2xl border border-navy-800 shadow-xl overflow-hidden hover:border-navy-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Card Bar */}
                <div className="p-4 border-b border-navy-800 flex items-center justify-between bg-navy-950/40">
                  <span className="font-mono font-bold text-xs text-cyan-400 bg-navy-900 px-2 py-0.5 rounded border border-navy-700">
                    {item.pothole_code}
                  </span>
                  <StatusBadge status={item.repair_status} size="sm" />
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <h4 className="font-semibold text-white text-sm truncate" title={item.road_name}>
                      {item.road_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.location_description || 'Surface asphalt cavity'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={item.severity} size="sm" />
                    <PriorityBadge score={item.priority_score} category={item.priority_category} />
                  </div>

                  {/* Contractor info snippet if assigned */}
                  <div className="bg-navy-950/70 p-3 rounded-xl border border-navy-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        <span>Contractor:</span>
                      </span>
                      <span className="text-slate-200 font-medium">
                        {item.assignments?.[0]?.contractor_name || 'Municipal Roads Dept'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>Detected:</span>
                      </span>
                      <span className="text-slate-200 font-mono">
                        {new Date(item.detection_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 border-t border-navy-800 bg-navy-950/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedPothole(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-navy-800 hover:bg-navy-700 border border-navy-700 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Audit Log</span>
                </button>
                <button
                  onClick={() => setRepairPothole(item)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Advance Stage</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {repairPothole && (
        <RepairActionModal
          pothole={repairPothole}
          onClose={() => setRepairPothole(null)}
          onSuccess={loadData}
        />
      )}

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

