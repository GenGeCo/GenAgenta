<?php
/**
 * API Entità
 * GET    /entita         - Lista entità del team (con filtri)
 * GET    /entita/:id     - Dettaglio singola entità
 * POST   /entita         - Crea nuova entità
 * PUT    /entita/:id     - Aggiorna entità
 * DELETE /entita/:id     - Elimina entità
 */

$user = requireAuth();
$db = getDB();
$id = $_REQUEST['id'] ?? null;
$teamId = $user['team_id'];
$userId = $user['user_id'];
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

if (!$teamId) {
    errorResponse('Utente non associato a un team', 403);
}

switch ($method) {

    case 'GET':
        if ($id) {
            // Dettaglio singola entità
            $sql = "
                SELECT e.*,
                       t.nome as tipo_nome,
                       t.forma as tipo_forma,
                       GROUP_CONCAT(tp.id) as tipologia_ids,
                       GROUP_CONCAT(tp.nome) as tipologia_nomi,
                       GROUP_CONCAT(tp.colore) as tipologia_colori
                FROM entita e
                JOIN tipi t ON e.tipo_id = t.id
                LEFT JOIN entita_tipologie et ON e.id = et.entita_id
                LEFT JOIN tipologie tp ON et.tipologia_id = tp.id
                WHERE e.id = ? AND e.team_id = ?
            ";
            $params = [$id, $teamId];

            // Filtro visibilità
            if (!$hasPersonalAccess) {
                $sql .= " AND e.visibilita = 'condiviso'";
            } else {
                $sql .= " AND (e.visibilita = 'condiviso' OR e.creato_da = ?)";
                $params[] = $userId;
            }

            $sql .= " GROUP BY e.id";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $entita = $stmt->fetch();

            if (!$entita) {
                errorResponse('Entità non trovata', 404);
            }

            // Parse tipologie
            $entita['tipologie'] = [];
            if ($entita['tipologia_ids']) {
                $ids = explode(',', $entita['tipologia_ids']);
                $nomi = explode(',', $entita['tipologia_nomi']);
                $colori = explode(',', $entita['tipologia_colori']);
                for ($i = 0; $i < count($ids); $i++) {
                    $entita['tipologie'][] = [
                        'id' => $ids[$i],
                        'nome' => $nomi[$i],
                        'colore' => $colori[$i]
                    ];
                }
            }
            unset($entita['tipologia_ids'], $entita['tipologia_nomi'], $entita['tipologia_colori']);

            // Carica campi personalizzati
            $stmt = $db->prepare('
                SELECT ct.nome as campo, ct.etichetta, ct.tipo_dato, ec.valore
                FROM entita_campi ec
                JOIN campi_tipo ct ON ec.campo_id = ct.id
                WHERE ec.entita_id = ?
            ');
            $stmt->execute([$id]);
            $entita['campi'] = $stmt->fetchAll();

            // Converti lat/lng a float
            $entita['lat'] = $entita['lat'] !== null ? (float)$entita['lat'] : null;
            $entita['lng'] = $entita['lng'] !== null ? (float)$entita['lng'] : null;
            $entita['valore'] = $entita['valore'] !== null ? (float)$entita['valore'] : null;

            jsonResponse($entita);

        } else {
            // Lista entità con filtri
            $tipo = $_GET['tipo'] ?? null;
            $tipologia = $_GET['tipologia'] ?? null;
            $search = $_GET['search'] ?? null;
            $limit = min((int)($_GET['limit'] ?? 100), 500);
            $offset = (int)($_GET['offset'] ?? 0);

            $where = ['e.team_id = ?'];
            $params = [$teamId];

            // Filtro visibilità
            if (!$hasPersonalAccess) {
                $where[] = "e.visibilita = 'condiviso'";
            } else {
                $where[] = "(e.visibilita = 'condiviso' OR e.creato_da = ?)";
                $params[] = $userId;
            }

            if ($tipo) {
                $where[] = "e.tipo_id = ?";
                $params[] = $tipo;
            }

            if ($tipologia) {
                $where[] = "EXISTS (SELECT 1 FROM entita_tipologie et WHERE et.entita_id = e.id AND et.tipologia_id = ?)";
                $params[] = $tipologia;
            }

            if ($search) {
                $where[] = "(e.nome LIKE ? OR e.indirizzo LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            $whereClause = 'WHERE ' . implode(' AND ', $where);

            // Count
            $countSql = "SELECT COUNT(DISTINCT e.id) as total FROM entita e $whereClause";
            $stmt = $db->prepare($countSql);
            $stmt->execute($params);
            $total = $stmt->fetch()['total'];

            // Dati
            $sql = "
                SELECT e.id, e.nome, e.tipo_id, e.lat, e.lng, e.indirizzo,
                       e.valore, e.valore_tipo, e.visibilita, e.data_creazione,
                       t.nome as tipo_nome, t.forma as tipo_forma,
                       (SELECT GROUP_CONCAT(tp.colore) FROM entita_tipologie et
                        JOIN tipologie tp ON et.tipologia_id = tp.id
                        WHERE et.entita_id = e.id LIMIT 1) as colore
                FROM entita e
                JOIN tipi t ON e.tipo_id = t.id
                $whereClause
                ORDER BY e.nome ASC
                LIMIT ? OFFSET ?
            ";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $entita = $stmt->fetchAll();

            // Converti tipi
            foreach ($entita as &$e) {
                $e['lat'] = $e['lat'] !== null ? (float)$e['lat'] : null;
                $e['lng'] = $e['lng'] !== null ? (float)$e['lng'] : null;
                $e['valore'] = $e['valore'] !== null ? (float)$e['valore'] : null;
            }

            jsonResponse([
                'data' => $entita,
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
        if (empty($data['nome'])) {
            errorResponse('Nome richiesto', 400);
        }
        if (empty($data['tipo_id'])) {
            errorResponse('Tipo richiesto', 400);
        }

        // Verifica tipo appartenga al team
        $stmt = $db->prepare('SELECT id FROM tipi WHERE id = ? AND team_id = ?');
        $stmt->execute([$data['tipo_id'], $teamId]);
        if (!$stmt->fetch()) {
            errorResponse('Tipo non valido', 400);
        }

        $id = generateUUID();
        $visibilita = $data['visibilita'] ?? 'condiviso';

        // Visibilità privata richiede accesso personale
        if ($visibilita === 'privato' && !$hasPersonalAccess) {
            errorResponse('Accesso personale richiesto per entità private', 403);
        }

        $stmt = $db->prepare('
            INSERT INTO entita (id, team_id, creato_da, tipo_id, nome, lat, lng, indirizzo,
                               telefono, email, sito_web, valore, valore_tipo,
                               data_inizio, data_fine, visibilita)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $id,
            $teamId,
            $userId,
            $data['tipo_id'],
            $data['nome'],
            $data['lat'] ?? null,
            $data['lng'] ?? null,
            $data['indirizzo'] ?? null,
            $data['telefono'] ?? null,
            $data['email'] ?? null,
            $data['sito_web'] ?? null,
            $data['valore'] ?? null,
            $data['valore_tipo'] ?? 'totale',
            $data['data_inizio'] ?? null,
            $data['data_fine'] ?? null,
            $visibilita
        ]);

        // Salva tipologie (N:N)
        if (!empty($data['tipologie']) && is_array($data['tipologie'])) {
            $stmt = $db->prepare('INSERT INTO entita_tipologie (entita_id, tipologia_id) VALUES (?, ?)');
            foreach ($data['tipologie'] as $tipologiaId) {
                $stmt->execute([$id, $tipologiaId]);
            }
        }

        // Salva campi personalizzati
        if (!empty($data['campi']) && is_array($data['campi'])) {
            $stmt = $db->prepare('INSERT INTO entita_campi (entita_id, campo_id, valore) VALUES (?, ?, ?)');
            foreach ($data['campi'] as $campoId => $valore) {
                $stmt->execute([$id, $campoId, $valore]);
            }
        }

        jsonResponse(['id' => $id, 'message' => 'Entità creata'], 201);
        break;

    case 'PUT':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        $data = getJsonBody();

        // Verifica proprietà
        $stmt = $db->prepare('SELECT id, creato_da, visibilita FROM entita WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            errorResponse('Entità non trovata', 404);
        }

        // Se privata, solo il creatore può modificare
        if ($existing['visibilita'] === 'privato' && $existing['creato_da'] !== $userId) {
            errorResponse('Non autorizzato', 403);
        }

        $updates = [];
        $params = [];

        $fields = ['nome', 'tipo_id', 'lat', 'lng', 'indirizzo', 'telefono', 'email',
                   'sito_web', 'valore', 'valore_tipo', 'data_inizio', 'data_fine', 'visibilita'];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (!empty($updates)) {
            $params[] = $id;
            $sql = 'UPDATE entita SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        // Aggiorna tipologie se fornite
        if (isset($data['tipologie']) && is_array($data['tipologie'])) {
            // Rimuovi vecchie
            $stmt = $db->prepare('DELETE FROM entita_tipologie WHERE entita_id = ?');
            $stmt->execute([$id]);

            // Inserisci nuove
            $stmt = $db->prepare('INSERT INTO entita_tipologie (entita_id, tipologia_id) VALUES (?, ?)');
            foreach ($data['tipologie'] as $tipologiaId) {
                $stmt->execute([$id, $tipologiaId]);
            }
        }

        // Aggiorna campi personalizzati se forniti
        if (isset($data['campi']) && is_array($data['campi'])) {
            foreach ($data['campi'] as $campoId => $valore) {
                $stmt = $db->prepare('
                    INSERT INTO entita_campi (entita_id, campo_id, valore)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE valore = ?
                ');
                $stmt->execute([$id, $campoId, $valore, $valore]);
            }
        }

        jsonResponse(['message' => 'Entità aggiornata']);
        break;

    case 'DELETE':
        if (!$id) {
            errorResponse('ID richiesto', 400);
        }

        // Verifica proprietà
        $stmt = $db->prepare('SELECT id, creato_da, visibilita FROM entita WHERE id = ? AND team_id = ?');
        $stmt->execute([$id, $teamId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            errorResponse('Entità non trovata', 404);
        }

        // Se privata, solo il creatore può eliminare
        if ($existing['visibilita'] === 'privato' && $existing['creato_da'] !== $userId) {
            errorResponse('Non autorizzato', 403);
        }

        $stmt = $db->prepare('DELETE FROM entita WHERE id = ?');
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Entità eliminata']);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
