<?php
/**
 * GET /auth/inviti-pendenti
 * Verifica se ci sono inviti pendenti per l'utente corrente
 */

$user = requireAuth();
$db = getDB();

// Cerca inviti pendenti per l'email dell'utente
$stmt = $db->prepare('
    SELECT
        i.id,
        i.azienda_id,
        a.nome as nome_azienda,
        u.nome as invitato_da_nome,
        i.data_creazione
    FROM inviti i
    JOIN aziende a ON i.azienda_id = a.id
    JOIN utenti u ON i.invitato_da = u.id
    WHERE i.email_invitato = ? AND i.stato = "pendente"
    ORDER BY i.data_creazione DESC
    LIMIT 1
');
$stmt->execute([$user['email']]);
$invito = $stmt->fetch();

if ($invito) {
    jsonResponse([
        'has_invite' => true,
        'invito' => [
            'id' => $invito['id'],
            'azienda_id' => $invito['azienda_id'],
            'nome_azienda' => $invito['nome_azienda'],
            'invitato_da' => $invito['invitato_da_nome'],
            'data' => $invito['data_creazione']
        ]
    ]);
} else {
    jsonResponse([
        'has_invite' => false
    ]);
}
