<?php
/**
 * POST /neuroni
 * Crea nuovo neurone
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
$required = ['nome', 'tipo', 'categorie'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        errorResponse("Campo '$field' richiesto", 400);
    }
}

// Valida tipo
$tipiValidi = ['persona', 'impresa', 'luogo'];
if (!in_array($data['tipo'], $tipiValidi)) {
    errorResponse('Tipo non valido. Valori: ' . implode(', ', $tipiValidi), 400);
}

// Valida categorie (deve essere array)
if (!is_array($data['categorie'])) {
    errorResponse('Categorie deve essere un array', 400);
}

$db = getDB();

$id = generateUUID();
$visibilita = $data['visibilita'] ?? 'aziendale';

// Se visibilità personale, richiede accesso personale
if ($visibilita === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto per creare neuroni privati', 403);
    }
}

$stmt = $db->prepare('
    INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, sito_web, dati_extra, creato_da, azienda_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['nome'],
    $data['tipo'],
    json_encode($data['categorie']),
    $visibilita,
    $data['lat'] ?? null,
    $data['lng'] ?? null,
    $data['indirizzo'] ?? null,
    $data['telefono'] ?? null,
    $data['email'] ?? null,
    $data['sito_web'] ?? null,
    isset($data['dati_extra']) ? json_encode($data['dati_extra']) : null,
    $user['user_id'],
    $user['azienda_id'] ?? null
]);

jsonResponse(['id' => $id, 'message' => 'Neurone creato'], 201);
