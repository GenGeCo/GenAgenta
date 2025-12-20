<?php
// File di test - mostra info debug
header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'time' => date('Y-m-d H:i:s'),
    'file_exists_me' => file_exists(__DIR__ . '/auth/me.php'),
    'me_content_preview' => substr(file_get_contents(__DIR__ . '/auth/me.php'), 0, 200)
]);
