<?php
/**
 * PUT /note/{id}
 * Aggiorna nota personale
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto', 403);
}

$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

if (empty($data['testo'])) {
    errorResponse('Testo richiesto', 400);
}

$db = getDB();

// Verifica proprietà
$stmt = $db->prepare('SELECT id FROM note_personali WHERE id = ? AND utente_id = ?');
$stmt->execute([$id, $user['user_id']]);
if (!$stmt->fetch()) {
    errorResponse('Nota non trovata', 404);
}

$stmt = $db->prepare('UPDATE note_personali SET testo = ? WHERE id = ?');
$stmt->execute([$data['testo'], $id]);

jsonResponse(['message' => 'Nota aggiornata']);
