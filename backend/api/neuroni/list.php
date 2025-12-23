<?php
/**
 * GET /neuroni
 * Lista neuroni con filtri
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

// Parametri filtro
$tipo = $_GET['tipo'] ?? null;  // persona, impresa, luogo
$categoria = $_GET['categoria'] ?? null;  // imbianchino, colorificio, etc
$search = $_GET['search'] ?? null;
$limit = min((int)($_GET['limit'] ?? 100), 500);
$offset = (int)($_GET['offset'] ?? 0);

// Filtri geografici
$lat = $_GET['lat'] ?? null;
$lng = $_GET['lng'] ?? null;
$raggio = $_GET['raggio'] ?? null;  // km

$db = getDB();

// Costruisci query
$where = [];
$params = [];

// Filtro visibilità e azienda
// - Dati aziendali: visibili solo alla stessa azienda
// - Dati personali: visibili solo al proprietario con PIN
$aziendaId = $user['azienda_id'] ?? null;

if (!$hasPersonalAccess) {
    // Solo dati aziendali della MIA azienda
    $where[] = "(n.visibilita = 'aziendale' AND n.azienda_id = ?)";
    $params[] = $aziendaId;
} else {
    // Dati aziendali della MIA azienda + i MIEI dati personali
    $where[] = "((n.visibilita = 'aziendale' AND n.azienda_id = ?) OR (n.visibilita = 'personale' AND n.creato_da = ?))";
    $params[] = $aziendaId;
    $params[] = $user['user_id'];
}

// Filtro tipo
if ($tipo) {
    $where[] = "n.tipo = ?";
    $params[] = $tipo;
}

// Filtro categoria (cerca nel JSON)
if ($categoria) {
    $where[] = "JSON_CONTAINS(n.categorie, ?)";
    $params[] = json_encode($categoria);
}

// Ricerca testuale
if ($search) {
    $where[] = "(n.nome LIKE ? OR n.indirizzo LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

// Filtro geografico (raggio in km)
if ($lat && $lng && $raggio) {
    $where[] = "(
        6371 * acos(
            cos(radians(?)) * cos(radians(n.lat)) * cos(radians(n.lng) - radians(?))
            + sin(radians(?)) * sin(radians(n.lat))
        )
    ) <= ?";
    $params[] = $lat;
    $params[] = $lng;
    $params[] = $lat;
    $params[] = $raggio;
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Query count
$countSql = "SELECT COUNT(*) as total FROM neuroni n $whereClause";
$stmt = $db->prepare($countSql);
$stmt->execute($params);
$total = $stmt->fetch()['total'];

// Verifica se esistono colonna potenziale e tabella vendite_prodotto
$hasPotenziale = false;
$hasVendite = false;

try {
    $db->query("SELECT potenziale FROM neuroni LIMIT 1");
    $hasPotenziale = true;
} catch (PDOException $e) {
    // Colonna potenziale non esiste
}

try {
    $db->query("SELECT 1 FROM vendite_prodotto LIMIT 1");
    $hasVendite = true;
} catch (PDOException $e) {
    // Tabella vendite_prodotto non esiste
}

// Query dati - con o senza potenziale/venduto in base a cosa esiste
$selectFields = "n.id, n.nome, n.tipo, n.categorie, n.visibilita, n.lat, n.lng, n.indirizzo, n.telefono, n.email, n.sito_web, n.dati_extra, n.dimensione, n.data_creazione";

if ($hasPotenziale) {
    $selectFields .= ", n.potenziale";
}
if ($hasVendite) {
    $selectFields .= ", COALESCE((SELECT SUM(v.importo) FROM vendite_prodotto v WHERE v.neurone_id = n.id), 0) as venduto_totale";
}

$sql = "SELECT $selectFields FROM neuroni n $whereClause ORDER BY n.nome ASC LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;

$stmt = $db->prepare($sql);
$stmt->execute($params);
$neuroni = $stmt->fetchAll();

// Decodifica JSON e converti tipi
foreach ($neuroni as &$n) {
    $n['categorie'] = json_decode($n['categorie'], true);
    $n['dati_extra'] = $n['dati_extra'] ? json_decode($n['dati_extra'], true) : null;

    // Converti lat/lng/dimensione a float (MySQL li restituisce come stringhe)
    $n['lat'] = $n['lat'] !== null ? (float)$n['lat'] : null;
    $n['lng'] = $n['lng'] !== null ? (float)$n['lng'] : null;
    $n['dimensione'] = $n['dimensione'] !== null ? (float)$n['dimensione'] : null;

    // Converti potenziale/venduto se presenti
    if (isset($n['potenziale'])) {
        $n['potenziale'] = $n['potenziale'] !== null ? (float)$n['potenziale'] : null;
    } else {
        $n['potenziale'] = null;
    }
    if (isset($n['venduto_totale'])) {
        $n['venduto_totale'] = (float)$n['venduto_totale'];
    } else {
        $n['venduto_totale'] = 0;
    }

    // Se non ha accesso personale, oscura neuroni personali (non dovrebbero esserci, ma per sicurezza)
    if (!$hasPersonalAccess && $n['visibilita'] === 'personale') {
        $n['nome'] = 'Fonte anonima';
        $n['telefono'] = null;
        $n['email'] = null;
        $n['indirizzo'] = null;
        $n['dati_extra'] = null;
    }
}

jsonResponse([
    'data' => $neuroni,
    'pagination' => [
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ]
]);
