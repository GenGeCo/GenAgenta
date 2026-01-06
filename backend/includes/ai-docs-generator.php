<?php
/**
 * Generatore automatico documentazione AI
 *
 * Quando l'utente modifica la configurazione (tipi, tipologie, campi),
 * questo file rigenera automaticamente la documentazione che l'AI legge.
 */

/**
 * Rigenera il file STRUTTURA.md per un team specifico
 * Contiene: tipi entità, tipologie (colori), campi personalizzati
 */
function regenerateAiStructureDocs(PDO $db, string $teamId): bool {
    // Directory per i docs per team
    $docsDir = __DIR__ . '/../config/ai/teams';
    if (!is_dir($docsDir)) {
        mkdir($docsDir, 0755, true);
    }

    $filePath = $docsDir . '/' . $teamId . '_struttura.md';

    // Recupera tutti i tipi del team
    $stmt = $db->prepare('
        SELECT t.id, t.nome, t.forma
        FROM tipi t
        WHERE t.team_id = ?
        ORDER BY t.nome
    ');
    $stmt->execute([$teamId]);
    $tipi = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($tipi)) {
        // Nessun tipo configurato
        $content = "# Struttura Entità\n\nNessun tipo di entità configurato.\n";
        file_put_contents($filePath, $content);
        return true;
    }

    $content = "# Struttura Entità del Team\n\n";
    $content .= "Questo file viene aggiornato automaticamente quando l'utente modifica la configurazione.\n\n";

    foreach ($tipi as $tipo) {
        $content .= "## {$tipo['nome']}\n\n";
        $content .= "- **ID**: `{$tipo['id']}`\n";
        $content .= "- **Forma mappa**: {$tipo['forma']}\n";
        $content .= "\n";

        // Recupera tipologie (categorie) per questo tipo
        $stmt = $db->prepare('
            SELECT id, nome, colore
            FROM tipologie
            WHERE tipo_id = ?
            ORDER BY nome
        ');
        $stmt->execute([$tipo['id']]);
        $tipologie = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($tipologie)) {
            $content .= "### Tipologie (determinano il COLORE)\n\n";
            $content .= "| Nome | Colore |\n";
            $content .= "|------|--------|\n";
            foreach ($tipologie as $tip) {
                $colore = $tip['colore'] ?: 'default';
                $content .= "| {$tip['nome']} | {$colore} |\n";
            }
            $content .= "\n";
        }

        // Recupera campi personalizzati per questo tipo
        try {
            $stmt = $db->prepare('
                SELECT nome, etichetta, tipo_dato, obbligatorio, opzioni
                FROM campi_tipo
                WHERE tipo_id = ?
                ORDER BY ordine, nome
            ');
            $stmt->execute([$tipo['id']]);
            $campi = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($campi)) {
                $content .= "### Campi Personalizzati\n\n";
                $content .= "| Campo | Etichetta | Tipo | Obbligatorio |\n";
                $content .= "|-------|-----------|------|-------------|\n";
                foreach ($campi as $campo) {
                    $obbligatorio = $campo['obbligatorio'] ? '✓' : '';
                    $content .= "| `{$campo['nome']}` | {$campo['etichetta']} | {$campo['tipo_dato']} | {$obbligatorio} |\n";

                    // Se è un select, mostra le opzioni
                    if ($campo['tipo_dato'] === 'select' && $campo['opzioni']) {
                        $opzioni = json_decode($campo['opzioni'], true);
                        if ($opzioni) {
                            $content .= "| | Opzioni: " . implode(', ', $opzioni) . " | | |\n";
                        }
                    }
                }
                $content .= "\n";
            }
        } catch (PDOException $e) {
            // Tabella campi_tipo potrebbe non esistere ancora
        }

        $content .= "---\n\n";
    }

    // =====================================================
    // FAMIGLIE PRODOTTO
    // =====================================================
    $content .= "# Famiglie Prodotto\n\n";
    $content .= "Le famiglie prodotto sono usate per categorizzare le vendite.\n\n";

    try {
        // Recupera famiglie prodotto (solo radici, con conteggio figli)
        $stmt = $db->prepare("
            SELECT f.id, f.nome, f.colore, f.parent_id,
                   (SELECT COUNT(*) FROM famiglie_prodotto fc WHERE fc.parent_id = f.id) as num_figli
            FROM famiglie_prodotto f
            WHERE f.azienda_id = ?
            ORDER BY f.ordine ASC, f.nome ASC
        ");
        $stmt->execute([$teamId]);
        $famiglie = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($famiglie)) {
            // Costruisci albero
            $radici = array_filter($famiglie, fn($f) => $f['parent_id'] === null);
            $figli = array_filter($famiglie, fn($f) => $f['parent_id'] !== null);

            foreach ($radici as $famiglia) {
                $colore = $famiglia['colore'] ?: 'default';
                $content .= "## {$famiglia['nome']}\n";
                $content .= "- Colore: {$colore}\n";

                // Trova sottofamiglie
                $sottofamiglie = array_filter($figli, fn($f) => $f['parent_id'] === $famiglia['id']);
                if (!empty($sottofamiglie)) {
                    $content .= "- Sottofamiglie:\n";
                    foreach ($sottofamiglie as $sotto) {
                        $content .= "  - {$sotto['nome']}\n";
                    }
                }
                $content .= "\n";
            }
        } else {
            $content .= "Nessuna famiglia prodotto configurata.\n\n";
        }
    } catch (PDOException $e) {
        $content .= "Tabella famiglie_prodotto non disponibile.\n\n";
    }

    // =====================================================
    // ISTRUZIONI
    // =====================================================
    $content .= "---\n\n";
    $content .= "# Come usare questi dati\n\n";

    $content .= "## Entità\n";
    $content .= "1. Il **tipo** deve essere uno di quelli elencati sopra\n";
    $content .= "2. La **tipologia** (categoria) determina il COLORE sulla mappa\n";
    $content .= "3. I **campi personalizzati** vanno passati nell'oggetto `campi_custom`\n\n";

    $content .= "## Vendite\n";
    $content .= "Quando registri una vendita, usa una **famiglia prodotto** esistente.\n";
    $content .= "Il colore della parabola sulla mappa dipende dalla famiglia.\n\n";

    $content .= "## Esempio creazione entità con campi custom\n";
    $content .= "```\n";
    $content .= "create_entity({\n";
    $content .= "  nome: \"Cantiere Via Roma\",\n";
    $content .= "  tipo: \"Cantiere\",\n";
    $content .= "  campi_custom: {\n";
    $content .= "    impresa_costruttrice: \"Rossi SRL\",\n";
    $content .= "    direttore_lavori: \"Ing. Bianchi\"\n";
    $content .= "  }\n";
    $content .= "})\n";
    $content .= "```\n";

    // Scrivi il file
    $result = file_put_contents($filePath, $content);

    if ($result !== false) {
        error_log("AI Docs: Rigenerato {$filePath}");
        return true;
    }

    error_log("AI Docs: ERRORE scrittura {$filePath}");
    return false;
}

/**
 * Wrapper per rigenerare i docs dal contesto utente
 */
function regenerateAiDocsForUser(PDO $db, array $user): bool {
    $teamId = $user['team_id'] ?? $user['azienda_id'] ?? null;
    if (!$teamId) {
        return false;
    }
    return regenerateAiStructureDocs($db, $teamId);
}
