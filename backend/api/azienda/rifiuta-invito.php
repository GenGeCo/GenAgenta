<?php
/**
 * POST /azienda/inviti/rifiuta
 * Rifiuta un invito
 */

$user = requireAuth();
$db = getDB();

$data = getJsonBody();
$invitoId = $data['invito_id'] ?? '';

if (empty($invitoId)) {
    errorResponse('ID invito richiesto', 400);
}

// Verifica che l'invito esista e sia per questo utente
$stmt = $db->prepare('SELECT id FROM inviti WHERE id = ? AND email_invitato = ? AND stato = "pendente"');
$stmt->execute([$invitoId, $user['email']]);
if (!$stmt->fetch()) {
    errorResponse('Invito non trovato', 404);
}

// Aggiorna stato invito
$stmt = $db->prepare('UPDATE inviti SET stato = "rifiutato" WHERE id = ?');
$stmt->execute([$invitoId]);

jsonResponse([
    'success' => true,
    'message' => 'Invito rifiutato'
]);
