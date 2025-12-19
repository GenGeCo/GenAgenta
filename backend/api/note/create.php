<?php
/**
 * POST /note
 * Crea nota personale (richiede PIN)
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto. Inserisci il PIN.', 403);
}

$data = getJsonBody();

if (empty($data['neurone_id']) || empty($data['testo'])) {
    errorResponse('neurone_id e testo richiesti', 400);
}

$db = getDB();

// Verifica esistenza neurone
$stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ?');
$stmt->execute([$data['neurone_id']]);
if (!$stmt->fetch()) {
    errorResponse('Neurone non trovato', 404);
}

// Verifica se esiste già una nota per questo neurone (una per utente/neurone)
$stmt = $db->prepare('SELECT id FROM note_personali WHERE utente_id = ? AND neurone_id = ?');
$stmt->execute([$user['user_id'], $data['neurone_id']]);
if ($stmt->fetch()) {
    errorResponse('Nota già esistente per questo neurone. Usa PUT per aggiornare.', 409);
}

$id = generateUUID();

$stmt = $db->prepare('
    INSERT INTO note_personali (id, utente_id, neurone_id, testo)
    VALUES (?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $user['user_id'],
    $data['neurone_id'],
    $data['testo']
]);

jsonResponse(['id' => $id, 'message' => 'Nota creata'], 201);
