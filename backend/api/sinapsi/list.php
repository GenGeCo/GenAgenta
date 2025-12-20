<?php
/**
 * GET /sinapsi
 * Lista sinapsi con filtri
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

// Filtri
$tipoConnessione = $_GET['tipo'] ?? null;
$dataInizio = $_GET['data_inizio'] ?? null;
$dataFine = $_GET['data_fine'] ?? null;
$certezza = $_GET['certezza'] ?? null;
$valoreMin = $_GET['valore_min'] ?? null;
$limit = min((int)($_GET['limit'] ?? 100), 500);
$offset = (int)($_GET['offset'] ?? 0);

$db = getDB();

$where = [];
$params = [];

// Filtro visibilità
if (!$hasPersonalAccess) {
    $where[] = "s.livello = 'aziendale'";
}

// Filtro tipo connessione
if ($tipoConnessione) {
    $where[] = "s.tipo_connessione = ?";
    $params[] = $tipoConnessione;
}

// Filtro periodo - sinapsi attive nel range
if ($dataInizio) {
    $where[] = "(s.data_fine IS NULL OR s.data_fine >= ?)";
    $params[] = $dataInizio;
}

if ($dataFine) {
    $where[] = "s.data_inizio <= ?";
    $params[] = $dataFine;
}

// Filtro certezza
if ($certezza) {
    $where[] = "s.certezza = ?";
    $params[] = $certezza;
}

// Filtro valore minimo
if ($valoreMin) {
    $where[] = "s.valore >= ?";
    $params[] = $valoreMin;
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Count
$countSql = "SELECT COUNT(*) as total FROM sinapsi s $whereClause";
$stmt = $db->prepare($countSql);
$stmt->execute($params);
$total = $stmt->fetch()['total'];

// Query con JOIN per nomi
$sql = "
    SELECT
        s.*,
        n_da.nome as nome_da,
        n_da.tipo as tipo_da,
        n_da.lat as lat_da,
        n_da.lng as lng_da,
        n_a.nome as nome_a,
        n_a.tipo as tipo_a,
        n_a.lat as lat_a,
        n_a.lng as lng_a
    FROM sinapsi s
    JOIN neuroni n_da ON s.neurone_da = n_da.id
    JOIN neuroni n_a ON s.neurone_a = n_a.id
    $whereClause
    ORDER BY s.data_inizio DESC
    LIMIT ? OFFSET ?
";

$params[] = $limit;
$params[] = $offset;

$stmt = $db->prepare($sql);
$stmt->execute($params);
$sinapsi = $stmt->fetchAll();

// Converti coordinate a float (MySQL le restituisce come stringhe)
foreach ($sinapsi as &$s) {
    $s['lat_da'] = $s['lat_da'] !== null ? (float)$s['lat_da'] : null;
    $s['lng_da'] = $s['lng_da'] !== null ? (float)$s['lng_da'] : null;
    $s['lat_a'] = $s['lat_a'] !== null ? (float)$s['lat_a'] : null;
    $s['lng_a'] = $s['lng_a'] !== null ? (float)$s['lng_a'] : null;
    $s['valore'] = $s['valore'] !== null ? (float)$s['valore'] : null;
}

jsonResponse([
    'data' => $sinapsi,
    'pagination' => [
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ]
]);
