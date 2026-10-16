import axios from 'axios';
import type { ApiError } from '@/core/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const TOKEN_STORAGE_KEY = 'casino_jwt_token';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Intercepteur JWT automatique sur chaque requête sortante
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** Extrait l'erreur au format commun { code, message, details } d'une erreur Axios (ou autre). */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiError>(error) && error.response?.data?.code) {
    return error.response.data;
  }
  return {
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Erreur réseau.',
    details: {},
  };
}
