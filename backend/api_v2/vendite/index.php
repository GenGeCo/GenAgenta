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

switch ($method) {

    case 'GET':
        $neuroneId = $_GET['neurone_id'] ?? null;

        if (!$neuroneId) {
            errorResponse('Parametro neurone_id richiesto', 400);
        }

        // Verifica neurone appartenga al team
        $stmt = $db->prepare('SELECT id, potenziale FROM neuroni WHERE id = ? AND team_id = ?');
        $stmt->execute([$neuroneId, $teamId]);
        $neurone = $stmt->fetch();
        if (!$neurone) {
            errorResponse('Neurone non trovato', 404);
        }

        try {
            $stmt = $db->prepare('
                SELECT v.*, f.nome as famiglia_nome, f.colore
                FROM vendite_prodotto v
                JOIN famiglie_prodotto f ON v.famiglia_id = f.id
                WHERE v.neurone_id = ?
                ORDER BY f.nome ASC
            ');
            $stmt->execute([$neuroneId]);
            $vendite = $stmt->fetchAll();

            // Calcola totale venduto
            $totaleVenduto = array_reduce($vendite, fn($sum, $v) => $sum + floatval($v['importo']), 0);

            jsonResponse([
                'data' => $vendite,
                'potenziale' => floatval($neurone['potenziale']) ?: 0,
                'totale_venduto' => $totaleVenduto,
                'percentuale' => $neurone['potenziale'] > 0
                    ? round(($totaleVenduto / floatval($neurone['potenziale'])) * 100, 1)
                    : 0
            ]);
        } catch (PDOException $e) {
            // Se tabella non esiste, ritorna array vuoto
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                jsonResponse([
                    'data' => [],
                    'potenziale' => floatval($neurone['potenziale']) ?: 0,
                    'totale_venduto' => 0,
                    'percentuale' => 0
                ]);
            } else {
                errorResponse('Errore database: ' . $e->getMessage(), 500);
            }
        }
        break;

    case 'POST':
        $data = getJsonBody();

        // Aggiorna potenziale se fornito
        if (isset($data['potenziale']) && isset($data['neurone_id'])) {
            // Verifica neurone appartenga al team
            $stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ? AND team_id = ?');
            $stmt->execute([$data['neurone_id'], $teamId]);
            if (!$stmt->fetch()) {
                errorResponse('Neurone non trovato', 404);
            }

            try {
                $stmt = $db->prepare('UPDATE neuroni SET potenziale = ? WHERE id = ?');
                $stmt->execute([$data['potenziale'], $data['neurone_id']]);
            } catch (PDOException $e) {
                // Se colonna non esiste, la aggiungiamo
                if (strpos($e->getMessage(), 'Unknown column') !== false) {
                    $db->exec("ALTER TABLE neuroni ADD COLUMN potenziale DECIMAL(12,2) NULL DEFAULT NULL AFTER dimensione");
                    $stmt = $db->prepare('UPDATE neuroni SET potenziale = ? WHERE id = ?');
                    $stmt->execute([$data['potenziale'], $data['neurone_id']]);
                } else {
                    errorResponse('Errore database: ' . $e->getMessage(), 500);
                }
            }

            // Se è solo aggiornamento potenziale, ritorna
            if (!isset($data['famiglia_id'])) {
                jsonResponse(['message' => 'Potenziale aggiornato']);
                break;
            }
        }

        // Crea/aggiorna vendita per famiglia
        if (empty($data['neurone_id'])) {
            errorResponse('neurone_id richiesto', 400);
        }
        if (empty($data['famiglia_id'])) {
            errorResponse('famiglia_id richiesto', 400);
        }
        if (!isset($data['importo'])) {
            errorResponse('importo richiesto', 400);
        }

        // Verifica neurone appartenga al team
        $stmt = $db->prepare('SELECT id FROM neuroni WHERE id = ? AND team_id = ?');
        $stmt->execute([$data['neurone_id'], $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Neurone non trovato', 404);
        }

        // Verifica famiglia esista
        $stmt = $db->prepare('SELECT id FROM famiglie_prodotto WHERE id = ?');
        $stmt->execute([$data['famiglia_id']]);
        if (!$stmt->fetch()) {
            errorResponse('Famiglia prodotto non trovata', 404);
        }

        try {
            // Upsert: INSERT ... ON DUPLICATE KEY UPDATE
            $stmt = $db->prepare('
                INSERT INTO vendite_prodotto (id, neurone_id, famiglia_id, importo)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE importo = VALUES(importo)
            ');
            $newId = generateUUID();
            $stmt->execute([
                $newId,
                $data['neurone_id'],
                $data['famiglia_id'],
                $data['importo']
            ]);

            jsonResponse(['id' => $newId, 'message' => 'Vendita salvata'], 201);
        } catch (PDOException $e) {
            // Se tabella non esiste, la creiamo
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                $db->exec("
                    CREATE TABLE IF NOT EXISTS vendite_prodotto (
                        id VARCHAR(36) PRIMARY KEY,
                        neurone_id VARCHAR(36) NOT NULL,
                        famiglia_id VARCHAR(36) NOT NULL,
                        importo DECIMAL(12,2) NOT NULL DEFAULT 0,
                        data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uk_neurone_famiglia (neurone_id, famiglia_id),
                        INDEX idx_neurone (neurone_id),
                        INDEX idx_famiglia (famiglia_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");

                // Riprova
                $stmt = $db->prepare('
                    INSERT INTO vendite_prodotto (id, neurone_id, famiglia_id, importo)
                    VALUES (?, ?, ?, ?)
                ');
                $newId = generateUUID();
                $stmt->execute([
                    $newId,
                    $data['neurone_id'],
                    $data['famiglia_id'],
                    $data['importo']
                ]);

                jsonResponse(['id' => $newId, 'message' => 'Vendita salvata (tabella creata)'], 201);
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
