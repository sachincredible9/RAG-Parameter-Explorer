import axios from 'axios';

// Base URL points to FastAPI local backend by default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to inject active Tenant ID header automatically
client.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('docmind_tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const api = {
  // Auth & Tenants
  listTenants: () => client.get('/auth/tenants'),
  createTenant: (name) => client.post('/auth/tenants', { name }),
  updateTenantSettings: (tenantId, settings) => client.put(`/auth/tenants/${tenantId}/settings`, settings),

  // Documents
  listDocuments: () => client.get('/documents'),
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteDocument: (docId) => client.delete(`/documents/${docId}`),
  getChunkPreview: (content, chunkSize, chunkOverlap) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('chunk_size', chunkSize);
    formData.append('chunk_overlap', chunkOverlap);
    return client.post('/documents/chunk-preview', formData);
  },

  // Personas
  listPersonas: () => client.get('/simulate/personas'),
  createPersona: (persona) => client.post('/simulate/personas', persona),
  deletePersona: (personaId) => client.delete(`/simulate/personas/${personaId}`),

  // Simulation Playground
  runSimulation: (data) => client.post('/simulate', data),
  getSimulationLogs: () => client.get('/simulate/logs'),
};
