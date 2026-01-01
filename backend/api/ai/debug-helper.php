<?php
/**
 * Helper per scrivere log AI leggibili
 */

function aiDebugLog($type, $data, $extra = []) {
    $logFile = __DIR__ . '/../../logs/ai_debug.json';
    $logDir = dirname($logFile);

    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    // Leggi log esistenti
    $logs = [];
    if (file_exists($logFile)) {
        $content = file_get_contents($logFile);
        $logs = json_decode($content, true) ?: [];
    }

    // Mantieni solo ultimi 200 log
    if (count($logs) > 200) {
        $logs = array_slice($logs, -100);
    }

    // Formatta il dato in modo leggibile
    $entry = [
        'id' => uniqid(),
        'timestamp' => microtime(true),
        'time' => date('H:i:s'),
        'type' => $type,
        'data' => $data
    ];

    if (!empty($extra)) {
        $entry = array_merge($entry, $extra);
    }

    $logs[] = $entry;

    file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Funzione per formattare messaggi in modo leggibile
function formatMessagesForDebug($messages) {
    $formatted = [];
    foreach ($messages as $msg) {
        $role = $msg['role'] ?? 'unknown';
        $content = $msg['content'] ?? '';

        if ($role === 'tool') {
            // Tool result - tronca se troppo lungo
            $toolId = $msg['tool_call_id'] ?? 'unknown';
            $content = strlen($content) > 500 ? substr($content, 0, 500) . '...[TRONCATO]' : $content;
            $formatted[] = [
                'role' => 'TOOL_RESULT',
                'tool_id' => substr($toolId, -8),
                'preview' => $content
            ];
        } elseif ($role === 'assistant' && isset($msg['tool_calls'])) {
            // Assistant con tool calls
            $tools = [];
            foreach ($msg['tool_calls'] as $tc) {
                $tools[] = [
                    'name' => $tc['function']['name'] ?? 'unknown',
                    'args' => json_decode($tc['function']['arguments'] ?? '{}', true)
                ];
            }
            $formatted[] = [
                'role' => 'AI_TOOL_CALL',
                'tools' => $tools,
                'text' => $msg['content'] ?? null
            ];
        } else {
            // Messaggio normale
            $formatted[] = [
                'role' => strtoupper($role),
                'content' => strlen($content) > 300 ? substr($content, 0, 300) . '...' : $content
            ];
        }
    }
    return $formatted;
}
