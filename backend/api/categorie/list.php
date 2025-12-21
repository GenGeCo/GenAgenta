<?php
/**
 * GET /categorie
 * Lista categorie (colori)
 */

$user = requireAuth();
$db = getDB();

$aziendaId = $user['azienda_id'] ?? null;
$hasPersonalAccess = ($user['personal_access'] ?? false) === true;
$tipoId = $_GET['tipo_id'] ?? null;

// Query base
$sql = "
    SELECT c.*, t.nome as tipo_nome, t.forma as tipo_forma
    FROM categorie c
    JOIN tipi_neurone t ON c.tipo_id = t.id
    WHERE (
        (c.visibilita = 'aziendale' AND c.azienda_id = ?)
        " . ($hasPersonalAccess ? "OR (c.visibilita = 'personale' AND c.creato_da = ?)" : "") . "
    )
";

$params = [$aziendaId];
if ($hasPersonalAccess) {
    $params[] = $user['user_id'];
}

if ($tipoId) {
    $sql .= " AND c.tipo_id = ?";
    $params[] = $tipoId;
}

$sql .= " ORDER BY t.ordine ASC, t.nome ASC, c.ordine ASC, c.nome ASC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$categorie = $stmt->fetchAll();

// Palette colori disponibile
$palette = [
    '#ef4444', '#dc2626', '#b91c1c', // Rosso
    '#f97316', '#ea580c', '#c2410c', // Arancione
    '#f59e0b', '#d97706', '#b45309', // Ambra
    '#eab308', '#ca8a04', '#a16207', // Giallo
    '#84cc16', '#65a30d', '#4d7c0f', // Lime
    '#22c55e', '#16a34a', '#15803d', // Verde
    '#10b981', '#059669', '#047857', // Smeraldo
    '#14b8a6', '#0d9488', '#0f766e', // Teal
    '#06b6d4', '#0891b2', '#0e7490', // Ciano
    '#0ea5e9', '#0284c7', '#0369a1', // Celeste
    '#3b82f6', '#2563eb', '#1d4ed8', // Blu
    '#6366f1', '#4f46e5', '#4338ca', // Indaco
    '#8b5cf6', '#7c3aed', '#6d28d9', // Viola
    '#d946ef', '#c026d3', '#a21caf', // Fucsia
    '#ec4899', '#db2777', '#be185d', // Rosa
    '#64748b', '#475569', '#334155', // Grigio
];

jsonResponse([
    'data' => $categorie,
    'palette' => $palette
]);
