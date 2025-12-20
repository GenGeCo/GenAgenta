<?php
/**
 * PUT /users/password
 * Cambia password utente (richiede password attuale)
 */

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Metodo non permesso', 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$passwordAttuale = $data['password_attuale'] ?? '';
$nuovaPassword = $data['nuova_password'] ?? '';
$confermaPassword = $data['conferma_password'] ?? '';

// Validazioni
if (empty($passwordAttuale)) {
    errorResponse('Password attuale richiesta', 400);
}

if (empty($nuovaPassword)) {
    errorResponse('Nuova password richiesta', 400);
}

if (strlen($nuovaPassword) < 6) {
    errorResponse('La nuova password deve essere di almeno 6 caratteri', 400);
}

if ($nuovaPassword !== $confermaPassword) {
    errorResponse('Le password non coincidono', 400);
}

$db = getDB();

// Verifica password attuale
$stmt = $db->prepare('SELECT password_hash FROM utenti WHERE id = ?');
$stmt->execute([$user['user_id']]);
$userData = $stmt->fetch();

if (!$userData || !verifyPassword($passwordAttuale, $userData['password_hash'])) {
    errorResponse('Password attuale non corretta', 401);
}

// Aggiorna password
$nuovoHash = hashPassword($nuovaPassword);
$stmt = $db->prepare('UPDATE utenti SET password_hash = ? WHERE id = ?');
$stmt->execute([$nuovoHash, $user['user_id']]);

jsonResponse([
    'success' => true,
    'message' => 'Password aggiornata con successo'
]);
