<?php
/**
 * GET /auth/me
 * Ottieni utente corrente con dati azienda
 */

try {
    $user = requireAuth();
    $db = getDB();

    // Query base semplice - funziona sempre
    $stmt = $db->prepare('
        SELECT id, email, nome, ruolo, pin_hash
        FROM utenti
        WHERE id = ? AND attivo = 1
    ');
    $stmt->execute([$user['user_id']]);
    $userData = $stmt->fetch();

    if (!$userData) {
        errorResponse('Utente non trovato', 404);
    }

    jsonResponse([
        'id' => $userData['id'],
        'email' => $userData['email'],
        'nome' => $userData['nome'],
        'foto_url' => null,
        'ruolo' => $userData['ruolo'],
        'ruolo_azienda' => null,
        'azienda_id' => null,
        'nome_azienda' => null,
        'codice_pairing' => null,
        'has_pin' => !empty($userData['pin_hash'])
    ]);

} catch (Exception $e) {
    // Debug: mostra errore esatto
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Errore interno',
        'debug_message' => $e->getMessage(),
        'debug_file' => $e->getFile(),
        'debug_line' => $e->getLine()
    ]);
    exit;
}
