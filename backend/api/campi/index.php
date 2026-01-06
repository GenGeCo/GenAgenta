<?php
/**
 * API Campi Personalizzati per Tipo
 * GET    /campi?tipo=ID        - Lista campi di un tipo
 * POST   /campi                - Crea nuovo campo
 * PUT    /campi/:id            - Aggiorna campo
 * DELETE /campi/:id            - Elimina campo
 */

require_once __DIR__ . '/../../includes/ai-docs-generator.php';

$user = requireAuth();
$db = getDB();
$id = $_REQUEST['id'] ?? null;
$teamId = $user['team_id'] ?? $user['azienda_id'] ?? null;

if (!$teamId) {
    errorResponse('Utente non associato a un team', 403);
}

switch ($method) {

    case 'GET':
        $tipoId = $_GET['tipo'] ?? null;

        if (!$tipoId) {
            errorResponse('Parametro tipo richiesto', 400);
        }

        // Verifica tipo appartenga al team
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
        $stmt->execute([$tipoId, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non trovato', 404);
        }

        try {
            $stmt = $db->prepare('
                SELECT * FROM campi_tipo
                WHERE tipo_id = ?
                ORDER BY ordine ASC, nome ASC
            ');
            $stmt->execute([$tipoId]);
            $campi = $stmt->fetchAll();

            // Parse opzioni JSON
            foreach ($campi as &$c) {
                $c['opzioni'] = $c['opzioni'] ? json_decode($c['opzioni'], true) : null;
                $c['obbligatorio'] = (bool)$c['obbligatorio'];
            }

            jsonResponse(['data' => $campi]);
        } catch (PDOException $e) {
            // Se tabella non esiste, ritorna array vuoto
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                jsonResponse(['data' => []]);
            } else {
                errorResponse('Errore database: ' . $e->getMessage(), 500);
            }
        }
        break;

    case 'POST':
        $data = getJsonBody();

        if (empty($data['tipo_id'])) {
            errorResponse('Tipo richiesto', 400);
        }
        if (empty($data['nome'])) {
            errorResponse('Nome richiesto', 400);
        }
        if (empty($data['etichetta'])) {
            errorResponse('Etichetta richiesta', 400);
        }

        // Verifica tipo appartenga al team
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
        $stmt->execute([$data['tipo_id'], $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non valido', 400);
        }

        $id = generateUUID();

        try {
            $stmt = $db->prepare('
                INSERT INTO campi_tipo (id, tipo_id, nome, etichetta, tipo_dato, opzioni, obbligatorio, ordine)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $id,
                $data['tipo_id'],
                $data['nome'],
                $data['etichetta'],
                $data['tipo_dato'] ?? 'testo',
                isset($data['opzioni']) ? json_encode($data['opzioni']) : null,
                $data['obbligatorio'] ?? 0,
                $data['ordine'] ?? 0
            ]);

            regenerateAiDocsForUser($db, $user);  // Aggiorna docs AI
            jsonResponse(['id' => $id, 'message' => 'Campo creato'], 201);
        } catch (PDOException $e) {
            // Se la tabella non esiste, la creiamo al volo
            if (strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), 'non esiste') !== false) {
                $db->exec("
                    CREATE TABLE IF NOT EXISTS campi_tipo (
                        id VARCHAR(36) PRIMARY KEY,
                        tipo_id VARCHAR(36) NOT NULL,
                        nome VARCHAR(100) NOT NULL,
                        etichetta VARCHAR(200) NOT NULL,
                        tipo_dato ENUM('testo', 'textarea', 'numero', 'data', 'select', 'email', 'telefono', 'url') NOT NULL DEFAULT 'testo',
                        opzioni JSON NULL,
                        obbligatorio BOOLEAN NOT NULL DEFAULT FALSE,
                        ordine INT NOT NULL DEFAULT 0,
                        data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_tipo_id (tipo_id),
                        FOREIGN KEY (tipo_id) REFERENCES tipi(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");

                // Riprova l'insert
                $stmt = $db->prepare('
                    INSERT INTO campi_tipo (id, tipo_id, nome, etichetta, tipo_dato, opzioni, obbligatorio, ordine)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $id,
                    $data['tipo_id'],
                    $data['nome'],
                    $data['etichetta'],
                    $data['tipo_dato'] ?? 'testo',
                    isset($data['opzioni']) ? json_encode($data['opzioni']) : null,
                    $data['obbligatorio'] ?? 0,
                    $data['ordine'] ?? 0
                ]);

                regenerateAiDocsForUser($db, $user);  // Aggiorna docs AI
                jsonResponse(['id' => $id, 'message' => 'Campo creato (tabella creata)'], 201);
            } else {
                errorResponse('Errore database: ' . $e->getMessage(), 500);
            }
        }
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        // Verifica proprietà (tramite tipo -> team)
        $stmt = $db->prepare('
            SELECT ct.id FROM campi_tipo ct
            JOIN tipi t ON ct.tipo_id = t.id
            WHERE ct.id = ? AND t.team_id = ?
        ');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Campo non trovato', 404);
        }

        $updates = [];
        $params = [];

        if (isset($data['nome'])) {
            $updates[] = 'nome = ?';
            $params[] = $data['nome'];
        }
        if (isset($data['etichetta'])) {
            $updates[] = 'etichetta = ?';
            $params[] = $data['etichetta'];
        }
        if (isset($data['tipo_dato'])) {
            $updates[] = 'tipo_dato = ?';
            $params[] = $data['tipo_dato'];
        }
        if (isset($data['opzioni'])) {
            $updates[] = 'opzioni = ?';
            $params[] = json_encode($data['opzioni']);
        }
        if (isset($data['obbligatorio'])) {
            $updates[] = 'obbligatorio = ?';
            $params[] = $data['obbligatorio'] ? 1 : 0;
        }
        if (isset($data['ordine'])) {
            $updates[] = 'ordine = ?';
            $params[] = $data['ordine'];
        }

        if (empty($updates)) {
            errorResponse('Nessun campo da aggiornare', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE campi_tipo SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        regenerateAiDocsForUser($db, $user);  // Aggiorna docs AI
        jsonResponse(['message' => 'Campo aggiornato']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica proprietà
        $stmt = $db->prepare('
            SELECT ct.id FROM campi_tipo ct
            JOIN tipi t ON ct.tipo_id = t.id
            WHERE ct.id = ? AND t.team_id = ?
        ');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Campo non trovato', 404);
        }

        // Elimina il campo (i valori in entita_campi saranno gestiti se la tabella esiste)
        $db->beginTransaction();
        try {
            // Prova a eliminare i valori associati se la tabella esiste
            try {
                $stmt = $db->prepare('DELETE FROM entita_campi WHERE campo_id = ?');
                $stmt->execute([$id]);
            } catch (PDOException $e) {
                // Ignora se tabella non esiste
            }

            $stmt = $db->prepare('DELETE FROM campi_tipo WHERE id = ?');
            $stmt->execute([$id]);

            $db->commit();
            regenerateAiDocsForUser($db, $user);  // Aggiorna docs AI
            jsonResponse(['message' => 'Campo eliminato']);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Errore eliminazione: ' . $e->getMessage(), 500);
        }
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
