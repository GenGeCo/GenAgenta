<?php
/**
 * API Vendite per Famiglia Prodotto
 * GET    /vendite?neurone_id=ID  - Lista vendite di un neurone
 * POST   /vendite                - Crea/aggiorna vendita (upsert)
 * DELETE /vendite/:id            - Elimina vendita
 */

$user = requireAuth();
$db = getDB();
$id = $_REQUEST['id'] ?? null;
$teamId = $user['team_id'] ?? $user['azienda_id'] ?? null;

if (!$teamId) {
    errorResponse('Utente non associato a un team', 403);
}

// Endpoint debug: GET /vendite/debug
if ($id === 'debug') {
    try {
        // Verifica se esiste la tabella
        $hasTable = false;
        try {
            $db->query("SELECT 1 FROM vendite_prodotto LIMIT 1");
            $hasTable = true;
        } catch (PDOException $e) {
            jsonResponse([
                'error' => 'Tabella vendite_prodotto non esiste',
                'message' => $e->getMessage()
            ]);
        }

        // Struttura tabella
        $structure = [];
        $structStmt = $db->query("DESCRIBE vendite_prodotto");
        while ($col = $structStmt->fetch()) {
            $structure[] = $col;
        }

        // Tutti i record
        $allRecords = $db->query("SELECT * FROM vendite_prodotto ORDER BY data_vendita DESC LIMIT 50")->fetchAll();

        // Count per neurone
        $countPerNeurone = $db->query("SELECT neurone_id, COUNT(*) as cnt FROM vendite_prodotto GROUP BY neurone_id")->fetchAll();

        jsonResponse([
            'table_exists' => $hasTable,
            'structure' => $structure,
            'total_records' => count($allRecords),
            'records' => $allRecords,
            'count_per_neurone' => $countPerNeurone,
            'db_info' => [
                'server_info' => $db->getAttribute(PDO::ATTR_SERVER_INFO),
                'server_version' => $db->getAttribute(PDO::ATTR_SERVER_VERSION)
            ]
        ]);
    } catch (PDOException $e) {
        errorResponse('Errore debug: ' . $e->getMessage(), 500);
    }
}

