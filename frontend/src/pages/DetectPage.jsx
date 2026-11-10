import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Split,
  Crop,
  Sliders,
  X
} from 'lucide-react';
import { detectRoadImage, getImageUrl } from '../services/api';
import { SeverityBadge, PriorityBadge } from '../components/SeverityBadge';

export function DetectPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [roadName, setRoadName] = useState('Central Arterial Expressway');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');
  const [trafficImportance, setTrafficImportance] = useState('High');
  const [nearbyFacility, setNearbyFacility] = useState('Hospital');
  const [facilityRisk, setFacilityRisk] = useState('High');
  const [confThreshold, setConfThreshold] = useState(0.18);
  const [saveToDb, setSaveToDb] = useState(true);

  const [loading, setLoading] = useState(false);
  const [progressPhase, setProgressPhase] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // UI View Controls
  const [viewMode, setViewMode] = useState('annotated'); // 'annotated' | 'original' | 'split'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [activeCrop, setActiveCrop] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
      setZoomLevel(1);
    }
  };

  // Helper to load sample test images from public/samples directory or generated canvas
  const loadDemoSample = async (sampleName) => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      let fetchUrl = '/samples/pothole_critical.jpg';
      let fileName = 'pothole_critical.jpg';
      if (sampleName === 'moderate') {
        fetchUrl = '/samples/pothole_moderate.jpg';
        fileName = 'pothole_moderate.jpg';
      } else if (sampleName === 'clean') {
        fetchUrl = '/samples/road_clean.jpg';
        fileName = 'road_clean.jpg';
      }

      const resp = await fetch(fetchUrl).catch(() => null);
      if (resp && resp.ok) {
        const blob = await resp.blob();
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        createCanvasSample(sampleName);
      }
    } catch (e) {
      createCanvasSample(sampleName);
    } finally {
      setLoading(false);
    }
  };

  const createCanvasSample = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    if (type === 'critical') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 640, 480);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 6;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 480);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(280, 260, 110, 85, Math.PI / 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(285, 265, 75, 55, Math.PI / 10, 0, 2 * Math.PI);
      ctx.fill();
    } else if (type === 'moderate') {
      ctx.fillStyle = '#52525b';
      ctx.fillRect(0, 0, 640, 480);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 480);
      ctx.stroke();

      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(310, 240, 70, 50, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 5;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 640, 480);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 480);
      ctx.stroke();
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], `sample_${type}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }, 'image/jpeg');
  };

  const handleRunInference = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or upload a road image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setProgressPhase('Uploading road image to AI engine...');

    const t1 = setTimeout(() => setProgressPhase('Running YOLOv8 neural defect detection...'), 1200);
    const t2 = setTimeout(() => setProgressPhase('Analyzing pavement geometry & classifying severity...'), 3500);
    const t3 = setTimeout(() => setProgressPhase('Cloud server cold-start in progress... please wait (~15-20s)'), 8000);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('road_name', roadName);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('traffic_importance', trafficImportance);
    formData.append('nearby_facility', nearbyFacility);
    formData.append('facility_risk', facilityRisk);
    formData.append('confidence_threshold', confThreshold);
    formData.append('save_to_database', saveToDb ? 'true' : 'false');

    try {
      const res = await detectRoadImage(formData);
      setResult(res);
      setZoomLevel(1);
    } catch (err) {
      setError(err.message || 'Error occurred while running local YOLO inference.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setLoading(false);
      setProgressPhase('');
    }
  };

  const handleDownloadImage = (urlOrBase64, filename) => {
    if (!urlOrBase64) return;
    const link = document.createElement('a');
    link.href = urlOrBase64;
    link.download = filename || 'pothole_detection.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-navy-900 p-6 rounded-2xl border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Camera className="w-4 h-4" />
            <span>Optimized Computer Vision & Neural Detection</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            AI Pothole & Road Damage Detection Suite
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Multi-scale sliced inference (SAHI), adaptive CLAHE contrast enhancement,
            high-visibility HUD annotations, and automatic extraction of individual damage crops.
          </p>
        </div>

        {/* Quick Sample Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-navy-950 p-2 rounded-xl border border-navy-800">
          <span className="text-[11px] text-slate-400 px-2 font-medium">Quick Ingest:</span>
          <button
            type="button"
            onClick={() => loadDemoSample('critical')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
          >
            Critical Cavity
          </button>
          <button
            type="button"
            onClick={() => loadDemoSample('moderate')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
          >
            Medium Pothole
          </button>
          <button
            type="button"
            onClick={() => loadDemoSample('clean')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
          >
            Clean Surface (0 Defect)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Ingest & Metadata Form */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleRunInference} className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Image Ingest & Road Metrology</span>
            </h3>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                previewUrl ? 'border-cyan-500/50 bg-navy-950/60' : 'border-navy-700 hover:border-cyan-500/40 bg-navy-950/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Uploaded preview"
                    className="w-full h-44 object-cover rounded-lg border border-navy-800"
                  />
                  <span className="text-[11px] text-cyan-400 font-mono block">
                    Click to change selected photograph
                  </span>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-white block">Click or drag road image here</span>
                    <span className="text-[10px] text-slate-400">Supports JPG, JPEG, PNG, WEBP (Any resolution)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Road Corridor Name *</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Traffic Importance</label>
                <select
                  value={trafficImportance}
                  onChange={(e) => setTrafficImportance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Critical">Critical (Expressway)</option>
                  <option value="High">High (Arterial)</option>
                  <option value="Medium">Medium (Collector)</option>
                  <option value="Low">Low (Local Street)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Adjacent Facility</label>
                <select
                  value={nearbyFacility}
                  onChange={(e) => setNearbyFacility(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="None">None</option>
                  <option value="Hospital">Hospital / Trauma Center</option>
                  <option value="School">School / Pedestrian Zone</option>
                  <option value="Transit Hub">Transit / Metro Hub</option>
                  <option value="Market">Market / Commercial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Facility Vulnerability Tier</label>
              <select
                value={facilityRisk}
                onChange={(e) => setFacilityRisk(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
                <option value="None">None</option>
              </select>
            </div>

            {/* Adaptive Confidence / Sensitivity Slider */}
            <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Detection Sensitivity</span>
                <span className="font-mono text-cyan-400 font-semibold">{Math.round(confThreshold * 100)}% Conf</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.45"
                step="0.02"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-navy-900 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>High Sensitivity (10%)</span>
                <span>Balanced (18%)</span>
                <span>Strict (45%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="saveToDb"
                checked={saveToDb}
                onChange={(e) => setSaveToDb(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="saveToDb" className="text-xs text-slate-300 cursor-pointer">
                Persist verified road hazard to SQLite registry
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Optimized Neural Inference...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Optimized YOLO Detection</span>
                </>
              )}
            </button>
          </form>

          {/* Technical Architecture Notes */}
          <div className="bg-navy-950/60 p-4 rounded-xl border border-navy-800 text-xs space-y-1.5 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Multi-Scale Detection Pipeline Active</span>
            </div>
            <p className="leading-relaxed">
              High-resolution frames undergo full-frame & sliced tiled inference with adaptive CLAHE contrast enhancement and Weighted Box Fusion (WBF).
            </p>
          </div>
        </div>

        {/* Right Column: Visual Output & Analysis */}
        <div className="lg:col-span-7 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-Time Processing Status Card (Displays during inference or cold-start) */}
          {loading && (
            <div className="bg-navy-900 rounded-2xl border border-cyan-500/30 shadow-2xl p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-white tracking-wide">
                  {progressPhase || 'Processing Road Image with YOLOv8...'}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Running local neural inference • CLAHE contrast enhancement • Cavity contour analysis
                </p>
              </div>
              <div className="w-full bg-navy-950 h-1.5 rounded-full overflow-hidden border border-navy-800">
                <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {result ? (
            <div className="bg-navy-900 rounded-2xl border border-navy-800 shadow-xl overflow-hidden space-y-5 p-5">
              {/* Detection Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-navy-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Detection Analysis</span>
                    {result.detected ? (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {result.count} Damage Region(s) Identified
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Pavement Clear
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    Inference Latency: <strong>{result.inference_time_ms} ms</strong> • Confidence Avg: <strong>{result.summary?.avg_confidence || 0}%</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {result.saved_pothole_id && (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      Code: #{result.pothole_code}
                    </span>
                  )}
                  {(result.annotated_image_base64 || result.annotated_image_path) && (
                    <button
                      onClick={() => handleDownloadImage(result.annotated_image_base64 || getImageUrl(result.annotated_image_path), `roadguard_annotated_${result.pothole_code || 'defect'}.jpg`)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-navy-700 flex items-center gap-1.5 transition-colors"
                      title="Download Annotated Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download HUD</span>
                    </button>
                  )}
                </div>
              </div>

              {/* View Mode Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-navy-950 p-2 rounded-xl border border-navy-800 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('annotated')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewMode === 'annotated'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-navy-900'
                    }`}
                  >
                    Annotated HUD View
                  </button>
                  <button
                    onClick={() => setViewMode('original')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewMode === 'original'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-navy-900'
                    }`}
                  >
                    Original Scene
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewMode === 'split'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-navy-900'
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                    className="p-1.5 rounded-lg bg-navy-900 text-slate-300 hover:text-white border border-navy-800"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1.5 rounded-lg bg-navy-900 text-slate-300 hover:text-white border border-navy-800"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setLightboxImage(viewMode === 'original' ? (previewUrl || getImageUrl(result.original_image_path)) : (result.annotated_image_base64 || getImageUrl(result.annotated_image_path) || previewUrl))}
                    className="p-1.5 rounded-lg bg-navy-900 text-cyan-400 hover:text-white border border-navy-800 ml-1"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Banner when clear */}
              {!result.detected && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span><strong>Pavement Clear:</strong> AI vision scan verified surface integrity. Zero road hazards detected.</span>
                </div>
              )}

              {/* Main Image Viewport with Zoom */}
              <div className="bg-navy-950 p-2 rounded-xl border border-navy-800 overflow-hidden relative">
                {viewMode === 'split' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">Original Scene</span>
                      <img
                        src={previewUrl || getImageUrl(result.original_image_path)}
                        alt="Original Road"
                        className="w-full h-72 object-cover rounded-lg border border-navy-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-cyan-400 font-mono block mb-1">Annotated Damage Overlay</span>
                      <img
                        src={result.annotated_image_base64 || getImageUrl(result.annotated_image_path) || previewUrl}
                        alt="Annotated Road"
                        className="w-full h-72 object-cover rounded-lg border border-navy-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="overflow-auto max-h-[420px] rounded-lg flex items-center justify-center bg-black/40">
                    <img
                      src={viewMode === 'original' ? (previewUrl || getImageUrl(result.original_image_path)) : (result.annotated_image_base64 || getImageUrl(result.annotated_image_path) || previewUrl)}
                      alt="Road Visual"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}
                      className="max-w-full object-contain rounded-lg border border-navy-800"
                    />
                  </div>
                )}
              </div>

              {/* Summary Stats Cards */}
              {result.detected && result.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    <span className="text-[10px] text-slate-400 block">Total Damage</span>
                    <span className="font-mono text-base font-bold text-white mt-0.5 block">{result.summary.total_damage}</span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-rose-900/40">
                    <span className="text-[10px] text-rose-400 block">Critical</span>
                    <span className="font-mono text-base font-bold text-rose-400 mt-0.5 block">{result.summary.critical_count}</span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-orange-900/40">
                    <span className="text-[10px] text-orange-400 block">High</span>
                    <span className="font-mono text-base font-bold text-orange-400 mt-0.5 block">{result.summary.high_count}</span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-amber-900/40">
                    <span className="text-[10px] text-amber-400 block">Medium / Low</span>
                    <span className="font-mono text-base font-bold text-amber-400 mt-0.5 block">
                      {result.summary.medium_count + result.summary.low_count}
                    </span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-cyan-900/40">
                    <span className="text-[10px] text-cyan-400 block">Confidence</span>
                    <span className="font-mono text-base font-bold text-cyan-300 mt-0.5 block">{result.summary.avg_confidence}%</span>
                  </div>
                </div>
              )}

              {/* Individual Damage Crops Gallery */}
              {result.detected && result.crops && result.crops.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-navy-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Crop className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Individual Extracted Damage Crops ({result.crops.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">12% Context Padding</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {result.crops.map((c) => (
                      <div
                        key={c.detection_id}
                        className="bg-navy-950 rounded-xl border border-navy-800 p-2 space-y-2 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-mono font-bold text-cyan-400">
                              #{c.detection_id}
                            </span>
                            <SeverityBadge severity={c.severity} size="sm" showIcon={false} />
                          </div>
                          <img
                            src={c.crop_base64 || getImageUrl(c.crop_path)}
                            alt={`Crop #${c.detection_id}`}
                            onClick={() => setLightboxImage(c.crop_base64 || getImageUrl(c.crop_path))}
                            className="w-full h-24 object-cover rounded-lg border border-navy-700 cursor-pointer hover:opacity-90"
                          />
                        </div>

                        <div className="space-y-1 text-[10px] font-mono text-slate-400 pt-1">
                          <div className="flex justify-between">
                            <span>Conf:</span>
                            <span className="text-emerald-400 font-bold">{(c.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Res:</span>
                            <span>{c.width}x{c.height}px</span>
                          </div>
                          <button
                            onClick={() => handleDownloadImage(c.crop_base64 || getImageUrl(c.crop_path), `pothole_crop_${c.detection_id}.jpg`)}
                            className="w-full mt-1.5 py-1 rounded bg-navy-900 hover:bg-navy-850 text-slate-300 hover:text-white border border-navy-700 flex items-center justify-center gap-1 text-[10px] transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download Crop</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Severity & Action Directives */}
              {result.detected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-navy-800">
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-navy-800">
                    <span className="text-xs text-slate-400 block mb-1">Calculated Severity</span>
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={result.max_severity} size="lg" />
                      <span className="font-mono text-sm text-slate-300 font-bold">
                        {result.max_severity_score} / 100
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 italic leading-relaxed">
                      {result.severity_reason}
                    </p>
                  </div>

                  <div className="bg-navy-950/70 p-4 rounded-xl border border-navy-800">
                    <span className="text-xs text-slate-400 block mb-1">Municipal Maintenance Priority</span>
                    <div className="flex items-center gap-3">
                      <PriorityBadge score={result.priority_score} category={result.priority_category} />
                    </div>
                    <p className="text-[11px] text-cyan-300 mt-2 font-medium">
                      {result.recommended_action}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-navy-900 rounded-2xl border border-navy-800 shadow-xl p-12 text-center text-slate-400 space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">Awaiting Road Image Ingest</h4>
              <p className="text-xs max-w-sm mx-auto">
                Select an image on the left or click one of the quick test presets above to observe multi-scale neural detection.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Fullscreen Zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-navy-700 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
