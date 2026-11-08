import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Filter,
  Search,
  Layers,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  X
} from 'lucide-react';
import { fetchMapLocations, fetchPotholeDetail, getImageUrl } from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/SeverityBadge';
import { PotholeDetailModal } from '../components/PotholeDetailModal';
import { RepairActionModal } from '../components/RepairActionModal';
import { PriorityOverrideModal } from '../components/PriorityOverrideModal';

// Custom colored leaflet marker pin generator
function createPinIcon(severity, repairStatus) {
  let color = '#f59e0b'; // Amber
  if (repairStatus === 'Repaired' || repairStatus === 'Verified') {
    color = '#3b82f6'; // Blue for repaired
  } else if (severity === 'Critical') {
    color = '#ef4444'; // Red
  } else if (severity === 'High') {
    color = '#f97316'; // Orange
  } else if (severity === 'Low') {
    color = '#10b981'; // Green
  }

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.3;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0f172a;
          border: 3px solid ${color};
          box-shadow: 0 4px 6px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

// Map Controller component to fly to coordinates
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Map Click Listener for manual pin placement
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export function MapPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  
  // Selected detail modal
  const [activePothole, setActivePothole] = useState(null);
  const [repairPothole, setRepairPothole] = useState(null);
  const [overridePothole, setOverridePothole] = useState(null);

  // Manual coordinate input drawer
  const [showManualCoordDrawer, setShowManualCoordDrawer] = useState(false);
  const [manualLat, setManualLat] = useState('12.9716');
  const [manualLng, setManualLng] = useState('77.5946');
  const [clickedCoord, setClickedCoord] = useState(null);

  const loadPoints = async () => {
    try {
      setLoading(true);
      const data = await fetchMapLocations({
        severity: severityFilter,
        status: statusFilter,
        search: search
      });
      setLocations(data);
      if (data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoints();
  }, [severityFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPoints();
  };

  const handleInspectDetail = async (id) => {
    try {
      const full = await fetchPotholeDetail(id);
      setActivePothole(full);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapClicked = (latlng) => {
    setClickedCoord(latlng);
    setManualLat(latlng.lat.toFixed(5));
    setManualLng(latlng.lng.toFixed(5));
    setShowManualCoordDrawer(true);
  };

  const handleFlyToManual = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng]);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Filter and Search Bar */}
      <div className="bg-navy-900 p-4 rounded-2xl border border-navy-800 shadow-xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by road name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-950 border border-navy-700 text-white text-xs placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </form>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Low">Low Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Detected">Detected</option>
              <option value="Reported">Reported</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Repaired">Repaired</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>

        {/* Map Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Showing <strong className="text-white">{locations.length}</strong> geocoded pins
          </span>
          <button
            onClick={() => setShowManualCoordDrawer(!showManualCoordDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-navy-700 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Manual Coordinate Input</span>
          </button>
        </div>
      </div>

      {/* Manual Coordinates Drawer (when GPS unavailable) */}
      {showManualCoordDrawer && (
        <div className="bg-navy-900 border border-navy-700 p-4 rounded-xl shadow-xl flex items-center justify-between gap-4 shrink-0 animate-fadeIn">
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="font-semibold text-white">Manual Coordinate Placement:</span>
            <span>(Click anywhere on map or enter manually below)</span>
          </div>
          <form onSubmit={handleFlyToManual} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono w-28 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs font-mono w-28 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Center Map
            </button>
            <button
              type="button"
              onClick={() => setShowManualCoordDrawer(false)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Main Map Container */}
      <div className="flex-1 bg-navy-900 rounded-2xl border border-navy-800 shadow-2xl overflow-hidden relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Free OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClicked} />

          {/* Render Defect Markers */}
          {locations.map((loc) => {
            const pinIcon = createPinIcon(loc.severity, loc.repair_status);
            return (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={pinIcon}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-xs min-w-[220px]">
                    <div className="flex items-center justify-between gap-2 border-b border-navy-800 pb-1.5">
                      <span className="font-mono font-bold text-cyan-400">{loc.pothole_code}</span>
                      <SeverityBadge severity={loc.severity} size="sm" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{loc.road_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <PriorityBadge score={loc.priority_score} category={loc.priority_category} />
                      <StatusBadge status={loc.repair_status} size="sm" />
                    </div>
                    {loc.image_annotated_path && (
                      <img
                        src={getImageUrl(loc.image_annotated_path)}
                        alt="Thumbnail"
                        className="w-full h-24 object-cover rounded border border-navy-800 my-1"
                      />
                    )}
                    <button
                      onClick={() => handleInspectDetail(loc.id)}
                      className="w-full mt-2 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect Full Record</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating Map Legend */}
        <div className="absolute bottom-5 right-5 z-[1000] bg-navy-950/90 backdrop-blur-md p-3 rounded-xl border border-navy-800 shadow-xl text-xs space-y-1.5 select-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            GIS Marker Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Critical Hazard (Immediate)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-slate-300">High Severity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">Medium Pothole</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Low Severity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-300">Repaired / Verified</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activePothole && (
        <PotholeDetailModal
          pothole={activePothole}
          onClose={() => setActivePothole(null)}
          onOpenRepairModal={(p) => {
            setActivePothole(null);
            setRepairPothole(p);
          }}
          onOpenOverrideModal={(p) => {
            setActivePothole(null);
            setOverridePothole(p);
          }}
        />
      )}

      {repairPothole && (
        <RepairActionModal
          pothole={repairPothole}
          onClose={() => setRepairPothole(null)}
          onSuccess={loadPoints}
        />
      )}

      {overridePothole && (
        <PriorityOverrideModal
          pothole={overridePothole}
          onClose={() => setOverridePothole(null)}
          onSuccess={loadPoints}
        />
      )}
    </div>
  );
}

