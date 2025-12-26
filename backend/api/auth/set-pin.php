<?php
/**
 * POST /auth/set-pin
 * Imposta o aggiorna PIN per area personale
 */

$user = requireAuth();
$data = getJsonBody();

$pin = $data['pin'] ?? '';
$currentPin = $data['current_pin'] ?? null;

// Validazione PIN
if (empty($pin)) {
    errorResponse('PIN richiesto', 400);
}

if (strlen($pin) < 4 || strlen($pin) > 10) {
    errorResponse('PIN deve essere tra 4 e 10 caratteri', 400);
}

if (!preg_match('/^[0-9]+$/', $pin)) {
    errorResponse('PIN deve contenere solo numeri', 400);
}

$db = getDB();

// Verifica se ha già un PIN
$stmt = $db->prepare('SELECT pin_hash FROM utenti WHERE id = ?');
$stmt->execute([$user['user_id']]);
$userData = $stmt->fetch();

// Se ha già un PIN, deve fornire quello corrente per cambiarlo
if (!empty($userData['pin_hash'])) {
    if (empty($currentPin)) {
        errorResponse('PIN attuale richiesto per modificare', 400);
    }
    if (!verifyPIN($currentPin, $userData['pin_hash'])) {
        errorResponse('PIN attuale non valido', 401);
    }
}

// Hash e salva nuovo PIN
$pinHash = password_hash($pin, PASSWORD_BCRYPT);

$stmt = $db->prepare('UPDATE utenti SET pin_hash = ? WHERE id = ?');
$stmt->execute([$pinHash, $user['user_id']]);

jsonResponse([
    'message' => 'PIN impostato con successo',
    'has_pin' => true
]);
