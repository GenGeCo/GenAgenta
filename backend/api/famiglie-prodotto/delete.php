<?php
/**
 * DELETE /famiglie-prodotto/{id}
 * Elimina famiglia prodotto (e tutti i figli)
 */

require_once __DIR__ . '/../../includes/ai-docs-generator.php';

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza e permessi
$stmt = $db->prepare('SELECT visibilita, creato_da, azienda_id FROM famiglie_prodotto WHERE id = ?');
$stmt->execute([$id]);
$famiglia = $stmt->fetch();

if (!$famiglia) {
    errorResponse('Famiglia prodotto non trovata', 404);
}

$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;

// Controllo accesso
if ($famiglia['visibilita'] === 'aziendale') {
    if ($famiglia['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    $isOwner = $famiglia['creato_da'] === $user['user_id'];
    if (!$hasPersonalAccess || !$isOwner) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

// Conta figli (per warning)
$stmt = $db->prepare('SELECT COUNT(*) as count FROM famiglie_prodotto WHERE parent_id = ?');
$stmt->execute([$id]);
$numFigli = $stmt->fetch()['count'];

// Elimina (CASCADE eliminerà i figli)
$stmt = $db->prepare('DELETE FROM famiglie_prodotto WHERE id = ?');
$stmt->execute([$id]);

jsonResponse([
    'success' => true,
    'message' => 'Famiglia prodotto eliminata',
    'deleted_children' => (int)$numFigli
]);
