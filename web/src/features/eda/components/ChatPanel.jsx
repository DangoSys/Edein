import React from 'react';
import sendIcon from '../../../assets/send.svg';

export function ChatPanel({
  items,
  message,
  busy,
  onChangeMessage,
  onSend
}) {
  const canSend = message.trim().length > 0 && !busy;
  const empty = items.length === 0;
  return (
    <div className="chat-box">
      <div className="chat-header">
        <div className="panel-title">Chat</div>
      </div>
      <div className={`chat-list ${empty ? 'empty' : ''}`}>
        {empty ? (
          <div className="chat-empty">
            <div className="edein-icon" aria-hidden="true">
              <div className="edein-face" />
            </div>
            <div className="edein-label">EDEIN</div>
            <div className="chat-empty-text">Ask Edein anything to get started</div>
          </div>
        ) : null}
        {items.map((item) => (
          <div key={item.id} className={`chat-item ${item.role}`}>
            <div className="chat-role">{item.role}</div>
            <div className="chat-bubble">
              <div className="chat-text">{item.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-form">
        <textarea
          value={message}
          onChange={(e) => onChangeMessage(e.target.value)}
          placeholder="Ask Edein anything, @ to add a tile/core/ball, $ for skills"
        />
        <button type="button" disabled={!canSend} onClick={onSend} className="send-btn">
          <img src={sendIcon} alt="Send" />
        </button>
      </div>
    </div>
  );
}
