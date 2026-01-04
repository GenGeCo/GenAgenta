<?php
/**
 * Test endpoint per debug get_user_actions
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Leggi il body JSON
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $context = $data['context'] ?? null;
    $userActions = $context['userActions'] ?? [];

    // Simula quello che fa il tool
    $result = [
        'raw_json' => $json,
        'parsed_data' => $data,
        'context' => $context,
        'userActions' => $userActions,
        'userActions_count' => count($userActions),
    ];

    // Prova a formattare come fa il tool
    if (!empty($userActions)) {
        $formattedActions = [];
        foreach ($userActions as $action) {
            $formatted = [
                'tipo' => $action['type'] ?? 'unknown',
                'quando' => $action['timestamp'] ?? 'unknown'
            ];

            $actionData = $action['data'] ?? [];

            switch ($action['type'] ?? '') {
                case 'map_click':
                    $formatted['descrizione'] = sprintf(
                        'Click sulla mappa in posizione (%.4f, %.4f)',
                        $actionData['lat'] ?? 0,
                        $actionData['lng'] ?? 0
                    );
                    break;

                case 'map_move':
                    $center = $actionData['center'] ?? [];
                    $formatted['descrizione'] = sprintf(
                        'Spostata mappa a (%.4f, %.4f) zoom %s',
                        $center['lat'] ?? 0,
                        $center['lng'] ?? 0,
                        $actionData['zoom'] ?? 'sconosciuto'
                    );
                    break;

                default:
                    $formatted['descrizione'] = 'Altro tipo: ' . ($action['type'] ?? 'null');
            }

            $formattedActions[] = $formatted;
        }
        $result['formatted'] = $formattedActions;
    }

    echo json_encode($result, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
} catch (Error $e) {
    echo json_encode([
        'fatal_error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
