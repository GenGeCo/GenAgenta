-- Migration 008: Aggiunge potenziale acquisto e tabella vendite per prodotto
-- Eseguire su MySQL

-- Campo potenziale sulla tabella neuroni
ALTER TABLE neuroni
ADD COLUMN potenziale DECIMAL(12,2) NULL DEFAULT NULL
COMMENT 'Potenziale di acquisto in euro (altezza massima edificio 3D)'
AFTER dimensione;

-- Tabella vendite per famiglia prodotto
CREATE TABLE IF NOT EXISTS vendite_prodotto (
    id VARCHAR(36) PRIMARY KEY,
    neurone_id VARCHAR(36) NOT NULL,
    famiglia_id VARCHAR(36) NOT NULL,
    importo DECIMAL(12,2) NOT NULL DEFAULT 0,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_neurone_famiglia (neurone_id, famiglia_id),
    INDEX idx_neurone (neurone_id),
    INDEX idx_famiglia (famiglia_id),

    FOREIGN KEY (neurone_id) REFERENCES neuroni(id) ON DELETE CASCADE,
    FOREIGN KEY (famiglia_id) REFERENCES famiglie_prodotto(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
