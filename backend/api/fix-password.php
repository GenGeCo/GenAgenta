<?php
/**
 * Script temporaneo per fix password
 * ELIMINARE DOPO L'USO!
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

// Genera hash per admin123
$password = 'admin123';
$hash = password_hash($password, PASSWORD_DEFAULT);

// Aggiorna nel database
$db = getDB();
$stmt = $db->prepare('UPDATE utenti SET password_hash = ? WHERE email = ?');
$result = $stmt->execute([$hash, 'admin@gruppogea.net']);

if ($result) {
    echo json_encode([
        'success' => true,
        'message' => 'Password aggiornata!',
        'hash' => $hash
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Errore aggiornamento'
    ]);
}
