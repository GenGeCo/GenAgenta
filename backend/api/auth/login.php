<?php
/**
 * POST /auth/login
 * Login utente
 */

$data = getJsonBody();

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    errorResponse('Email e password richiesti', 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT id, email, password_hash, nome, ruolo, ruolo_azienda, azienda_id, pin_hash FROM utenti WHERE email = ? AND attivo = 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !verifyPassword($password, $user['password_hash'])) {
    errorResponse('Credenziali non valide', 401);
}

// Genera token JWT (include azienda_id per filtro dati)
$token = generateJWT([
    'user_id' => $user['id'],
    'azienda_id' => $user['azienda_id'],
    'email' => $user['email'],
    'nome' => $user['nome'],
    'ruolo' => $user['ruolo'],
    'ruolo_azienda' => $user['ruolo_azienda']
]);

jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'azienda_id' => $user['azienda_id'],
        'email' => $user['email'],
        'nome' => $user['nome'],
        'ruolo' => $user['ruolo'],
        'ruolo_azienda' => $user['ruolo_azienda'],
        'has_pin' => !empty($user['pin_hash'])
    ]
]);
