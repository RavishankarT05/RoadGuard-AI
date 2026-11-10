// Base backend URL configured via environment variable for Vercel/Production deployment,
// with automatic fallback to local backend for development.
const RAW_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const STATIC_BASE_URL = RAW_URL.replace(/\/+$/, '');
const API_BASE_URL = STATIC_BASE_URL.endsWith('/api') 
  ? STATIC_BASE_URL 
  : `${STATIC_BASE_URL}/api`;

export function getImageUrl(path) {
  if (!path) return null;
  // If already full URL, base64 data URI, or blob URI, return directly
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Route through /api/ to guarantee CORS headers on cloud hosting
  return `${API_BASE_URL}/${cleanPath}`;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to load dashboard statistics');
  return res.json();
}

export async function fetchPotholes(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.severity && params.severity !== 'all') query.append('severity', params.severity);
  if (params.priority && params.priority !== 'all') query.append('priority_category', params.priority);
  if (params.status && params.status !== 'all') query.append('repair_status', params.status);
  if (params.sortBy) query.append('sort_by', params.sortBy);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const res = await fetch(`${API_BASE_URL}/potholes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load potholes');
  return res.json();
}

export async function fetchPotholeDetail(id) {
  const res = await fetch(`${API_BASE_URL}/potholes/${id}`);
  if (!res.ok) throw new Error(`Failed to load pothole #${id}`);
  return res.json();
}

export async function updatePothole(id, data) {
  const res = await fetch(`${API_BASE_URL}/potholes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update pothole');
  return res.json();
}

export async function deletePothole(id) {
  const res = await fetch(`${API_BASE_URL}/potholes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete pothole');
  return res.json();
}

export async function updatePotholeStatus(id, statusData) {
  const res = await fetch(`${API_BASE_URL}/potholes/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData),
  });
  if (!res.ok) throw new Error('Failed to update repair status');
  return res.json();
}

export async function overridePriority(id, overrideData) {
  const res = await fetch(`${API_BASE_URL}/potholes/${id}/priority-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(overrideData),
  });
  if (!res.ok) throw new Error('Failed to override priority');
  return res.json();
}

export async function detectRoadImage(formData) {
  const res = await fetch(`${API_BASE_URL}/detect/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Inference failed');
  }
  return res.json();
}

export async function fetchMapLocations(params = {}) {
  const query = new URLSearchParams();
  if (params.severity && params.severity !== 'all') query.append('severity', params.severity);
  if (params.status && params.status !== 'all') query.append('repair_status', params.status);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE_URL}/map/locations?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load map points');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE_URL}/analytics`);
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}

export async function queryAssistant(query) {
  const res = await fetch(`${API_BASE_URL}/assistant/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Assistant query failed');
  return res.json();
}

export async function fetchModelSettings() {
  const res = await fetch(`${API_BASE_URL}/settings/model`);
  if (!res.ok) throw new Error('Failed to load model settings');
  return res.json();
}

export async function uploadModelWeights(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/settings/model/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Weight upload failed');
  }
  return res.json();
}

export async function seedDemoData(force = false) {
  const res = await fetch(`${API_BASE_URL}/database/seed?force=${force}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to seed demo data');
  return res.json();
}

export async function fetchRoads() {
  const res = await fetch(`${API_BASE_URL}/roads`);
  if (!res.ok) throw new Error('Failed to load roads');
  return res.json();
}

export function getExportUrl(format, road = '', severity = '', status = '') {
  const query = new URLSearchParams({ format });
  if (road) query.append('road_name', road);
  if (severity) query.append('severity', severity);
  if (status) query.append('repair_status', status);
  return `${API_BASE_URL}/reports/export?${query.toString()}`;
}

export function getBackupUrl() {
  return `${API_BASE_URL}/database/backup`;
}

