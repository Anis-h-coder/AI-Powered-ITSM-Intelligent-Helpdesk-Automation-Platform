/**
 * Centralized API Client for ITSM AI Platform
 * Connects frontend React components to FastAPI backend endpoints.
 * Backend failures are surfaced explicitly; this client never fabricates system status.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API Client] Error on ${options.method || 'GET'} ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  // System Health & Service Status
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

    const qs = params.toString() ? `?${params.toString()}` : '';
    return await request(`/incidents${qs}`);
  },

  createIncident: async (incidentData) => {
    return await request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
  },

  updateIncident: async (incidentId, updates) => {
    return await request(`/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Service Requests
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
    return await request(`/service-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // AI Triage & NLP Analysis
  runTriage: async (text, department = 'General') => {
    return await request('/triage', {
      method: 'POST',
      body: JSON.stringify({ text, department }),
    });
  },

  // Knowledge Base & RAG Pipeline
  getArticles: async (category = 'ALL') => {
    const qs =
      category && category !== 'ALL'
        ? `?category=${encodeURIComponent(category)}`
        : '';

    return await request(`/knowledge/articles${qs}`);
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

  // Auto-Resolution & Remediation
  simulateResolution: async (payload, runbookId = null) => {
    const body =
      typeof payload === 'string'
        ? { ticketId: payload, runbookId }
        : payload;

    return await request('/auto-resolution/simulate', {
      method: 'POST',
      body: JSON.stringify(body),
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

  // Anomaly clusters from persisted incidents
  getAnomalyClusters: async () => {
    return await request('/anomaly-clusters');
  },

  // Computed Metrics
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
