import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { EmployeeSelfService } from './pages/EmployeeSelfService.jsx';
import { ItsmDashboard } from './pages/ItsmDashboard.jsx';
import { AiAnalysis } from './pages/AiAnalysis.jsx';
import { AutoResolution } from './pages/AutoResolution.jsx';
import { KnowledgeBase } from './pages/KnowledgeBase.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { TicketDetailModal } from './components/common/TicketDetailModal.jsx';
import { TechnicalDetailsModal } from './components/common/TechnicalDetailsModal.jsx';
import { api } from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing-page');
  const [tickets, setTickets] = useState([]);
  const [softwareRequests, setSoftwareRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [backendHealth, setBackendHealth] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeModalTicket, setActiveModalTicket] = useState(null);
  const [autoResolutionTicketId, setAutoResolutionTicketId] = useState(null);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);

  // Sync initial and updated records with FastAPI backend
  useEffect(() => {
    let isMounted = true;

    
    async function loadData() {
      try {
        const [healthResult, incidentsResult] = await Promise.allSettled([
          api.getHealth(),
          api.getIncidents(),
        ]);

        if (!isMounted) return;

        if (healthResult.status === 'fulfilled') {
          setBackendHealth(healthResult.value);
        } else {
          console.error('Health API failed:', healthResult.reason);
        }

        if (incidentsResult.status === 'fulfilled') {
          const response = incidentsResult.value;

          const incidentItems = Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
              ? response.items
              : [];

          const formattedTickets = incidentItems.map((incident) => ({
            ...incident,
            id: incident.incident_id || incident.id,
            title: incident.title,
            description: incident.description,
            category: incident.category || 'Other',
            priority: incident.priority || 'P3 - Medium',
            status: incident.status || 'New',
            requester:
              incident.requester ||
              incident.requester_email ||
              'Employee',
            requesterEmail: incident.requester_email || '',
            assignmentGroup: incident.assignmentGroup || 'IT Support',
            assignee: incident.assignee || 'Unassigned',
            createdAt: incident.created_at || incident.createdAt || '',
            isUserCreated: true,
            resolvedByAi: Boolean(incident.resolvedByAi),

          }));

          setTickets(formattedTickets);
        } else {
          console.error('Incidents API failed:', incidentsResult.reason);
        }

        const [requestsResult, logsResult] = await Promise.allSettled([
          api.getServiceRequests(),
          api.getAuditLogs(),
        ]);

        if (!isMounted) return;
        if (requestsResult.status === 'fulfilled') {
          const response = requestsResult.value;

          const requestItems = Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
              ? response.items
              : [];

          // Render only valid records returned by the backend. Do not merge
          // mock or stale local records into the live database response.
          const formattedRequests = requestItems
            .filter((request) => {
              const softwareName = String(request.requestedSoftware ?? '').trim();
              return softwareName.length > 0 && softwareName.toLowerCase() !== 'string';
            })
            .map((request) => ({
              ...request,
              id: request.request_id || request.id || request._id,
              requestedSoftware: String(request.requestedSoftware).trim(),
              requester: request.requester || 'Employee',
              department: request.department || 'General',
              status: request.status || 'Submitted',
              submittedAt: request.created_at || request.submittedAt || '',
              isUserCreated:
                request.requester === 'Sarah Chen (Current User)' ||
                request.requester === 'Sarah Chen',
            }))
            .filter((request) => Boolean(request.id));

          setSoftwareRequests(formattedRequests);
        } else {
          console.warn(
            'Service Requests API failed:',
            requestsResult.reason
          );
        }
        if (logsResult.status === 'fulfilled') {
          const response = logsResult.value;
          if (Array.isArray(response)) {
            setAuditLogs(response);
          } else if (Array.isArray(response?.items)) {
            setAuditLogs(response.items);
          }
        } else {
          console.warn(
            'Audit Logs API not available yet:',
            logsResult.reason
          );
        }
      } catch (err) {
        console.error('[App] Backend sync failed:', err);
      }
    }


    loadData();
    const interval = setInterval(loadData, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // ==========================================
  // SHARED STATE HANDLERS WITH PERSISTENCE
  // ==========================================

  // 1. Add Incident Ticket
  
    const handleAddTicket = async (newTicket) => {
      const payload = {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        category: newTicket.category || 'Other',
        priority: newTicket.priority || 'P3 - Medium',
        requester_email:
          newTicket.requesterEmail || 'sarah.chen@enterprise.internal',
      };

      // Save to FastAPI first. Do not show a false success.
      const persisted = await api.createIncident(payload);

      if (!persisted?.success || !persisted?.incident?.incident_id) {
        throw new Error('Incident was not confirmed as saved by the backend.');
      }

      const incident = persisted.incident;

      const savedTicket = {
        ...incident,
        id: incident.incident_id,
        title: incident.title,
        description: incident.description,
        category: incident.category || 'Other',
        priority: incident.priority || 'P3 - Medium',
        status: incident.status || 'New',
        requester: incident.requester || incident.requester_email || 'Employee',
        requesterEmail: incident.requester_email || '',
        department: newTicket.department || 'Software Engineering',
        assignmentGroup: newTicket.assignmentGroup || 'IT Support',
        assignee: newTicket.assignee || 'Unassigned',
        createdAt: incident.created_at || '',
        isUserCreated: true,
        resolvedByAi: false,
      };

      setTickets((prev) => [
        savedTicket,
        ...prev.filter((ticket) => ticket.id !== savedTicket.id),
      ]);

      return savedTicket;

      // Audit log endpoint is not implemented yet, so don't let it
      // affect incident creation or report a fake success.
    };


  // 2. Update Incident Ticket Status
  
  const handleUpdateTicketStatus = async (
    ticketId,
    newStatus,
    options = {}
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw new Error("Incident not found in the dashboard.");
    }

    try {
      const payload = {
        status: newStatus,
      };

      // AI simulation successful-a irundha mattum AI flag save pannum.
      if (typeof options.resolvedByAi === "boolean") {
        payload.resolvedByAi = options.resolvedByAi;
      }

      const response = await api.updateIncident(ticketId, payload);

      if (!response?.success || !response?.incident?.incident_id) {
        throw new Error("Backend did not confirm the status update.");
      }

      const updatedIncident = response.incident;

      const updatedTicket = {
        ...ticket,
        ...updatedIncident,
        id: updatedIncident.incident_id,
        status: updatedIncident.status,
        resolvedByAi:
          updatedIncident.resolvedByAi ?? ticket.resolvedByAi ?? false,
      };

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? updatedTicket : t))
      );

      if (activeModalTicket?.id === ticketId) {
        setActiveModalTicket(updatedTicket);
      }
    } catch (err) {
      console.error("[App] Incident status update failed:", err);

      window.alert(
        `Could not update incident status. ${
          err.message || "Please try again."
        }`
      );

      throw err;
    }
  };

  // 3. Add Software Request
  
  const handleAddSoftwareRequest = async (newRequest) => {
    const requestedSoftware = String(newRequest.requestedSoftware ?? '').trim();
    if (!requestedSoftware || requestedSoftware.toLowerCase() === 'string') {
      throw new Error('Please enter the actual software name before submitting.');
    }
    const payload = {
      requestedSoftware,
      requester: newRequest.requester || newRequest.requesterName || 'Sarah Chen',
      department: newRequest.department || 'Software Engineering',
      status: newRequest.status || 'Provisioning',
    };

    try {
      const persisted = await api.createServiceRequest(payload);
      const request = persisted?.request;

      if (!persisted?.success || !request?.request_id) {
        throw new Error('Backend did not confirm the saved service request.');
      }

      const savedRequest = {
        ...request,
        id: request.request_id,
        requestedSoftware: request.requestedSoftware,
        status: request.status,
        requester: request.requester,
        department: request.department,
        submittedAt: request.created_at,
        isUserCreated: true,
      };

      setSoftwareRequests((prev) => [
        savedRequest,
        ...prev.filter((r) => r.id !== savedRequest.id),
      ]);

      const refreshedLogs = await api.getAuditLogs();
      if (Array.isArray(refreshedLogs?.items)) {
        setAuditLogs(refreshedLogs.items);
      }

      return savedRequest;
    } catch (err) {
      console.error('[App] Software request save failed:', err);
      window.alert(
        `Could not save software request. ${err.message || 'Please try again.'}`
      );
      throw err;
    }
  };


  // 4. Update Software Request Status
  
  const handleUpdateSoftwareRequestStatus = async (requestId, newStatus) => {
    try {
      // Update the request in the backend first
      await api.updateServiceRequest(requestId, { status: newStatus });

      // Update the UI after the backend succeeds
      setSoftwareRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: newStatus } : r
        )
      );

      // Persist the audit log in the database
      await api.addAuditLog({
        automatedAction: `Software Provisioning State: ${newStatus}`,
        relatedItem: requestId,
        executionStatus: newStatus === 'Failed' ? 'Failed' : 'Success',
        result: `Provisioning state for request ${requestId} updated to "${newStatus}".`,
      });

      // Reload persisted audit logs
      const response = await api.getAuditLogs();
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : [];

      setAuditLogs(
        items.map((log) => ({
          ...log,
          id: log.log_id || log.id || log._id,
        }))
      );
    } catch (err) {
      console.error('[App] Failed to update request or save audit log:', err);
      window.alert(
        'Request update or audit log save failed. Please check the backend and try again.'
      );
    }
  };

  
  const handleAddAuditLog = async (newLog) => {
    try {
      const payload = {
        automatedAction: newLog.automatedAction || 'Automation Event',
        relatedItem: newLog.relatedItem || '',
        executionStatus: newLog.executionStatus || 'Success',
        result: newLog.result || '',
        remediationDetails: newLog.remediationDetails || null,
        timestamp: newLog.timestamp || null,
        isSimulated: newLog.isSimulated ?? true,
      };

      const saved = await api.addAuditLog(payload);

      if (!saved?.success) {
        throw new Error('Audit log was not confirmed by the backend.');
      }

      const response = await api.getAuditLogs();
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : [];

      setAuditLogs(
        items.map((log) => ({
          ...log,
          id: log.log_id || log.id || log._id,
        }))
      );
    } catch (err) {
      console.error('[App] Audit log persistence failed:', err);
      window.alert('Simulation audit log could not be saved. Please check the backend.');
    }
  };

  const handleNavigateToAutoResolution = (ticketId = null) => {
    setAutoResolutionTicketId(ticketId);
    setActiveTab('auto-resolution');
  };

  const handleOpenTicketModal = (ticket) => {
    setActiveModalTicket(ticket);
  };

  const handleCloseTicketModal = () => {
    setActiveModalTicket(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/95 text-slate-900 font-sans flex flex-col relative selection:bg-blue-600 selection:text-white">
      {/* Subtle architectural dot grid mesh and ambient lighting */}
      <div className="fixed inset-0 pointer-events-none dot-grid-pattern opacity-60 z-0"></div>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.10),transparent)] z-0"></div>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_85%_75%,rgba(99,102,241,0.06),transparent)] z-0"></div>

      {/* Top Fixed Header */}
      <Header
        activeTab={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigateTab={setActiveTab}
        onOpenTechModal={() => setIsTechModalOpen(true)}
        backendHealth={backendHealth}
      />

      {/* Main Layout Area - pt-16 offsets the fixed 64px header */}
      <div className="flex flex-1 pt-16 relative z-10">
        {/* Sidebar Navigation - only shown when not on the Landing Page */}
        {activeTab !== 'landing-page' && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onOpenTechModal={() => setIsTechModalOpen(true)}
          />
        )}

        {/* Content Viewport */}
        <main
          className={`flex-1 transition-all duration-200 p-3 sm:p-5 lg:p-6 xl:p-8 min-w-0 ${
            activeTab === 'landing-page'
              ? 'ml-0'
              : isSidebarCollapsed
              ? 'md:ml-16'
              : 'md:ml-64'
          }`}
        >
          <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
            {activeTab === 'landing-page' && (
              <LandingPage
                onNavigateTab={setActiveTab}
                tickets={tickets}
                softwareRequests={softwareRequests}
                auditLogs={auditLogs}
                onOpenTechModal={() => setIsTechModalOpen(true)}
              />
            )}

            {activeTab === 'employee-self-service' && (
              <EmployeeSelfService
                tickets={tickets}
                softwareRequests={softwareRequests}
                onAddTicket={handleAddTicket}
                onAddSoftwareRequest={handleAddSoftwareRequest}
                onOpenTicketModal={handleOpenTicketModal}
              />
            )}

            {activeTab === 'itsm-dashboard' && (
              <ItsmDashboard
                tickets={tickets}
                softwareRequests={softwareRequests}
                auditLogs={auditLogs}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onUpdateSoftwareRequestStatus={handleUpdateSoftwareRequestStatus}
                onOpenTicketModal={handleOpenTicketModal}
                onNavigateToAutoResolution={handleNavigateToAutoResolution}
              />
            )}

            {activeTab === 'ai-analysis' && (
              <AiAnalysis
                tickets={tickets}
                softwareRequests={softwareRequests}
                auditLogs={auditLogs}
                onOpenTicketModal={handleOpenTicketModal}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onNavigateToAutoResolution={handleNavigateToAutoResolution}
              />
            )}

            {activeTab === 'auto-resolution' && (
              <AutoResolution
                tickets={tickets}
                softwareRequests={softwareRequests}
                auditLogs={auditLogs}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onAddAuditLog={handleAddAuditLog}
                onNavigateTab={setActiveTab}
                preselectedTicketId={autoResolutionTicketId}
              />
            )}

            {activeTab === 'knowledge-base' && (
              <KnowledgeBase searchQuery={searchQuery} />
            )}
          </div>
        </main>
      </div>

      {/* Global Ticket Inspection Modal */}
      {activeModalTicket && (
        <TicketDetailModal
          ticket={activeModalTicket}
          isOpen={Boolean(activeModalTicket)}
          onClose={handleCloseTicketModal}
          onUpdateStatus={handleUpdateTicketStatus}
        />
      )}

      {/* How It Works & Architecture Modal */}
      <TechnicalDetailsModal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
      />
    </div>
  );
}
