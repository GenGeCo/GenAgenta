<?php
/**
 * POST /sinapsi
 * Crea nuova sinapsi
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
$required = ['neurone_da', 'neurone_a', 'tipo_connessione', 'data_inizio'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        errorResponse("Campo '$field' richiesto", 400);
    }
}

$db = getDB();

// Verifica esistenza neuroni
$stmt = $db->prepare('SELECT id FROM neuroni WHERE id IN (?, ?)');
$stmt->execute([$data['neurone_da'], $data['neurone_a']]);
$found = $stmt->fetchAll();

if (count($found) !== 2) {
    errorResponse('Uno o entrambi i neuroni non esistono', 400);
}

$id = generateUUID();
$livello = $data['livello'] ?? 'aziendale';

// Se livello personale, richiede accesso personale
if ($livello === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto per creare connessioni private', 403);
    }
}

$stmt = $db->prepare('
    INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, certezza, livello, note, creato_da)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['neurone_da'],
    $data['neurone_a'],
    $data['tipo_connessione'],
    $data['data_inizio'],
    $data['data_fine'] ?? null,
    $data['valore'] ?? null,
    $data['certezza'] ?? 'certo',
    $livello,
    $data['note'] ?? null,
    $user['user_id']
]);

jsonResponse(['id' => $id, 'message' => 'Sinapsi creata'], 201);
