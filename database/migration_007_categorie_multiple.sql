-- Migration 007: Categorie multiple per neurone
-- Permette di assegnare più categorie a un neurone (es: impresa che fa intonaco E cartongesso)

-- Tabella di relazione N:N tra neuroni e categorie
CREATE TABLE IF NOT EXISTS neuroni_categorie (
    neurone_id CHAR(36) NOT NULL,
    categoria_id CHAR(36) NOT NULL,
    PRIMARY KEY (neurone_id, categoria_id),
    FOREIGN KEY (neurone_id) REFERENCES neuroni(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorie(id) ON DELETE CASCADE
);

-- Indice per ricerche inverse (quali neuroni hanno questa categoria)
CREATE INDEX idx_neuroni_categorie_cat ON neuroni_categorie(categoria_id);

-- Migra dati esistenti dalla colonna categoria_id (se presente)
INSERT IGNORE INTO neuroni_categorie (neurone_id, categoria_id)
SELECT id, categoria_id FROM neuroni WHERE categoria_id IS NOT NULL;

-- Nota: non rimuoviamo categoria_id da neuroni per compatibilità retroattiva
-- Il campo categoria_id diventa la "categoria principale" mentre neuroni_categorie
-- contiene tutte le categorie (inclusa la principale)
