<?php
/**
 * Test endpoint per vedere errori PHP
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Test 1: Carica il prompt
    $promptFile = __DIR__ . '/../../config/ai/prompt_base.txt';
    if (!file_exists($promptFile)) {
        echo json_encode(['error' => 'Prompt file not found', 'path' => $promptFile]);
        exit;
    }

    $prompt = file_get_contents($promptFile);
    if ($prompt === false) {
        echo json_encode(['error' => 'Cannot read prompt file']);
        exit;
    }

    // Test 2: Verifica API key
    require_once __DIR__ . '/../../config/database.php';
    $OPENROUTER_API_KEY = getenv('OPENROUTER_API_KEY') ?: (defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : null);

    echo json_encode([
        'success' => true,
        'prompt_length' => strlen($prompt),
        'prompt_preview' => substr($prompt, 0, 200),
        'has_api_key' => !empty($OPENROUTER_API_KEY),
        'php_version' => PHP_VERSION
    ]);

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
