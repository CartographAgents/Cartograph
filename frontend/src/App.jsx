import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import GraphView from './components/GraphView';
import ProjectOverview from './components/ProjectOverview';
import DecisionFocusView from './components/DecisionFocusView';
import ViewTransition from './components/common/ViewTransition';
import Breadcrumbs from './components/Breadcrumbs';
import { VscFileSubmodule, VscGraph, VscBook, VscBell, VscClose, VscChevronDown, VscChevronUp } from 'react-icons/vsc';
import { useAppLogic } from './hooks/useAppLogic';
import { findNodeById } from './utils/treeUtils';

const parseRouteFromPath = (pathname = '/') => {
  const parts = String(pathname).split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'projects') {
    return { projectId: null, viewMode: 'pillar', pillarId: null, decisionId: null };
  }

  const projectId = parts[1];
  const section = parts[2] || 'details';

  if (section === 'graph') {
    return { projectId, viewMode: 'graph', pillarId: null, decisionId: null };
  }
  if (section === 'overview') {
    return { projectId, viewMode: 'overview', pillarId: null, decisionId: null };
  }
  if (section === 'focus') {
    if (parts.length >= 5) {
      return { projectId, viewMode: 'decision', pillarId: parts[3], decisionId: parts[4] };
    }
    return { projectId, viewMode: 'decision', pillarId: null, decisionId: parts[3] || null };
  }
  if (section === 'details') {
    return { projectId, viewMode: 'pillar', pillarId: parts[3] || null, decisionId: null };
  }

  return { projectId, viewMode: 'pillar', pillarId: null, decisionId: null };
};

const buildPathFromState = ({ projectId, viewMode, activePillarId, activeDecisionId }) => {
  if (!projectId) return '/';
  const pid = String(projectId);
  if (viewMode === 'graph') return `/projects/${pid}/graph`;
  if (viewMode === 'overview') return `/projects/${pid}/overview`;
  if (viewMode === 'decision' && activeDecisionId) {
    return activePillarId
      ? `/projects/${pid}/focus/${activePillarId}/${activeDecisionId}`
      : `/projects/${pid}/focus/${activeDecisionId}`;
  }
  if (activePillarId) return `/projects/${pid}/details/${activePillarId}`;
  return `/projects/${pid}/details`;
};

const findPillarContainingDecision = (nodes = [], decisionId) => {
  for (const node of nodes || []) {
    if ((node.decisions || []).some((d) => d.id === decisionId)) {
      return node.id;
    }
    const nested = findPillarContainingDecision(node.subcategories || [], decisionId);
    if (nested) return node.id;
  }
  return null;
};

