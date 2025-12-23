-- Migration 007: Aggiunge tabella per campi personalizzati per tipo entità
-- Eseguire su MySQL

-- Tabella campi_tipo: definisce quali campi ha ogni tipo di entità
-- NOTA: team_id deriva dalla relazione con tipi (tipi.team_id)
CREATE TABLE IF NOT EXISTS campi_tipo (
    id VARCHAR(36) PRIMARY KEY,
    tipo_id VARCHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL COMMENT 'Nome tecnico del campo (es: comune, committente)',
    etichetta VARCHAR(200) NOT NULL COMMENT 'Etichetta mostrata nel form (es: Comune, Committente)',
    tipo_dato ENUM('testo', 'textarea', 'numero', 'data', 'select', 'email', 'telefono', 'url') NOT NULL DEFAULT 'testo',
    opzioni JSON NULL COMMENT 'Per tipo select: array di opzioni ["opt1", "opt2"]',
    obbligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    ordine INT NOT NULL DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo_id (tipo_id),

    FOREIGN KEY (tipo_id) REFERENCES tipi(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
