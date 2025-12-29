<?php
/**
 * POST /famiglie-prodotto
 * Crea nuova famiglia prodotto
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
if (empty($data['nome'])) {
    errorResponse("Campo 'nome' richiesto", 400);
}

$db = getDB();

$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$visibilita = $data['visibilita'] ?? 'aziendale';

// Se visibilità personale, richiede accesso personale
if ($visibilita === 'personale' && !$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto per creare famiglie private', 403);
}

// Se ha parent_id, verificane esistenza
$parentId = $data['parent_id'] ?? null;
if ($parentId) {
    $stmt = $db->prepare('SELECT id FROM famiglie_prodotto WHERE id = ?');
    $stmt->execute([$parentId]);
    if (!$stmt->fetch()) {
        errorResponse('Famiglia padre non trovata', 400);
    }
}

// Trova prossimo ordine
$ordine = $data['ordine'] ?? null;
if ($ordine === null) {
    $sqlOrdine = "SELECT COALESCE(MAX(ordine), 0) + 1 as next FROM famiglie_prodotto WHERE ";
    if ($parentId) {
        $sqlOrdine .= "parent_id = ?";
        $stmt = $db->prepare($sqlOrdine);
        $stmt->execute([$parentId]);
    } else {
        $sqlOrdine .= "parent_id IS NULL AND azienda_id = ?";
        $stmt = $db->prepare($sqlOrdine);
        $stmt->execute([$user['azienda_id']]);
    }
    $ordine = $stmt->fetch()['next'];
}

$id = generateUUID();

$stmt = $db->prepare('
    INSERT INTO famiglie_prodotto (id, nome, parent_id, descrizione, ordine, visibilita, azienda_id, creato_da, colore)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['nome'],
    $parentId,
    $data['descrizione'] ?? null,
    $ordine,
    $visibilita,
    $user['azienda_id'],
    $user['user_id'],
    $data['colore'] ?? null
]);

jsonResponse(['id' => $id, 'message' => 'Famiglia prodotto creata'], 201);
