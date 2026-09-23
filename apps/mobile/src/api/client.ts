import axios from 'axios';
import { API_CONFIG } from '../constants/theme';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

export const api = {
  getStats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  },
  getCurrentTrack: async () => {
    const response = await apiClient.get('/current');
    return response.data;
  },
};