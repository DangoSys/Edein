import React from 'react';

export function ChatPanel({
  items,
  message,
  payload,
  busy,
  onChangeMessage,
  onChangePayload,
  onSend
}) {
  return (
    <div className="chat-box">
      <div className="panel-title">Workflow Chat</div>
      <div className="chat-list">
        {items.length === 0 ? <div className="hint">send a message</div> : null}
        {items.map((item) => (
          <div key={item.id} className={`chat-item ${item.role}`}>
            <div className="chat-role">{item.role}</div>
            <pre>{item.text}</pre>
          </div>
        ))}
      </div>
      <div className="chat-form">
        <textarea
          value={message}
          onChange={(e) => onChangeMessage(e.target.value)}
          placeholder="natural language message"
        />
        <textarea
          value={payload}
          onChange={(e) => onChangePayload(e.target.value)}
          placeholder='json payload, e.g. {"intent":"run"}'
        />
        <button type="button" disabled={busy} onClick={onSend}>Send</button>
      </div>
    </div>
  );
}
