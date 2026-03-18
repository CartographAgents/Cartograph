import React from 'react';

export default function PillarWorkspace({ pillar, onUpdateDecision, onBack }) {
    if (!pillar) return null;

    return (
        <div className="pillar-workspace glass-panel">
            <div className="workspace-nav">
                <button className="btn-secondary" onClick={onBack}>&larr; Back</button>
                <h2>{pillar.title}</h2>
            </div>

            <div className="decision-container">
                <p className="pillar-description">{pillar.description}</p>

                <h3 className="section-title">Key Decisions</h3>
                {pillar.decisions && pillar.decisions.length > 0 ? (
                    <div className="decision-list">
                        {pillar.decisions.map(decision => (
                            <div key={decision.id} className={`decision-card ${decision.answer ? 'answered' : 'pending'}`}>
                                <h4>{decision.question}</h4>
                                <p className="decision-context">{decision.context}</p>

                                <div className="options-grid">
                                    {decision.options.map(opt => (
                                        <button
                                            key={opt}
                                            className={`btn-option ${decision.answer === opt ? 'selected' : ''}`}
                                            onClick={() => onUpdateDecision(pillar.id, decision.id, opt)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No decisions generated for this pillar.</p>
                )}
            </div>
        </div>
    );
}
