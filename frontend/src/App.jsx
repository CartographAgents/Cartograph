import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import ProjectsPanel from './components/ProjectsPanel';
import DependencyGraph from './components/DependencyGraph';
import { VscFileSubmodule, VscGraph } from 'react-icons/vsc';
import { useAppLogic } from './hooks/useAppLogic';

function App() {
  const {
    messages,
    isWaiting,
    pillars,
    activePillarId,
    setActivePillarId,
    activePillar,
    agentFeedback,
    projectId,
    errorMessage,
    setErrorMessage,
    isProjectsOpen,
    setIsProjectsOpen,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
    setLlmConfig,
    handleNewProject,
    handleSelectProject,
    handleSendMessage,
    handleUpdateDecision,
    handleExport
  } = useAppLogic();

  return (
    <div className="app-layout">
      <ProjectsPanel
        currentProjectId={projectId}
        isOpen={isProjectsOpen}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onToggle={() => setIsProjectsOpen(!isProjectsOpen)}
      />

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSave={config => setLlmConfig(config)}
        />
      )}

      <Sidebar
        pillars={pillars}
        activePillarId={activePillarId}
        onSelectPillar={(node) => setActivePillarId(node.id)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-workspace">
        <header className="workspace-header glass-panel">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className={`btn-secondary ${viewMode === 'pillar' ? 'active' : ''}`}
              style={{ 
                padding: '0.25rem 0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                borderColor: viewMode === 'pillar' ? '#3b82f6' : 'rgba(255,255,255,0.1)' 
              }}
              onClick={() => setViewMode('pillar')}
              title="Pillar Details"
            >
              <VscFileSubmodule /> Details
            </button>
            <button 
              className={`btn-secondary ${viewMode === 'graph' ? 'active' : ''}`}
              style={{ 
                padding: '0.25rem 0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                borderColor: viewMode === 'graph' ? '#10b981' : 'rgba(255,255,255,0.1)' 
              }}
              onClick={() => setViewMode('graph')}
              title="Dependency Graph"
            >
              <VscGraph /> Graph
            </button>
          </div>
          <h3>Architecture Blueprint</h3>
          <button
            className="btn-primary"
            onClick={handleExport}
            title="Export Blueprint"
          >
            Export .zip
          </button>
        </header>

        {errorMessage && (
          <div className="agent-alerts glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #ef4444', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#ef4444', marginBottom: '0.25rem' }}>System Error</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{errorMessage}</p>
            </div>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setErrorMessage(null)}>Dismiss</button>
          </div>
        )}

        {agentFeedback.length > 0 && (
          <div className="agent-alerts glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b', marginBottom: '1rem' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Agent Observations</h4>
            <ul>
              {agentFeedback.map((fb, i) => <li key={i}>{fb}</li>)}
            </ul>
          </div>
        )}

        <div className="workspace-content" style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 120px)' }}>
          <div className="pillar-details-pane" style={{ flex: 1, overflowY: 'auto' }}>
            {viewMode === 'graph' ? (
              <DependencyGraph pillars={pillars} />
            ) : activePillar ? (
              <PillarWorkspace
                pillar={activePillar}
                onUpdateDecision={handleUpdateDecision}
                onBack={() => setActivePillarId(null)}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: 0.7 }}>
                <h2>Blueprint Overview</h2>
                <p>Select a node from the sidebar to view its extracted details.</p>
              </div>
            )}
          </div>
          <div className="chat-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isWaiting={isWaiting}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
