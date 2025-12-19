<?php
/**
 * GET /auth/me
 * Ottieni utente corrente
 */

$user = requireAuth();

$db = getDB();
$stmt = $db->prepare('SELECT id, email, nome, ruolo, pin_hash FROM utenti WHERE id = ? AND attivo = 1');
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
    'has_pin' => !empty($userData['pin_hash'])
]);
