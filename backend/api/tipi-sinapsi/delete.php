<?php
/**
 * DELETE /tipi-sinapsi/{id}
 * Elimina tipo sinapsi
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? null;

if (!$id) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza e permessi
$stmt = $db->prepare('SELECT * FROM tipi_sinapsi WHERE id = ?');
$stmt->execute([$id]);
$tipo = $stmt->fetch();

if (!$tipo) {
    errorResponse('Tipo non trovato', 404);
}

// Verifica permessi
$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if ($tipo['visibilita'] === 'aziendale') {
    if ($tipo['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    if (!$hasPersonalAccess || $tipo['creato_da'] !== $user['user_id']) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

// Verifica se ci sono sinapsi che usano questo tipo
$stmt = $db->prepare('SELECT COUNT(*) as count FROM sinapsi WHERE tipo_sinapsi_id = ?');
$stmt->execute([$id]);
$result = $stmt->fetch();

if ($result['count'] > 0) {
    errorResponse('Impossibile eliminare: ci sono ' . $result['count'] . ' connessioni che usano questo tipo', 400);
}

// Elimina
$stmt = $db->prepare('DELETE FROM tipi_sinapsi WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['success' => true]);
