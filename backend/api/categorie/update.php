<?php
/**
 * PUT /categorie/{id}
 * Modifica categoria
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? null;

if (!$id) {
    errorResponse('ID richiesto', 400);
}

$data = getJsonBody();
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

// Validazione colore
if (isset($data['colore']) && !preg_match('/^#[0-9a-fA-F]{6}$/', $data['colore'])) {
    errorResponse('Colore non valido (formato: #RRGGBB)', 400);
}

// Update
$updates = [];
$params = [];

if (isset($data['nome'])) {
    $updates[] = 'nome = ?';
    $params[] = $data['nome'];
}
if (isset($data['colore'])) {
    $updates[] = 'colore = ?';
    $params[] = $data['colore'];
}
if (isset($data['ordine'])) {
    $updates[] = 'ordine = ?';
    $params[] = $data['ordine'];
}

if (empty($updates)) {
    errorResponse('Nessun campo da aggiornare', 400);
}

$params[] = $id;
$stmt = $db->prepare('UPDATE categorie SET ' . implode(', ', $updates) . ' WHERE id = ?');
$stmt->execute($params);

jsonResponse(['success' => true]);
