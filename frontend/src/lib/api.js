import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

// Attach the current user's JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Log errors to console so we can debug
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error(
      `API Error [${err.config?.method?.toUpperCase()} ${err.config?.url}]:`,
      err.response?.status,
      err.response?.data || err.message
    );
    return Promise.reject(err);
  }
);

// Workspaces
export const getWorkspaces = () => api.get('/api/workspaces').then(r => r.data);
export const createWorkspace = (name) => api.post('/api/workspaces', { name }).then(r => r.data);
export const renameWorkspace = (id, name) => api.patch(`/api/workspaces/${id}`, { name }).then(r => r.data);
export const deleteWorkspace = (id) => api.delete(`/api/workspaces/${id}`).then(r => r.data);

// Documents
export const getDocuments = (wsId) => api.get(`/api/workspaces/${wsId}/documents`).then(r => r.data);
export const uploadDocument = (wsId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/api/workspaces/${wsId}/documents`, form).then(r => r.data);
};
export const deleteDocument = (wsId, docId) =>
  api.delete(`/api/workspaces/${wsId}/documents/${docId}`).then(r => r.data);

// Tasks
export const updateTask = (wsId, taskId, updates) =>
  api.patch(`/api/workspaces/${wsId}/tasks/${taskId}`, updates).then(r => r.data);
export const deleteTask = (wsId, taskId) =>
  api.delete(`/api/workspaces/${wsId}/tasks/${taskId}`).then(r => r.data);

// Chat
export const getChatHistory = (wsId) => api.get(`/api/workspaces/${wsId}/chat`).then(r => r.data);
export const sendMessage = (wsId, message) =>
  api.post(`/api/workspaces/${wsId}/chat`, { message }).then(r => r.data);

// Dashboard
export const getDashboard = (wsId) => api.get(`/api/workspaces/${wsId}/dashboard`).then(r => r.data);

export default api;
