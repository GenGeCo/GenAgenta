<?php
/**
 * GET /ai/debug-log.php - Legge il log AI in tempo reale
 * POST /ai/debug-log.php - Pulisce il log
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$logFile = __DIR__ . '/../../logs/ai_debug.json';
$logDir = dirname($logFile);

// Crea directory se non esiste
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

// POST = pulisci log
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    file_put_contents($logFile, json_encode([], JSON_PRETTY_PRINT));
    echo json_encode(['success' => true, 'message' => 'Log pulito']);
    exit;
}

// GET = leggi log
if (!file_exists($logFile)) {
    echo json_encode([]);
    exit;
}

$content = file_get_contents($logFile);
$logs = json_decode($content, true) ?: [];

// Opzionale: filtra per timestamp (ultimi N secondi)
$since = $_GET['since'] ?? null;
if ($since) {
    $logs = array_filter($logs, function($log) use ($since) {
        return ($log['timestamp'] ?? 0) > $since;
    });
    $logs = array_values($logs);
}

echo json_encode($logs);
