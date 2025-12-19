<?php
/**
 * GET /note
 * Lista note personali (richiede PIN)
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto. Inserisci il PIN.', 403);
}

$neuroneId = $_GET['neurone_id'] ?? null;

$db = getDB();

$where = ['utente_id = ?'];
$params = [$user['user_id']];

if ($neuroneId) {
    $where[] = 'neurone_id = ?';
    $params[] = $neuroneId;
}

$whereClause = 'WHERE ' . implode(' AND ', $where);

$sql = "
    SELECT
        np.*,
        n.nome as neurone_nome,
        n.tipo as neurone_tipo
    FROM note_personali np
    JOIN neuroni n ON np.neurone_id = n.id
    $whereClause
    ORDER BY np.data_modifica DESC
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$note = $stmt->fetchAll();

jsonResponse(['data' => $note]);
