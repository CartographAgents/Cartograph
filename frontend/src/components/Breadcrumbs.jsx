import React from 'react';
import { findNodeById } from '../utils/treeUtils';

export default function Breadcrumbs({ projectName, pillars, activePillarId, activeDecisionId, onNavigate }) {
    const pillarNode = activePillarId ? findNodeById(pillars, activePillarId) : null;

    let decisionQuestion = null;
    if (activeDecisionId && pillarNode) {
        const findDecision = (node) => {
            for (const d of node.decisions || []) {
                if (d.id === activeDecisionId) return d.question;
            }
            for (const sub of node.subcategories || []) {
                const found = findDecision(sub);
                if (found) return found;
            }
            return null;
        };
        decisionQuestion = findDecision(pillarNode);
    }

    const segments = [];

    // Segment 1: Project name
    segments.push({
        label: projectName || 'New Project',
        onClick: () => onNavigate({ pillarId: null, decisionId: null, viewMode: 'pillar' }),
    });

    // Segment 2: Active pillar
    if (pillarNode) {
        segments.push({
            label: pillarNode.title,
            onClick: () => onNavigate({ pillarId: activePillarId, decisionId: null, viewMode: 'pillar' }),
        });
    }

    // Segment 3: Active decision
    if (activeDecisionId && decisionQuestion) {
        const truncated = decisionQuestion.length > 40 ? decisionQuestion.substring(0, 40) + '...' : decisionQuestion;
        segments.push({
            label: truncated,
            onClick: () => onNavigate({ pillarId: activePillarId, decisionId: activeDecisionId, viewMode: 'decision' }),
        });
    }

    return (
        <nav className="breadcrumbs">
            {segments.map((seg, i) => {
                const isLast = i === segments.length - 1;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="breadcrumb-separator">&gt;</span>}
                        <button
                            className={`breadcrumb-segment ${isLast ? 'breadcrumb-active' : ''}`}
                            onClick={isLast ? undefined : seg.onClick}
                        >
                            {seg.label}
                        </button>
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
