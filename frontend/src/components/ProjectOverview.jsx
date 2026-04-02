import React from 'react';
import { renderMessageContent } from '../utils/markdownRenderer';

export default function ProjectOverview({ markdown }) {
    return (
        <div className="glass-panel" style={{ height: '100%', overflow: 'auto', padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Project Overview</h2>
            <div className="markdown-body">
                {markdown ? renderMessageContent(markdown) : (
                    <p style={{ opacity: 0.6 }}>Overview will appear here after the project is saved.</p>
                )}
            </div>
        </div>
    );
}
