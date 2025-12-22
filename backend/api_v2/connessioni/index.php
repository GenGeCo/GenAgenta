<?php
/**
 * API Connessioni
 * GET    /connessioni         - Lista connessioni del team (con filtri)
 * GET    /connessioni/:id     - Dettaglio singola connessione
 * POST   /connessioni         - Crea nuova connessione
 * PUT    /connessioni/:id     - Aggiorna connessione
 * DELETE /connessioni/:id     - Elimina connessione
 */

$user = requireAuth();
$db = getDB();
$id = $_REQUEST['id'] ?? null;
$teamId = $user['team_id'] ?? $user['azienda_id'] ?? null;
$userId = $user['user_id'] ?? $user['id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$teamId) {
    errorResponse('Utente non associato a un team', 403);
}

switch ($method) {

    case 'GET':
        if ($id) {
            // Dettaglio singola connessione
            $sql = "
                SELECT c.*,
                       tc.nome as tipo_nome, tc.colore as tipo_colore,
                       e1.nome as nome_da, e1.lat as lat_da, e1.lng as lng_da,
                       e2.nome as nome_a, e2.lat as lat_a, e2.lng as lng_a
                FROM connessioni c
                JOIN tipi_connessione tc ON c.tipo_id = tc.id
                JOIN entita e1 ON c.entita_da = e1.id
                JOIN entita e2 ON c.entita_a = e2.id
                WHERE c.id = ? AND c.team_id = ?
            ";
            $params = [$id, $teamId];

            if (!$hasPersonalAccess) {
                $sql .= " AND c.visibilita = 'condiviso'";
            } else {
                $sql .= " AND (c.visibilita = 'condiviso' OR c.creato_da = ?)";
                $params[] = $userId;
            }

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $conn = $stmt->fetch();

            if (!$conn) {
                errorResponse('Connessione non trovata', 404);
            }

            $conn['valore'] = $conn['valore'] !== null ? (float)$conn['valore'] : null;
            $conn['lat_da'] = $conn['lat_da'] !== null ? (float)$conn['lat_da'] : null;
            $conn['lng_da'] = $conn['lng_da'] !== null ? (float)$conn['lng_da'] : null;
            $conn['lat_a'] = $conn['lat_a'] !== null ? (float)$conn['lat_a'] : null;
            $conn['lng_a'] = $conn['lng_a'] !== null ? (float)$conn['lng_a'] : null;

            jsonResponse($conn);

        } else {
            // Lista con filtri
            $entita = $_GET['entita'] ?? null;
            $tipo = $_GET['tipo'] ?? null;
            $certezza = $_GET['certezza'] ?? null;
            $dataInizio = $_GET['data_inizio'] ?? null;
            $dataFine = $_GET['data_fine'] ?? null;
            $limit = min((int)($_GET['limit'] ?? 500), 1000);
            $offset = (int)($_GET['offset'] ?? 0);

            $where = ['c.team_id = ?'];
            $params = [$teamId];

            if (!$hasPersonalAccess) {
                $where[] = "c.visibilita = 'condiviso'";
            } else {
                $where[] = "(c.visibilita = 'condiviso' OR c.creato_da = ?)";
                $params[] = $userId;
            }

            if ($entita) {
                $where[] = "(c.entita_da = ? OR c.entita_a = ?)";
                $params[] = $entita;
                $params[] = $entita;
            }

            if ($tipo) {
                $where[] = "c.tipo_id = ?";
                $params[] = $tipo;
            }

            if ($certezza) {
                $where[] = "c.certezza = ?";
                $params[] = $certezza;
            }

            // Filtro temporale: mostra connessioni attive nel periodo
            if ($dataInizio) {
                $where[] = "(c.data_fine IS NULL OR c.data_fine >= ?)";
                $params[] = $dataInizio;
            }
            if ($dataFine) {
                $where[] = "c.data_inizio <= ?";
                $params[] = $dataFine;
            }

            $whereClause = 'WHERE ' . implode(' AND ', $where);

            // Count
            $countSql = "SELECT COUNT(*) as total FROM connessioni c $whereClause";
            $stmt = $db->prepare($countSql);
            $stmt->execute($params);
            $total = $stmt->fetch()['total'];

            // Dati
            $sql = "
                SELECT c.id, c.entita_da, c.entita_a, c.tipo_id, c.certezza,
                       c.data_inizio, c.data_fine, c.valore, c.visibilita,
                       tc.nome as tipo_nome, tc.colore as tipo_colore,
                       e1.nome as nome_da, e1.lat as lat_da, e1.lng as lng_da,
                       e2.nome as nome_a, e2.lat as lat_a, e2.lng as lng_a
                FROM connessioni c
                JOIN tipi_connessione tc ON c.tipo_id = tc.id
                JOIN entita e1 ON c.entita_da = e1.id
                JOIN entita e2 ON c.entita_a = e2.id
                $whereClause
                ORDER BY c.data_inizio DESC
                LIMIT ? OFFSET ?
            ";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $connessioni = $stmt->fetchAll();

            foreach ($connessioni as &$c) {
                $c['valore'] = $c['valore'] !== null ? (float)$c['valore'] : null;
                $c['lat_da'] = $c['lat_da'] !== null ? (float)$c['lat_da'] : null;
                $c['lng_da'] = $c['lng_da'] !== null ? (float)$c['lng_da'] : null;
                $c['lat_a'] = $c['lat_a'] !== null ? (float)$c['lat_a'] : null;
                $c['lng_a'] = $c['lng_a'] !== null ? (float)$c['lng_a'] : null;
            }

            jsonResponse([
                'data' => $connessioni,
                'pagination' => [
                    'total' => (int)$total,
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);
        }
        break;

    case 'POST':
        $data = getJsonBody();

        // Validazione
        if (empty($data['entita_da'])) {
            errorResponse('Entità origine richiesta', 400);
        }
        if (empty($data['entita_a'])) {
            errorResponse('Entità destinazione richiesta', 400);
        }
        if (empty($data['tipo_id'])) {
            errorResponse('Tipo connessione richiesto', 400);
        }
        if (empty($data['data_inizio'])) {
            errorResponse('Data inizio richiesta', 400);
        }

        // Verifica entità appartengano al team
        $stmt = $db->prepare('SELECT id FROM entita WHERE id IN (?, ?) AND team_id = ?');
        $stmt->execute([$data['entita_da'], $data['entita_a'], $teamId]);
        if ($stmt->rowCount() !== 2) {
            errorResponse('Entità non valide', 400);
        }

        // Verifica tipo connessione
        $stmt = $db->prepare('SELECT id FROM tipi_connessione WHERE id = ? AND team_id = ?');
        $stmt->execute([$data['tipo_id'], $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo connessione non valido', 400);
        }

        $id = generateUUID();
        $visibilita = $data['visibilita'] ?? 'condiviso';

        if ($visibilita === 'privato' && !$hasPersonalAccess) {
            errorResponse('Accesso personale richiesto per connessioni private', 403);
        }

        $stmt = $db->prepare('
            INSERT INTO connessioni (id, team_id, creato_da, entita_da, entita_a, tipo_id,
                                    certezza, data_inizio, data_fine, valore, fonte,
                                    data_verifica, note, visibilita)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $id,
            $teamId,
            $userId,
            $data['entita_da'],
            $data['entita_a'],
            $data['tipo_id'],
            $data['certezza'] ?? 'confermato',
            $data['data_inizio'],
            $data['data_fine'] ?? null,
            $data['valore'] ?? null,
            $data['fonte'] ?? null,
            $data['data_verifica'] ?? null,
            $data['note'] ?? null,
            $visibilita
        ]);

        jsonResponse(['id' => $id, 'message' => 'Connessione creata'], 201);
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        // Verifica proprietà
        $stmt = $db->prepare('SELECT id, creato_da, visibilita FROM connessioni WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            errorResponse('Connessione non trovata', 404);
        }

        if ($existing['visibilita'] === 'privato' && $existing['creato_da'] !== $userId) {
            errorResponse('Non autorizzato', 403);
        }

        $updates = [];
        $params = [];

        $fields = ['tipo_id', 'certezza', 'data_inizio', 'data_fine', 'valore',
                   'fonte', 'data_verifica', 'note', 'visibilita'];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($updates)) {
            errorResponse('Nessun campo da aggiornare', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE connessioni SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        jsonResponse(['message' => 'Connessione aggiornata']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $stmt = $db->prepare('SELECT id, creato_da, visibilita FROM connessioni WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            errorResponse('Connessione non trovata', 404);
        }

        if ($existing['visibilita'] === 'privato' && $existing['creato_da'] !== $userId) {
            errorResponse('Non autorizzato', 403);
        }

        $stmt = $db->prepare('DELETE FROM connessioni WHERE id = ?');
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Connessione eliminata']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
