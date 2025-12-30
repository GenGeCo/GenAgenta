<?php
/**
 * Tools disponibili per l'AI
 * Ogni tool è una funzione che l'AI può chiamare per recuperare dati
 */

/**
 * Esegue un tool AI e restituisce il risultato
 */
function executeAiTool(string $toolName, array $input, array $user): array {
    $db = getDB();
    $aziendaId = $user['azienda_id'] ?? null;

    try {
        switch ($toolName) {
            case 'query_database':
                return tool_queryDatabase($db, $input, $aziendaId);

            case 'get_database_schema':
                return tool_getDatabaseSchema($db);

            case 'search_entities':
                return tool_searchEntities($db, $input, $aziendaId);

            case 'get_entity_details':
                return tool_getEntityDetails($db, $input, $aziendaId);

            case 'get_sales_stats':
                return tool_getSalesStats($db, $input, $aziendaId);

            case 'get_connections':
                return tool_getConnections($db, $input, $aziendaId);

            // Tool di SCRITTURA
            case 'geocode_address':
                return tool_geocodeAddress($input);

            case 'create_entity':
                return tool_createEntity($db, $input, $user);

            case 'update_entity':
                return tool_updateEntity($db, $input, $user);

            case 'create_connection':
                return tool_createConnection($db, $input, $user);

            case 'create_sale':
                return tool_createSale($db, $input, $user);

            case 'create_note':
                return tool_createNote($db, $input, $user);

            default:
                return ['error' => "Tool sconosciuto: $toolName"];
        }
    } catch (Exception $e) {
        error_log("AI Tool error ($toolName): " . $e->getMessage());
        return ['error' => $e->getMessage()];
    }
}

/**
 * Tool: Esegue query SQL (solo SELECT)
 */
function tool_queryDatabase(PDO $db, array $input, ?string $aziendaId): array {
    $sql = $input['sql'] ?? '';

    // Validazione sicurezza: solo SELECT
    $sqlUpper = strtoupper(trim($sql));
    if (!str_starts_with($sqlUpper, 'SELECT')) {
        return ['error' => 'Solo query SELECT sono permesse'];
    }

    // Blocca parole chiave pericolose
    $forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    foreach ($forbidden as $word) {
        if (str_contains($sqlUpper, $word)) {
            return ['error' => "Operazione $word non permessa"];
        }
    }

    // Esegui query
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Limita risultati per non sovraccaricare
        $limited = array_slice($results, 0, 100);

        return [
            'success' => true,
            'rows' => count($results),
            'data' => $limited,
            'truncated' => count($results) > 100
        ];
    } catch (PDOException $e) {
        return ['error' => 'Errore SQL: ' . $e->getMessage()];
    }
}

/**
 * Tool: Ottiene schema database
 */
function tool_getDatabaseSchema(PDO $db): array {
    $schema = [];

    // Lista tabelle
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        // Salta tabelle di sistema
        if (str_starts_with($table, 'pma_') || $table === 'migrations') continue;

        $columns = $db->query("DESCRIBE `$table`")->fetchAll(PDO::FETCH_ASSOC);
        $schema[$table] = array_map(function($col) {
            return [
                'name' => $col['Field'],
                'type' => $col['Type'],
                'nullable' => $col['Null'] === 'YES',
                'key' => $col['Key']
            ];
        }, $columns);
    }

    return [
        'success' => true,
        'tables' => array_keys($schema),
        'schema' => $schema
    ];
}

/**
 * Tool: Cerca entità
 */
function tool_searchEntities(PDO $db, array $input, ?string $aziendaId): array {
    $query = $input['query'] ?? '';
    $tipo = $input['tipo'] ?? null;
    $limit = min($input['limit'] ?? 10, 50);

    $sql = "SELECT id, nome, tipo, categorie, indirizzo, email, telefono
            FROM neuroni
            WHERE azienda_id = ?";
    $params = [$aziendaId];

    if ($query) {
        $sql .= " AND (nome LIKE ? OR indirizzo LIKE ?)";
        $params[] = "%$query%";
        $params[] = "%$query%";
    }

    if ($tipo) {
        $sql .= " AND tipo = ?";
        $params[] = $tipo;
    }

    $sql .= " ORDER BY nome ASC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decodifica JSON categorie
    foreach ($results as &$r) {
        $r['categorie'] = json_decode($r['categorie'], true) ?? [];
    }

    return [
        'success' => true,
        'count' => count($results),
        'entities' => $results
    ];
}

