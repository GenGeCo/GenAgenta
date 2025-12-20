<?php
/**
 * GET /auth/me
 * Ottieni utente corrente con dati azienda
 */

$user = requireAuth();

$db = getDB();

// Query con JOIN per ottenere anche dati azienda
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

if (!$userData) {
    errorResponse('Utente non trovato', 404);
}

jsonResponse([
    'id' => $userData['id'],
    'email' => $userData['email'],
    'nome' => $userData['nome'],
    'ruolo' => $userData['ruolo'],
    'ruolo_azienda' => $userData['ruolo_azienda'],
    'azienda_id' => $userData['azienda_id'],
    'nome_azienda' => $userData['nome_azienda'],
    'codice_pairing' => $userData['codice_pairing'],
    'has_pin' => !empty($userData['pin_hash'])
]);
