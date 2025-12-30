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

// Cerca team_id dell'utente (sistema v2)
$teamId = null;
$stmt = $db->prepare('SELECT team_id FROM team_membri WHERE utente_id = ? LIMIT 1');
$stmt->execute([$user['id']]);
$teamRow = $stmt->fetch();
if ($teamRow) {
    $teamId = $teamRow['team_id'];
}

// Genera session_token univoco e salvalo nel DB (se la colonna esiste)
// Questo invalida automaticamente le sessioni precedenti
$sessionToken = bin2hex(random_bytes(32));
try {
    $stmt = $db->prepare('UPDATE utenti SET session_token = ? WHERE id = ?');
    $stmt->execute([$sessionToken, $user['id']]);
} catch (PDOException $e) {
    // Colonna session_token non esiste ancora - continua senza
    $sessionToken = null;
}

// Genera token JWT (include azienda_id, team_id e session_token)
$token = generateJWT([
    'user_id' => $user['id'],
    'azienda_id' => $user['azienda_id'],
    'team_id' => $teamId,
    'email' => $user['email'],
    'nome' => $user['nome'],
    'ruolo' => $user['ruolo'],
    'ruolo_azienda' => $user['ruolo_azienda'],
    'session_token' => $sessionToken
]);

jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'azienda_id' => $user['azienda_id'],
        'team_id' => $teamId,
        'email' => $user['email'],
        'nome' => $user['nome'],
        'ruolo' => $user['ruolo'],
        'ruolo_azienda' => $user['ruolo_azienda'],
        'has_pin' => !empty($user['pin_hash'])
    ]
]);
