// frontend/src/services/api.ts
import axios from 'axios';
import { QueryRequest, QueryResponse, Place } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded');
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Query places
  queryPlaces: async (request: QueryRequest): Promise<QueryResponse> => {
    const response = await apiClient.post<QueryResponse>('/query', request);
    return response.data;
  },

  // Get place details
  getPlaceDetails: async (placeId: string): Promise<Place> => {
    const response = await apiClient.get<Place>(`/place/${placeId}`);
    return response.data;
  },

  // Search nearby
  searchNearby: async (
    location: { lat: number; lng: number },
    placeType: string,
    radius?: number,
    keyword?: string
  ) => {
    const response = await apiClient.post('/nearby', {
      location,
      place_type: placeType,
      radius,
      keyword,
    });
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default api;