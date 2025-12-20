<?php
/**
 * GET /sinapsi/{id}
 * Dettaglio sinapsi
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;

$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

$sql = "
    SELECT
        s.*,
        n_da.nome as nome_da,
        n_da.tipo as tipo_da,
        n_a.nome as nome_a,
        n_a.tipo as tipo_a
    FROM sinapsi s
    JOIN neuroni n_da ON s.neurone_da = n_da.id
    JOIN neuroni n_a ON s.neurone_a = n_a.id
    WHERE s.id = ?
";

$stmt = $db->prepare($sql);
$stmt->execute([$id]);
$sinapsi = $stmt->fetch();

if (!$sinapsi) {
    errorResponse('Sinapsi non trovata', 404);
}

// Controllo visibilità e azienda
if ($sinapsi['livello'] === 'aziendale') {
    // Dati aziendali: verifico che sia della MIA azienda
    if ($sinapsi['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    // Dati personali: verifico che sia MIO e che ho il PIN
    $isOwner = $sinapsi['creato_da'] === $user['user_id'];

    if (!$hasPersonalAccess || !$isOwner) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

jsonResponse($sinapsi);
