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

            // Tool di ELIMINAZIONE
            case 'delete_entity':
                return tool_deleteEntity($db, $input, $user);

            case 'delete_connection':
                return tool_deleteConnection($db, $input, $user);

            case 'delete_sale':
                return tool_deleteSale($db, $input, $user);

            // Tool MAPPA - Azioni frontend
            case 'map_fly_to':
                return tool_mapFlyTo($input);

            case 'map_select_entity':
                return tool_mapSelectEntity($db, $input, $user);

            case 'map_show_connections':
                return tool_mapShowConnections($db, $input, $user);

            // Tool UI - Azioni frontend
            case 'ui_open_panel':
                return tool_uiOpenPanel($input);

            case 'ui_show_notification':
                return tool_uiShowNotification($input);

            // Tool AUTONOMIA - L'AI esplora e impara
            case 'explore_code':
                return tool_exploreCode($input);

            case 'save_learning':
                return tool_saveLearning($input, $user);

            case 'read_learnings':
                return tool_readLearnings($user);

            case 'propose_improvement':
                return tool_proposeImprovement($input, $user);

            // Tool FILE SYSTEM - Lazy loading e memoria
            case 'read_file':
                return tool_readFile($input);

            case 'write_file':
                return tool_writeFile($input);

            case 'list_files':
                return tool_listFiles($input);

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
            'header' => 'User-Agent: GenAgenta/1.0',
            'timeout' => 10
        ]
    ]);

    try {
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            error_log("Geocoding failed for: $address");
            return ['error' => 'Errore nella richiesta di geocoding. Riprova.'];
        }
    } catch (Exception $e) {
        error_log("Geocoding exception: " . $e->getMessage());
        return ['error' => 'Errore durante il geocoding: ' . $e->getMessage()];
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
    $tipo = $input['tipo'] ?? null;
    $indirizzo = $input['indirizzo'] ?? null;
    $lat = $input['lat'] ?? null;
    $lng = $input['lng'] ?? null;
    $email = $input['email'] ?? null;
    $telefono = $input['telefono'] ?? null;
    $categorie = $input['categorie'] ?? [];
    $visibilita = $input['personale'] ?? false ? 'personale' : 'aziendale';

    if (empty($nome)) {
        return ['error' => 'Nome entità richiesto'];
    }

    // Recupera tipi disponibili dal database (prima tipi v2, poi tipi_neurone v1)
    $aziendaId = $user['azienda_id'] ?? null;
    $teamId = $user['team_id'] ?? $aziendaId;

    $tipiDisponibili = [];

    // Prima cerca in tabella tipi (v2)
    if ($teamId) {
        $stmt = $db->prepare("SELECT nome FROM tipi WHERE team_id = ?");
        $stmt->execute([$teamId]);
        $tipiDisponibili = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    // Fallback a tipi_neurone (v1) se vuoto
    if (empty($tipiDisponibili) && $aziendaId) {
        $stmt = $db->prepare("SELECT nome FROM tipi_neurone WHERE azienda_id = ?");
        $stmt->execute([$aziendaId]);
        $tipiDisponibili = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    if (empty($tipiDisponibili)) {
        return ['error' => 'Nessun tipo configurato nel sistema. Configura prima i tipi di entità.'];
    }

    // Se tipo non specificato, usa il primo disponibile
    if (empty($tipo)) {
        $tipo = $tipiDisponibili[0];
    }

    // Valida tipo (case-insensitive)
    $tipoTrovato = null;
    foreach ($tipiDisponibili as $t) {
        if (strtolower($t) === strtolower($tipo)) {
            $tipoTrovato = $t; // Usa il nome esatto dal DB
            break;
        }
    }

    if (!$tipoTrovato) {
        return ['error' => "Tipo '$tipo' non valido. Tipi disponibili: " . implode(', ', $tipiDisponibili)];
    }

    $tipo = $tipoTrovato; // Usa il nome esatto dal database

    // Recupera categorie (tipologie) disponibili per questo tipo
    $categorieDisponibili = [];

    // Prima cerca in tipologie (v2) - collegate a tipi tramite tipo_id
    $stmt = $db->prepare("
        SELECT tp.nome FROM tipologie tp
        JOIN tipi t ON tp.tipo_id = t.id
        WHERE t.team_id = ? AND t.nome = ?
        ORDER BY tp.ordine ASC
    ");
    $stmt->execute([$teamId, $tipo]);
    $categorieDisponibili = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Fallback a categorie (v1) se vuoto
    if (empty($categorieDisponibili) && $aziendaId) {
        $stmt = $db->prepare("
            SELECT c.nome FROM categorie c
            JOIN tipi_neurone tn ON c.tipo_id = tn.id
            WHERE tn.azienda_id = ? AND tn.nome = ?
            ORDER BY c.ordine ASC
        ");
        $stmt->execute([$aziendaId, $tipo]);
        $categorieDisponibili = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    // Valida categorie
    if (empty($categorie)) {
        if (!empty($categorieDisponibili)) {
            // Se non passata, usa la prima disponibile
            $categorie = [$categorieDisponibili[0]];
        }
        // Se non ci sono categorie configurate, lascia vuoto (alcuni tipi potrebbero non averle)
    } else {
        // Valida che le categorie passate esistano (case-insensitive)
        $categorieValide = [];
        foreach ($categorie as $cat) {
            $found = false;
            foreach ($categorieDisponibili as $catDB) {
                if (strtolower($cat) === strtolower($catDB)) {
                    $categorieValide[] = $catDB; // Usa nome esatto dal DB
                    $found = true;
                    break;
                }
            }
            if (!$found && !empty($categorieDisponibili)) {
                return ['error' => "Categoria '$cat' non valida per tipo '$tipo'. Categorie disponibili: " . implode(', ', $categorieDisponibili)];
            }
        }
        if (!empty($categorieValide)) {
            $categorie = $categorieValide;
        }
    }

    // Genera UUID
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    try {
        // Struttura allineata a neuroni/create.php
        $sql = "INSERT INTO neuroni (
                    id, nome, tipo, categorie, visibilita, lat, lng,
                    indirizzo, telefono, email, creato_da, azienda_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            $id,
            $nome,
            $tipo,
            json_encode($categorie),
            $visibilita,
            $lat,
            $lng,
            $indirizzo,
            $telefono,
            $email,
            $user['user_id'],
            $user['azienda_id']
        ]);
    } catch (PDOException $e) {
        error_log("create_entity SQL error: " . $e->getMessage());
        return ['error' => "Errore database: " . $e->getMessage()];
    }

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
        ],
        // Azione frontend: ricarica neuroni per mostrare la nuova entità sulla mappa
        '_frontend_action' => [
            'type' => 'refresh_neuroni'
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
        $updates[] = "lat = ?";
        $updates[] = "lng = ?";
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

    $params[] = $entityId;
    $params[] = $user['azienda_id'];

    $sql = "UPDATE neuroni SET " . implode(', ', $updates) . " WHERE id = ? AND azienda_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    return [
        'success' => true,
        'message' => "Entità aggiornata con successo",
        'entity_id' => $entityId,
        // Azione frontend: ricarica neuroni per mostrare le modifiche sulla mappa
        '_frontend_action' => [
            'type' => 'refresh_neuroni'
        ]
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

// ============================================================
// TOOL DI ELIMINAZIONE
// ============================================================

/**
 * Tool: Elimina un'entità (neurone)
 */
function tool_deleteEntity(PDO $db, array $input, array $user): array {
    $entityId = $input['entity_id'] ?? '';

    if (empty($entityId)) {
        return ['error' => 'entity_id richiesto'];
    }

    // Verifica che l'entità esista e appartenga all'azienda
    $stmt = $db->prepare("SELECT id, nome FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$entityId, $user['azienda_id']]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entita non trovata o non accessibile'];
    }

    $nome = $entity['nome'];

    // Elimina in cascata: vendite, sinapsi, note
    $db->prepare("DELETE FROM vendite_prodotto WHERE neurone_id = ?")->execute([$entityId]);
    $db->prepare("DELETE FROM sinapsi WHERE neurone_da = ? OR neurone_a = ?")->execute([$entityId, $entityId]);
    $db->prepare("DELETE FROM note WHERE neurone_id = ?")->execute([$entityId]);

    // Elimina l'entità
    $db->prepare("DELETE FROM neuroni WHERE id = ? AND azienda_id = ?")->execute([$entityId, $user['azienda_id']]);

    return [
        'success' => true,
        'message' => "Entita '$nome' eliminata con tutte le sue connessioni e transazioni",
        // Azione frontend: ricarica neuroni per rimuovere l'entità dalla mappa
        '_frontend_action' => [
            'type' => 'refresh_neuroni'
        ]
    ];
}

/**
 * Tool: Elimina una connessione (sinapsi)
 */
function tool_deleteConnection(PDO $db, array $input, array $user): array {
    $sinapsiId = $input['sinapsi_id'] ?? $input['connection_id'] ?? '';

    if (empty($sinapsiId)) {
        return ['error' => 'sinapsi_id richiesto'];
    }

    // Verifica che la sinapsi esista
    $stmt = $db->prepare("SELECT id FROM sinapsi WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$sinapsiId, $user['azienda_id']]);
    if (!$stmt->fetch()) {
        return ['error' => 'Connessione non trovata o non accessibile'];
    }

    // Elimina vendite associate
    $db->prepare("DELETE FROM vendite_prodotto WHERE sinapsi_id = ?")->execute([$sinapsiId]);

    // Elimina la sinapsi
    $db->prepare("DELETE FROM sinapsi WHERE id = ? AND azienda_id = ?")->execute([$sinapsiId, $user['azienda_id']]);

    return [
        'success' => true,
        'message' => 'Connessione eliminata con successo'
    ];
}

/**
 * Tool: Elimina una vendita
 */
function tool_deleteSale(PDO $db, array $input, array $user): array {
    $saleId = $input['sale_id'] ?? '';

    if (empty($saleId)) {
        return ['error' => 'sale_id richiesto'];
    }

    // Verifica che la vendita esista
    $stmt = $db->prepare("SELECT id, importo FROM vendite_prodotto WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$saleId, $user['azienda_id']]);
    $sale = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sale) {
        return ['error' => 'Vendita non trovata o non accessibile'];
    }

    $db->prepare("DELETE FROM vendite_prodotto WHERE id = ? AND azienda_id = ?")->execute([$saleId, $user['azienda_id']]);

    return [
        'success' => true,
        'message' => 'Vendita di ' . number_format($sale['importo'], 2, ',', '.') . ' euro eliminata'
    ];
}

// ============================================================
// TOOL MAPPA - Azioni per controllare la visualizzazione
// ============================================================

/**
 * Tool: Sposta la vista della mappa a coordinate specifiche
 */
function tool_mapFlyTo(array $input): array {
    $lat = $input['lat'] ?? null;
    $lng = $input['lng'] ?? null;
    $zoom = $input['zoom'] ?? 15;
    $pitch = $input['pitch'] ?? 60;

    if ($lat === null || $lng === null) {
        return ['error' => 'lat e lng sono richiesti'];
    }

    return [
        'success' => true,
        'message' => "Mappa spostata a coordinate ($lat, $lng)",
        '_frontend_action' => [
            'type' => 'map_fly_to',
            'lat' => (float)$lat,
            'lng' => (float)$lng,
            'zoom' => (float)$zoom,
            'pitch' => (float)$pitch
        ]
    ];
}

/**
 * Tool: Seleziona un'entità sulla mappa
 */
function tool_mapSelectEntity(PDO $db, array $input, array $user): array {
    $entityId = $input['entity_id'] ?? '';

    if (empty($entityId)) {
        return ['error' => 'entity_id richiesto'];
    }

    // Verifica che l'entità esista e recupera coordinate
    $stmt = $db->prepare("SELECT id, nome, lat, lng FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$entityId, $user['azienda_id']]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entita non trovata o non accessibile'];
    }

    return [
        'success' => true,
        'message' => "Selezionata entita '{$entity['nome']}'",
        '_frontend_action' => [
            'type' => 'map_select_entity',
            'entity_id' => $entityId,
            'lat' => (float)$entity['lat'],
            'lng' => (float)$entity['lng'],
            'entity_name' => $entity['nome']
        ]
    ];
}

/**
 * Tool: Mostra le connessioni di un'entità
 */
function tool_mapShowConnections(PDO $db, array $input, array $user): array {
    $entityId = $input['entity_id'] ?? '';

    if (empty($entityId)) {
        return ['error' => 'entity_id richiesto'];
    }

    // Verifica che l'entità esista
    $stmt = $db->prepare("SELECT id, nome FROM neuroni WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$entityId, $user['azienda_id']]);
    $entity = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entity) {
        return ['error' => 'Entita non trovata o non accessibile'];
    }

    // Conta connessioni
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM sinapsi WHERE (neurone_da = ? OR neurone_a = ?) AND azienda_id = ?");
    $stmt->execute([$entityId, $entityId, $user['azienda_id']]);
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    return [
        'success' => true,
        'message' => "Mostrate $count connessioni di '{$entity['nome']}'",
        '_frontend_action' => [
            'type' => 'map_show_connections',
            'entity_id' => $entityId,
            'entity_name' => $entity['nome']
        ]
    ];
}

// ============================================================
// TOOL UI - Azioni per controllare l'interfaccia
// ============================================================

/**
 * Tool: Apre un pannello dell'interfaccia
 */
function tool_uiOpenPanel(array $input): array {
    $panel = $input['panel'] ?? '';
    $entityId = $input['entity_id'] ?? null;

    $validPanels = ['entity_detail', 'connection_detail', 'settings', 'families'];
    if (!in_array($panel, $validPanels)) {
        return ['error' => 'Pannello non valido. Usa: ' . implode(', ', $validPanels)];
    }

    return [
        'success' => true,
        'message' => "Aperto pannello $panel",
        '_frontend_action' => [
            'type' => 'ui_open_panel',
            'panel' => $panel,
            'entity_id' => $entityId
        ]
    ];
}

/**
 * Tool: Mostra una notifica all'utente
 */
function tool_uiShowNotification(array $input): array {
    $message = $input['message'] ?? '';
    $type = $input['type'] ?? 'info';

    if (empty($message)) {
        return ['error' => 'message richiesto'];
    }

    $validTypes = ['success', 'error', 'warning', 'info'];
    if (!in_array($type, $validTypes)) {
        $type = 'info';
    }

    return [
        'success' => true,
        'message' => 'Notifica mostrata',
        '_frontend_action' => [
            'type' => 'ui_notification',
            'notification_message' => $message,
            'notification_type' => $type
        ]
    ];
}

// ============================================================
// TOOL AUTONOMIA - L'AI esplora il codice e impara
// ============================================================

/**
 * Tool: Esplora il codice sorgente del progetto
 * L'AI può leggere file per capire come funziona il software
 */
function tool_exploreCode(array $input): array {
    $path = $input['path'] ?? '';
    $search = $input['search'] ?? '';

    // Directory base del progetto (2 livelli sopra api/ai/)
    $baseDir = realpath(__DIR__ . '/../../..');

    if (empty($path) && empty($search)) {
        // Mostra struttura progetto
        $structure = [
            'frontend/' => 'Codice React/TypeScript dell\'interfaccia',
            'frontend/src/components/' => 'Componenti UI (MapView, AiChat, ecc.)',
            'frontend/src/pages/' => 'Pagine principali (Dashboard)',
            'frontend/src/utils/' => 'Utility e API client',
            'backend/api/' => 'Endpoint PHP',
            'backend/api/ai/' => 'Chat AI e tools',
            'backend/config/' => 'Configurazione e prompt AI',
            'docs/' => 'Documentazione'
        ];
        return [
            'success' => true,
            'message' => 'Struttura progetto GenAgenta',
            'structure' => $structure,
            'hint' => 'Usa path per leggere un file specifico, o search per cercare nel codice'
        ];
    }

    // Ricerca nel codice
    if (!empty($search)) {
        $results = [];
        $searchDirs = ['frontend/src', 'backend/api', 'backend/config'];

        foreach ($searchDirs as $dir) {
            $fullDir = $baseDir . '/' . $dir;
            if (!is_dir($fullDir)) continue;

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($fullDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $ext = $file->getExtension();
                if (!in_array($ext, ['php', 'ts', 'tsx', 'js', 'jsx', 'txt', 'json'])) continue;

                $content = file_get_contents($file->getPathname());
                if (stripos($content, $search) !== false) {
                    $relativePath = str_replace($baseDir . '/', '', $file->getPathname());
                    $relativePath = str_replace('\\', '/', $relativePath);

                    // Trova le righe che contengono il termine
                    $lines = explode("\n", $content);
                    $matches = [];
                    foreach ($lines as $num => $line) {
                        if (stripos($line, $search) !== false) {
                            $matches[] = ['line' => $num + 1, 'content' => trim(substr($line, 0, 100))];
                            if (count($matches) >= 3) break;
                        }
                    }

                    $results[] = [
                        'file' => $relativePath,
                        'matches' => $matches
                    ];

                    if (count($results) >= 10) break 2;
                }
            }
        }

        return [
            'success' => true,
            'search_term' => $search,
            'results' => $results,
            'hint' => 'Usa path per leggere il contenuto completo di un file'
        ];
    }

    // Lettura file specifico
    $path = str_replace('\\', '/', $path);
    $path = ltrim($path, '/');

    // Sicurezza: impedisci path traversal
    if (strpos($path, '..') !== false) {
        return ['error' => 'Path non valido'];
    }

    // Solo certi tipi di file
    $allowedExtensions = ['php', 'ts', 'tsx', 'js', 'jsx', 'txt', 'json', 'md', 'css'];
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    if (!in_array($ext, $allowedExtensions)) {
        return ['error' => 'Tipo file non permesso. Estensioni valide: ' . implode(', ', $allowedExtensions)];
    }

    $fullPath = $baseDir . '/' . $path;
    if (!file_exists($fullPath)) {
        return ['error' => "File non trovato: $path"];
    }

    $content = file_get_contents($fullPath);

    // Limita dimensione output
    if (strlen($content) > 15000) {
        $content = substr($content, 0, 15000) . "\n\n... [TRONCATO - file troppo lungo] ...";
    }

    return [
        'success' => true,
        'file' => $path,
        'content' => $content,
        'lines' => substr_count($content, "\n") + 1
    ];
}

/**
 * Tool: Salva una scoperta/apprendimento dell'AI
 */
function tool_saveLearning(array $input, array $user): array {
    $category = $input['category'] ?? 'general';
    $title = $input['title'] ?? '';
    $content = $input['content'] ?? '';

    if (empty($title) || empty($content)) {
        return ['error' => 'title e content sono richiesti'];
    }

    $knowledgeFile = __DIR__ . '/../../config/ai_knowledge.json';

    // Carica conoscenze esistenti
    $knowledge = [];
    if (file_exists($knowledgeFile)) {
        $knowledge = json_decode(file_get_contents($knowledgeFile), true) ?? [];
    }

    // Aggiungi nuova conoscenza
    $id = uniqid('learn_');
    $knowledge[$id] = [
        'category' => $category,
        'title' => $title,
        'content' => $content,
        'learned_at' => date('Y-m-d H:i:s'),
        'learned_by' => $user['nome'] ?? 'unknown'
    ];

    // Salva
    file_put_contents($knowledgeFile, json_encode($knowledge, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return [
        'success' => true,
        'message' => "Ho memorizzato: '$title'",
        'learning_id' => $id
    ];
}

/**
 * Tool: Legge le conoscenze memorizzate
 */
function tool_readLearnings(array $user): array {
    $knowledgeFile = __DIR__ . '/../../config/ai_knowledge.json';

    if (!file_exists($knowledgeFile)) {
        return [
            'success' => true,
            'message' => 'Nessuna conoscenza memorizzata ancora',
            'learnings' => []
        ];
    }

    $knowledge = json_decode(file_get_contents($knowledgeFile), true) ?? [];

    // Raggruppa per categoria (salta metadati che iniziano con _)
    $byCategory = [];
    $count = 0;
    foreach ($knowledge as $id => $item) {
        // Salta chiavi di metadati
        if (strpos($id, '_') === 0) continue;
        // Salta item senza i campi necessari
        if (!isset($item['title']) || !isset($item['content'])) continue;

        $cat = $item['category'] ?? 'general';
        if (!isset($byCategory[$cat])) {
            $byCategory[$cat] = [];
        }
        $byCategory[$cat][] = [
            'id' => $id,
            'title' => $item['title'],
            'content' => $item['content']
        ];
        $count++;
    }

    return [
        'success' => true,
        'message' => $count > 0 ? 'Ecco le mie conoscenze memorizzate' : 'Nessuna conoscenza memorizzata ancora',
        'learnings' => $byCategory,
        'total' => $count
    ];
}

/**
 * Tool: Propone un miglioramento al software
 * Formatta la proposta in modo che possa essere implementata
 */
function tool_proposeImprovement(array $input, array $user): array {
    $title = $input['title'] ?? '';
    $description = $input['description'] ?? '';
    $files_to_modify = $input['files_to_modify'] ?? [];
    $code_changes = $input['code_changes'] ?? '';
    $priority = $input['priority'] ?? 'normal'; // low, normal, high

    if (empty($title) || empty($description)) {
        return ['error' => 'title e description sono richiesti'];
    }

    $proposalsFile = __DIR__ . '/../../config/ai_proposals.json';

    // Carica proposte esistenti
    $proposals = [];
    if (file_exists($proposalsFile)) {
        $proposals = json_decode(file_get_contents($proposalsFile), true) ?? [];
    }

    // Aggiungi nuova proposta
    $id = 'prop_' . date('Ymd_His');
    $proposals[$id] = [
        'title' => $title,
        'description' => $description,
        'files_to_modify' => $files_to_modify,
        'code_changes' => $code_changes,
        'priority' => $priority,
        'status' => 'pending', // pending, approved, rejected, implemented
        'proposed_at' => date('Y-m-d H:i:s'),
        'proposed_during_chat_with' => $user['nome'] ?? 'unknown'
    ];

    // Salva
    file_put_contents($proposalsFile, json_encode($proposals, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Formatta messaggio per l'utente
    $message = "📝 **PROPOSTA DI MIGLIORAMENTO**\n\n";
    $message .= "**{$title}**\n\n";
    $message .= "{$description}\n\n";

    if (!empty($files_to_modify)) {
        $message .= "**File da modificare:**\n";
        foreach ($files_to_modify as $file) {
            $message .= "- {$file}\n";
        }
        $message .= "\n";
    }

    if (!empty($code_changes)) {
        $message .= "**Modifiche suggerite:**\n```\n{$code_changes}\n```\n\n";
    }

    $message .= "Per implementare questa proposta, chiedi a Claude Code di farlo!";

    return [
        'success' => true,
        'message' => $message,
        'proposal_id' => $id,
        '_frontend_action' => [
            'type' => 'ui_notification',
            'notification_message' => "Nuova proposta AI: {$title}",
            'notification_type' => 'info'
        ]
    ];
}

// ==========================================
// TOOL FILE SYSTEM - Lazy loading e memoria
// ==========================================

/**
 * Tool: Legge un file
 * Sicurezza: solo file in backend/config/ai/
 */
function tool_readFile(array $input): array {
    $path = $input['path'] ?? '';

    // Sicurezza: solo file in backend/config/ai/
    $basePath = realpath(__DIR__ . '/../../config/ai');
    if (!$basePath) {
        return ['error' => 'Cartella AI non trovata'];
    }

    // Normalizza path: rimuovi "backend/" se presente all'inizio
    // L'AI potrebbe usare "backend/config/ai/..." o "config/ai/..."
    $path = ltrim($path, '/');
    if (str_starts_with($path, 'backend/')) {
        $path = substr($path, 8); // Rimuovi "backend/"
    }

    // Costruisci path completo (relativo a backend/)
    $fullPath = __DIR__ . '/../../' . $path;
    $realFullPath = realpath($fullPath);

    // Verifica che sia dentro backend/config/ai/
    if (!$realFullPath || !str_starts_with($realFullPath, $basePath)) {
        return ['error' => "Accesso negato: puoi leggere solo file in config/ai/. Path ricevuto: $path"];
    }

    if (!file_exists($realFullPath)) {
        return ['error' => "File non trovato: $path"];
    }

    $content = file_get_contents($realFullPath);
    if ($content === false) {
        return ['error' => "Impossibile leggere: $path"];
    }

    return [
        'success' => true,
        'path' => $path,
        'content' => $content,
        'size' => strlen($content)
    ];
}

/**
 * Tool: Scrive un file nella cartella memoria
 * Sicurezza: solo in backend/config/ai/memory/
 */
function tool_writeFile(array $input): array {
    $filename = $input['filename'] ?? '';
    $content = $input['content'] ?? '';

    // Validazione filename
    if (empty($filename) || str_contains($filename, '..') || str_contains($filename, '/')) {
        return ['error' => 'Nome file non valido'];
    }

    // Solo nella cartella memory
    $memoryPath = __DIR__ . '/../../config/ai/memory';
    if (!is_dir($memoryPath)) {
        mkdir($memoryPath, 0755, true);
    }

    $fullPath = $memoryPath . '/' . $filename;

    if (file_put_contents($fullPath, $content) === false) {
        return ['error' => "Impossibile scrivere: $filename"];
    }

    return [
        'success' => true,
        'path' => "backend/config/ai/memory/$filename",
        'message' => "File salvato: $filename",
        'size' => strlen($content)
    ];
}

/**
 * Tool: Lista file in una cartella
 * Sicurezza: solo in backend/config/ai/
 */
function tool_listFiles(array $input): array {
    $path = $input['path'] ?? 'config/ai';

    // Sicurezza: solo in backend/config/ai/
    $basePath = realpath(__DIR__ . '/../../config/ai');
    if (!$basePath) {
        return ['error' => 'Cartella AI non trovata'];
    }

    // Normalizza path: rimuovi "backend/" se presente all'inizio
    $path = ltrim($path, '/');
    if (str_starts_with($path, 'backend/')) {
        $path = substr($path, 8); // Rimuovi "backend/"
    }

    // Costruisci path completo (relativo a backend/)
    $fullPath = __DIR__ . '/../../' . $path;
    $realFullPath = realpath($fullPath);

    if (!$realFullPath || !str_starts_with($realFullPath, $basePath)) {
        return ['error' => "Accesso negato: puoi vedere solo config/ai/. Path ricevuto: $path"];
    }

    if (!is_dir($realFullPath)) {
        return ['error' => "Cartella non trovata: $path"];
    }

    $files = [];
    foreach (scandir($realFullPath) as $file) {
        if ($file === '.' || $file === '..') continue;

        $filePath = $realFullPath . '/' . $file;
        $files[] = [
            'name' => $file,
            'type' => is_dir($filePath) ? 'directory' : 'file',
            'size' => is_file($filePath) ? filesize($filePath) : null
        ];
    }

    return [
        'success' => true,
        'path' => $path,
        'files' => $files,
        'count' => count($files)
    ];
}
