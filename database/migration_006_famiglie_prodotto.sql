-- Migration 006: Tabella famiglie_prodotto gerarchiche
-- Per organizzare i prodotti in categorie e sottocategorie

CREATE TABLE IF NOT EXISTS famiglie_prodotto (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    parent_id CHAR(36) DEFAULT NULL,  -- Per gerarchia (padre -> figlio)
    descrizione TEXT DEFAULT NULL,
    ordine INT DEFAULT 0,
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id CHAR(36) DEFAULT NULL,
    creato_da CHAR(36) DEFAULT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES famiglie_prodotto(id) ON DELETE CASCADE,
    INDEX idx_parent (parent_id),
    INDEX idx_azienda (azienda_id),
    INDEX idx_visibilita (visibilita),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Esempi di famiglie prodotto per colorificio/edilizia
-- INSERT INTO famiglie_prodotto (id, nome, parent_id, ordine) VALUES
-- ('f0000001-0000-0000-0000-000000000001', 'Pitture', NULL, 1),
-- ('f0000001-0000-0000-0000-000000000002', 'Idropitture', 'f0000001-0000-0000-0000-000000000001', 1),
-- ('f0000001-0000-0000-0000-000000000003', 'Smalti', 'f0000001-0000-0000-0000-000000000001', 2),
-- ('f0000001-0000-0000-0000-000000000004', 'Cappotto', NULL, 2),
-- ('f0000001-0000-0000-0000-000000000005', 'Pannelli EPS', 'f0000001-0000-0000-0000-000000000004', 1),
-- ('f0000001-0000-0000-0000-000000000006', 'Rasante', 'f0000001-0000-0000-0000-000000000004', 2);
