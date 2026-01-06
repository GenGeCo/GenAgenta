<?php
/**
 * API Tipi Entità
 * GET    /tipi         - Lista tipi del team
 * POST   /tipi         - Crea nuovo tipo
 * PUT    /tipi/:id     - Aggiorna tipo
 * DELETE /tipi/:id     - Elimina tipo
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
        // Lista tipi con conteggio tipologie
        $sql = "
            SELECT t.*,
                   (SELECT COUNT(*) FROM tipologie tp WHERE tp.tipo_id = t.id) as num_tipologie
            FROM tipi t
            WHERE t.team_id = ?
            ORDER BY t.ordine ASC, t.nome ASC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([$teamId]);
        $tipi = $stmt->fetchAll();

        // Cast boolean per JavaScript
        foreach ($tipi as &$tipo) {
            $tipo['is_acquirente'] = (bool)($tipo['is_acquirente'] ?? false);
            $tipo['is_venditore'] = (bool)($tipo['is_venditore'] ?? false);
            $tipo['is_intermediario'] = (bool)($tipo['is_intermediario'] ?? false);
            $tipo['is_influencer'] = (bool)($tipo['is_influencer'] ?? false);
        }

        jsonResponse([
            'data' => $tipi,
            'forme_disponibili' => ['cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'esagono']
        ]);
        break;

    case 'POST':
        $data = getJsonBody();

        if (empty($data['nome'])) {
            errorResponse('Nome richiesto', 400);
        }

        $id = generateUUID();
        $forma = $data['forma'] ?? 'cerchio';
        $ordine = $data['ordine'] ?? 0;

        // Natura commerciale
        $isAcquirente = isset($data['is_acquirente']) ? (bool)$data['is_acquirente'] : false;
        $isVenditore = isset($data['is_venditore']) ? (bool)$data['is_venditore'] : false;
        $isIntermediario = isset($data['is_intermediario']) ? (bool)$data['is_intermediario'] : false;
        $isInfluencer = isset($data['is_influencer']) ? (bool)$data['is_influencer'] : false;

        $stmt = $db->prepare('
            INSERT INTO tipi (id, team_id, nome, forma, ordine, is_acquirente, is_venditore, is_intermediario, is_influencer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $teamId, $data['nome'], $forma, $ordine, $isAcquirente, $isVenditore, $isIntermediario, $isInfluencer]);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['id' => $id, 'message' => 'Tipo creato'], 201);
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        // Verifica proprietà
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
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
        if (isset($data['forma'])) {
            $updates[] = 'forma = ?';
            $params[] = $data['forma'];
        }
        if (isset($data['ordine'])) {
            $updates[] = 'ordine = ?';
            $params[] = $data['ordine'];
        }
        // Natura commerciale
        if (isset($data['is_acquirente'])) {
            $updates[] = 'is_acquirente = ?';
            $params[] = (bool)$data['is_acquirente'];
        }
        if (isset($data['is_venditore'])) {
            $updates[] = 'is_venditore = ?';
            $params[] = (bool)$data['is_venditore'];
        }
        if (isset($data['is_intermediario'])) {
            $updates[] = 'is_intermediario = ?';
            $params[] = (bool)$data['is_intermediario'];
        }
        if (isset($data['is_influencer'])) {
            $updates[] = 'is_influencer = ?';
            $params[] = (bool)$data['is_influencer'];
        }

        if (empty($updates)) {
            errorResponse('Nessun campo da aggiornare', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE tipi SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['message' => 'Tipo aggiornato']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica proprietà
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non trovato', 404);
        }

        // Verifica se ha entità associate
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM entita WHERE tipo_id = ?');
        $stmt->execute([$id]);
        $count = $stmt->fetch()['cnt'];
        if ($count > 0) {
            errorResponse("Impossibile eliminare: $count entità usano questo tipo", 400);
        }

        $stmt = $db->prepare('DELETE FROM tipi WHERE id = ?');
        $stmt->execute([$id]);

        regenerateAiDocsForUser($db, $user);
        jsonResponse(['message' => 'Tipo eliminato']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
