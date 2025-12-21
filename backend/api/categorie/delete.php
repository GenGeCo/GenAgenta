<?php
/**
 * DELETE /categorie/{id}
 * Elimina categoria
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? null;

if (!$id) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza e permessi
$stmt = $db->prepare('SELECT * FROM categorie WHERE id = ?');
$stmt->execute([$id]);
$categoria = $stmt->fetch();

if (!$categoria) {
    errorResponse('Categoria non trovata', 404);
}

// Verifica permessi
$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if ($categoria['visibilita'] === 'aziendale') {
    if ($categoria['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    if (!$hasPersonalAccess || $categoria['creato_da'] !== $user['user_id']) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

// Verifica se ci sono neuroni che usano questa categoria
$stmt = $db->prepare('SELECT COUNT(*) as count FROM neuroni WHERE categoria_id = ?');
$stmt->execute([$id]);
$result = $stmt->fetch();

if ($result['count'] > 0) {
    errorResponse('Impossibile eliminare: ci sono ' . $result['count'] . ' neuroni che usano questa categoria', 400);
}

// Elimina
$stmt = $db->prepare('DELETE FROM categorie WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['success' => true]);
