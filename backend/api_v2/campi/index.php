<?php
/**
 * API Campi Personalizzati per Tipo
 * GET    /campi?tipo=ID        - Lista campi di un tipo
 * POST   /campi                - Crea nuovo campo
 * PUT    /campi/:id            - Aggiorna campo
 * DELETE /campi/:id            - Elimina campo
 */

$user = requireAuth();
$db = getDB();
$id = $_REQUEST['id'] ?? null;
$teamId = $user['team_id'];

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

        jsonResponse(['id' => $id, 'message' => 'Campo creato'], 201);
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

        // Elimina anche i valori associati (CASCADE dovrebbe farlo, ma per sicurezza)
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('DELETE FROM entita_campi WHERE campo_id = ?');
            $stmt->execute([$id]);

            $stmt = $db->prepare('DELETE FROM campi_tipo WHERE id = ?');
            $stmt->execute([$id]);

            $db->commit();
            jsonResponse(['message' => 'Campo eliminato']);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Errore eliminazione: ' . $e->getMessage(), 500);
        }
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
