<?php
/**
 * PUT /neuroni/{id}
 * Aggiorna neurone
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza
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

// Campi aggiornabili
$updates = [];
$params = [];

$allowedFields = ['nome', 'tipo', 'categorie', 'visibilita', 'lat', 'lng', 'indirizzo', 'telefono', 'email', 'sito_web', 'dati_extra', 'dimensione'];
$booleanFields = ['is_acquirente', 'is_venditore', 'is_intermediario', 'is_influencer'];

foreach ($allowedFields as $field) {
    if (isset($data[$field])) {
        if ($field === 'categorie' || $field === 'dati_extra') {
            $updates[] = "$field = ?";
            $params[] = json_encode($data[$field]);
        } else {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
}

// Natura commerciale (nullable = eredita da tipo, false esplicito resetta)
foreach ($booleanFields as $field) {
    if (array_key_exists($field, $data)) {
        $updates[] = "$field = ?";
        // Se null, resetta a eredita dal tipo; altrimenti usa il valore boolean
        $params[] = $data[$field] === null ? null : (bool)$data[$field];
    }
}

if (empty($updates)) {
    errorResponse('Nessun campo da aggiornare', 400);
}

$params[] = $id;
$sql = "UPDATE neuroni SET " . implode(', ', $updates) . " WHERE id = ?";

$stmt = $db->prepare($sql);
$stmt->execute($params);

jsonResponse(['message' => 'Neurone aggiornato']);
