<?php
/**
 * Webhook per deploy automatico
 * Chiamato da GitHub Actions dopo la build
 */

// Chiave segreta per sicurezza
$secret = 'GenAgentaDeploy2024!';

// Verifica token
$token = $_GET['token'] ?? '';
if ($token !== $secret) {
    http_response_code(403);
    die('Accesso negato');
}

// Esegui git pull
$output = [];
$return = 0;

// Cambia alla directory del progetto
chdir(__DIR__);

// Pull dal remote
exec('git pull origin main 2>&1', $output, $return);

// Risposta
header('Content-Type: application/json');
echo json_encode([
    'success' => $return === 0,
    'output' => implode("\n", $output),
    'time' => date('Y-m-d H:i:s')
]);
