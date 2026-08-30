export const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname.endsWith('.local')
    ? `http://${window.location.hostname}:5000/api`
    : '/api'
);
