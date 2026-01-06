<?php
/**
 * API Tipologie (sottocategorie)
 * GET    /tipologie         - Lista tipologie del team
 * GET    /tipologie?tipo=ID - Lista tipologie di un tipo specifico
 * POST   /tipologie         - Crea nuova tipologia
 * PUT    /tipologie/:id     - Aggiorna tipologia
 * DELETE /tipologie/:id     - Elimina tipologia
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

        $sql = "
            SELECT tp.*, t.nome as tipo_nome, t.forma as tipo_forma
            FROM tipologie tp
            JOIN tipi t ON tp.tipo_id = t.id
            WHERE t.team_id = ?
        ";
        $params = [$teamId];

        if ($tipoId) {
            $sql .= " AND tp.tipo_id = ?";
            $params[] = $tipoId;
        }

        $sql .= " ORDER BY t.ordine ASC, tp.ordine ASC, tp.nome ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $tipologie = $stmt->fetchAll();

        jsonResponse(['data' => $tipologie]);
        break;

    case 'POST':
        $data = getJsonBody();

        if (empty($data['nome'])) {
            errorResponse('Nome richiesto', 400);
        }
        if (empty($data['tipo_id'])) {
            errorResponse('Tipo richiesto', 400);
        }

        // Verifica che il tipo appartenga al team
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
        $stmt->execute([$data['tipo_id'], $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non valido', 400);
        }

        $id = generateUUID();
        $colore = $data['colore'] ?? '#3b82f6';
        $ordine = $data['ordine'] ?? 0;

        $stmt = $db->prepare('
            INSERT INTO tipologie (id, tipo_id, nome, colore, ordine)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $data['tipo_id'], $data['nome'], $colore, $ordine]);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['id' => $id, 'message' => 'Tipologia creata'], 201);
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        // Verifica proprietà (tramite tipo -> team)
        $stmt = $db->prepare('
            SELECT tp.id FROM tipologie tp
            JOIN tipi t ON tp.tipo_id = t.id
            WHERE tp.id = ? AND t.team_id = ?
        ');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipologia non trovata', 404);
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
        $sql = 'UPDATE tipologie SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['message' => 'Tipologia aggiornata']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica proprietà
        $stmt = $db->prepare('
            SELECT tp.id FROM tipologie tp
            JOIN tipi t ON tp.tipo_id = t.id
            WHERE tp.id = ? AND t.team_id = ?
        ');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipologia non trovata', 404);
        }

        $stmt = $db->prepare('DELETE FROM tipologie WHERE id = ?');
        $stmt->execute([$id]);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['message' => 'Tipologia eliminata']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
