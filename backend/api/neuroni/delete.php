<?php
/**
 * DELETE /neuroni/{id}
 * Elimina neurone
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza e permessi
$stmt = $db->prepare('SELECT visibilita FROM neuroni WHERE id = ?');
$stmt->execute([$id]);
$neurone = $stmt->fetch();

if (!$neurone) {
    errorResponse('Neurone non trovato', 404);
}

// Se neurone personale, richiede accesso personale
if ($neurone['visibilita'] === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto', 403);
    }
}

// Elimina (CASCADE eliminerà anche sinapsi e note collegate)
$stmt = $db->prepare('DELETE FROM neuroni WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['message' => 'Neurone eliminato']);
