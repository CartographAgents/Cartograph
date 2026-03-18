import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface({ messages, onSendMessage, isWaiting }) {
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isWaiting) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="chat-container glass-panel">
            <div className="chat-history">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role === 'agent' ? 'agent-message' : 'user-message'}`}>
                        <div className="avatar">{msg.role === 'agent' ? 'A' : 'U'}</div>
                        <div className="bubble" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}></div>
                    </div>
                ))}
                {isWaiting && (
                    <div className="message agent-message">
                        <div className="avatar">A</div>
                        <div className="bubble typing-indicator">Thinking...</div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="chat-input-area">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="e.g. A social network for dogs..."
                    rows="3"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                ></textarea>
                <button className="btn-primary" onClick={handleSend} disabled={isWaiting}>
                    Send
                </button>
            </div>
        </div>
    );
}
