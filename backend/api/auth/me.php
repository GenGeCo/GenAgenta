<?php
/**
 * GET /auth/me
 * Ottieni utente corrente con dati azienda
 */

$user = requireAuth();

$db = getDB();

// Query con JOIN per ottenere anche dati azienda
// Nota: foto_url è opzionale (migration_002)
$stmt = $db->prepare('
    SELECT
        u.id, u.email, u.nome, u.ruolo, u.ruolo_azienda, u.azienda_id, u.pin_hash,
        a.nome as nome_azienda,
        a.codice_pairing
    FROM utenti u
    LEFT JOIN aziende a ON u.azienda_id = a.id
    WHERE u.id = ? AND u.attivo = 1
');

// Prova a leggere foto_url se esiste
$hasFotoUrl = false;
try {
    $checkStmt = $db->query("SHOW COLUMNS FROM utenti LIKE 'foto_url'");
    $hasFotoUrl = $checkStmt->rowCount() > 0;
} catch (Exception $e) {
    // Ignora
}
$stmt->execute([$user['user_id']]);
$userData = $stmt->fetch();

if (!$userData) {
    errorResponse('Utente non trovato', 404);
}

// Leggi foto_url separatamente se la colonna esiste
$fotoUrl = null;
if ($hasFotoUrl) {
    $fotoStmt = $db->prepare('SELECT foto_url FROM utenti WHERE id = ?');
    $fotoStmt->execute([$user['user_id']]);
    $fotoRow = $fotoStmt->fetch();
    $fotoUrl = $fotoRow['foto_url'] ?? null;
}

jsonResponse([
    'id' => $userData['id'],
    'email' => $userData['email'],
    'nome' => $userData['nome'],
    'foto_url' => $fotoUrl,
    'ruolo' => $userData['ruolo'],
    'ruolo_azienda' => $userData['ruolo_azienda'],
    'azienda_id' => $userData['azienda_id'],
    'nome_azienda' => $userData['nome_azienda'],
    'codice_pairing' => $userData['codice_pairing'],
    'has_pin' => !empty($userData['pin_hash'])
]);
