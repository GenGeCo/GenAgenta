<?php
/**
 * Test endpoint che simula l'ambiente COMPLETO di chat.php
 * per isolare il bug 500 su get_user_actions
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$debug = [];

try {
    $debug[] = 'Step 1: Reading POST body';
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $debug[] = 'Step 2: Extracting userActions';
    $context = $data['context'] ?? null;
    $userActions = $context['userActions'] ?? [];
    $debug[] = 'userActions count: ' . count($userActions);

    $debug[] = 'Step 3: Setting global';
    $GLOBALS['ai_user_actions'] = $userActions;

    $debug[] = 'Step 4: Including database.php';
    require_once __DIR__ . '/../../config/database.php';

    $debug[] = 'Step 5: Including helpers.php';
    require_once __DIR__ . '/../../includes/helpers.php';

    $debug[] = 'Step 6: Including tools.php';
    require_once __DIR__ . '/tools.php';

    $debug[] = 'Step 7: Calling tool_getUserActions()';
    $result = tool_getUserActions();
    $debug[] = 'Result keys: ' . implode(', ', array_keys($result));

    $debug[] = 'Step 8: JSON encoding result';
    $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE);
    $jsonError = json_last_error_msg();
    $debug[] = "JSON length: " . strlen($resultJson) . ", error: $jsonError";

    $debug[] = 'Step 9: Building tool message';
    $toolMessage = [
        'role' => 'tool',
        'tool_call_id' => 'test_123',
        'content' => $resultJson
    ];

    $debug[] = 'Step 10: JSON encoding tool message';
    $toolMessageJson = json_encode($toolMessage, JSON_UNESCAPED_UNICODE);
    $jsonError2 = json_last_error_msg();
    $debug[] = "Tool message JSON length: " . strlen($toolMessageJson) . ", error: $jsonError2";

    echo json_encode([
        'success' => true,
        'debug_steps' => $debug,
        'result' => $result,
        'result_json_valid' => json_last_error() === JSON_ERROR_NONE,
        'tool_message_valid' => !empty($toolMessageJson)
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'error' => 'Exception',
        'debug_steps' => $debug,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
} catch (Error $e) {
    echo json_encode([
        'fatal_error' => 'Error',
        'debug_steps' => $debug,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