/**
 * Tool: Dettagli entità completi
 */
function tool_getEntityDetails(PDO $db, array $input, ?string $aziendaId): array {
    $entityId = $input['entity_id'] ?? '';

    if (!$entityId) {
        return ['error' => 'entity_id richiesto'];
    }

    // Recupera entità
    $stmt = $db->prepare("
        SELECT *
        FROM neuroni
        WHERE id = ? AND azienda_id = ?
    ");
    $stmt->execute([$entityId, $aziendaId]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entità non trovata'];
    }

    $entity['categorie'] = json_decode($entity['categorie'], true) ?? [];
    $entity['dati_extra'] = json_decode($entity['dati_extra'], true);

    // Recupera connessioni
    $stmt = $db->prepare("
        SELECT s.*, n.nome as nome_controparte
        FROM sinapsi s
        LEFT JOIN neuroni n ON (
            CASE WHEN s.neurone_da = ? THEN s.neurone_a ELSE s.neurone_da END = n.id
        )
        WHERE (s.neurone_da = ? OR s.neurone_a = ?) AND s.azienda_id = ?
        LIMIT 20
    ");
    $stmt->execute([$entityId, $entityId, $entityId, $aziendaId]);
    $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recupera vendite
    $stmt = $db->prepare("
        SELECT v.*, fp.nome as famiglia_nome
        FROM vendite_prodotto v
        LEFT JOIN famiglie_prodotto fp ON v.famiglia_id = fp.id
        WHERE v.neurone_id = ?
        ORDER BY v.data_vendita DESC
        LIMIT 20
    ");
    $stmt->execute([$entityId]);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calcola totali
    $stmt = $db->prepare("
        SELECT COUNT(*) as num_vendite, SUM(importo) as totale_vendite
        FROM vendite_prodotto
        WHERE neurone_id = ?
    ");
    $stmt->execute([$entityId]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'entity' => $entity,
        'connections' => $connections,
        'recent_sales' => $sales,
        'totals' => [
            'num_vendite' => (int)$totals['num_vendite'],
            'totale_vendite' => (float)$totals['totale_vendite']
        ]
    ];
}

/**
 * Tool: Statistiche vendite
 */
function tool_getSalesStats(PDO $db, array $input, ?string $aziendaId): array {
    $entityId = $input['entity_id'] ?? null;
    $fromDate = $input['from_date'] ?? date('Y-m-d', strtotime('-1 year'));
    $toDate = $input['to_date'] ?? date('Y-m-d');
    $groupBy = $input['group_by'] ?? 'month';

    $params = [$aziendaId, $fromDate, $toDate];

    // Query base
    $sql = "SELECT ";

    switch ($groupBy) {
        case 'month':
            $sql .= "DATE_FORMAT(v.data_vendita, '%Y-%m') as periodo, ";
            break;
        case 'entity':
            $sql .= "v.neurone_id, n.nome as entita, ";
            break;
        case 'family':
            $sql .= "v.famiglia_id, fp.nome as famiglia, ";
            break;
        default:
            $sql .= "DATE_FORMAT(v.data_vendita, '%Y-%m') as periodo, ";
    }

    $sql .= "COUNT(*) as num_transazioni, SUM(v.importo) as totale, AVG(v.importo) as media
             FROM vendite_prodotto v
             LEFT JOIN neuroni n ON v.neurone_id = n.id
             LEFT JOIN famiglie_prodotto fp ON v.famiglia_id = fp.id
             WHERE v.azienda_id = ? AND v.data_vendita BETWEEN ? AND ?";

    if ($entityId) {
        $sql .= " AND v.neurone_id = ?";
        $params[] = $entityId;
    }

    switch ($groupBy) {
        case 'month':
            $sql .= " GROUP BY DATE_FORMAT(v.data_vendita, '%Y-%m') ORDER BY periodo DESC";
            break;
        case 'entity':
            $sql .= " GROUP BY v.neurone_id, n.nome ORDER BY totale DESC LIMIT 20";
            break;
        case 'family':
            $sql .= " GROUP BY v.famiglia_id, fp.nome ORDER BY totale DESC";
            break;
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Totale generale
    $totalSql = "SELECT COUNT(*) as num, SUM(importo) as tot
                 FROM vendite_prodotto
                 WHERE azienda_id = ? AND data_vendita BETWEEN ? AND ?";
    $totalParams = [$aziendaId, $fromDate, $toDate];

    if ($entityId) {
        $totalSql .= " AND neurone_id = ?";
        $totalParams[] = $entityId;
    }

    $stmt = $db->prepare($totalSql);
    $stmt->execute($totalParams);
    $total = $stmt->fetch(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'period' => ['from' => $fromDate, 'to' => $toDate],
        'group_by' => $groupBy,
        'stats' => $stats,
        'total' => [
            'transazioni' => (int)$total['num'],
            'importo' => (float)$total['tot']
        ]
    ];
}

/**
 * Tool: Connessioni entità
 */
function tool_getConnections(PDO $db, array $input, ?string $aziendaId): array {
    $entityId = $input['entity_id'] ?? '';
    $targetId = $input['target_id'] ?? null;

    if (!$entityId) {
        return ['error' => 'entity_id richiesto'];
    }

    $sql = "SELECT s.*,
                   n1.nome as nome_da, n1.tipo as tipo_da,
                   n2.nome as nome_a, n2.tipo as tipo_a
            FROM sinapsi s
            LEFT JOIN neuroni n1 ON s.neurone_da = n1.id
            LEFT JOIN neuroni n2 ON s.neurone_a = n2.id
            WHERE s.azienda_id = ?
              AND (s.neurone_da = ? OR s.neurone_a = ?)";
    $params = [$aziendaId, $entityId, $entityId];

    if ($targetId) {
        $sql .= " AND (s.neurone_da = ? OR s.neurone_a = ?)";
        $params[] = $targetId;
        $params[] = $targetId;
    }

    $sql .= " LIMIT 50";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'entity_id' => $entityId,
        'count' => count($connections),
        'connections' => $connections
    ];
}

// ============================================================
// TOOL DI SCRITTURA
// ============================================================

/**
 * Tool: Geocoding indirizzo
 * Cerca un indirizzo e restituisce le coordinate
 */
function tool_geocodeAddress(array $input): array {
    $address = $input['address'] ?? '';
    $limit = $input['limit'] ?? 5;

    if (empty($address)) {
        return ['error' => 'Indirizzo richiesto'];
    }

    // Usa Nominatim (gratuito) per il geocoding
    $url = 'https://nominatim.openstreetmap.org/search';
    $url .= '?' . http_build_query([
        'q' => $address,
        'format' => 'json',
        'limit' => $limit,
        'addressdetails' => 1,
        'countrycodes' => 'it'
    ]);

    $context = stream_context_create([
        'http' => [
            'header' => 'User-Agent: GenAgenta/1.0'
        ]
    ]);

    $response = file_get_contents($url, false, $context);
    if (!$response) {
        return ['error' => 'Errore nella richiesta di geocoding'];
    }

    $data = json_decode($response, true);
    if (!is_array($data) || empty($data)) {
        return [
            'success' => true,
            'results' => [],
            'message' => 'Nessun risultato trovato per: ' . $address
        ];
    }

    $results = array_map(function($item) {
        return [
            'formatted' => $item['display_name'] ?? '',
            'lat' => (float)($item['lat'] ?? 0),
            'lng' => (float)($item['lon'] ?? 0),
            'type' => $item['type'] ?? 'unknown'
        ];
    }, $data);

    return [
        'success' => true,
        'query' => $address,
        'results' => $results
    ];
}

/**
 * Tool: Crea nuova entità (neurone)
 */
function tool_createEntity(PDO $db, array $input, array $user): array {
    $nome = $input['nome'] ?? '';
    $tipo = $input['tipo'] ?? 'impresa'; // persona, impresa, luogo, cantiere
    $indirizzo = $input['indirizzo'] ?? null;
    $lat = $input['lat'] ?? null;
    $lng = $input['lng'] ?? null;
    $email = $input['email'] ?? null;
    $telefono = $input['telefono'] ?? null;
    $categorie = $input['categorie'] ?? [];
    $note = $input['note'] ?? null;
    $personale = $input['personale'] ?? false;

    if (empty($nome)) {
        return ['error' => 'Nome entità richiesto'];
    }

    // Valida tipo
    $tipiValidi = ['persona', 'impresa', 'luogo', 'cantiere'];
    if (!in_array($tipo, $tipiValidi)) {
        return ['error' => "Tipo non valido. Usa: " . implode(', ', $tipiValidi)];
    }

    // Genera UUID
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $sql = "INSERT INTO neuroni (
                id, azienda_id, nome, tipo, indirizzo, latitudine, longitudine,
                email, telefono, categorie, note, personale, creato_da, creato_il
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $id,
        $user['azienda_id'],
        $nome,
        $tipo,
        $indirizzo,
        $lat,
        $lng,
        $email,
        $telefono,
        json_encode($categorie),
        $note,
        $personale ? 1 : 0,
        $user['user_id']
    ]);

    return [
        'success' => true,
        'message' => "Entità '$nome' creata con successo",
        'entity_id' => $id,
        'entity' => [
            'id' => $id,
            'nome' => $nome,
            'tipo' => $tipo,
            'indirizzo' => $indirizzo,
            'lat' => $lat,
            'lng' => $lng
        ]
    ];
}

/**
 * Tool: Aggiorna entità esistente
 */
function tool_updateEntity(PDO $db, array $input, array $user): array {
    $entityId = $input['entity_id'] ?? '';

    if (empty($entityId)) {
        return ['error' => 'entity_id richiesto'];
    }

    // Verifica che l'entità esista e appartenga all'azienda
    $stmt = $db->prepare("SELECT * FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$entityId, $user['azienda_id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        return ['error' => 'Entità non trovata o non accessibile'];
    }

    // Prepara campi da aggiornare
    $updates = [];
    $params = [];

    $campiAggiornabili = ['nome', 'indirizzo', 'email', 'telefono', 'note'];
    foreach ($campiAggiornabili as $campo) {
        if (isset($input[$campo])) {
            $updates[] = "$campo = ?";
            $params[] = $input[$campo];
        }
    }

    // Coordinate
    if (isset($input['lat']) && isset($input['lng'])) {
        $updates[] = "latitudine = ?";
        $updates[] = "longitudine = ?";
        $params[] = $input['lat'];
        $params[] = $input['lng'];
    }

    // Categorie
    if (isset($input['categorie'])) {
        $updates[] = "categorie = ?";
        $params[] = json_encode($input['categorie']);
    }

    if (empty($updates)) {
        return ['error' => 'Nessun campo da aggiornare specificato'];
    }

    $updates[] = "aggiornato_il = NOW()";
    $params[] = $entityId;
    $params[] = $user['azienda_id'];

    $sql = "UPDATE neuroni SET " . implode(', ', $updates) . " WHERE id = ? AND azienda_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    return [
        'success' => true,
        'message' => "Entità aggiornata con successo",
        'entity_id' => $entityId
    ];
}

/**
 * Tool: Crea connessione (sinapsi) tra due entità
 */
function tool_createConnection(PDO $db, array $input, array $user): array {
    $neuroneDa = $input['entity_from'] ?? $input['neurone_da'] ?? '';
    $neuroneA = $input['entity_to'] ?? $input['neurone_a'] ?? '';
    $tipo = $input['tipo'] ?? 'commerciale';
    $note = $input['note'] ?? null;
    $personale = $input['personale'] ?? false;

    if (empty($neuroneDa) || empty($neuroneA)) {
        return ['error' => 'entity_from e entity_to sono richiesti'];
    }

    if ($neuroneDa === $neuroneA) {
        return ['error' => 'Non puoi collegare un\'entità a se stessa'];
    }

    // Verifica che entrambe le entità esistano
    $stmt = $db->prepare("SELECT id, nome FROM neuroni WHERE id IN (?, ?) AND azienda_id = ?");
    $stmt->execute([$neuroneDa, $neuroneA, $user['azienda_id']]);
    $entities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($entities) !== 2) {
        return ['error' => 'Una o entrambe le entità non esistono o non sono accessibili'];
    }

    // Verifica che non esista già una connessione
    $stmt = $db->prepare("
        SELECT id FROM sinapsi
        WHERE ((neurone_da = ? AND neurone_a = ?) OR (neurone_da = ? AND neurone_a = ?))
        AND azienda_id = ?
    ");
    $stmt->execute([$neuroneDa, $neuroneA, $neuroneA, $neuroneDa, $user['azienda_id']]);
    if ($stmt->fetch()) {
        return ['error' => 'Esiste già una connessione tra queste due entità'];
    }

    // Genera UUID
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $sql = "INSERT INTO sinapsi (
                id, azienda_id, neurone_da, neurone_a, tipo, note,
                personale, creato_da, data_inizio, creato_il
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $id,
        $user['azienda_id'],
        $neuroneDa,
        $neuroneA,
        $tipo,
        $note,
        $personale ? 1 : 0,
        $user['user_id']
    ]);

    // Recupera nomi per il messaggio
    $nomi = [];
    foreach ($entities as $e) {
        $nomi[$e['id']] = $e['nome'];
    }

    return [
        'success' => true,
        'message' => "Connessione creata tra '{$nomi[$neuroneDa]}' e '{$nomi[$neuroneA]}'",
        'connection_id' => $id,
        'tipo' => $tipo
    ];
}

