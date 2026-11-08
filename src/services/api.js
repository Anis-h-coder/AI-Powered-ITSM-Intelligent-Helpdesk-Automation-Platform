
/**
 * Centralized API Client for ITSM AI Platform
 * Connects React frontend to FastAPI backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;

      try {
        const errorBody = await response.json();
        const detail = errorBody.detail;

        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((item) => item.msg || JSON.stringify(item))
            .join('; ');
        } else if (detail && typeof detail === 'object') {
          message = detail.message || JSON.stringify(detail);
        } else {
          message = errorBody.message || message;
        }
      } catch {
        // Keep the original HTTP error message.
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(
      `[API Client] ${options.method || 'GET'} ${url} failed:`,
      error.message
    );

    throw error;
  }
}

export const api = {
  // System Health
  getHealth: async () => request('/health'),

  // Incidents
  getIncidents: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.category && filters.category !== 'ALL') {
      params.append('category', filters.category);
    }

    if (filters.priority && filters.priority !== 'ALL') {
      params.append('priority', filters.priority);
    }

    if (filters.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }

    const query = params.toString();

    return request(`/incidents${query ? `?${query}` : ''}`);
  },

  createIncident: async (incidentData) =>
    request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    }),

  updateIncident: async (incidentId, updates) =>
    request(`/incidents/${encodeURIComponent(incidentId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Software Requests
  getServiceRequests: async () => request('/service-requests'),

  createServiceRequest: async (requestData) =>
    request('/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  updateServiceRequest: async (requestId, updates) =>
    request(`/service-requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // AI Triage
  runTriage: async (
  text,
  department = 'General',
  clarification = {}
) =>
  request('/triage', {
    method: 'POST',
    body: JSON.stringify({
      text,
      department,
      ...clarification,
    }),
  }),

  // Knowledge Base
  getArticles: async (category = 'ALL') => {
    const query =
      category && category !== 'ALL'
        ? `?category=${encodeURIComponent(category)}`
        : '';

    return request(`/knowledge/articles${query}`);
  },

  searchKnowledge: async (query, category = 'ALL') => {
    const params = new URLSearchParams({ q: query });

    if (category && category !== 'ALL') {
      params.append('category', category);
    }

    return request(`/knowledge/search?${params.toString()}`);
  },

  askKnowledge: async (question, category = 'ALL') =>
    request('/knowledge/ask', {
      method: 'POST',
      body: JSON.stringify({ question, category }),
    }),

  ingestArticle: async (articleData) =>
    request('/knowledge/ingest', {
      method: 'POST',
      body: JSON.stringify(articleData),
    }),

  // Auto-Resolution
  simulateResolution: async (payload) =>
    request('/auto-resolution/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  approveResolution: async (
    ticketId,
    approverName,
    approvalNotes = ''
  ) =>
    request('/auto-resolution/approve', {
      method: 'POST',
      body: JSON.stringify({
        ticketId,
        approverName,
        approvalNotes,
      }),
    }),

  // Audit Logs
  getAuditLogs: async () => request('/audit-logs'),

  addAuditLog: async (logData) =>
    request('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    }),

  // Metrics
  getMetrics: async () => request('/metrics'),

  // ServiceNow Integration
  getServiceNowStatus: async () => request('/servicenow/status'),

  syncServiceNow: async (incidentId) =>
    request(
      `/servicenow/sync?incident_id=${encodeURIComponent(incidentId)}`,
      {
        method: 'POST',
      }
    ),
};
