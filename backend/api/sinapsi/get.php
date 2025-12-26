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
        n_a.tipo as tipo_a,
        fp.nome as prodotto_nome
    FROM sinapsi s
    JOIN neuroni n_da ON s.neurone_da = n_da.id
    JOIN neuroni n_a ON s.neurone_a = n_a.id
    LEFT JOIN famiglie_prodotto fp ON s.famiglia_prodotto_id = fp.id
    WHERE s.id = ?
";

$stmt = $db->prepare($sql);
$stmt->execute([$id]);
$sinapsi = $stmt->fetch();

if (!$sinapsi) {
    errorResponse('Sinapsi non trovata', 404);
}

// Decodifica tipo_connessione da JSON a array
if (!empty($sinapsi['tipo_connessione'])) {
    $decoded = json_decode($sinapsi['tipo_connessione'], true);
    if (is_array($decoded)) {
        $sinapsi['tipo_connessione'] = $decoded;
    } else {
        // Legacy: stringa singola - converti in array
        $sinapsi['tipo_connessione'] = [$sinapsi['tipo_connessione']];
    }
} else {
    $sinapsi['tipo_connessione'] = [];
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

// === DATI OGGETTIVI (calcolati dalle vendite) ===
// Calcola volume e conteggio transazioni tra le due entità
$datiOggettivi = [
    'volume_totale' => 0,
    'numero_transazioni' => 0,
    'ultima_transazione' => null,
    'prima_transazione' => null
];

try {
    // Cerca transazioni tra i due neuroni (in entrambe le direzioni)
    $sqlVendite = "
        SELECT
            COALESCE(SUM(importo), 0) as volume_totale,
            COUNT(*) as numero_transazioni,
            MAX(data_vendita) as ultima_transazione,
            MIN(data_vendita) as prima_transazione
        FROM vendite_prodotto
        WHERE (neurone_id = ? AND controparte_id = ?)
           OR (neurone_id = ? AND controparte_id = ?)
    ";
    $stmtVendite = $db->prepare($sqlVendite);
    $stmtVendite->execute([
        $sinapsi['neurone_da'], $sinapsi['neurone_a'],
        $sinapsi['neurone_a'], $sinapsi['neurone_da']
    ]);
    $risultatoVendite = $stmtVendite->fetch();

    if ($risultatoVendite) {
        $datiOggettivi['volume_totale'] = (float)($risultatoVendite['volume_totale'] ?? 0);
        // Dividi per 2 perché le transazioni bilaterali creano 2 record
        $datiOggettivi['numero_transazioni'] = (int)(($risultatoVendite['numero_transazioni'] ?? 0) / 2);
        $datiOggettivi['ultima_transazione'] = $risultatoVendite['ultima_transazione'];
        $datiOggettivi['prima_transazione'] = $risultatoVendite['prima_transazione'];
    }
} catch (PDOException $e) {
    // Ignora errori (tabella potrebbe non esistere)
}

// Aggiungi dati oggettivi alla risposta
$sinapsi['dati_oggettivi'] = $datiOggettivi;

// Cast campi soggettivi a int (se presenti)
$campiSoggettivi = ['influenza', 'qualita_relazione', 'importanza_strategica', 'affidabilita', 'potenziale'];
foreach ($campiSoggettivi as $campo) {
    if (isset($sinapsi[$campo]) && $sinapsi[$campo] !== null) {
        $sinapsi[$campo] = (int)$sinapsi[$campo];
    }
}

jsonResponse($sinapsi);
