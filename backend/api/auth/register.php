<?php
/**
 * POST /auth/register
 * Registrazione nuovo utente
 *
 * CASO 1: Senza codice_azienda → Crea nuova azienda, utente diventa admin
 * CASO 2: Con codice_azienda → Si unisce ad azienda esistente come membro
 */

$data = getJsonBody();

$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$nome = trim($data['nome'] ?? '');
$codiceAzienda = trim($data['codice_azienda'] ?? '');
$nomeAzienda = trim($data['nome_azienda'] ?? '');

// Validazione base
if (empty($email) || empty($password) || empty($nome)) {
    errorResponse('Email, password e nome sono richiesti', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Email non valida', 400);
}

if (strlen($password) < 6) {
    errorResponse('La password deve essere di almeno 6 caratteri', 400);
}

$db = getDB();

// Verifica che email non sia già registrata
$stmt = $db->prepare('SELECT id FROM utenti WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    errorResponse('Email già registrata', 409);
}

$userId = generateUUID();
$passwordHash = hashPassword($password);
$aziendaId = null;
$teamId = null;
$ruoloAzienda = 'membro';

// CASO 1: Con codice azienda → unisciti ad azienda esistente
if (!empty($codiceAzienda)) {
    $stmt = $db->prepare('SELECT id, nome, max_utenti FROM aziende WHERE codice_pairing = ? AND attiva = 1');
    $stmt->execute([$codiceAzienda]);
    $azienda = $stmt->fetch();

    if (!$azienda) {
        errorResponse('Codice azienda non valido', 404);
    }

    // Verifica limite utenti
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM utenti WHERE azienda_id = ?');
    $stmt->execute([$azienda['id']]);
    $count = $stmt->fetch()['cnt'];

    if ($count >= $azienda['max_utenti']) {
        errorResponse('Limite utenti raggiunto per questa azienda', 403);
    }

    $aziendaId = $azienda['id'];
    $ruoloAzienda = 'membro';
}
// CASO 2: Senza codice → crea nuova azienda
else {
    if (empty($nomeAzienda)) {
        errorResponse('Nome azienda richiesto per creare un nuovo account', 400);
    }

    $aziendaId = generateUUID();
    $teamId = generateUUID();
    $ruoloAzienda = 'admin';

    // Genera codice pairing unico (es: ABC-1X2Y3Z)
    $codicePairing = generateCodicePairing($db);

    // Crea azienda (sistema legacy)
    $stmt = $db->prepare('INSERT INTO aziende (id, nome, codice_pairing, piano, max_utenti) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$aziendaId, $nomeAzienda, $codicePairing, 'free', 3]);

    // Crea team (sistema v2)
    $stmt = $db->prepare('INSERT INTO team (id, nome, codice_invito, piano, max_utenti) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$teamId, $nomeAzienda, $codicePairing, 'free', 3]);
}
// Se si unisce ad azienda esistente, cerca il team corrispondente
else {
    // Cerca team con stesso codice invito
    $stmt = $db->prepare('SELECT id FROM team WHERE codice_invito = ?');
    $stmt->execute([$codiceAzienda]);
    $teamRow = $stmt->fetch();
    $teamId = $teamRow ? $teamRow['id'] : null;
}

// Crea utente
$stmt = $db->prepare('
    INSERT INTO utenti (id, azienda_id, email, password_hash, nome, ruolo, ruolo_azienda, attivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
');
$stmt->execute([$userId, $aziendaId, $email, $passwordHash, $nome, 'commerciale', $ruoloAzienda]);

// Aggiungi utente a team_membri (sistema v2)
if ($teamId) {
    $ruoloTeam = ($ruoloAzienda === 'admin') ? 'responsabile' : 'membro';
    $stmt = $db->prepare('INSERT INTO team_membri (team_id, utente_id, ruolo) VALUES (?, ?, ?)');
    $stmt->execute([$teamId, $userId, $ruoloTeam]);
}

// Genera token JWT (include team_id per API v2)
$token = generateJWT([
    'user_id' => $userId,
    'azienda_id' => $aziendaId,
    'team_id' => $teamId,
    'email' => $email,
    'nome' => $nome,
    'ruolo' => 'commerciale',
    'ruolo_azienda' => $ruoloAzienda
]);

// Ottieni info azienda per risposta
$stmt = $db->prepare('SELECT nome, codice_pairing FROM aziende WHERE id = ?');
$stmt->execute([$aziendaId]);
$aziendaInfo = $stmt->fetch();

jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $userId,
        'azienda_id' => $aziendaId,
        'team_id' => $teamId,
        'email' => $email,
        'nome' => $nome,
        'ruolo' => 'commerciale',
        'ruolo_azienda' => $ruoloAzienda,
        'has_pin' => false
    ],
    'azienda' => [
        'id' => $aziendaId,
        'nome' => $aziendaInfo['nome'],
        'codice_pairing' => $aziendaInfo['codice_pairing']
    ]
], 201);

/**
 * Genera codice pairing unico (es: GEA-X7K2M9)
 */
function generateCodicePairing($db): string {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, I, 1 per evitare confusione
    $maxAttempts = 10;

    for ($i = 0; $i < $maxAttempts; $i++) {
        $code = '';
        for ($j = 0; $j < 3; $j++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $code .= '-';
        for ($j = 0; $j < 6; $j++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }

        // Verifica unicità
        $stmt = $db->prepare('SELECT id FROM aziende WHERE codice_pairing = ?');
        $stmt->execute([$code]);
        if (!$stmt->fetch()) {
            return $code;
        }
    }

    // Fallback con UUID se non trova codice unico
    return 'NEW-' . substr(generateUUID(), 0, 6);
}
