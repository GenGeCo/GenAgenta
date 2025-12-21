<?php
/**
 * GET /tipi-sinapsi
 * Lista tipi sinapsi (connessioni)
 */

$user = requireAuth();
$db = getDB();

$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;

$sql = "
    SELECT ts.*,
           (SELECT COUNT(*) FROM sinapsi s WHERE s.tipo_sinapsi_id = ts.id) as num_sinapsi
    FROM tipi_sinapsi ts
    WHERE (
        (ts.visibilita = 'aziendale' AND ts.azienda_id = ?)
        " . ($hasPersonalAccess ? "OR (ts.visibilita = 'personale' AND ts.creato_da = ?)" : "") . "
    )
    ORDER BY ts.ordine ASC, ts.nome ASC
";

$params = [$aziendaId];
if ($hasPersonalAccess) {
    $params[] = $user['user_id'];
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$tipi = $stmt->fetchAll();

// Palette colori per sinapsi (più sobria)
$palette = [
    '#64748b', '#475569', '#334155', // Grigio
    '#3b82f6', '#2563eb', '#1d4ed8', // Blu
    '#22c55e', '#16a34a', '#15803d', // Verde
    '#f59e0b', '#d97706', '#b45309', // Ambra
    '#ef4444', '#dc2626', '#b91c1c', // Rosso
    '#8b5cf6', '#7c3aed', '#6d28d9', // Viola
];

jsonResponse([
    'data' => $tipi,
    'palette' => $palette
]);
