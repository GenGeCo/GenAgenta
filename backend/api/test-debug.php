<?php
// File di test - simula chiamata a /auth/me
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

$result = [
    'step' => 'start',
    'php_version' => PHP_VERSION,
    'time' => date('Y-m-d H:i:s')
];

try {
    // Step 1: Carica config
    $result['step'] = 'loading config';
    require_once __DIR__ . '/../config/config.php';
    $result['config_loaded'] = true;
    $result['environment'] = ENVIRONMENT;

    // Step 2: Carica database
    $result['step'] = 'loading database';
    require_once __DIR__ . '/../config/database.php';
    $result['database_loaded'] = true;

    // Step 3: Carica helpers
    $result['step'] = 'loading helpers';
    require_once __DIR__ . '/../includes/helpers.php';
    $result['helpers_loaded'] = true;

    // Step 4: Prova connessione DB
    $result['step'] = 'connecting to db';
    $db = getDB();
    $result['db_connected'] = true;

    // Step 5: Prova query semplice
    $result['step'] = 'test query';
    $stmt = $db->query('SELECT COUNT(*) as cnt FROM utenti');
    $count = $stmt->fetch();
    $result['utenti_count'] = $count['cnt'];

    // Step 6: Controlla colonne tabella utenti
    $result['step'] = 'check columns';
    $cols = $db->query("SHOW COLUMNS FROM utenti");
    $result['utenti_columns'] = array_column($cols->fetchAll(), 'Field');

    $result['step'] = 'complete';
    $result['success'] = true;

} catch (Exception $e) {
    $result['error'] = $e->getMessage();
    $result['error_file'] = $e->getFile();
    $result['error_line'] = $e->getLine();
} catch (Error $e) {
    $result['fatal_error'] = $e->getMessage();
    $result['error_file'] = $e->getFile();
    $result['error_line'] = $e->getLine();
}

echo json_encode($result, JSON_PRETTY_PRINT);
