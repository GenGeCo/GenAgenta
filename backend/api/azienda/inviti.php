<?php
/**
 * POST /azienda/inviti
 * Crea un invito per un collega
 */

$user = requireAuth();
$db = getDB();

// Solo admin può invitare
if ($user['ruolo_azienda'] !== 'admin') {
    errorResponse('Solo gli admin possono invitare colleghi', 403);
}

$data = getJsonBody();
$emailInvitato = trim($data['email'] ?? '');

if (empty($emailInvitato)) {
    errorResponse('Email richiesta', 400);
}

if (!filter_var($emailInvitato, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Email non valida', 400);
}

// Non puoi invitare te stesso
if (strtolower($emailInvitato) === strtolower($user['email'])) {
    errorResponse('Non puoi invitare te stesso', 400);
}

// Verifica se l'utente esiste già
$stmt = $db->prepare('SELECT id, azienda_id FROM utenti WHERE email = ? AND attivo = 1');
$stmt->execute([$emailInvitato]);
$utenteEsistente = $stmt->fetch();

if ($utenteEsistente) {
    // Se è già nella stessa azienda
    if ($utenteEsistente['azienda_id'] === $user['azienda_id']) {
        errorResponse('Questo utente è già nel tuo team', 400);
    }
}

// Verifica se esiste già un invito pendente per questa email/azienda
$stmt = $db->prepare('SELECT id FROM inviti WHERE email_invitato = ? AND azienda_id = ? AND stato = "pendente"');
$stmt->execute([$emailInvitato, $user['azienda_id']]);
if ($stmt->fetch()) {
    errorResponse('Invito già inviato a questa email', 400);
}

// Crea invito
$invitoId = generateUUID();
$stmt = $db->prepare('
    INSERT INTO inviti (id, email_invitato, azienda_id, invitato_da, stato)
    VALUES (?, ?, ?, ?, "pendente")
');
$stmt->execute([$invitoId, $emailInvitato, $user['azienda_id'], $user['user_id']]);

jsonResponse([
    'success' => true,
    'message' => 'Invito creato. Il collega vedrà la richiesta quando aprirà l\'app.',
    'invito_id' => $invitoId
], 201);