function App() {
  const [chatFocusTrigger, setChatFocusTrigger] = React.useState(0);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = React.useState(false);
  const lastSeenMessageCount = React.useRef(0);
  const scrollContainerRef = React.useRef(null);
  const scrollPositions = React.useRef({});
  const prevViewKeyRef = React.useRef('');
  const isApplyingRouteRef = React.useRef(false);
  const hasAppliedInitialRouteRef = React.useRef(false);
  const loadingRouteProjectRef = React.useRef(null);
  const {
    messages,
    isWaiting,
    pillars,
    activePillarId,
    setActivePillarId,
    activeDecisionId,
    setActiveDecisionId,
    activePillar,
    agentFeedback,
    projectId,
    projectName,
    projectOverview,
    errorMessage,
    setErrorMessage,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    llmConfig,
    handleNewProject,
    handleSelectProject,
    handleSendMessage,
    handleUpdateDecision,
    handleAddFeature,
    handleDeleteFeature,
    handleEditFeature,
    handleExport,
    handleSaveLlmConfig
  } = useAppLogic();
  const handleSelectProjectRef = React.useRef(handleSelectProject);

  React.useEffect(() => {
    handleSelectProjectRef.current = handleSelectProject;
  }, [handleSelectProject]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyRoute = async () => {
      const route = parseRouteFromPath(window.location.pathname);
      const normalizedProjectId = projectId == null ? null : String(projectId);
      if (!route.projectId) {
        hasAppliedInitialRouteRef.current = true;
        return;
      }

      isApplyingRouteRef.current = true;
      try {
        if (route.projectId !== normalizedProjectId) {
          if (loadingRouteProjectRef.current === route.projectId) return;
          loadingRouteProjectRef.current = route.projectId;
          await handleSelectProjectRef.current(route.projectId);
          return;
        }

        if (route.viewMode === 'graph' || route.viewMode === 'overview') {
          setViewMode(route.viewMode);
          setActiveDecisionId(null);
          if (route.pillarId) setActivePillarId(route.pillarId);
          hasAppliedInitialRouteRef.current = true;
          return;
        }

        if (route.viewMode === 'decision' && route.decisionId) {
          const resolvedPillarId = route.pillarId && findNodeById(pillars, route.pillarId)
            ? route.pillarId
            : findPillarContainingDecision(pillars, route.decisionId);

          if (resolvedPillarId) setActivePillarId(resolvedPillarId);
          setActiveDecisionId(route.decisionId);
          setViewMode('decision');
          hasAppliedInitialRouteRef.current = true;
          return;
        }

        setViewMode('pillar');
        setActiveDecisionId(null);
        if (route.pillarId && findNodeById(pillars, route.pillarId)) {
          setActivePillarId(route.pillarId);
        }
        hasAppliedInitialRouteRef.current = true;
      } finally {
        loadingRouteProjectRef.current = null;
        setTimeout(() => {
          isApplyingRouteRef.current = false;
        }, 0);
      }
    };

    applyRoute();

    const handlePopState = () => {
      applyRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projectId, pillars]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasAppliedInitialRouteRef.current) return;
    if (isApplyingRouteRef.current) return;

    const nextPath = buildPathFromState({
      projectId,
      viewMode,
      activePillarId,
      activeDecisionId
    });

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [projectId, viewMode, activePillarId, activeDecisionId]);

  // Save/restore scroll position on view switch
  React.useEffect(() => {
    const viewKey = `${viewMode}-${activePillarId || 'none'}`;
    const prev = prevViewKeyRef.current;
    if (prev && prev !== viewKey && scrollContainerRef.current) {
      scrollPositions.current[prev] = scrollContainerRef.current.scrollTop;
    }
    prevViewKeyRef.current = viewKey;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPositions.current[viewKey] || 0;
      }
    });
  }, [viewMode, activePillarId]);

  // Update unread count when drawer opens
  React.useEffect(() => {
    if (isChatDrawerOpen) {
      lastSeenMessageCount.current = messages.length;
      setChatFocusTrigger(v => v + 1);
    }
  }, [isChatDrawerOpen, messages.length]);

  const unreadMessageCount = isChatDrawerOpen ? 0 : Math.max(0, messages.length - lastSeenMessageCount.current);

  const handleNewProjectAction = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    handleNewProject();
    setIsChatDrawerOpen(true);
    setChatFocusTrigger((value) => value + 1);
  };

  return (
    <div className="app-layout">
      {isSettingsOpen && (
        <SettingsModal
          currentConfig={llmConfig}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveLlmConfig}
        />
      )}

      <Sidebar
        pillars={pillars}
        activePillarId={activePillarId}
        activeDecisionId={activeDecisionId}
        onSelectPillar={(node) => setActivePillarId(node.id)}
        onSelectDecision={(pillarId, decisionId) => {
          setActivePillarId(pillarId);
          setActiveDecisionId(decisionId);
          setViewMode('decision');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentProjectId={projectId}
        currentProjectName={''}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProjectAction}
        agentFeedback={agentFeedback}
        onExport={handleExport}
      />

      <main className="main-workspace">

        {errorMessage && (
          <div className="agent-alerts glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--color-conflict)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: 'var(--color-conflict)', marginBottom: '0.25rem' }}>System Error</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{errorMessage}</p>
            </div>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setErrorMessage(null)}>Dismiss</button>
          </div>
        )}

        <NotificationTray 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)}
          feedback={agentFeedback}
          activePillarId={activePillarId}
        />

        <div className="workspace-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div ref={scrollContainerRef} className="pillar-details-pane" style={{ flex: 1, overflowY: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="workspace-toolbar">
              <Breadcrumbs
                projectName={projectName}
                pillars={pillars}
                activePillarId={activePillarId}
                activeDecisionId={activeDecisionId}
                viewMode={viewMode}
                onNavigate={({ pillarId, decisionId, viewMode: mode }) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode(mode);
                }}
              />
              <div className="workspace-toolbar-actions">
                <button className={`view-tab btn-secondary ${viewMode === 'pillar' ? 'active' : ''}`} onClick={() => setViewMode('pillar')} title="Pillar Details">
                  <VscFileSubmodule /> Details
                </button>
                <button className={`view-tab btn-secondary ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => setViewMode('graph')} title="Dependency Graph">
                  <VscGraph /> Graph
                </button>
                <button className={`view-tab btn-secondary ${viewMode === 'overview' ? 'active' : ''}`} onClick={() => setViewMode('overview')} title="Project Overview">
                  <VscBook /> Overview
                </button>
                {activeDecisionId && (
                  <button className={`view-tab btn-secondary ${viewMode === 'decision' ? 'active' : ''}`} onClick={() => setViewMode('decision')} title="Decision Focus">
                    Focus
                  </button>
                )}
                <div style={{ position: 'relative', cursor: 'pointer', marginLeft: '0.5rem' }} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
                  <VscBell size={18} style={{ opacity: 0.7 }} />
                  {agentFeedback.metadataReport.length > 0 && (
                    <span className="notification-badge">
                      {agentFeedback.metadataReport.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ViewTransition viewKey={`${viewMode}-${activePillarId || 'none'}`}>
            {viewMode === 'graph' ? (
              <GraphView 
                pillars={pillars}
                projectId={projectId}
                onSelectDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('decision');
                }} 
              />
            ) : viewMode === 'decision' ? (
              <DecisionFocusView
                pillars={pillars}
                decisionId={activeDecisionId}
                projectId={projectId}
                onApplyDecision={handleUpdateDecision}
                onExitFocus={() => setViewMode('pillar')}
                onJumpToDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('decision');
                }}
              />
            ) : viewMode === 'overview' ? (
              <ProjectOverview markdown={projectOverview} />
            ) : activePillar ? (
              <PillarWorkspace
                pillar={activePillar}
                allPillars={pillars}
                activeDecisionId={activeDecisionId}
                onUpdateDecision={handleUpdateDecision}
                onAddFeature={handleAddFeature}
                onDeleteFeature={handleDeleteFeature}
                onEditFeature={handleEditFeature}
                onJumpToDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('pillar');
                }}
                onBack={() => {
                  setActivePillarId(null);
                  setActiveDecisionId(null);
                }}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: 0.7 }}>
                <h2>Blueprint Overview</h2>
                <p>Select a node from the sidebar to view its extracted details.</p>
              </div>
            )}
            </ViewTransition>
          </div>
        </div>
      </main>

      {/* Chat Drawer */}
      {isChatDrawerOpen && <div className="modal-overlay chat-drawer-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setIsChatDrawerOpen(false)} />}
      <div className={`chat-drawer ${isChatDrawerOpen ? 'open' : ''}`}>
        <div className="chat-drawer-header">
          <h4 style={{ margin: 0, color: 'var(--text-heading)' }}>Agent</h4>
          <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsChatDrawerOpen(false)}>
            <VscClose size={14} />
          </button>
        </div>
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isWaiting={isWaiting}
          focusTrigger={chatFocusTrigger}
        />
      </div>

      {/* Chat FAB */}
      {!isChatDrawerOpen && (
        <button className="chat-trigger-fab" onClick={() => setIsChatDrawerOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Agent
          {unreadMessageCount > 0 && <span className="chat-badge">{unreadMessageCount}</span>}
        </button>
      )}
    </div>
  );
}

function NotificationTray({ isOpen, onClose, feedback, activePillarId }) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const filteredItems = React.useMemo(() => {
    if (!activePillarId) return feedback.metadataReport;
    return feedback.metadataReport.filter(item => item.pillarId === activePillarId || item.type === 'global');
  }, [feedback.metadataReport, activePillarId]);

  const groups = React.useMemo(() => {
    const g = { errors: [], warnings: [], info: [] };
    filteredItems.forEach(item => {
      if (item.severity === 'error') g.errors.push(item);
      else if (item.severity === 'warning') g.warnings.push(item);
      else g.info.push(item);
    });
    return g;
  }, [filteredItems]);

  return (
    <>
      {isOpen && <div className="modal-overlay" style={{ background: 'transparent' }} onClick={onClose} />}
      <div className={`notification-tray ${isOpen ? 'open' : ''}`}>
        <div className="notification-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <VscBell size={20} />
            <h4 style={{ margin: 0 }}>Agent Observations</h4>
          </div>
          <button className="btn-secondaryIcon" onClick={onClose} style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <VscClose size={20} />
          </button>
        </div>

        <div className="notification-content">
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activePillarId ? 'Active Pillar View' : 'Global Overview'}
            </span>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isExpanded ? <><VscChevronUp /> Collapse</> : <><VscChevronDown /> Expand</>}
            </button>
          </div>

          {isExpanded && (
            <div className="notification-list">
              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                  No observations for this view.
                </div>
              ) : (
                <>
                  {groups.errors.length > 0 && <div className="section-title">Critical Blockers</div>}
                  {groups.errors.map((item, i) => (
                    <div key={`err-${i}`} className="notification-item error">
                      <strong>{item.title || 'Error'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}

                  {groups.warnings.length > 0 && <div className="section-title">Quality Warnings</div>}
                  {groups.warnings.map((item, i) => (
                    <div key={`warn-${i}`} className="notification-item warning">
                      <strong>{item.title || 'Warning'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}

                  {groups.info.length > 0 && <div className="section-title">Context Tips</div>}
                  {groups.info.map((item, i) => (
                    <div key={`info-${i}`} className="notification-item info">
                      <strong>{item.title || 'Tip'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
