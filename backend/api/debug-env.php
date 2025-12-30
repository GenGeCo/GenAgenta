<?php
/**
 * Debug endpoint - RIMUOVERE DOPO IL TEST
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$results = [];

try {
    // Test 1: Carica config (che include env.php)
    $results['step1_config'] = 'loading...';
    require_once __DIR__ . '/../config/config.php';
    $results['step1_config'] = 'OK';

    // Test 2: Carica database
    $results['step2_database'] = 'loading...';
    require_once __DIR__ . '/../config/database.php';
    $results['step2_database'] = 'OK';

    // Test 3: Carica helpers
    $results['step3_helpers'] = 'loading...';
    require_once __DIR__ . '/../includes/helpers.php';
    $results['step3_helpers'] = 'OK';

    // Test 4: Connessione DB
    $results['step4_db_connect'] = 'connecting...';
    $db = getDB();
    $results['step4_db_connect'] = 'OK';

    // Test 5: JWT Secret
    $results['step5_jwt_secret'] = defined('JWT_SECRET') ? substr(JWT_SECRET, 0, 10) . '...' : 'NOT DEFINED';

    // Test 6: Genera un JWT di test
    $results['step6_jwt_generate'] = 'generating...';
    $testToken = generateJWT(['test' => 'data', 'user_id' => 'test123']);
    $results['step6_jwt_generate'] = 'OK - token length: ' . strlen($testToken);

    // Test 7: Verifica il JWT
    $results['step7_jwt_verify'] = 'verifying...';
    $decoded = verifyJWT($testToken);
    $results['step7_jwt_verify'] = $decoded ? 'OK' : 'FAILED';

    $results['success'] = true;

} catch (Throwable $e) {
    $results['success'] = false;
    $results['error'] = $e->getMessage();
    $results['error_file'] = $e->getFile();
    $results['error_line'] = $e->getLine();
}

echo json_encode($results, JSON_PRETTY_PRINT);
