<?php
/**
 * API Tipi Connessione
 * GET    /tipi-connessione         - Lista tipi connessione del team
 * POST   /tipi-connessione         - Crea nuovo tipo
 * PUT    /tipi-connessione/:id     - Aggiorna tipo
 * DELETE /tipi-connessione/:id     - Elimina tipo
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
        $sql = "
            SELECT tc.*,
                   (SELECT COUNT(*) FROM connessioni c WHERE c.tipo_id = tc.id) as num_connessioni
            FROM tipi_connessione tc
            WHERE tc.team_id = ?
            ORDER BY tc.ordine ASC, tc.nome ASC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([$teamId]);
        $tipi = $stmt->fetchAll();

        jsonResponse(['data' => $tipi]);
        break;

    case 'POST':
        $data = getJsonBody();

        if (empty($data['nome'])) {
            errorResponse('Nome richiesto', 400);
        }

        $id = generateUUID();
        $colore = $data['colore'] ?? '#64748b';
        $ordine = $data['ordine'] ?? 0;

        $stmt = $db->prepare('
            INSERT INTO tipi_connessione (id, team_id, nome, colore, ordine)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $teamId, $data['nome'], $colore, $ordine]);

        jsonResponse(['id' => $id, 'message' => 'Tipo connessione creato'], 201);
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        $stmt = $db->prepare('SELECT id FROM tipi_connessione WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non trovato', 404);
        }

        $updates = [];
        $params = [];

        if (isset($data['nome'])) {
            $updates[] = 'nome = ?';
            $params[] = $data['nome'];
        }
        if (isset($data['colore'])) {
            $updates[] = 'colore = ?';
            $params[] = $data['colore'];
        }
        if (isset($data['ordine'])) {
            $updates[] = 'ordine = ?';
            $params[] = $data['ordine'];
        }

        if (empty($updates)) {
            errorResponse('Nessun campo da aggiornare', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE tipi_connessione SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        jsonResponse(['message' => 'Tipo aggiornato']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $stmt = $db->prepare('SELECT id FROM tipi_connessione WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non trovato', 404);
        }

        // Verifica uso
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM connessioni WHERE tipo_id = ?');
        $stmt->execute([$id]);
        $count = $stmt->fetch()['cnt'];
        if ($count > 0) {
            errorResponse("Impossibile eliminare: $count connessioni usano questo tipo", 400);
        }

        $stmt = $db->prepare('DELETE FROM tipi_connessione WHERE id = ?');
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Tipo eliminato']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
