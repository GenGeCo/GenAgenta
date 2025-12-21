<?php
/**
 * DELETE /neuroni/{id}
 * Elimina neurone con log audit trail
 */

$user = requireAuth();
$id = $_REQUEST['id'] ?? '';
$data = getJsonBody();

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Recupera neurone completo per il log
$stmt = $db->prepare('SELECT * FROM neuroni WHERE id = ?');
$stmt->execute([$id]);
$neurone = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$neurone) {
    errorResponse('Neurone non trovato', 404);
}

// Se neurone personale, richiede accesso personale E essere il creatore
if ($neurone['visibilita'] === 'personale') {
    $hasPersonalAccess = ($user['personal_access'] ?? false) === true;
    $isOwner = $neurone['creato_da'] === $user['user_id'];

    if (!$hasPersonalAccess || !$isOwner) {
        errorResponse('Non puoi eliminare neuroni personali di altri utenti', 403);
    }
}

// Verifica azienda per neuroni aziendali
if ($neurone['visibilita'] === 'aziendale') {
    $userAziendaId = $user['azienda_id'] ?? null;
    if ($neurone['azienda_id'] && $neurone['azienda_id'] !== $userAziendaId) {
        errorResponse('Non puoi eliminare neuroni di altre aziende', 403);
    }
}

try {
    $db->beginTransaction();

    // Recupera anche le sinapsi collegate per il log
    $stmtSinapsi = $db->prepare('SELECT * FROM sinapsi WHERE neurone_da = ? OR neurone_a = ?');
    $stmtSinapsi->execute([$id, $id]);
    $sinapsiCollegate = $stmtSinapsi->fetchAll(PDO::FETCH_ASSOC);

    // Recupera note personali per il log
    $stmtNote = $db->prepare('SELECT * FROM note_personali WHERE neurone_id = ?');
    $stmtNote->execute([$id]);
    $noteCollegate = $stmtNote->fetchAll(PDO::FETCH_ASSOC);

    // Prepara snapshot completo
    $snapshot = [
        'neurone' => $neurone,
        'sinapsi_collegate' => $sinapsiCollegate,
        'note_collegate' => $noteCollegate,
        'conteggi' => [
            'sinapsi' => count($sinapsiCollegate),
            'note' => count($noteCollegate)
        ]
    ];

    // Salva nel log eliminazioni (se la tabella esiste)
    $logId = generateUUID();
    try {
        $stmtLog = $db->prepare('
            INSERT INTO log_eliminazioni (id, tipo_entita, entita_id, dati_json, eliminato_da, motivo)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmtLog->execute([
            $logId,
            'neurone',
            $id,
            json_encode($snapshot, JSON_UNESCAPED_UNICODE),
            $user['user_id'],
            $data['motivo'] ?? null
        ]);
    } catch (PDOException $e) {
        // Tabella log_eliminazioni potrebbe non esistere ancora, ignora
    }

    // Elimina il neurone (le sinapsi e note vengono eliminate automaticamente per CASCADE)
    $stmtDelete = $db->prepare('DELETE FROM neuroni WHERE id = ?');
    $stmtDelete->execute([$id]);

    $db->commit();

    jsonResponse([
        'message' => 'Neurone eliminato',
        'sinapsi_eliminate' => count($sinapsiCollegate),
        'note_eliminate' => count($noteCollegate)
    ]);

} catch (Exception $e) {
    $db->rollBack();
    errorResponse('Errore durante l\'eliminazione: ' . $e->getMessage(), 500);
}
