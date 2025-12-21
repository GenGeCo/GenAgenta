-- =====================================================
-- GenAgenTa - Migration 002: Tipi e Categorie Personalizzabili
-- =====================================================

-- =====================================================
-- TIPI NEURONE (forme 3D sulla mappa)
-- =====================================================
CREATE TABLE IF NOT EXISTS tipi_neurone (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    forma ENUM('cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'L', 'C', 'W', 'Z') NOT NULL DEFAULT 'cerchio',
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id CHAR(36) DEFAULT NULL,
    creato_da CHAR(36) DEFAULT NULL,
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_azienda (azienda_id),
    INDEX idx_visibilita (visibilita),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CATEGORIE (colori, legate ai tipi)
-- =====================================================
CREATE TABLE IF NOT EXISTS categorie (
    id CHAR(36) PRIMARY KEY,
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    colore VARCHAR(7) NOT NULL DEFAULT '#3b82f6',  -- Hex color
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id CHAR(36) DEFAULT NULL,
    creato_da CHAR(36) DEFAULT NULL,
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (tipo_id) REFERENCES tipi_neurone(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo_id),
    INDEX idx_azienda (azienda_id),
    INDEX idx_visibilita (visibilita),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIPI SINAPSI (tipi connessione personalizzabili)
-- =====================================================
CREATE TABLE IF NOT EXISTS tipi_sinapsi (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    colore VARCHAR(7) NOT NULL DEFAULT '#64748b',  -- Hex color
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id CHAR(36) DEFAULT NULL,
    creato_da CHAR(36) DEFAULT NULL,
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_azienda (azienda_id),
    INDEX idx_visibilita (visibilita),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MODIFICA TABELLA NEURONI
-- Aggiungi riferimenti alle nuove tabelle
-- =====================================================
ALTER TABLE neuroni
    ADD COLUMN tipo_id CHAR(36) DEFAULT NULL AFTER tipo,
    ADD COLUMN categoria_id CHAR(36) DEFAULT NULL AFTER categorie,
    ADD INDEX idx_tipo_id (tipo_id),
    ADD INDEX idx_categoria_id (categoria_id);

-- =====================================================
-- MODIFICA TABELLA SINAPSI
-- Aggiungi riferimento a tipi_sinapsi
-- =====================================================
ALTER TABLE sinapsi
    ADD COLUMN tipo_sinapsi_id CHAR(36) DEFAULT NULL AFTER tipo_connessione,
    ADD INDEX idx_tipo_sinapsi_id (tipo_sinapsi_id);

-- =====================================================
-- PALETTE COLORI PREDEFINITA (per riferimento frontend)
-- =====================================================
-- Rosso: #ef4444, #dc2626, #b91c1c
-- Arancione: #f97316, #ea580c, #c2410c
-- Ambra: #f59e0b, #d97706, #b45309
-- Giallo: #eab308, #ca8a04, #a16207
-- Lime: #84cc16, #65a30d, #4d7c0f
-- Verde: #22c55e, #16a34a, #15803d
-- Smeraldo: #10b981, #059669, #047857
-- Teal: #14b8a6, #0d9488, #0f766e
-- Ciano: #06b6d4, #0891b2, #0e7490
-- Celeste: #0ea5e9, #0284c7, #0369a1
-- Blu: #3b82f6, #2563eb, #1d4ed8
-- Indaco: #6366f1, #4f46e5, #4338ca
-- Viola: #8b5cf6, #7c3aed, #6d28d9
-- Fucsia: #d946ef, #c026d3, #a21caf
-- Rosa: #ec4899, #db2777, #be185d
-- Grigio: #64748b, #475569, #334155
