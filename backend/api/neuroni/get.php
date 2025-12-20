<?php
/**
 * GET /neuroni/{id}
 * Dettaglio singolo neurone
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;

$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

// Ottieni neurone
$stmt = $db->prepare('SELECT * FROM neuroni WHERE id = ?');
$stmt->execute([$id]);
$neurone = $stmt->fetch();

if (!$neurone) {
    errorResponse('Neurone non trovato', 404);
}

// Controllo visibilità e azienda
if ($neurone['visibilita'] === 'aziendale') {
    // Dati aziendali: verifico che sia della MIA azienda
    if ($neurone['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    // Dati personali: verifico che sia MIO e che ho il PIN
    $isOwner = $neurone['creato_da'] === $user['user_id'];

    if (!$hasPersonalAccess || !$isOwner) {
        // Restituisci versione anonimizzata
        jsonResponse([
            'id' => $neurone['id'],
            'nome' => 'Fonte anonima',
            'tipo' => $neurone['tipo'],
            'categorie' => ['altro'],
            'visibilita' => 'personale',
            'is_hidden' => true
        ]);
    }
}

// Decodifica JSON
$neurone['categorie'] = json_decode($neurone['categorie'], true);
$neurone['dati_extra'] = $neurone['dati_extra'] ? json_decode($neurone['dati_extra'], true) : null;

// Conta note personali (solo se ha accesso)
$noteCount = 0;
if ($hasPersonalAccess) {
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM note_personali WHERE neurone_id = ? AND utente_id = ?');
    $stmt->execute([$id, $user['user_id']]);
    $noteCount = $stmt->fetch()['cnt'];
}

$neurone['has_note'] = $noteCount > 0;
$neurone['note_count'] = $hasPersonalAccess ? $noteCount : null;

jsonResponse($neurone);
