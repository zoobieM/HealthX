const API_URL = 'http://localhost:3002/api';

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('medqr_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API Request Failed');
  }
  
  return response.json();
};