switch ($method) {

    case 'GET':
        $neuroneId = $_GET['neurone_id'] ?? null;

        if (!$neuroneId) {
            errorResponse('Parametro neurone_id richiesto', 400);
        }

        // Verifica se esiste la colonna potenziale
        $hasPotenziale = false;
        try {
            $db->query("SELECT potenziale FROM neuroni LIMIT 1");
            $hasPotenziale = true;
        } catch (PDOException $e) {
            // Colonna non esiste
        }

        // Verifica neurone esista (senza filtro team per massima compatibilità)
        $selectFields = $hasPotenziale ? 'id, potenziale' : 'id';
        try {
            $stmt = $db->prepare("SELECT $selectFields FROM neuroni WHERE id = ?");
            $stmt->execute([$neuroneId]);
            $neurone = $stmt->fetch();
        } catch (PDOException $e) {
            errorResponse('Errore query neurone: ' . $e->getMessage(), 500);
        }

        if (!$neurone) {
            errorResponse('Neurone non trovato', 404);
        }

        $potenziale = $hasPotenziale ? (floatval($neurone['potenziale'] ?? 0)) : 0;

        // Verifica se esiste la tabella vendite_prodotto e la colonna data_vendita
        $hasTable = false;
        $hasDataVendita = false;
        try {
            $db->query("SELECT 1 FROM vendite_prodotto LIMIT 1");
            $hasTable = true;
            // Tabella esiste, ora verifica colonna
            try {
                $db->query("SELECT data_vendita FROM vendite_prodotto LIMIT 1");
                $hasDataVendita = true;
            } catch (PDOException $e) {
                // Colonna data_vendita non esiste
            }
        } catch (PDOException $e) {
            // Tabella non esiste
        }

        // Se tabella non esiste, ritorna subito array vuoto
        if (!$hasTable) {
            jsonResponse([
                'data' => [],
                'potenziale' => $potenziale,
                'totale_venduto' => 0,
                'percentuale' => 0
            ]);
            break;
        }

        try {
            $orderBy = $hasDataVendita ? 'v.data_vendita DESC, f.nome ASC' : 'f.nome ASC';
            $stmt = $db->prepare("
                SELECT v.*, f.nome as famiglia_nome, f.colore
                FROM vendite_prodotto v
                LEFT JOIN famiglie_prodotto f ON v.famiglia_id = f.id
                WHERE v.neurone_id = ?
                ORDER BY $orderBy
            ");
            $stmt->execute([$neuroneId]);
            $vendite = $stmt->fetchAll();

            // Calcola totale venduto
            $totaleVenduto = array_reduce($vendite, fn($sum, $v) => $sum + floatval($v['importo']), 0);

            // Debug: conta record totali nella tabella
            $debugStmt = $db->query("SELECT COUNT(*) as total FROM vendite_prodotto");
            $debugTotal = $debugStmt->fetch()['total'];

            jsonResponse([
                'data' => $vendite,
                'potenziale' => $potenziale,
                'totale_venduto' => $totaleVenduto,
                'percentuale' => $potenziale > 0
                    ? round(($totaleVenduto / $potenziale) * 100, 1)
                    : 0,
                'debug' => [
                    'neurone_id_cercato' => $neuroneId,
                    'vendite_trovate' => count($vendite),
                    'vendite_totali_tabella' => $debugTotal,
                    'hasDataVendita' => $hasDataVendita
                ]
            ]);
        } catch (PDOException $e) {
            // Qualsiasi errore, ritorna array vuoto con DEBUG dell'errore
            error_log('Errore query vendite: ' . $e->getMessage());
            jsonResponse([
                'data' => [],
                'potenziale' => $potenziale,
                'totale_venduto' => 0,
                'percentuale' => 0,
                'error_debug' => [
                    'message' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'neurone_id' => $neuroneId,
                    'hasTable' => $hasTable,
                    'hasDataVendita' => $hasDataVendita
                ]
            ]);
        }
        break;

    case 'POST':
        $data = getJsonBody();

        // Aggiorna potenziale se fornito
        if (isset($data['potenziale']) && isset($data['neurone_id'])) {
            // Verifica neurone esista (senza filtro team per massima compatibilità)
            try {
                $stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ?');
                $stmt->execute([$data['neurone_id']]);
                if (!$stmt->fetch()) {
                    errorResponse('Neurone non trovato', 404);
                }
            } catch (PDOException $e) {
                errorResponse('Errore verifica neurone: ' . $e->getMessage(), 500);
            }

            // Prova ad aggiornare potenziale
            try {
                $stmt = $db->prepare('UPDATE neuroni SET potenziale = ? WHERE id = ?');
                $stmt->execute([$data['potenziale'], $data['neurone_id']]);

                // Se è solo aggiornamento potenziale, ritorna
                if (!isset($data['famiglia_id'])) {
                    jsonResponse(['message' => 'Potenziale aggiornato']);
                    break;
                }
            } catch (PDOException $e) {
                // Se colonna non esiste, la aggiungiamo
                if (strpos($e->getMessage(), 'Unknown column') !== false ||
                    strpos($e->getMessage(), "doesn't have a default") !== false) {
                    try {
                        $db->exec("ALTER TABLE neuroni ADD COLUMN potenziale DECIMAL(12,2) NULL DEFAULT NULL");
                        $stmt = $db->prepare('UPDATE neuroni SET potenziale = ? WHERE id = ?');
                        $stmt->execute([$data['potenziale'], $data['neurone_id']]);

                        if (!isset($data['famiglia_id'])) {
                            jsonResponse(['message' => 'Potenziale aggiornato (colonna creata)']);
                            break;
                        }
                    } catch (PDOException $e2) {
                        errorResponse('Errore creazione colonna potenziale: ' . $e2->getMessage(), 500);
                    }
                } else {
                    errorResponse('Errore aggiornamento potenziale: ' . $e->getMessage(), 500);
                }
            }
        }

        // Crea vendita per famiglia (con data)
        if (empty($data['neurone_id'])) {
            errorResponse('neurone_id richiesto', 400);
        }
        if (empty($data['famiglia_id'])) {
            errorResponse('famiglia_id richiesto', 400);
        }
        if (!isset($data['importo'])) {
            errorResponse('importo richiesto', 400);
        }

        // Data vendita (default: oggi)
        $dataVendita = $data['data_vendita'] ?? date('Y-m-d');

        // Verifica neurone esista
        try {
            $stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ?');
            $stmt->execute([$data['neurone_id']]);
            if (!$stmt->fetch()) {
                errorResponse('Neurone non trovato', 404);
            }
        } catch (PDOException $e) {
            errorResponse('Errore verifica neurone: ' . $e->getMessage(), 500);
        }

        // Verifica famiglia esista
        try {
            $stmt = $db->prepare('SELECT id FROM famiglie_prodotto WHERE id = ?');
            $stmt->execute([$data['famiglia_id']]);
            if (!$stmt->fetch()) {
                errorResponse('Famiglia prodotto non trovata', 404);
            }
        } catch (PDOException $e) {
            errorResponse('Errore verifica famiglia: ' . $e->getMessage(), 500);
        }

        try {
            // Prima prova a rimuovere il constraint UNIQUE se esiste (migrazione)
            try {
                $db->exec("ALTER TABLE vendite_prodotto DROP INDEX uk_neurone_famiglia");
            } catch (PDOException $e3) {
                // Ignore se non esiste - è normale
            }

            // INSERT normale - permette vendite multiple per stessa famiglia con date diverse
            $stmt = $db->prepare('
                INSERT INTO vendite_prodotto (id, neurone_id, famiglia_id, importo, data_vendita)
                VALUES (?, ?, ?, ?, ?)
            ');
            $newId = generateUUID();
            $stmt->execute([
                $newId,
                $data['neurone_id'],
                $data['famiglia_id'],
                $data['importo'],
                $dataVendita
            ]);

            // Verifica che l'INSERT sia riuscito
            $rowCount = $stmt->rowCount();
            if ($rowCount === 0) {
                errorResponse('INSERT non ha inserito righe', 500);
            }

            // Verifica immediata che il dato sia stato salvato
            $verifyStmt = $db->prepare("SELECT * FROM vendite_prodotto WHERE id = ?");
            $verifyStmt->execute([$newId]);
            $savedRecord = $verifyStmt->fetch();

            // Conta vendite per questo neurone
            $countStmt = $db->prepare("SELECT COUNT(*) as cnt FROM vendite_prodotto WHERE neurone_id = ?");
            $countStmt->execute([$data['neurone_id']]);
            $countResult = $countStmt->fetch();

            jsonResponse([
                'id' => $newId,
                'data_vendita' => $dataVendita,
                'rows_affected' => $rowCount,
                'message' => 'Vendita salvata',
                'debug' => [
                    'neurone_id_inserito' => $data['neurone_id'],
                    'famiglia_id_inserito' => $data['famiglia_id'],
                    'importo_inserito' => $data['importo'],
                    'record_verificato' => $savedRecord,
                    'vendite_per_questo_neurone' => $countResult['cnt']
                ]
            ], 201);
        } catch (PDOException $e) {
            // Se colonna data_vendita non esiste, la aggiungiamo
            if (strpos($e->getMessage(), 'Unknown column') !== false && strpos($e->getMessage(), 'data_vendita') !== false) {
                try {
                    // Rimuovi constraint UNIQUE se esiste
                    try {
                        $db->exec("ALTER TABLE vendite_prodotto DROP INDEX uk_neurone_famiglia");
                    } catch (PDOException $e3) {
                        // Ignore se non esiste
                    }

                    // Aggiungi colonna data_vendita
                    $db->exec("ALTER TABLE vendite_prodotto ADD COLUMN data_vendita DATE NOT NULL DEFAULT CURRENT_DATE");
                    $db->exec("ALTER TABLE vendite_prodotto ADD INDEX idx_data_vendita (data_vendita)");

                    // Riprova INSERT
                    $stmt = $db->prepare('
                        INSERT INTO vendite_prodotto (id, neurone_id, famiglia_id, importo, data_vendita)
                        VALUES (?, ?, ?, ?, ?)
                    ');
                    $newId = generateUUID();
                    $stmt->execute([
                        $newId,
                        $data['neurone_id'],
                        $data['famiglia_id'],
                        $data['importo'],
                        $dataVendita
                    ]);

                    jsonResponse(['id' => $newId, 'data_vendita' => $dataVendita, 'message' => 'Vendita salvata (migrazione completata)'], 201);
                } catch (PDOException $e2) {
                    errorResponse('Errore migrazione tabella: ' . $e2->getMessage(), 500);
                }
            }
            // Se tabella non esiste, la creiamo
            elseif (strpos($e->getMessage(), "doesn't exist") !== false) {
                $db->exec("
                    CREATE TABLE IF NOT EXISTS vendite_prodotto (
                        id VARCHAR(36) PRIMARY KEY,
                        neurone_id VARCHAR(36) NOT NULL,
                        famiglia_id VARCHAR(36) NOT NULL,
                        importo DECIMAL(12,2) NOT NULL DEFAULT 0,
                        data_vendita DATE NOT NULL,
                        data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_neurone (neurone_id),
                        INDEX idx_famiglia (famiglia_id),
                        INDEX idx_data_vendita (data_vendita)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");

                // Riprova
                $stmt = $db->prepare('
                    INSERT INTO vendite_prodotto (id, neurone_id, famiglia_id, importo, data_vendita)
                    VALUES (?, ?, ?, ?, ?)
                ');
                $newId = generateUUID();
                $stmt->execute([
                    $newId,
                    $data['neurone_id'],
                    $data['famiglia_id'],
                    $data['importo'],
                    $dataVendita
                ]);

                jsonResponse(['id' => $newId, 'data_vendita' => $dataVendita, 'message' => 'Vendita salvata (tabella creata)'], 201);
            } else {
                errorResponse('Errore database: ' . $e->getMessage(), 500);
            }
        }
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica proprietà tramite neurone -> team
        $stmt = $db->prepare('
            SELECT v.id FROM vendite_prodotto v
            JOIN neuroni n ON v.neurone_id = n.id
            WHERE v.id = ? AND n.team_id = ?
        ');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Vendita non trovata', 404);
        }

        $stmt = $db->prepare('DELETE FROM vendite_prodotto WHERE id = ?');
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Vendita eliminata']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
