<?php
/**
 * GET /tipi-neurone
 * Lista tipi neurone (forme)
 */

$user = requireAuth();
$db = getDB();

$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

// Query base: tipi aziendali della propria azienda + tipi personali propri
$sql = "
    SELECT t.*,
           (SELECT COUNT(*) FROM categorie c WHERE c.tipo_id = t.id) as num_categorie
    FROM tipi_neurone t
    WHERE (
        (t.visibilita = 'aziendale' AND t.azienda_id = ?)
        " . ($hasPersonalAccess ? "OR (t.visibilita = 'personale' AND t.creato_da = ?)" : "") . "
    )
    ORDER BY t.ordine ASC, t.nome ASC
";

$params = [$aziendaId];
if ($hasPersonalAccess) {
    $params[] = $user['user_id'];
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$tipi = $stmt->fetchAll();

jsonResponse([
    'data' => $tipi,
    'forme_disponibili' => ['cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'L', 'C', 'W', 'Z']
]);
