import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  signup: async (data: { username: string; password: string; upi_id: string }) => {
    const response = await api.post('/api/auth/signup', data);
    return response.data;
  },

  login: async (data: { username: string; password: string }) => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (creatorId: string) => {
    const response = await api.get(`/api/dashboard/${creatorId}`);
    return response.data;
  },

  refreshStats: async (creatorId: string) => {
    const response = await api.post(`/api/dashboard/${creatorId}/refresh`);
    return response.data;
  },
};

// Types
export interface User {
  id: number;
  username: string;
  creator_id: string;
  upi_id: string;
}

export interface ProductPerformance {
  product_title: string;
  asin: string;
  clicks: number;
  orders: number;
  revenue: number;
  earnings: number;
  conversion_rate: number;
}

export interface DailyEarning {
  date: string;
  earnings: number;
  clicks: number;
  orders: number;
}

export interface CreatorStats {
  creator_id: string;
  total_earnings: number;
  total_clicks: number;
  total_orders: number;
  total_shipped: number;
  total_returns: number;
  conversion_rate: number;
  top_products: ProductPerformance[];
  last_updated: string;
  daily_earnings: DailyEarning[];
}
