<?php
/**
 * POST /tipi-sinapsi
 * Crea nuovo tipo sinapsi
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
if (empty($data['nome'])) {
    errorResponse('Nome richiesto', 400);
}

$colore = $data['colore'] ?? '#64748b';
if (!preg_match('/^#[0-9a-fA-F]{6}$/', $colore)) {
    errorResponse('Colore non valido (formato: #RRGGBB)', 400);
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
    INSERT INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
    VALUES (?, ?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    $id,
    $data['nome'],
    $colore,
    $visibilita,
    $user['azienda_id'] ?? null,
    $user['user_id'],
    $data['ordine'] ?? 0
]);

jsonResponse(['id' => $id, 'message' => 'Tipo sinapsi creato'], 201);