/**
 * Tool: Crea una vendita/transazione
 */
function tool_createSale(PDO $db, array $input, array $user): array {
    $neuroneId = $input['entity_id'] ?? $input['neurone_id'] ?? '';
    $importo = $input['importo'] ?? 0;
    $famigliaId = $input['famiglia_id'] ?? null;
    $dataVendita = $input['data'] ?? date('Y-m-d');
    $descrizione = $input['descrizione'] ?? null;
    $sinapsiId = $input['sinapsi_id'] ?? null;
    $tipoTransazione = $input['tipo_transazione'] ?? 'vendita';

    if (empty($neuroneId)) {
        return ['error' => 'entity_id richiesto'];
    }

    if ($importo <= 0) {
        return ['error' => 'Importo deve essere maggiore di 0'];
    }

    // Verifica entità
    $stmt = $db->prepare("SELECT id, nome FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$neuroneId, $user['azienda_id']]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entità non trovata o non accessibile'];
    }

    // Genera UUID
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $sql = "INSERT INTO vendite_prodotto (
                id, azienda_id, neurone_id, sinapsi_id, famiglia_id,
                importo, tipo_transazione, data_vendita, descrizione, creato_da, creato_il
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $id,
        $user['azienda_id'],
        $neuroneId,
        $sinapsiId,
        $famigliaId,
        $importo,
        $tipoTransazione,
        $dataVendita,
        $descrizione,
        $user['user_id']
    ]);

    return [
        'success' => true,
        'message' => "Vendita di € " . number_format($importo, 2, ',', '.') . " registrata per '{$entity['nome']}'",
        'sale_id' => $id,
        'importo' => $importo,
        'entity_name' => $entity['nome']
    ];
}

/**
 * Tool: Crea nota su un'entità
 */
function tool_createNote(PDO $db, array $input, array $user): array {
    $neuroneId = $input['entity_id'] ?? $input['neurone_id'] ?? '';
    $contenuto = $input['contenuto'] ?? $input['content'] ?? '';
    $tipo = $input['tipo'] ?? 'nota';
    $personale = $input['personale'] ?? true;

    if (empty($neuroneId)) {
        return ['error' => 'entity_id richiesto'];
    }

    if (empty($contenuto)) {
        return ['error' => 'Contenuto della nota richiesto'];
    }

    // Verifica entità
    $stmt = $db->prepare("SELECT id, nome FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$neuroneId, $user['azienda_id']]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entità non trovata o non accessibile'];
    }

    // Genera UUID
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $sql = "INSERT INTO note (
                id, azienda_id, neurone_id, tipo, contenuto,
                personale, creato_da, creato_il
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $id,
        $user['azienda_id'],
        $neuroneId,
        $tipo,
        $contenuto,
        $personale ? 1 : 0,
        $user['user_id']
    ]);

    return [
        'success' => true,
        'message' => "Nota aggiunta a '{$entity['nome']}'",
        'note_id' => $id
    ];
}
