import React from 'react';

export default function Sidebar({ pillars, activePillar, onSelectPillar }) {
    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-header">
                <h2>Cartograph</h2>
                <span className="badge">Agent Mode</span>
            </div>
            <div className="sidebar-content">
                {pillars && pillars.length > 0 ? (
                    <nav className="pillar-nav">
                        {pillars.map(p => (
                            <button
                                key={p.id}
                                className={`pillar-btn ${activePillar?.id === p.id ? 'active' : ''}`}
                                onClick={() => onSelectPillar(p)}
                            >
                                {p.title}
                            </button>
                        ))}
                    </nav>
                ) : (
                    <p className="empty-state">No pillars generated yet. Describe your app idea to begin.</p>
                )}
            </div>
        </aside>
    );
}
