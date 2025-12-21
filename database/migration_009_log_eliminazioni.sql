-- =====================================================
-- GenAgenTa - Migration 009: Log Eliminazioni (Audit Trail)
-- =====================================================
-- Tabella per tenere traccia di tutte le eliminazioni
-- I dati non vengono mai persi, solo spostati qui

CREATE TABLE IF NOT EXISTS log_eliminazioni (
    id CHAR(36) PRIMARY KEY,
    tipo_entita ENUM('neurone', 'sinapsi', 'nota') NOT NULL,
    entita_id CHAR(36) NOT NULL,
    dati_json LONGTEXT NOT NULL,  -- Snapshot completo dell'entità eliminata
    eliminato_da CHAR(36) NOT NULL,
    motivo VARCHAR(500) DEFAULT NULL,
    data_eliminazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo_entita),
    INDEX idx_entita (entita_id),
    INDEX idx_eliminato_da (eliminato_da),
    INDEX idx_data (data_eliminazione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
