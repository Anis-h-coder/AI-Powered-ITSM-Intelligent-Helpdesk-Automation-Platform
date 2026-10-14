/**
 * Centralized API Client for ITSM AI Platform
 * Connects the React frontend to the FastAPI backend.
 * Backend errors are propagated instead of showing fake success responses.
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
        message = errorBody.detail || errorBody.message || message;
      } catch {
        // Keep the HTTP error message if the response is not JSON.
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
  getHealth: async () => {
    return await request('/health');
  },

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
    return await request(`/incidents${query ? `?${query}` : ''}`);
  },

  createIncident: async (incidentData) => {
    return await request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
  },

  updateIncident: async (incidentId, updates) => {
    return await request(
      `/incidents/${encodeURIComponent(incidentId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  // Software Requests
  getServiceRequests: async () => {
    return await request('/service-requests');
  },

  createServiceRequest: async (requestData) => {
    return await request('/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  updateServiceRequest: async (requestId, updates) => {
    return await request(
      `/service-requests/${encodeURIComponent(requestId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  // AI Triage
  runTriage: async (text, department = 'General') => {
    return await request('/triage', {
      method: 'POST',
      body: JSON.stringify({ text, department }),
    });
  },

  // Knowledge Base
  getArticles: async (category = 'ALL') => {
    const query =
      category && category !== 'ALL'
        ? `?category=${encodeURIComponent(category)}`
        : '';

    return await request(`/knowledge/articles${query}`);
  },

  searchKnowledge: async (query, category = 'ALL') => {
    const params = new URLSearchParams({ q: query });

    if (category && category !== 'ALL') {
      params.append('category', category);
    }

    return await request(`/knowledge/search?${params.toString()}`);
  },

  askKnowledge: async (question, category = 'ALL') => {
    return await request('/knowledge/ask', {
      method: 'POST',
      body: JSON.stringify({ question, category }),
    });
  },

  ingestArticle: async (articleData) => {
    return await request('/knowledge/ingest', {
      method: 'POST',
      body: JSON.stringify(articleData),
    });
  },

  // Auto-Resolution
  
  simulateResolution: async (payload) => {
    return await request('/auto-resolution/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveResolution: async (
    ticketId,
    approverName,
    approvalNotes = ''
  ) => {
    return await request('/auto-resolution/approve', {
      method: 'POST',
      body: JSON.stringify({
        ticketId,
        approverName,
        approvalNotes,
      }),
    });
  },

  // Audit Logs
  getAuditLogs: async () => {
    return await request('/audit-logs');
  },

  addAuditLog: async (logData) => {
    return await request('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  },

  // Metrics
  getMetrics: async () => {
    return await request('/metrics');
  },

  // ServiceNow Integration
  getServiceNowStatus: async () => {
    return await request('/servicenow/status');
  },

  syncServiceNow: async (incidentId) => {
    return await request(
      `/servicenow/sync?incident_id=${encodeURIComponent(incidentId)}`,
      {
        method: 'POST',
      }
    );
  },
};