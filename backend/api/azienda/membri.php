<?php
/**
 * GET /azienda/membri - Lista membri azienda
 * DELETE /azienda/membri/{id} - Rimuovi membro (solo admin)
 */

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$membroId = $_REQUEST['id'] ?? null;

$db = getDB();

// Verifica che l'utente appartenga a un'azienda
$aziendaId = $user['azienda_id'] ?? null;
if (!$aziendaId) {
    errorResponse('Non appartieni a nessuna azienda', 400);
}

if ($method === 'GET') {
    // Lista membri della mia azienda
    $stmt = $db->prepare('
        SELECT id, nome, email, ruolo_azienda, data_creazione, foto_url
        FROM utenti
        WHERE azienda_id = ? AND attivo = 1
        ORDER BY ruolo_azienda DESC, nome ASC
    ');
    $stmt->execute([$aziendaId]);
    $membri = $stmt->fetchAll();

    // Non esporre email complete agli altri membri (tranne admin)
    $isAdmin = ($user['ruolo_azienda'] ?? '') === 'admin';
    foreach ($membri as &$m) {
        $m['is_me'] = $m['id'] === $user['user_id'];
        if (!$isAdmin && !$m['is_me']) {
            // Oscura email per non-admin
            $parts = explode('@', $m['email']);
            $m['email'] = substr($parts[0], 0, 3) . '***@' . ($parts[1] ?? 'email.com');
        }
    }

    jsonResponse([
        'data' => $membri,
        'total' => count($membri)
    ]);

} elseif ($method === 'DELETE' && $membroId) {
    // Solo admin può rimuovere membri
    if (($user['ruolo_azienda'] ?? '') !== 'admin') {
        errorResponse('Solo gli admin possono rimuovere membri', 403);
    }

    // Non puoi rimuovere te stesso
    if ($membroId === $user['user_id']) {
        errorResponse('Non puoi rimuovere te stesso', 400);
    }

    // Verifica che il membro appartenga alla stessa azienda
    $stmt = $db->prepare('SELECT id, nome, ruolo_azienda FROM utenti WHERE id = ? AND azienda_id = ?');
    $stmt->execute([$membroId, $aziendaId]);
    $membro = $stmt->fetch();

    if (!$membro) {
        errorResponse('Membro non trovato nella tua azienda', 404);
    }

    // Non puoi rimuovere altri admin
    if ($membro['ruolo_azienda'] === 'admin') {
        errorResponse('Non puoi rimuovere un altro amministratore', 403);
    }

    // Rimuovi membro dall'azienda (non elimina l'account, solo lo scollega)
    $stmt = $db->prepare('UPDATE utenti SET azienda_id = NULL, ruolo_azienda = NULL WHERE id = ?');
    $stmt->execute([$membroId]);

    jsonResponse([
        'success' => true,
        'message' => 'Membro rimosso dall\'azienda'
    ]);

} else {
    errorResponse('Metodo non permesso', 405);
}
