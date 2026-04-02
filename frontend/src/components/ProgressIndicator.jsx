import React, { useMemo } from 'react';
import { flattenAllDecisions } from '../utils/treeUtils';

export default function ProgressIndicator({ pillars, agentFeedback, onExport }) {
    const counts = useMemo(() => {
        const all = flattenAllDecisions(pillars);
        const total = all.length;
        const resolved = all.filter(d => d.answer && !d.conflict).length;
        const conflicts = all.filter(d => !!d.conflict).length;
        const pending = total - resolved - conflicts;
        const percent = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { total, resolved, conflicts, pending, percent };
    }, [pillars]);

    const exportReady = agentFeedback.isValid && counts.conflicts === 0 && counts.total > 0 && counts.percent > 0;

    if (counts.total === 0) return null;

    return (
        <div className="progress-indicator">
            <div className="progress-bar">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${counts.percent}%` }}
                />
            </div>
            <div className="progress-text">
                <span>{counts.resolved}/{counts.total} resolved</span>
                {counts.conflicts > 0 && (
                    <span className="progress-conflicts">{counts.conflicts} conflict{counts.conflicts !== 1 ? 's' : ''}</span>
                )}
            </div>
            <button
                className={`btn-primary progress-export-btn ${!exportReady ? 'disabled' : ''}`}
                onClick={onExport}
                disabled={!exportReady}
                title={exportReady ? 'Export Blueprint' : 'Resolve all decisions to export'}
            >
                Export .zip
            </button>
        </div>
    );
}
