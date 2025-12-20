<?php
/**
 * POST /users/upload-foto
 * Upload foto profilo
 */

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Metodo non permesso', 405);
}

// Verifica che sia stato caricato un file
if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'File troppo grande (limite server)',
        UPLOAD_ERR_FORM_SIZE => 'File troppo grande',
        UPLOAD_ERR_PARTIAL => 'Upload incompleto',
        UPLOAD_ERR_NO_FILE => 'Nessun file caricato',
    ];
    $code = $_FILES['foto']['error'] ?? UPLOAD_ERR_NO_FILE;
    errorResponse($errors[$code] ?? 'Errore upload', 400);
}

$file = $_FILES['foto'];

// Validazioni
$maxSize = 2 * 1024 * 1024; // 2MB
if ($file['size'] > $maxSize) {
    errorResponse('File troppo grande (max 2MB)', 400);
}

$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    errorResponse('Tipo file non permesso. Usa JPG, PNG, GIF o WebP', 400);
}

// Crea cartella uploads se non esiste
$uploadDir = dirname(__DIR__, 2) . '/uploads/foto-profilo/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Genera nome file unico
$ext = match($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    default => 'jpg'
};
$filename = $user['user_id'] . '_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

// Sposta file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    errorResponse('Errore salvataggio file', 500);
}

// URL pubblico della foto
$fotoUrl = BASE_URL . '/backend/uploads/foto-profilo/' . $filename;

// Aggiorna database
$db = getDB();

// Controlla se colonna foto_url esiste
$hasFotoUrl = false;
try {
    $check = $db->query("SHOW COLUMNS FROM utenti LIKE 'foto_url'");
    $hasFotoUrl = $check->rowCount() > 0;
} catch (Exception $e) {
    // Ignora
}

if ($hasFotoUrl) {
    // Elimina vecchia foto se esiste
    $stmt = $db->prepare('SELECT foto_url FROM utenti WHERE id = ?');
    $stmt->execute([$user['user_id']]);
    $oldFoto = $stmt->fetchColumn();

    if ($oldFoto && strpos($oldFoto, '/uploads/foto-profilo/') !== false) {
        $oldFilename = basename($oldFoto);
        $oldPath = $uploadDir . $oldFilename;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    // Salva nuova foto
    $stmt = $db->prepare('UPDATE utenti SET foto_url = ? WHERE id = ?');
    $stmt->execute([$fotoUrl, $user['user_id']]);
}

jsonResponse([
    'success' => true,
    'foto_url' => $fotoUrl
]);
