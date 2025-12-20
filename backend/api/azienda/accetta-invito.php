<?php
/**
 * POST /azienda/inviti/accetta
 * Accetta un invito a unirsi a un team
 */

$user = requireAuth();
$db = getDB();

$data = getJsonBody();
$invitoId = $data['invito_id'] ?? '';

if (empty($invitoId)) {
    errorResponse('ID invito richiesto', 400);
}

// Verifica che l'invito esista e sia per questo utente
$stmt = $db->prepare('
    SELECT i.*, a.nome as nome_azienda
    FROM inviti i
    JOIN aziende a ON i.azienda_id = a.id
    WHERE i.id = ? AND i.email_invitato = ? AND i.stato = "pendente"
');
$stmt->execute([$invitoId, $user['email']]);
$invito = $stmt->fetch();

if (!$invito) {
    errorResponse('Invito non trovato o già utilizzato', 404);
}

// Verifica limite utenti azienda
$stmt = $db->prepare('SELECT COUNT(*) as cnt, a.max_utenti FROM utenti u JOIN aziende a ON u.azienda_id = a.id WHERE u.azienda_id = ?');
$stmt->execute([$invito['azienda_id']]);
$check = $stmt->fetch();

if ($check && $check['cnt'] >= $check['max_utenti']) {
    errorResponse('Limite utenti raggiunto per questa azienda', 403);
}

// Aggiorna utente con nuova azienda
$stmt = $db->prepare('UPDATE utenti SET azienda_id = ?, ruolo_azienda = "membro" WHERE id = ?');
$stmt->execute([$invito['azienda_id'], $user['user_id']]);

// Aggiorna stato invito
$stmt = $db->prepare('UPDATE inviti SET stato = "accettato" WHERE id = ?');
$stmt->execute([$invitoId]);

// Rigenera JWT con nuova azienda
$token = generateJWT([
    'user_id' => $user['user_id'],
    'azienda_id' => $invito['azienda_id'],
    'email' => $user['email'],
    'nome' => $user['nome'] ?? '',
    'ruolo' => $user['ruolo'] ?? 'commerciale',
    'ruolo_azienda' => 'membro'
]);

jsonResponse([
    'success' => true,
    'message' => 'Sei entrato nel team ' . $invito['nome_azienda'],
    'token' => $token,
    'azienda' => [
        'id' => $invito['azienda_id'],
        'nome' => $invito['nome_azienda']
    ]
]);
