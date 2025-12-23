<?php
/**
 * GenAgenTa API v2 - Router principale
 * Riscrittura pulita con terminologia corretta
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Includes
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

// Helper function (deve essere prima dell'uso)
function is_uuid($str) {
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $str);
}

// Parse URL
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/genagenta/backend/api_v2';
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace($basePath, '', $path);
$path = str_replace('/index.php', '', $path);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$subResource = $segments[2] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// Route mapping
$routes = [
    // Auth
    'auth/login' => 'auth/login.php',
    'auth/register' => 'auth/register.php',
    'auth/me' => 'auth/me.php',
    'auth/verify-pin' => 'auth/verify-pin.php',

    // Tipi entità (CRUD)
    'tipi' => 'tipi/index.php',

    // Tipologie (CRUD)
    'tipologie' => 'tipologie/index.php',

    // Tipi connessione (CRUD)
    'tipi-connessione' => 'tipi-connessione/index.php',

    // Campi personalizzati per tipo
    'campi' => 'campi/index.php',

    // Entita (CRUD)
    'entita' => 'entita/index.php',

    // Connessioni (CRUD)
    'connessioni' => 'connessioni/index.php',

    // Vendite per famiglia prodotto
    'vendite' => 'vendite/index.php',

    // Team
    'team' => 'team/index.php',
    'team/membri' => 'team/membri.php',
    'team/inviti' => 'team/inviti.php',
];

// Find route
$routeKey = $resource;
if ($subResource) {
    $routeKey = "$resource/$subResource";
} elseif ($id && !is_uuid($id)) {
    $routeKey = "$resource/$id";
}

// Check if route exists
$routeFile = $routes[$routeKey] ?? $routes[$resource] ?? null;

if (!$routeFile) {
    errorResponse('Endpoint non trovato', 404);
}

// Pass ID to included file
$_REQUEST['id'] = $id;

// Include route handler
require_once __DIR__ . '/' . $routeFile;
