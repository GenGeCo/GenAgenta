<?php
/**
 * PUT /users/profile
 * Aggiorna profilo utente (nome, foto)
 */

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Metodo non permesso', 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$nome = trim($data['nome'] ?? '');
$fotoUrl = $data['foto_url'] ?? null;

if (empty($nome)) {
    errorResponse('Nome richiesto', 400);
}

if (strlen($nome) > 100) {
    errorResponse('Nome troppo lungo (max 100 caratteri)', 400);
}

$db = getDB();

// Verifica se la colonna foto_url esiste
$hasFotoUrl = false;
try {
    $checkStmt = $db->query("SHOW COLUMNS FROM utenti LIKE 'foto_url'");
    $hasFotoUrl = $checkStmt->rowCount() > 0;
} catch (Exception $e) {
    // Ignora
}

// Aggiorna profilo
$sql = 'UPDATE utenti SET nome = ?';
$params = [$nome];

if ($fotoUrl !== null && $hasFotoUrl) {
    // Valida URL foto (deve essere URL valido o null per rimuoverla)
    if (!empty($fotoUrl) && !filter_var($fotoUrl, FILTER_VALIDATE_URL)) {
        errorResponse('URL foto non valido', 400);
    }
    $sql .= ', foto_url = ?';
    $params[] = $fotoUrl ?: null;
}

$sql .= ' WHERE id = ?';
$params[] = $user['user_id'];

$stmt = $db->prepare($sql);
$stmt->execute($params);

jsonResponse([
    'success' => true,
    'message' => 'Profilo aggiornato'
]);
