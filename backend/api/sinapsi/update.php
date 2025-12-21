<?php
/**
 * PUT /sinapsi/{id}
 * Aggiorna sinapsi
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

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

// Campi aggiornabili
$updates = [];
$params = [];

$allowedFields = ['tipo_connessione', 'famiglia_prodotto_id', 'data_inizio', 'data_fine', 'valore', 'certezza', 'fonte', 'data_verifica', 'livello', 'note'];

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
$sql = "UPDATE sinapsi SET " . implode(', ', $updates) . " WHERE id = ?";

$stmt = $db->prepare($sql);
$stmt->execute($params);

jsonResponse(['message' => 'Sinapsi aggiornata']);
