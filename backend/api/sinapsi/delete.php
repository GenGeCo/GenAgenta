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

// Verifica esistenza e ottieni dati per controllo accesso
$stmt = $db->prepare('SELECT livello, creato_da, azienda_id FROM sinapsi WHERE id = ?');
$stmt->execute([$id]);
$sinapsi = $stmt->fetch();

if (!$sinapsi) {
    errorResponse('Sinapsi non trovata', 404);
}

$userAziendaId = $user['azienda_id'] ?? null;

// Controllo accesso in base al livello
if ($sinapsi['livello'] === 'personale') {
    // Dati personali: richiede PIN + essere il proprietario
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    $isOwner = $sinapsi['creato_da'] === $user['user_id'];

    if (!$hasPersonalAccess || !$isOwner) {
        errorResponse('Non puoi eliminare sinapsi personali di altri utenti', 403);
    }
} else {
    // Dati aziendali: verifica appartenenza alla stessa azienda
    if ($sinapsi['azienda_id'] !== $userAziendaId) {
        errorResponse('Non puoi eliminare sinapsi di altre aziende', 403);
    }
}

$stmt = $db->prepare('DELETE FROM sinapsi WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['message' => 'Sinapsi eliminata']);
