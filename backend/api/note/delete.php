<?php
/**
 * DELETE /note/{id}
 * Elimina nota personale
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto', 403);
}

$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica proprietà
$stmt = $db->prepare('SELECT id FROM note_personali WHERE id = ? AND utente_id = ?');
$stmt->execute([$id, $user['user_id']]);
if (!$stmt->fetch()) {
    errorResponse('Nota non trovata', 404);
}

$stmt = $db->prepare('DELETE FROM note_personali WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['message' => 'Nota eliminata']);
