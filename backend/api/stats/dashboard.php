<?php
/**
 * GET /stats
 * Statistiche per dashboard
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

$db = getDB();

// Conta neuroni per tipo
$sql = "
    SELECT tipo, COUNT(*) as count
    FROM neuroni
    WHERE visibilita = 'aziendale'" . ($hasPersonalAccess ? " OR visibilita = 'personale'" : "") . "
    GROUP BY tipo
";
$stmt = $db->query($sql);
$neuroniPerTipo = $stmt->fetchAll();

// Conta sinapsi per tipo connessione (top 10)
$sql = "
    SELECT tipo_connessione, COUNT(*) as count
    FROM sinapsi
    WHERE livello = 'aziendale'" . ($hasPersonalAccess ? " OR livello = 'personale'" : "") . "
    GROUP BY tipo_connessione
    ORDER BY count DESC
    LIMIT 10
";
$stmt = $db->query($sql);
$sinapsiPerTipo = $stmt->fetchAll();

// Totali
$totaleNeuroni = 0;
foreach ($neuroniPerTipo as $n) {
    $totaleNeuroni += $n['count'];
}

$stmt = $db->query("SELECT COUNT(*) as count FROM sinapsi WHERE livello = 'aziendale'" . ($hasPersonalAccess ? " OR livello = 'personale'" : ""));
$totaleSinapsi = $stmt->fetch()['count'];

// Cantieri attivi (senza data_fine)
$sql = "
    SELECT COUNT(*) as count
    FROM neuroni
    WHERE tipo = 'luogo'
    AND JSON_CONTAINS(categorie, '\"cantiere\"')
    AND (dati_extra->>'$.data_fine' IS NULL OR dati_extra->>'$.data_fine' = '')
";
$stmt = $db->query($sql);
$cantieriAttivi = $stmt->fetch()['count'];

// Valore totale sinapsi (fatturato)
$stmt = $db->query("SELECT SUM(valore) as total FROM sinapsi WHERE valore IS NOT NULL");
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
