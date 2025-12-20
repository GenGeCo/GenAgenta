-- =====================================================
-- Migration 003: Tabella inviti team
-- =====================================================

CREATE TABLE IF NOT EXISTS inviti (
    id CHAR(36) PRIMARY KEY,
    email_invitato VARCHAR(255) NOT NULL,
    azienda_id CHAR(36) NOT NULL,
    invitato_da CHAR(36) NOT NULL,
    stato ENUM('pendente', 'accettato', 'rifiutato') DEFAULT 'pendente',
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_scadenza TIMESTAMP NULL,

    FOREIGN KEY (azienda_id) REFERENCES aziende(id) ON DELETE CASCADE,
    FOREIGN KEY (invitato_da) REFERENCES utenti(id) ON DELETE CASCADE,

    INDEX idx_email (email_invitato),
    INDEX idx_azienda (azienda_id),
    INDEX idx_stato (stato),
    UNIQUE idx_email_azienda (email_invitato, azienda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
