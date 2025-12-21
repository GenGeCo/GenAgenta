<?php
/**
 * GET /famiglie-prodotto/{id}
 * Dettaglio famiglia prodotto
 */

$user = requireAuth();
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$aziendaId = $user['azienda_id'] ?? null;

$id = $_REQUEST['id'] ?? '';

if (empty($id)) {
    errorResponse('ID richiesto', 400);
}

$db = getDB();

$sql = "
    SELECT f.*,
           p.nome as parent_nome,
           (SELECT COUNT(*) FROM famiglie_prodotto fc WHERE fc.parent_id = f.id) as num_figli
    FROM famiglie_prodotto f
    LEFT JOIN famiglie_prodotto p ON f.parent_id = p.id
    WHERE f.id = ?
";

$stmt = $db->prepare($sql);
$stmt->execute([$id]);
$famiglia = $stmt->fetch();

if (!$famiglia) {
    errorResponse('Famiglia prodotto non trovata', 404);
}

// Controllo accesso
if ($famiglia['visibilita'] === 'aziendale') {
    if ($famiglia['azienda_id'] !== $aziendaId) {
        errorResponse('Accesso non autorizzato', 403);
    }
} else {
    $isOwner = $famiglia['creato_da'] === $user['user_id'];
    if (!$hasPersonalAccess || !$isOwner) {
        errorResponse('Accesso non autorizzato', 403);
    }
}

// Carica anche i figli diretti
$stmtChildren = $db->prepare("
    SELECT id, nome, ordine
    FROM famiglie_prodotto
    WHERE parent_id = ?
    ORDER BY ordine ASC, nome ASC
");
$stmtChildren->execute([$id]);
$famiglia['children'] = $stmtChildren->fetchAll();

// Carica percorso (breadcrumb)
$path = [];
$currentId = $famiglia['parent_id'];
while ($currentId) {
    $stmtPath = $db->prepare("SELECT id, nome, parent_id FROM famiglie_prodotto WHERE id = ?");
    $stmtPath->execute([$currentId]);
    $parent = $stmtPath->fetch();
    if ($parent) {
        array_unshift($path, ['id' => $parent['id'], 'nome' => $parent['nome']]);
        $currentId = $parent['parent_id'];
    } else {
        break;
    }
}
$famiglia['path'] = $path;

jsonResponse($famiglia);
