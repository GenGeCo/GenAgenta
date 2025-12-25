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

// tipo_connessione può essere array (multi-select) o stringa singola
// Salviamo sempre come JSON array per consistenza
$tipoConnessione = $data['tipo_connessione'];
if (is_array($tipoConnessione)) {
    $tipoConnessione = json_encode($tipoConnessione);
} elseif (is_string($tipoConnessione) && substr($tipoConnessione, 0, 1) !== '[') {
    // Stringa singola legacy - convertiamo in array JSON
    $tipoConnessione = json_encode([$tipoConnessione]);
}
// Se già JSON string, lasciamo così

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
    INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, famiglia_prodotto_id, data_inizio, data_fine, valore, certezza, fonte, data_verifica, livello, note, creato_da, azienda_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['neurone_da'],
    $data['neurone_a'],
    $tipoConnessione,
    $data['famiglia_prodotto_id'] ?? null,
    $data['data_inizio'],
    $data['data_fine'] ?? null,
    $data['valore'] ?? null,
    $data['certezza'] ?? 'certo',
    $data['fonte'] ?? null,
    $data['data_verifica'] ?? null,
    $livello,
    $data['note'] ?? null,
    $user['user_id'],
    $user['azienda_id'] ?? null
]);

jsonResponse(['id' => $id, 'message' => 'Sinapsi creata'], 201);
