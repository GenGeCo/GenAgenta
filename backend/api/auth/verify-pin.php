<?php
/**
 * POST /auth/verify-pin
 * Verifica PIN per accesso area personale
 */

$user = requireAuth();
$data = getJsonBody();

$pin = $data['pin'] ?? '';

if (empty($pin)) {
    errorResponse('PIN richiesto', 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT pin_hash FROM utenti WHERE id = ?');
$stmt->execute([$user['user_id']]);
$userData = $stmt->fetch();

if (!$userData || empty($userData['pin_hash'])) {
    errorResponse('PIN non configurato', 400);
}

if (!verifyPIN($pin, $userData['pin_hash'])) {
    errorResponse('PIN non valido', 401);
}

// Genera token con flag accesso personale
$personalToken = generateJWT([
    'user_id' => $user['user_id'],
    'email' => $user['email'],
    'nome' => $user['nome'],
    'ruolo' => $user['ruolo'],
    'personal_access' => true,
    'personal_exp' => time() + 3600  // 1 ora per area personale
]);

jsonResponse([
    'token' => $personalToken,
    'personal_access' => true
]);
