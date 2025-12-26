<?php
/**
 * GET /stats
 * Statistiche per dashboard
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;
$userId = $user['user_id'];

$db = getDB();

// Costruisci condizione visibilità (usata in tutte le query)
// Aziendale: stessa azienda | Personale: stesso utente + PIN
$visibilitaNeuroni = "(visibilita = 'aziendale' AND azienda_id = ?)";
$paramsNeuroni = [$aziendaId];
if ($hasPersonalAccess) {
    $visibilitaNeuroni .= " OR (visibilita = 'personale' AND creato_da = ?)";
    $paramsNeuroni[] = $userId;
}

$visibilitaSinapsi = "(livello = 'aziendale' AND azienda_id = ?)";
$paramsSinapsi = [$aziendaId];
if ($hasPersonalAccess) {
    $visibilitaSinapsi .= " OR (livello = 'personale' AND creato_da = ?)";
    $paramsSinapsi[] = $userId;
}

// Conta neuroni per tipo
$sql = "
    SELECT tipo, COUNT(*) as count
    FROM neuroni
    WHERE $visibilitaNeuroni
    GROUP BY tipo
";
$stmt = $db->prepare($sql);
$stmt->execute($paramsNeuroni);
$neuroniPerTipo = $stmt->fetchAll();

// Conta sinapsi per tipo connessione (top 10)
$sql = "
    SELECT tipo_connessione, COUNT(*) as count
    FROM sinapsi
    WHERE $visibilitaSinapsi
    GROUP BY tipo_connessione
    ORDER BY count DESC
    LIMIT 10
";
$stmt = $db->prepare($sql);
$stmt->execute($paramsSinapsi);
$sinapsiPerTipo = $stmt->fetchAll();

// Totali
$totaleNeuroni = 0;
foreach ($neuroniPerTipo as $n) {
    $totaleNeuroni += $n['count'];
}

$sql = "SELECT COUNT(*) as count FROM sinapsi WHERE $visibilitaSinapsi";
$stmt = $db->prepare($sql);
$stmt->execute($paramsSinapsi);
$totaleSinapsi = $stmt->fetch()['count'];

// Cantieri attivi (senza data_fine) - solo della mia azienda
$sql = "
    SELECT COUNT(*) as count
    FROM neuroni
    WHERE tipo = 'luogo'
    AND JSON_CONTAINS(categorie, '\"cantiere\"')
    AND (dati_extra->>'$.data_fine' IS NULL OR dati_extra->>'$.data_fine' = '')
    AND ($visibilitaNeuroni)
";
$stmt = $db->prepare($sql);
$stmt->execute($paramsNeuroni);
$cantieriAttivi = $stmt->fetch()['count'];

// Valore totale sinapsi (fatturato) - solo della mia azienda
$sql = "SELECT SUM(valore) as total FROM sinapsi WHERE valore IS NOT NULL AND ($visibilitaSinapsi)";
$stmt = $db->prepare($sql);
$stmt->execute($paramsSinapsi);
$valoreTotale = $stmt->fetch()['total'] ?? 0;

// Note personali (solo se ha accesso)
$notePersonali = 0;
if ($hasPersonalAccess) {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM note_personali WHERE utente_id = ?");
    $stmt->execute([$user['user_id']]);
    $notePersonali = $stmt->fetch()['count'];
}

jsonResponse([
    'totali' => [
        'neuroni' => (int)$totaleNeuroni,
        'sinapsi' => (int)$totaleSinapsi,
        'cantieri_attivi' => (int)$cantieriAttivi,
        'valore_totale' => (float)$valoreTotale,
        'note_personali' => (int)$notePersonali
    ],
    'neuroni_per_tipo' => $neuroniPerTipo,
    'sinapsi_per_tipo' => $sinapsiPerTipo
]);
