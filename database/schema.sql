-- =====================================================
-- GenAgenTa - Schema Database
-- Rete Neurale Temporale delle Relazioni Commerciali
-- =====================================================

-- Elimina tabelle esistenti (per reset)
DROP TABLE IF EXISTS note_personali;
DROP TABLE IF EXISTS sinapsi;
DROP TABLE IF EXISTS neuroni;
DROP TABLE IF EXISTS utenti;

-- =====================================================
-- UTENTI
-- =====================================================
CREATE TABLE utenti (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) DEFAULT NULL,  -- PIN per area personale
    nome VARCHAR(255) NOT NULL,
    ruolo ENUM('admin', 'commerciale') DEFAULT 'commerciale',
    attivo TINYINT(1) DEFAULT 1,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_attivo (attivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NEURONI (Entità: persone, imprese, luoghi)
-- =====================================================
CREATE TABLE neuroni (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo ENUM('persona', 'impresa', 'luogo') NOT NULL,
    categorie JSON NOT NULL,  -- ["imbianchino", "cartongessista"] o ["colorificio"]
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',

    -- Geolocalizzazione
    lat DECIMAL(10, 8) DEFAULT NULL,
    lng DECIMAL(11, 8) DEFAULT NULL,
    indirizzo TEXT DEFAULT NULL,

    -- Contatti
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    sito_web VARCHAR(255) DEFAULT NULL,

    -- Dati extra flessibili (JSON)
    dati_extra JSON DEFAULT NULL,
    /*
        Esempi dati_extra per tipo:
        - persona: { "codice_fiscale": "...", "data_nascita": "..." }
        - impresa: { "partita_iva": "...", "ragione_sociale": "...", "fatturato_annuo": 150000 }
        - luogo/cantiere: { "data_inizio": "...", "data_fine": "...", "importo_lavori": 50000 }
    */

    -- Audit
    creato_da CHAR(36) DEFAULT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_visibilita (visibilita),
    INDEX idx_nome (nome),
    INDEX idx_geo (lat, lng),
    FULLTEXT idx_ricerca (nome, indirizzo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SINAPSI (Connessioni tra neuroni)
-- =====================================================
CREATE TABLE sinapsi (
    id CHAR(36) PRIMARY KEY,
    neurone_da CHAR(36) NOT NULL,
    neurone_a CHAR(36) NOT NULL,
    tipo_connessione VARCHAR(100) NOT NULL,
    /*
        Tipi connessione:
        - Cantiere: progetta, dirige_lavori, costruisce, subappalta, fornisce,
                    applica_pittura, applica_cartongesso, commissiona, segnala...
        - Persona-Impresa: lavora_per, titolare_di, collabora_con, dipendente_di
        - Commerciale: compra_da, vende_a, consiglia, rappresenta, visita
        - Personale: conosce, segnalato_da, parente_di, amico_di
    */

    -- Periodo validità (per slider temporale)
    data_inizio DATE NOT NULL,
    data_fine DATE DEFAULT NULL,  -- NULL = ancora attiva

    -- Valore (per spessore linea)
    valore DECIMAL(12, 2) DEFAULT NULL,  -- Es: importo fatturato, valore fornitura

    -- Certezza
    certezza ENUM('certo', 'probabile', 'ipotesi') DEFAULT 'certo',

    -- Visibilità
    livello ENUM('aziendale', 'personale') DEFAULT 'aziendale',

    -- Note sulla connessione
    note TEXT DEFAULT NULL,

    -- Audit
    creato_da CHAR(36) DEFAULT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (neurone_da) REFERENCES neuroni(id) ON DELETE CASCADE,
    FOREIGN KEY (neurone_a) REFERENCES neuroni(id) ON DELETE CASCADE,

    INDEX idx_neurone_da (neurone_da),
    INDEX idx_neurone_a (neurone_a),
    INDEX idx_tipo_conn (tipo_connessione),
    INDEX idx_periodo (data_inizio, data_fine),
    INDEX idx_livello (livello),
    INDEX idx_certezza (certezza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NOTE PERSONALI (sempre protette da PIN)
-- =====================================================
CREATE TABLE note_personali (
    id CHAR(36) PRIMARY KEY,
    utente_id CHAR(36) NOT NULL,
    neurone_id CHAR(36) NOT NULL,
    testo TEXT NOT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    FOREIGN KEY (neurone_id) REFERENCES neuroni(id) ON DELETE CASCADE,

    INDEX idx_utente (utente_id),
    INDEX idx_neurone (neurone_id),
    UNIQUE idx_utente_neurone (utente_id, neurone_id)  -- Una nota per neurone per utente
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DATI INIZIALI - Utente admin
-- =====================================================
-- Password: admin123 (da cambiare!)
-- Hash generato con: password_hash('admin123', PASSWORD_DEFAULT)
INSERT INTO utenti (id, email, password_hash, nome, ruolo) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@gruppogea.net',
    '$2y$10$YourHashHere',  -- Placeholder - va rigenerato
    'Amministratore',
    'admin'
);
