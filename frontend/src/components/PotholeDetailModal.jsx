import React from 'react';
import { X, Calendar, MapPin, AlertTriangle, Shield, CheckCircle2, Clock, Wrench, FileText, ExternalLink } from 'lucide-react';
import { SeverityBadge, PriorityBadge, StatusBadge } from './SeverityBadge';
import { getImageUrl } from '../services/api';

export function PotholeDetailModal({ pothole, onClose, onOpenRepairModal, onOpenOverrideModal }) {
  if (!pothole) return null;

  let breakdown = {};
  try {
    breakdown = JSON.parse(pothole.priority_breakdown || '{}');
  } catch (e) {
    breakdown = {};
  }

  const annotatedImgUrl = getImageUrl(pothole.image_annotated_path);
  const originalImgUrl = getImageUrl(pothole.image_original_path);
  const afterImgUrl = getImageUrl(pothole.image_after_path);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700 w-full max-w-4xl rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-850">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg text-white bg-navy-800 px-3 py-1 rounded-lg border border-navy-700">
              {pothole.pothole_code}
            </span>
            <SeverityBadge severity={pothole.severity} size="lg" />
            <PriorityBadge score={pothole.priority_score} category={pothole.priority_category} />
            <StatusBadge status={pothole.repair_status} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 block mb-1">Road Corridor</span>
              <span className="font-semibold text-white text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                {pothole.road_name}
              </span>
              <span className="text-xs text-slate-400 block mt-1 font-mono">
                Lat: {pothole.latitude?.toFixed(4)}, Lng: {pothole.longitude?.toFixed(4)}
              </span>
            </div>

            <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 block mb-1">Environmental Risk</span>
              <span className="font-semibold text-white text-sm block">
                Traffic: <span className="text-cyan-300">{pothole.traffic_importance}</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Facility: {pothole.nearby_facility || 'None'} ({pothole.facility_risk || 'None'} Risk)
              </span>
            </div>

            <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 block mb-1">Detection Metrology</span>
              <span className="font-semibold text-white text-sm block">
                Model: <span className="text-emerald-400 font-mono text-xs">{pothole.detected_by || 'YOLOv8'}</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Confidence: <strong className="text-white">{(pothole.detection_confidence * 100).toFixed(1)}%</strong> | Area: {(pothole.estimated_area_ratio * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Action Recommendation Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-navy-900 border border-cyan-800/40 p-4 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 block mb-0.5">
                Municipal Action Directive
              </span>
              <p className="text-sm text-slate-200">{pothole.recommended_action || 'Deploy inspection team to confirm pavement status.'}</p>
              {pothole.severity_reason && (
                <p className="text-xs text-slate-400 mt-2 italic bg-navy-950/50 p-2 rounded border border-navy-800">
                  {pothole.severity_reason}
                </p>
              )}
            </div>
          </div>

          {/* Image Previews */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Photographic Evidence & AI Annotations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
                <span className="text-xs text-slate-400 block mb-2 font-mono">Annotated Bounding Box (YOLO)</span>
                {annotatedImgUrl ? (
                  <img
                    src={annotatedImgUrl}
                    alt="AI Annotated Road Defect"
                    className="w-full h-56 object-cover rounded-lg border border-navy-700"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg bg-navy-900 border border-navy-800 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500/60" />
                    <span>Synthetically recorded / No visual render attached</span>
                  </div>
                )}
              </div>

              <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
                <span className="text-xs text-slate-400 block mb-2 font-mono">Original Road Scene / Repair Verification</span>
                {afterImgUrl ? (
                  <img
                    src={afterImgUrl}
                    alt="After Repair Patch"
                    className="w-full h-56 object-cover rounded-lg border border-emerald-500/40"
                  />
                ) : originalImgUrl ? (
                  <img
                    src={originalImgUrl}
                    alt="Original Road Scene"
                    className="w-full h-56 object-cover rounded-lg border border-navy-700"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg bg-navy-900 border border-navy-800 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <CheckCircle2 className="w-6 h-6 text-cyan-500/60" />
                    <span>Baseline survey image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority Score Breakdown Formula */}
          {breakdown.total_score !== undefined && (
            <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Priority Index Scoring Calculation (0 - 100)</span>
                <span className="text-cyan-400 font-mono text-sm font-bold">{breakdown.total_score} pts</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(breakdown).map(([key, item]) => {
                  if (key === 'total_score' || typeof item !== 'object') return null;
                  return (
                    <div key={key} className="bg-navy-900 p-2.5 rounded-lg border border-navy-800">
                      <span className="text-[11px] text-slate-400 block truncate">{item.label}</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        +{item.points} <span className="text-[10px] text-slate-400 font-normal">/ {item.max}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Repair Assignments & Contractors */}
          {pothole.assignments && pothole.assignments.length > 0 && (
            <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Contractor & Engineering Deployment</span>
              </h4>
              {pothole.assignments.map((assign, idx) => (
                <div key={idx} className="bg-navy-900 p-3 rounded-lg border border-navy-800 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-white text-sm">{assign.contractor_name}</span>
                      <span className="text-slate-400 block text-[11px]">In Charge: {assign.officer_in_charge} ({assign.contact_number})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/20">
                      Method: {assign.repair_method}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    <strong>Materials:</strong> {assign.materials_used} | <strong>Cost:</strong> ₹{assign.actual_cost || assign.estimated_cost || 0}
                  </div>
                  {assign.notes && <p className="text-slate-400 italic text-[11px]">Note: "{assign.notes}"</p>}
                </div>
              ))}
            </div>
          )}

          {/* Audit History Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Immutable Lifecycle Audit Log</span>
            </h4>
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-700">
              {(pothole.history || []).map((h, i) => (
                <div key={i} className="flex items-start gap-4 text-xs relative pl-8">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-navy-900"></div>
                  <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-200">
                        {h.change_type.toUpperCase()}: <span className="text-cyan-400">{h.new_status || 'Updated'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300">{h.remarks}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">Logged by: {h.changed_by}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-navy-800 bg-navy-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenOverrideModal(pothole)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 transition-colors"
            >
              Authority Priority Override
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onOpenRepairModal(pothole)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Update Repair Lifecycle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

