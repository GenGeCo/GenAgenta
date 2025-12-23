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
    $where[] = "(visibilita = 'aziendale' AND azienda_id = ?)";
    $params[] = $aziendaId;
} else {
    // Dati aziendali della MIA azienda + i MIEI dati personali
    $where[] = "((visibilita = 'aziendale' AND azienda_id = ?) OR (visibilita = 'personale' AND creato_da = ?))";
    $params[] = $aziendaId;
    $params[] = $user['user_id'];
}

// Filtro tipo
if ($tipo) {
    $where[] = "tipo = ?";
    $params[] = $tipo;
}

// Filtro categoria (cerca nel JSON)
if ($categoria) {
    $where[] = "JSON_CONTAINS(categorie, ?)";
    $params[] = json_encode($categoria);
}

// Ricerca testuale
if ($search) {
    $where[] = "(nome LIKE ? OR indirizzo LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

// Filtro geografico (raggio in km)
if ($lat && $lng && $raggio) {
    $where[] = "(
        6371 * acos(
            cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?))
            + sin(radians(?)) * sin(radians(lat))
        )
    ) <= ?";
    $params[] = $lat;
    $params[] = $lng;
    $params[] = $lat;
    $params[] = $raggio;
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Query count
$countSql = "SELECT COUNT(*) as total FROM neuroni $whereClause";
$stmt = $db->prepare($countSql);
$stmt->execute($params);
$total = $stmt->fetch()['total'];

// Query dati
$sql = "SELECT id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, sito_web, dati_extra, dimensione, data_creazione
        FROM neuroni $whereClause
        ORDER BY nome ASC
        LIMIT ? OFFSET ?";

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
