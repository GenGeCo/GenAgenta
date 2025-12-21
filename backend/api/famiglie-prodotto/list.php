<?php
/**
 * GET /famiglie-prodotto
 * Lista famiglie prodotto gerarchiche
 */

$user = requireAuth();
$db = getDB();

$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$parentId = $_GET['parent_id'] ?? null;
$flat = isset($_GET['flat']); // Se true, restituisce lista piatta

// Query base
$sql = "
    SELECT f.*,
           (SELECT COUNT(*) FROM famiglie_prodotto fc WHERE fc.parent_id = f.id) as num_figli
    FROM famiglie_prodotto f
    WHERE (
        (f.visibilita = 'aziendale' AND f.azienda_id = ?)
        " . ($hasPersonalAccess ? "OR (f.visibilita = 'personale' AND f.creato_da = ?)" : "") . "
    )
";

$params = [$aziendaId];
if ($hasPersonalAccess) {
    $params[] = $user['user_id'];
}

// Filtro per parent_id
if ($parentId === 'null' || $parentId === '') {
    $sql .= " AND f.parent_id IS NULL";
} elseif ($parentId) {
    $sql .= " AND f.parent_id = ?";
    $params[] = $parentId;
}

$sql .= " ORDER BY f.ordine ASC, f.nome ASC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$famiglie = $stmt->fetchAll();

// Se richiesta struttura gerarchica, costruisci albero
if (!$flat && ($parentId === 'null' || $parentId === '' || !$parentId)) {
    // Funzione ricorsiva per costruire albero
    $buildTree = function($items, $parentId = null) use (&$buildTree) {
        $branch = [];
        foreach ($items as $item) {
            if ($item['parent_id'] === $parentId) {
                $children = $buildTree($items, $item['id']);
                if ($children) {
                    $item['children'] = $children;
                }
                $branch[] = $item;
            }
        }
        return $branch;
    };

    // Ricarica tutte le famiglie per costruire albero completo
    $sqlAll = "
        SELECT f.*,
               (SELECT COUNT(*) FROM famiglie_prodotto fc WHERE fc.parent_id = f.id) as num_figli
        FROM famiglie_prodotto f
        WHERE (
            (f.visibilita = 'aziendale' AND f.azienda_id = ?)
            " . ($hasPersonalAccess ? "OR (f.visibilita = 'personale' AND f.creato_da = ?)" : "") . "
        )
        ORDER BY f.ordine ASC, f.nome ASC
    ";

    $paramsAll = [$aziendaId];
    if ($hasPersonalAccess) {
        $paramsAll[] = $user['user_id'];
    }

    $stmt = $db->prepare($sqlAll);
    $stmt->execute($paramsAll);
    $allFamiglie = $stmt->fetchAll();

    $famiglie = $buildTree($allFamiglie, null);
}

jsonResponse([
    'data' => $famiglie
]);
