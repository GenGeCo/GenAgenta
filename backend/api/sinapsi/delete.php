<?php
/**
 * DELETE /sinapsi/{id}
 * Elimina sinapsi
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza
$stmt = $db->prepare('SELECT livello FROM sinapsi WHERE id = ?');
$stmt->execute([$id]);
$sinapsi = $stmt->fetch();

if (!$sinapsi) {
    errorResponse('Sinapsi non trovata', 404);
}

// Se personale, richiede accesso
if ($sinapsi['livello'] === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto', 403);
    }
}

$stmt = $db->prepare('DELETE FROM sinapsi WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['message' => 'Sinapsi eliminata']);
