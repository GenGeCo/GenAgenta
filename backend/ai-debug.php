<?php
// Pagina debug AI - standalone, no auth required
// Accesso: https://www.gruppogea.net/genagenta/backend/ai-debug.php
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenAgenta AI Debug</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Monaco', 'Consolas', monospace;
            background: #1a1a2e;
            color: #eee;
            padding: 20px;
            min-height: 100vh;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #333;
        }
        h1 {
            font-size: 24px;
            color: #3b82f6;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .controls {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .btn-clear {
            background: #ef4444;
            color: white;
        }
        .btn-clear:hover {
            background: #dc2626;
        }
        .btn-pause {
            background: #f59e0b;
            color: white;
        }
        .btn-pause:hover {
            background: #d97706;
        }
        .btn-pause.paused {
            background: #22c55e;
        }
        .logs {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .log-entry {
            background: #252542;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #666;
        }
        .log-entry.USER_MESSAGE {
            border-left-color: #3b82f6;
        }
        .log-entry.API_REQUEST {
            border-left-color: #8b5cf6;
        }
        .log-entry.API_RESPONSE {
            border-left-color: #10b981;
        }
        .log-entry.TOOL_EXECUTED {
            border-left-color: #f59e0b;
        }
        .log-entry.TOOL_ERROR {
            border-left-color: #ef4444;
        }
        .log-entry.FINAL_RESPONSE {
            border-left-color: #22c55e;
            background: #1a2e1a;
        }
        .log-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .log-type {
            font-weight: bold;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
        }
        .log-time {
            color: #888;
            font-size: 12px;
        }
        .log-content {
            font-size: 13px;
            line-height: 1.5;
        }
        .log-content pre {
            background: #1a1a2e;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin-top: 8px;
        }
        .log-content .key {
            color: #8b5cf6;
        }
        .log-content .string {
            color: #22c55e;
        }
        .log-content .number {
            color: #f59e0b;
        }
        .log-content .boolean {
            color: #3b82f6;
        }
        .empty-state {
            text-align: center;
            padding: 60px;
            color: #666;
        }
        .tool-call {
            background: #1a1a2e;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 5px 0;
        }
        .tool-name {
            color: #f59e0b;
            font-weight: bold;
        }
        .message-preview {
            background: #1a1a2e;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 5px 0;
            border-left: 2px solid #666;
        }
        .message-preview.USER {
            border-left-color: #3b82f6;
        }
        .message-preview.ASSISTANT, .message-preview.AI_TOOL_CALL {
            border-left-color: #10b981;
        }
        .message-preview.TOOL_RESULT {
            border-left-color: #f59e0b;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GenAgenta AI Debug</h1>
        <div class="status">
            <div class="status-dot"></div>
            <span id="status-text">Live</span>
        </div>
        <div class="controls">
            <button class="btn-pause" id="pauseBtn" onclick="togglePause()">Pausa</button>
            <button class="btn-clear" onclick="clearLogs()">Pulisci Log</button>
        </div>
    </div>

    <div class="logs" id="logs">
        <div class="empty-state">
            In attesa di messaggi AI...
        </div>
    </div>

    <script>
        let isPaused = false;
        let lastTimestamp = 0;
        let allLogs = [];

        function togglePause() {
            isPaused = !isPaused;
            const btn = document.getElementById('pauseBtn');
            const statusText = document.getElementById('status-text');
            if (isPaused) {
                btn.textContent = 'Riprendi';
                btn.classList.add('paused');
                statusText.textContent = 'In pausa';
            } else {
                btn.textContent = 'Pausa';
                btn.classList.remove('paused');
                statusText.textContent = 'Live';
            }
        }

        async function clearLogs() {
            try {
                await fetch('api/ai/debug-log.php', { method: 'POST' });
                allLogs = [];
                lastTimestamp = 0;
                renderLogs();
            } catch (e) {
                console.error('Errore pulizia log:', e);
            }
        }

        function formatValue(value, depth = 0) {
            if (value === null) return '<span class="boolean">null</span>';
            if (typeof value === 'boolean') return `<span class="boolean">${value}</span>`;
            if (typeof value === 'number') return `<span class="number">${value}</span>`;
            if (typeof value === 'string') {
                if (value.length > 100 && depth > 0) {
                    return `<span class="string">"${escapeHtml(value.substring(0, 100))}..."</span>`;
                }
                return `<span class="string">"${escapeHtml(value)}"</span>`;
            }
            if (Array.isArray(value)) {
                if (value.length === 0) return '[]';
                if (depth > 2) return '[...]';
                return '[' + value.map(v => formatValue(v, depth + 1)).join(', ') + ']';
            }
            if (typeof value === 'object') {
                if (Object.keys(value).length === 0) return '{}';
                if (depth > 2) return '{...}';
                const entries = Object.entries(value).map(([k, v]) =>
                    `<span class="key">${k}</span>: ${formatValue(v, depth + 1)}`
                );
                return '{' + entries.join(', ') + '}';
            }
            return String(value);
        }

        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function renderLogEntry(log) {
            let content = '';

            switch (log.type) {
                case 'USER_MESSAGE':
                    content = `
                        <div><strong>Utente:</strong> ${log.user || 'unknown'}</div>
                        <div><strong>History:</strong> ${log.history_count} messaggi</div>
                        <div style="margin-top:10px; padding: 10px; background: #1a1a2e; border-radius: 4px;">
                            "${escapeHtml(log.data)}"
                        </div>
                    `;
                    break;

                case 'API_REQUEST':
                    content = `
                        <div><strong>Iterazione:</strong> ${log.data.iteration} | <strong>Messaggi:</strong> ${log.data.messages_count} | <strong>Payload:</strong> ${log.data.payload_size_kb}KB</div>
                        <div style="margin-top:10px;"><strong>Messaggi inviati:</strong></div>
                        ${(log.data.messages_preview || []).map(m => `
                            <div class="message-preview ${m.role}">
                                <strong>${m.role}</strong>: ${m.content ? escapeHtml(m.content) : ''}
                                ${m.tools ? m.tools.map(t => `<div class="tool-call"><span class="tool-name">${t.name}</span>(${JSON.stringify(t.args)})</div>`).join('') : ''}
                                ${m.preview ? `<pre>${escapeHtml(m.preview)}</pre>` : ''}
                            </div>
                        `).join('')}
                    `;
                    break;

                case 'API_RESPONSE':
                    content = `
                        <div><strong>Iterazione:</strong> ${log.data.iteration} | <strong>Finish:</strong> ${log.data.finish_reason}</div>
                        ${log.data.text_preview ? `<div style="margin-top:10px; padding: 10px; background: #1a2e1a; border-radius: 4px;">${escapeHtml(log.data.text_preview)}</div>` : ''}
                        ${log.data.tool_calls_count > 0 ? `
                            <div style="margin-top:10px;"><strong>Tool calls (${log.data.tool_calls_count}):</strong></div>
                            ${log.data.tool_calls.map(t => `
                                <div class="tool-call">
                                    <span class="tool-name">${t.name}</span>
                                    <pre>${JSON.stringify(t.args, null, 2)}</pre>
                                </div>
                            `).join('')}
                        ` : ''}
                    `;
                    break;

                case 'TOOL_EXECUTED':
                    content = `
                        <div class="tool-call">
                            <span class="tool-name">${log.data.name}</span>
                            ${log.data.success ? '<span style="color:#22c55e;margin-left:10px;">OK</span>' : '<span style="color:#ef4444;margin-left:10px;">ERRORE</span>'}
                        </div>
                        <div><strong>Args:</strong> <pre>${JSON.stringify(log.data.args, null, 2)}</pre></div>
                        <div><strong>Result:</strong> <pre>${typeof log.data.result_preview === 'string' ? escapeHtml(log.data.result_preview) : JSON.stringify(log.data.result_preview, null, 2)}</pre></div>
                    `;
                    break;

                case 'TOOL_ERROR':
                    content = `
                        <div class="tool-call">
                            <span class="tool-name">${log.data.name}</span>
                            <span style="color:#ef4444;margin-left:10px;">ERRORE</span>
                        </div>
                        <div style="color:#ef4444;">${escapeHtml(log.data.error)}</div>
                    `;
                    break;

                case 'FINAL_RESPONSE':
                    content = `
                        <div><strong>Iterazioni:</strong> ${log.data.iterations} | <strong>Azioni:</strong> ${log.data.actions_count}</div>
                        <div style="margin-top:10px; padding: 10px; background: #1a2e1a; border-radius: 4px;">
                            ${escapeHtml(log.data.response_preview)}
                        </div>
                        ${log.data.actions_count > 0 ? `
                            <div style="margin-top:10px;"><strong>Azioni frontend:</strong></div>
                            <pre>${JSON.stringify(log.data.actions, null, 2)}</pre>
                        ` : ''}
                    `;
                    break;

                default:
                    content = `<pre>${JSON.stringify(log.data, null, 2)}</pre>`;
            }

            return `
                <div class="log-entry ${log.type}">
                    <div class="log-header">
                        <span class="log-type">${log.type}</span>
                        <span class="log-time">${log.time}</span>
                    </div>
                    <div class="log-content">${content}</div>
                </div>
            `;
        }

        function renderLogs() {
            const container = document.getElementById('logs');
            if (allLogs.length === 0) {
                container.innerHTML = '<div class="empty-state">In attesa di messaggi AI...</div>';
                return;
            }
            container.innerHTML = allLogs.map(renderLogEntry).join('');
            // Scroll to bottom
            window.scrollTo(0, document.body.scrollHeight);
        }

        async function fetchLogs() {
            if (isPaused) return;

            try {
                const url = lastTimestamp ? `api/ai/debug-log.php?since=${lastTimestamp}` : 'api/ai/debug-log.php';
                const response = await fetch(url);
                const newLogs = await response.json();

                if (newLogs.length > 0) {
                    allLogs = allLogs.concat(newLogs);
                    // Mantieni solo ultimi 100 log in UI
                    if (allLogs.length > 100) {
                        allLogs = allLogs.slice(-100);
                    }
                    lastTimestamp = newLogs[newLogs.length - 1].timestamp;
                    renderLogs();
                }
            } catch (e) {
                console.error('Errore fetch log:', e);
            }
        }

        // Polling ogni secondo
        setInterval(fetchLogs, 1000);

        // Fetch iniziale
        fetchLogs();
    </script>
</body>
</html>
