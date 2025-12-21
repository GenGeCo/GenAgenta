<?php
/**
 * POST /tipi-neurone
 * Crea nuovo tipo neurone
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
if (empty($data['nome'])) {
    errorResponse('Nome richiesto', 400);
}

$formeValide = ['cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'L', 'C', 'W', 'Z'];
$forma = $data['forma'] ?? 'cerchio';
if (!in_array($forma, $formeValide)) {
    errorResponse('Forma non valida', 400);
}

$visibilita = $data['visibilita'] ?? 'aziendale';
if ($visibilita === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto', 403);
    }
}

$db = getDB();
$id = generateUUID();

$stmt = $db->prepare('
    INSERT INTO tipi_neurone (id, nome, forma, visibilita, azienda_id, creato_da, ordine)
    VALUES (?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['nome'],
    $forma,
    $visibilita,
    $user['azienda_id'] ?? null,
    $user['user_id'],
    $data['ordine'] ?? 0
]);

jsonResponse(['id' => $id, 'message' => 'Tipo creato'], 201);
