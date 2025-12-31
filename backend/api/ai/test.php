<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'time' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'test' => 'deploy_working'
]);
