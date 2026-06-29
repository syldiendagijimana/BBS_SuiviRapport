// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API BASE URL
//const API_URL = "http://10.241.220.120:3000/api";
const API_URL = "https://bbs-suivirapport-1.onrender.com/api";

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
});
// ======================
// TOKEN INTERCEPTOR
// ======================
api.interceptors.request.use(async (config) => {
  console.log("➡️ REQUEST:", config.url);
  console.log("➡️ DATA:", config.data);

  const token = await AsyncStorage.getItem('bbs_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
// ======================
// RESPONSE INTERCEPTOR
// ======================
api.interceptors.response.use(
  (response) => response.data,
  (error) => {

    console.log('========== API ERROR ==========');
    console.log('STATUS :', error.response?.status);
    console.log('DATA :', error.response?.data);
    console.log('URL :', error.config?.url);
    console.log('REQUEST :', error.config?.data);
    console.log('===============================');

    const msg =
      error.response?.data?.error ||
      error.message ||
      'Erreur réseau';

    return Promise.reject(new Error(msg));
  }
);
// ======================
// AUTH API
// ======================
export const authAPI = {
 login: (email, password) =>
   api.post('/auth/login', {
     email: String(email).trim(),
     password: String(password).trim(),
   }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),

  changePassword: (data) => api.post('/auth/change-password', data),
};

// ======================
// USERS API
// ======================
export const usersAPI = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggle: (id) => api.patch(`/users/${id}/toggle`),
  delete: (id) => api.delete(`/users/${id}`),
};

// ======================
// TECHNICIENS API
// ======================
export const techniciensAPI = {
  list: () => api.get('/techniciens'),
  get: (id) => api.get(`/techniciens/${id}`),
  missions: (id) => api.get(`/techniciens/${id}/missions`),
  create: (data) => api.post('/techniciens', data),
  update: (id, data) => api.put(`/techniciens/${id}`, data),
  affecterTache: (id, data) => api.post(`/techniciens/${id}/taches`, data),
  delete: (id) => api.delete(`/techniciens/${id}`),
};

// ======================
// RAPPORTS API — CORRIGÉ
// ======================
// ✅ FormData doit passer par axios avec Content-Type multipart
// ✅ On utilise AsyncStorage pour le token (pas getToken)

const getAuthToken = async () => {
  return await AsyncStorage.getItem('bbs_token');
};

export const rapportsAPI = {
  list: () => api.get('/rapports'),

  get: (id) => api.get(`/rapports/${id}`),

  // ✅ FIX COMPLET : axios + token AsyncStorage + pas de Content-Type manuel
  create: async (formData) => {
    const token = await getAuthToken();
    const response = await axios.post(`${API_URL}/rapports`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
      transformRequest: (data) => data, // ✅ empêche axios de sérialiser FormData en JSON
    });
    return response.data;
  },

  update: async (id, formData) => {
    const token = await getAuthToken();
    const response = await axios.put(`${API_URL}/rapports/${id}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
      transformRequest: (data) => data, // ✅ idem
    });
    return response.data;
  },

  delete: (id) => api.delete(`/rapports/${id}`),
};

// ======================
// INCIDENTS API
// ======================
export const incidentsAPI = {
  list: (params) => api.get('/incidents', { params }),
  get: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  delete: (id) => api.delete(`/incidents/${id}`),
};

// ======================
// RESEAU API
// ======================
export const reseauAPI = {
  latest: () => api.get('/reseau/bande-passante/latest'),
  historique: (zone) =>
    api.get(`/reseau/historique/${encodeURIComponent(zone)}`),
  enregistrer: (data) => api.post('/reseau/bande-passante', data),
  notifications: () => api.get('/reseau/notifications'),
  marquerLu: (id) => api.patch(`/reseau/notifications/${id}/lu`),
  toutLire: () => api.patch('/reseau/notifications/tout-lire'),
};

// ======================
// STATISTIQUES API
// ======================
export const statsAPI = {
  dashboard: () => api.get('/stats/dashboard'),
  rapportMensuel: (mois, annee) =>
    api.get('/stats/rapport-mensuel', { params: { mois, annee } }),
  technicien: (id) => api.get(`/stats/technicien/${id}`),
};

export default api;