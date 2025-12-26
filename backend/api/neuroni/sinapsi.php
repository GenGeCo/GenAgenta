<?php
/**
 * GET /neuroni/{id}/sinapsi
 * Lista sinapsi di un neurone (connessioni in entrata e uscita)
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;
$userId = $user['user_id'];

$neuroneId = $_REQUEST['neurone_id'] ?? '';

if (empty($neuroneId)) {
    errorResponse('ID neurone richiesto', 400);
}

// Filtri temporali
$dataInizio = $_GET['data_inizio'] ?? null;
$dataFine = $_GET['data_fine'] ?? null;
$soloAttive = isset($_GET['solo_attive']);

$db = getDB();

// Costruisci query
$where = ["(s.neurone_da = ? OR s.neurone_a = ?)"];
$params = [$neuroneId, $neuroneId];

// Filtro visibilità e azienda
// Aziendale: stessa azienda | Personale: stesso utente + PIN
if (!$hasPersonalAccess) {
    $where[] = "(s.livello = 'aziendale' AND s.azienda_id = ?)";
    $params[] = $aziendaId;
} else {
    $where[] = "((s.livello = 'aziendale' AND s.azienda_id = ?) OR (s.livello = 'personale' AND s.creato_da = ?))";
    $params[] = $aziendaId;
    $params[] = $userId;
}

// Filtro temporale
if ($dataInizio) {
    $where[] = "(s.data_fine IS NULL OR s.data_fine >= ?)";
    $params[] = $dataInizio;
}

if ($dataFine) {
    $where[] = "s.data_inizio <= ?";
    $params[] = $dataFine;
}

if ($soloAttive) {
    $where[] = "s.data_fine IS NULL";
}

$whereClause = 'WHERE ' . implode(' AND ', $where);

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
    $whereClause
    ORDER BY s.data_inizio DESC
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$sinapsi = $stmt->fetchAll();

jsonResponse(['data' => $sinapsi]);
