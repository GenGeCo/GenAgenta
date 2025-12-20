<?php
/**
 * GET /auth/me
 * Ottieni utente corrente con dati azienda
 */

$user = requireAuth();

$db = getDB();

// Controlla se esiste la tabella aziende (migration eseguita?)
$hasAziende = false;
try {
    $check = $db->query("SHOW TABLES LIKE 'aziende'");
    $hasAziende = $check->rowCount() > 0;
} catch (Exception $e) {
    // Ignora
}

if ($hasAziende) {
    // Query completa con azienda
    $stmt = $db->prepare('
        SELECT
            u.id, u.email, u.nome, u.ruolo, u.ruolo_azienda, u.azienda_id, u.pin_hash,
            a.nome as nome_azienda,
            a.codice_pairing
        FROM utenti u
        LEFT JOIN aziende a ON u.azienda_id = a.id
        WHERE u.id = ? AND u.attivo = 1
    ');
    $stmt->execute([$user['user_id']]);
    $userData = $stmt->fetch();
} else {
    // Query base senza azienda (pre-migration)
    $stmt = $db->prepare('
        SELECT id, email, nome, ruolo, pin_hash
        FROM utenti
        WHERE id = ? AND attivo = 1
    ');
    $stmt->execute([$user['user_id']]);
    $userData = $stmt->fetch();
}

if (!$userData) {
    errorResponse('Utente non trovato', 404);
}

jsonResponse([
    'id' => $userData['id'],
    'email' => $userData['email'],
    'nome' => $userData['nome'],
    'foto_url' => null,
    'ruolo' => $userData['ruolo'],
    'ruolo_azienda' => $userData['ruolo_azienda'] ?? null,
    'azienda_id' => $userData['azienda_id'] ?? null,
    'nome_azienda' => $userData['nome_azienda'] ?? null,
    'codice_pairing' => $userData['codice_pairing'] ?? null,
    'has_pin' => !empty($userData['pin_hash'])
]);
