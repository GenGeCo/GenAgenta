<?php
/**
 * POST /neuroni
 * Crea nuovo neurone
 */

$user = requireAuth();
$data = getJsonBody();

// Validazione
$required = ['nome', 'tipo', 'categorie'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        errorResponse("Campo '$field' richiesto", 400);
    }
}

// Valida tipo - deve esistere nella tabella tipi_neurone
$db = getDB();
$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

// Cerca il tipo per nome o ID (supporta sia il nome che l'UUID)
$sqlTipo = "
    SELECT id, nome FROM tipi_neurone
    WHERE (id = ? OR nome = ?)
    AND (
        (visibilita = 'aziendale' AND azienda_id = ?)
        " . ($hasPersonalAccess ? "OR (visibilita = 'personale' AND creato_da = ?)" : "") . "
    )
";
$paramsTipo = [$data['tipo'], $data['tipo'], $aziendaId];
if ($hasPersonalAccess) {
    $paramsTipo[] = $user['user_id'];
}
$stmtTipo = $db->prepare($sqlTipo);
$stmtTipo->execute($paramsTipo);
$tipoRow = $stmtTipo->fetch();

if (!$tipoRow) {
    // DEBUG: log per capire perché non trova il tipo
    error_log("DEBUG create.php: tipo non trovato. data[tipo]={$data['tipo']}, azienda_id=$aziendaId");
    errorResponse('Tipo non valido o non accessibile: ' . $data['tipo'], 400);
}
// Usa il nome del tipo per salvare nel DB (per retrocompatibilità)
$tipoNome = $tipoRow['nome'];
error_log("DEBUG create.php: tipo trovato. tipoNome=$tipoNome");

// Valida categorie (deve essere array)
if (!is_array($data['categorie'])) {
    errorResponse('Categorie deve essere un array', 400);
}

$id = generateUUID();
$visibilita = $data['visibilita'] ?? 'aziendale';

// Se visibilità personale, richiede accesso personale
if ($visibilita === 'personale' && !$hasPersonalAccess) {
    errorResponse('Accesso personale richiesto per creare neuroni privati', 403);
}

$stmt = $db->prepare('
    INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, sito_web, dati_extra, creato_da, azienda_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

// DEBUG TEMPORANEO: usa direttamente $data['tipo'] per bypassare la validazione
$tipoFinale = $data['tipo']; // Provo direttamente dal payload
error_log("DEBUG create.php: tipoFinale=$tipoFinale (da data), tipoNome=$tipoNome (da validazione)");

$params = [
    $id,
    $data['nome'],
    $tipoFinale,  // Uso direttamente il tipo dal payload
    json_encode($data['categorie']),
    $visibilita,
    $data['lat'] ?? null,
    $data['lng'] ?? null,
    $data['indirizzo'] ?? null,
    $data['telefono'] ?? null,
    $data['email'] ?? null,
    $data['sito_web'] ?? null,
    isset($data['dati_extra']) ? json_encode($data['dati_extra']) : null,
    $user['user_id'],
    $user['azienda_id'] ?? null
];

error_log("DEBUG create.php INSERT params: " . json_encode($params));
$stmt->execute($params);

// Verifica cosa è stato salvato
$verifyStmt = $db->prepare('SELECT id, nome, tipo FROM neuroni WHERE id = ?');
$verifyStmt->execute([$id]);
$saved = $verifyStmt->fetch();
error_log("DEBUG create.php DOPO INSERT: " . json_encode($saved));

jsonResponse(['id' => $id, 'message' => 'Neurone creato', 'debug_saved' => $saved], 201);
