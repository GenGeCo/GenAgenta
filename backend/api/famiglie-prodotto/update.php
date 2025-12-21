<?php
/**
 * PUT /famiglie-prodotto/{id}
 * Aggiorna famiglia prodotto
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

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

// Verifica parent_id se cambiato (no cicli!)
if (array_key_exists('parent_id', $data) && $data['parent_id']) {
    // Non può essere parent di se stesso
    if ($data['parent_id'] === $id) {
        errorResponse('Una famiglia non può essere parent di se stessa', 400);
    }

    // Verifica esistenza parent
    $stmt = $db->prepare('SELECT id FROM famiglie_prodotto WHERE id = ?');
    $stmt->execute([$data['parent_id']]);
    if (!$stmt->fetch()) {
        errorResponse('Famiglia padre non trovata', 400);
    }

    // Verifica che non crei ciclo (parent non può essere un discendente)
    $checkId = $data['parent_id'];
    while ($checkId) {
        if ($checkId === $id) {
            errorResponse('Impossibile creare ciclo nella gerarchia', 400);
        }
        $stmtCheck = $db->prepare('SELECT parent_id FROM famiglie_prodotto WHERE id = ?');
        $stmtCheck->execute([$checkId]);
        $row = $stmtCheck->fetch();
        $checkId = $row ? $row['parent_id'] : null;
    }
}

// Campi aggiornabili
$updates = [];
$params = [];

$allowedFields = ['nome', 'parent_id', 'descrizione', 'ordine'];

foreach ($allowedFields as $field) {
    if (array_key_exists($field, $data)) {
        $updates[] = "$field = ?";
        $params[] = $data[$field];
    }
}

if (empty($updates)) {
    errorResponse('Nessun campo da aggiornare', 400);
}

$params[] = $id;
$sql = "UPDATE famiglie_prodotto SET " . implode(', ', $updates) . " WHERE id = ?";

$stmt = $db->prepare($sql);
$stmt->execute($params);

jsonResponse(['success' => true, 'message' => 'Famiglia prodotto aggiornata']);
