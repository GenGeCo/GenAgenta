<?php
/**
 * PUT /sinapsi/{id}
 * Aggiorna sinapsi
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Verifica esistenza e ottieni dati per controllo accesso
$stmt = $db->prepare('SELECT livello, creato_da, azienda_id FROM sinapsi WHERE id = ?');
$stmt->execute([$id]);
$sinapsi = $stmt->fetch();

if (!$sinapsi) {
    errorResponse('Sinapsi non trovata', 404);
}

$aziendaId = $user['azienda_id'] ?? null;

// Controllo accesso in base al livello
if ($sinapsi['livello'] === 'personale') {
    // Dati personali: richiede PIN + essere il proprietario
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    if (!$hasPersonalAccess) {
        errorResponse('Accesso personale richiesto', 403);
    }

    if ($sinapsi['creato_da'] !== $user['user_id']) {
        errorResponse('Solo il creatore può modificare dati personali', 403);
    }
} else {
    // Dati aziendali: verifica appartenenza alla stessa azienda
    if ($sinapsi['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

// Campi aggiornabili
$updates = [];
$params = [];

$allowedFields = [
    // Campi base
    'tipo_connessione', 'famiglia_prodotto_id', 'data_inizio', 'data_fine',
    'valore', 'certezza', 'fonte', 'data_verifica', 'livello', 'note',
    // Campi soggettivi (valutazioni 1-5)
    'influenza', 'qualita_relazione', 'importanza_strategica',
    'affidabilita', 'potenziale', 'note_relazione'
];

foreach ($allowedFields as $field) {
    if (array_key_exists($field, $data)) {
        $value = $data[$field];

        // tipo_connessione: converti array in JSON
        if ($field === 'tipo_connessione') {
            if (is_array($value)) {
                $value = json_encode($value);
            } elseif (is_string($value) && substr($value, 0, 1) !== '[') {
                // Stringa singola legacy - convertiamo in array JSON
                $value = json_encode([$value]);
            }
        }

        $updates[] = "$field = ?";
        $params[] = $value;
    }
}

if (empty($updates)) {
    errorResponse('Nessun campo da aggiornare', 400);
}

$params[] = $id;
$sql = "UPDATE sinapsi SET " . implode(', ', $updates) . " WHERE id = ?";

$stmt = $db->prepare($sql);
$stmt->execute($params);

jsonResponse(['message' => 'Sinapsi aggiornata']);
