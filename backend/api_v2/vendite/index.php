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
            // Verifica se famiglie_prodotto ha colonna colore
            $hasColore = false;
            try {
                $db->query("SELECT colore FROM famiglie_prodotto LIMIT 1");
                $hasColore = true;
            } catch (PDOException $e) {
                // Colonna colore non esiste
            }

            $orderBy = $hasDataVendita ? 'v.data_vendita DESC, f.nome ASC' : 'f.nome ASC';
            $selectFields = $hasColore
                ? 'v.*, f.nome as famiglia_nome, f.colore, n.nome as controparte_nome'
                : 'v.*, f.nome as famiglia_nome, n.nome as controparte_nome';

            $stmt = $db->prepare("
                SELECT $selectFields
                FROM vendite_prodotto v
                LEFT JOIN famiglie_prodotto f ON v.famiglia_id = f.id
                LEFT JOIN neuroni n ON v.controparte_id = n.id
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

        // === PARAMETRI TRANSAZIONE BILATERALE ===
        $controparteId = $data['controparte_id'] ?? null;
        $sinapsiId = $data['sinapsi_id'] ?? null;
        $tipoTransazione = $data['tipo_transazione'] ?? 'vendita';

        // Aggiorna potenziale se fornito
        if (isset($data['potenziale']) && isset($data['neurone_id'])) {
            try {
                $stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ?');
                $stmt->execute([$data['neurone_id']]);
                if (!$stmt->fetch()) {
                    errorResponse('Neurone non trovato', 404);
                }
            } catch (PDOException $e) {
                errorResponse('Errore verifica neurone: ' . $e->getMessage(), 500);
            }

            try {
                $stmt = $db->prepare('UPDATE neuroni SET potenziale = ? WHERE id = ?');
                $stmt->execute([$data['potenziale'], $data['neurone_id']]);

                if (!isset($data['famiglia_id'])) {
                    jsonResponse(['message' => 'Potenziale aggiornato']);
                    break;
                }
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Unknown column') !== false) {
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

        // Crea vendita per famiglia
        if (empty($data['neurone_id'])) {
            errorResponse('neurone_id richiesto', 400);
        }
        if (empty($data['famiglia_id'])) {
            errorResponse('famiglia_id richiesto', 400);
        }
        if (!isset($data['importo'])) {
            errorResponse('importo richiesto', 400);
        }

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

        // === HELPER: Assicura colonne bilaterali esistano ===
        $ensureBilateralColumns = function() use ($db) {
            try {
                $db->query("SELECT sinapsi_id FROM vendite_prodotto LIMIT 1");
            } catch (PDOException $e) {
                // Aggiungi colonne per transazioni bilaterali
                try {
                    $db->exec("ALTER TABLE vendite_prodotto
                        ADD COLUMN sinapsi_id VARCHAR(36) NULL,
                        ADD COLUMN controparte_id VARCHAR(36) NULL,
                        ADD COLUMN controparte_vendita_id VARCHAR(36) NULL,
                        ADD COLUMN tipo_transazione VARCHAR(20) DEFAULT 'vendita'");
                    $db->exec("ALTER TABLE vendite_prodotto
                        ADD INDEX idx_sinapsi (sinapsi_id),
                        ADD INDEX idx_controparte (controparte_id),
                        ADD INDEX idx_tipo_transazione (tipo_transazione)");
                } catch (PDOException $e2) {
                    // Ignora se già esistono
                }
            }
        };

        try {
            // Rimuovi constraint UNIQUE se esiste
            try {
                $db->exec("ALTER TABLE vendite_prodotto DROP INDEX uk_neurone_famiglia");
            } catch (PDOException $e3) {}

            // Assicura colonne bilaterali
            $ensureBilateralColumns();

            // === CREA RECORD PRINCIPALE ===
            $newId = generateUUID();
            $stmt = $db->prepare('
                INSERT INTO vendite_prodotto
                (id, neurone_id, famiglia_id, importo, data_vendita, sinapsi_id, controparte_id, tipo_transazione)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $newId,
                $data['neurone_id'],
                $data['famiglia_id'],
                $data['importo'],
                $dataVendita,
                $sinapsiId,
                $controparteId,
                $tipoTransazione
            ]);

            $controparteVenditaId = null;

            // === CREA RECORD SPECULARE SE CONTROPARTE SPECIFICATA ===
            if ($controparteId) {
                $controparteVenditaId = generateUUID();
                $tipoSpeculare = ($tipoTransazione === 'acquisto') ? 'vendita' : 'acquisto';

                $stmt2 = $db->prepare('
                    INSERT INTO vendite_prodotto
                    (id, neurone_id, famiglia_id, importo, data_vendita, sinapsi_id, controparte_id, controparte_vendita_id, tipo_transazione)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $stmt2->execute([
                    $controparteVenditaId,
                    $controparteId,  // Il record speculare è sulla controparte
                    $data['famiglia_id'],
                    $data['importo'],
                    $dataVendita,
                    $sinapsiId,
                    $data['neurone_id'],  // La controparte del record speculare è il neurone originale
                    $newId,  // Link al record originale
                    $tipoSpeculare
                ]);

                // Aggiorna record originale con link al record speculare
                $stmt3 = $db->prepare('UPDATE vendite_prodotto SET controparte_vendita_id = ? WHERE id = ?');
                $stmt3->execute([$controparteVenditaId, $newId]);
            }

            jsonResponse([
                'id' => $newId,
                'controparte_vendita_id' => $controparteVenditaId,
                'data_vendita' => $dataVendita,
                'tipo_transazione' => $tipoTransazione,
                'message' => $controparteId ? 'Transazione bilaterale salvata' : 'Vendita salvata',
                'bilaterale' => (bool)$controparteId
            ], 201);

        } catch (PDOException $e) {
            // Gestione errori e auto-migration come prima...
            if (strpos($e->getMessage(), 'Unknown column') !== false) {
                // Colonne mancanti - prova a crearle
                $ensureBilateralColumns();
                errorResponse('Colonne migrate, riprova la richiesta', 503);
            } elseif (strpos($e->getMessage(), "doesn't exist") !== false) {
                // Tabella non esiste - creala
                $db->exec("
                    CREATE TABLE IF NOT EXISTS vendite_prodotto (
                        id VARCHAR(36) PRIMARY KEY,
                        neurone_id VARCHAR(36) NOT NULL,
                        famiglia_id VARCHAR(36) NOT NULL,
                        importo DECIMAL(12,2) NOT NULL DEFAULT 0,
                        data_vendita DATE NOT NULL,
                        sinapsi_id VARCHAR(36) NULL,
                        controparte_id VARCHAR(36) NULL,
                        controparte_vendita_id VARCHAR(36) NULL,
                        tipo_transazione VARCHAR(20) DEFAULT 'vendita',
                        data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_neurone (neurone_id),
                        INDEX idx_famiglia (famiglia_id),
                        INDEX idx_data_vendita (data_vendita),
                        INDEX idx_sinapsi (sinapsi_id),
                        INDEX idx_controparte (controparte_id),
                        INDEX idx_tipo_transazione (tipo_transazione)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");
                errorResponse('Tabella creata, riprova la richiesta', 503);
            } else {
                errorResponse('Errore database: ' . $e->getMessage(), 500);
            }
        }
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica che la vendita esista
        $stmt = $db->prepare('SELECT id FROM vendite_prodotto WHERE id = ?');
        $stmt->execute([$id]);
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
