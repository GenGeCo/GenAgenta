<?php
/**
 * Debug endpoint - RIMUOVERE DOPO IL TEST
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Test 1: Carica env.php
    require_once __DIR__ . '/../config/env.php';

    // Test 2: Verifica se .env esiste
    $envPaths = [
        __DIR__ . '/../config/.env',
        __DIR__ . '/../.env',
        __DIR__ . '/../../.env',
    ];

    $foundPath = null;
    foreach ($envPaths as $path) {
        if (file_exists($path)) {
            $foundPath = $path;
            break;
        }
    }

    // Test 3: Prova a leggere le variabili
    $jwtSecret = env('JWT_SECRET', 'DEFAULT_NOT_FOUND');
    $geminiKey = env('GEMINI_API_KEY', 'DEFAULT_NOT_FOUND');

    echo json_encode([
        'success' => true,
        'env_file_found' => $foundPath,
        'jwt_secret_set' => ($jwtSecret !== 'DEFAULT_NOT_FOUND'),
        'jwt_secret_value' => substr($jwtSecret, 0, 10) . '...',
        'gemini_key_set' => ($geminiKey !== 'DEFAULT_NOT_FOUND'),
        'gemini_key_preview' => substr($geminiKey, 0, 10) . '...',
        'php_version' => PHP_VERSION
    ], JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
