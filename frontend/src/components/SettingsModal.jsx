import React, { useState } from 'react';

export default function SettingsModal({ onClose, onSave, currentConfig }) {
    const [keys, setKeys] = useState(currentConfig?.keys || { openai: '', anthropic: '', gemini: '' });
    const [provider, setProvider] = useState(currentConfig?.provider || 'mock');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ keys, provider });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <h2>LLM Settings (BYOK)</h2>
                <p className="modal-desc">Provide your APIs keys to empower Cartograph with real AI. Settings are persisted in the backend database.</p>

                <div className="form-group">
                    <label>Active Provider</label>
                    <select value={provider} onChange={e => setProvider(e.target.value)}>
                        <option value="mock">Mock Agent (Testing)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="gemini">Google Gemini</option>
                    </select>
                </div>

                {provider !== 'mock' && (
                    <div className="form-group">
                        <label>{provider === 'openai' ? 'OpenAI API Key' : provider === 'anthropic' ? 'Anthropic API Key' : 'Gemini API Key'}</label>
                        <input
                            type="password"
                            placeholder={`sk-...`}
                            value={keys[provider]}
                            onChange={e => setKeys({ ...keys, [provider]: e.target.value })}
                        />
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
