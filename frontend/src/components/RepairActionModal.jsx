import React, { useState } from 'react';
import { X, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import { updatePotholeStatus } from '../services/api';

export function RepairActionModal({ pothole, onClose, onSuccess }) {
  const [newStatus, setNewStatus] = useState(pothole?.repair_status || 'Assigned');
  const [changedBy, setChangedBy] = useState('Chief Road Maintenance Engineer');
  const [contractorName, setContractorName] = useState('Apex Infrastructure Ltd.');
  const [officerInCharge, setOfficerInCharge] = useState('Er. Vivek Sharma');
  const [cost, setCost] = useState('4500');
  const [materials, setMaterials] = useState('Dense Bituminous Macadam (DBM) Type 2');
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!pothole) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updatePotholeStatus(pothole.id, {
        new_status: newStatus,
        changed_by: changedBy,
        remarks: remarks || `Status advanced to ${newStatus}.`,
        contractor_name: contractorName,
        officer_in_charge: officerInCharge,
        cost: parseFloat(cost) || 0,
        materials: materials,
        after_image_url: afterImageUrl || null
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update repair status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700 w-full max-w-xl rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden my-8">
        <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-850">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Update Repair Lifecycle</h3>
              <p className="text-xs text-slate-400 font-mono">{pothole.pothole_code} • {pothole.road_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Lifecycle Phase *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="Detected">Stage 1: Detected (AI Flagged)</option>
              <option value="Reported">Stage 2: Reported (Civic Scout Verified)</option>
              <option value="Assigned">Stage 3: Assigned (Contractor Dispatched)</option>
              <option value="In Progress">Stage 4: In Progress (Milling & Compaction)</option>
              <option value="Repaired">Stage 5: Repaired (Patch Completed)</option>
              <option value="Verified">Stage 6: Verified (Quality SLA Certified)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assigned Contractor</label>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supervising Engineer</label>
              <input
                type="text"
                value={officerInCharge}
                onChange={(e) => setOfficerInCharge(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Repair Cost (₹ INR)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Materials Specification</label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              After-Repair Image URL / Path (Optional Verification Photo)
            </label>
            <input
              type="text"
              placeholder="e.g. /outputs/verified_patch_01.jpg or web URL"
              value={afterImageUrl}
              onChange={(e) => setAfterImageUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Audit Remarks / Quality Notes *</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter field observations, compaction roller parameters, or verification notes..."
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-navy-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>Updating...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Status Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

