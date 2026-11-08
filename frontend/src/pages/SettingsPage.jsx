import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Database,
  Upload,
  Download,
  RefreshCw,
  HardDrive,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Users
} from 'lucide-react';
import {
  fetchHealth,
  fetchModelSettings,
  uploadModelWeights,
  seedDemoData,
  getBackupUrl
} from '../services/api';

export function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [modelSettings, setModelSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Model upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');

  // Seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [h, m] = await Promise.all([
        fetchHealth(),
        fetchModelSettings()
      ]);
      setHealth(h);
      setModelSettings(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWeightUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadMsg('');
    setUploadErr('');

    try {
      const res = await uploadModelWeights(uploadFile);
      setUploadMsg(res.message || 'Model weights updated successfully!');
      setUploadFile(null);
      loadData();
    } catch (err) {
      setUploadErr(err.message || 'Failed to upload custom weights.');
    } finally {
      setUploading(false);
    }
  };

  const handleSeedReset = async () => {
    if (!window.confirm('Reset database and re-seed 15+ realistic municipal road defects?')) return;
    setSeeding(true);
    setSeedMsg('');
    try {
      await seedDemoData(true);
      setSeedMsg('Database successfully re-seeded with realistic municipal defects!');
      loadData();
      setTimeout(() => setSeedMsg(''), 4000);
    } catch (err) {
      alert('Seed failed: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading || !health || !modelSettings) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading system configurations...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-navy-900 p-6 rounded-2xl border border-navy-800 shadow-xl">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>System Administration & Model Management</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          RoadGuard AI Architecture & Platform Controls
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
          Manage local YOLO weights, inspect hardware accelerator telemetry, backup SQLite database, and configure automated municipal dispatch rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Neural Vision Model Configuration */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>YOLO Vision Model Engine</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {modelSettings.is_loaded ? 'ONLINE / LOADED' : 'OFFLINE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">Active Weights File</span>
              <span className="font-mono font-bold text-cyan-400 mt-1 block truncate">
                {modelSettings.model_name}
              </span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">File Size on Disk</span>
              <span className="font-mono font-bold text-white mt-1 block">
                {modelSettings.weights_size_mb} MB
              </span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">Inference Hardware</span>
              <span className="font-mono font-bold text-emerald-400 mt-1 block">
                {modelSettings.device_name} ({modelSettings.device.toUpperCase()})
              </span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">Confidence / IoU Threshold</span>
              <span className="font-mono font-bold text-amber-400 mt-1 block">
                {modelSettings.conf_threshold} / {modelSettings.iou_threshold}
              </span>
            </div>
          </div>

          {/* Upload Custom Weights (.pt) */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-3">
            <span className="text-xs font-semibold text-slate-200 block">
              Upload Custom Trained YOLO Weights (.pt)
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upload fine-tuned PyTorch / YOLO weights (e.g. <code>pothole_best.pt</code>).
              The model engine will dynamically load weights without restarting the server.
            </p>

            {uploadMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadMsg}</span>
              </div>
            )}
            {uploadErr && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadErr}</span>
              </div>
            )}

            <form onSubmit={handleWeightUpload} className="flex items-center gap-3">
              <input
                type="file"
                accept=".pt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-800 file:text-cyan-400 hover:file:bg-navy-700 cursor-pointer"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Load Model'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* 2. Database Administration */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>SQLite Pavement Database</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              CONNECTED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">Database Engine</span>
              <span className="font-mono font-bold text-white mt-1 block">SQLite 3</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[11px]">Total Pothole Records</span>
              <span className="font-mono font-bold text-cyan-400 mt-1 block">
                {health.database_potholes_count} records
              </span>
            </div>
          </div>

          {seedMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{seedMsg}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {/* Backup Database */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-navy-800">
              <div>
                <span className="text-xs font-semibold text-white block">Download Database Backup</span>
                <span className="text-[11px] text-slate-400">Save a complete snapshot of roadguard.db</span>
              </div>
              <a
                href={getBackupUrl()}
                download
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Backup DB</span>
              </a>
            </div>

            {/* Seed / Reset Demo Data */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-navy-800">
              <div>
                <span className="text-xs font-semibold text-white block">Seed Demonstration Data</span>
                <span className="text-[11px] text-slate-400">Populate 15+ realistic defects with complete audit logs</span>
              </div>
              <button
                onClick={handleSeedReset}
                disabled={seeding}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                <span>{seeding ? 'Seeding...' : 'Seed Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. System Health & Environment Diagnostics */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white text-sm font-semibold border-b border-navy-800 pb-3">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Environment Diagnostics & Dependencies</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Python Version</span>
              <span className="text-white font-bold mt-1 block">{health.python_version}</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">PyTorch Version</span>
              <span className="text-white font-bold mt-1 block">{health.torch_version}</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Ultralytics YOLO</span>
              <span className="text-white font-bold mt-1 block">{health.ultralytics_version}</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">OpenCV Version</span>
              <span className="text-white font-bold mt-1 block">{health.opencv_version}</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Free Storage</span>
              <span className="text-emerald-400 font-bold mt-1 block">{health.storage_free_mb} MB</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">System Status</span>
              <span className="text-emerald-400 font-bold mt-1 block">100% HEALTHY</span>
            </div>
          </div>
        </div>

        {/* 4. Municipal Roles & Access Control */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white text-sm font-semibold border-b border-navy-800 pb-3">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Municipal Access Roles (Local Identity)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Dr. Rajesh Raman</span>
                <span className="text-slate-400 text-[11px]">Chief Civil Engineer • Municipal HQ</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                ROLE: ADMIN
              </span>
            </div>

            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">S. Ananth</span>
                <span className="text-slate-400 text-[11px]">Senior Patrol Inspector • Zone 1</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                ROLE: INSPECTOR
              </span>
            </div>

            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Apex Infrastructure Crew Chief</span>
                <span className="text-slate-400 text-[11px]">Highway Resurfacing Contractor</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                ROLE: CONTRACTOR
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

