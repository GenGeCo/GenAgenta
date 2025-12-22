-- =====================================================
-- GenAgenTa - Schema Database v2
-- Riscrittura pulita con terminologia corretta
-- =====================================================

-- =====================================================
-- UTENTI
-- =====================================================
CREATE TABLE utenti (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) DEFAULT NULL,
    nome VARCHAR(255) NOT NULL,
    foto_url VARCHAR(500) DEFAULT NULL,
    ruolo ENUM('admin', 'utente') DEFAULT 'utente',
    attivo TINYINT(1) DEFAULT 1,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TEAM (ex aziende)
-- =====================================================
CREATE TABLE team (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codice_invito VARCHAR(20) NOT NULL UNIQUE,
    piano ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    max_utenti INT DEFAULT 3,
    attivo TINYINT(1) DEFAULT 1,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_codice (codice_invito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MEMBRI TEAM
-- =====================================================
CREATE TABLE team_membri (
    team_id CHAR(36) NOT NULL,
    utente_id CHAR(36) NOT NULL,
    ruolo ENUM('responsabile', 'membro') DEFAULT 'membro',
    data_ingresso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (team_id, utente_id),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIPI ENTITA (Cantiere, Tecnico, Rivendita...)
-- Definisce forma 3D
-- =====================================================
CREATE TABLE tipi (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    forma ENUM('cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'esagono') NOT NULL DEFAULT 'cerchio',
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    INDEX idx_team (team_id),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIPOLOGIE (Villa, Palazzina, Architetto...)
-- Sottocategorie con colore, legate a un tipo
-- =====================================================
CREATE TABLE tipologie (
    id CHAR(36) PRIMARY KEY,
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    colore CHAR(7) NOT NULL DEFAULT '#3b82f6',
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tipo_id) REFERENCES tipi(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo_id),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ENTITA (ex neuroni)
-- Elementi sulla mappa: cantieri, persone, rivendite...
-- =====================================================
CREATE TABLE entita (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    creato_da CHAR(36) NOT NULL,

    -- Classificazione
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(255) NOT NULL,

    -- Posizione
    lat DECIMAL(10, 8) DEFAULT NULL,
    lng DECIMAL(11, 8) DEFAULT NULL,
    indirizzo TEXT DEFAULT NULL,

    -- Contatti
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    sito_web VARCHAR(255) DEFAULT NULL,

    -- Valore (per altezza 3D)
    valore DECIMAL(12, 2) DEFAULT NULL,
    valore_tipo ENUM('totale', 'annuo') DEFAULT 'totale',

    -- Date
    data_inizio DATE DEFAULT NULL,
    data_fine DATE DEFAULT NULL,

    -- Visibilita
    visibilita ENUM('condiviso', 'privato') DEFAULT 'condiviso',

    -- Timestamp
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (creato_da) REFERENCES utenti(id),
    FOREIGN KEY (tipo_id) REFERENCES tipi(id),

    INDEX idx_team (team_id),
    INDEX idx_tipo (tipo_id),
    INDEX idx_geo (lat, lng),
    INDEX idx_visibilita (visibilita),
    FULLTEXT idx_ricerca (nome, indirizzo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ENTITA_TIPOLOGIE (N:N - un'entità può avere più tipologie)
-- Es: Rivendita che vende Pitture + Cartongesso
-- =====================================================
CREATE TABLE entita_tipologie (
    entita_id CHAR(36) NOT NULL,
    tipologia_id CHAR(36) NOT NULL,

    PRIMARY KEY (entita_id, tipologia_id),
    FOREIGN KEY (entita_id) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (tipologia_id) REFERENCES tipologie(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CAMPI PERSONALIZZATI per tipo entità
-- Es: Cantiere ha "progettista", "direttore_lavori"
-- =====================================================
CREATE TABLE campi_tipo (
    id CHAR(36) PRIMARY KEY,
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    etichetta VARCHAR(100) NOT NULL,
    tipo_dato ENUM('testo', 'numero', 'data', 'email', 'telefono', 'url', 'select') NOT NULL DEFAULT 'testo',
    opzioni JSON DEFAULT NULL,  -- Per tipo 'select': ["opzione1", "opzione2"]
    obbligatorio TINYINT(1) DEFAULT 0,
    ordine INT DEFAULT 0,

    FOREIGN KEY (tipo_id) REFERENCES tipi(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo_id),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VALORI CAMPI PERSONALIZZATI
-- =====================================================
CREATE TABLE entita_campi (
    entita_id CHAR(36) NOT NULL,
    campo_id CHAR(36) NOT NULL,
    valore TEXT,

    PRIMARY KEY (entita_id, campo_id),
    FOREIGN KEY (entita_id) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (campo_id) REFERENCES campi_tipo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIPI CONNESSIONE (compra_da, lavora_per, fornisce...)
-- =====================================================
CREATE TABLE tipi_connessione (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    colore CHAR(7) NOT NULL DEFAULT '#64748b',
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    INDEX idx_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CONNESSIONI (ex sinapsi)
-- Legami tra entità
-- =====================================================
CREATE TABLE connessioni (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    creato_da CHAR(36) NOT NULL,

    -- Entità collegate
    entita_da CHAR(36) NOT NULL,
    entita_a CHAR(36) NOT NULL,

    -- Tipo e certezza
    tipo_id CHAR(36) NOT NULL,
    certezza ENUM('confermato', 'probabile', 'da_verificare') DEFAULT 'confermato',

    -- Periodo
    data_inizio DATE NOT NULL,
    data_fine DATE DEFAULT NULL,

    -- Valore (per spessore linea)
    valore DECIMAL(12, 2) DEFAULT NULL,

    -- Fonte e verifica
    fonte VARCHAR(255) DEFAULT NULL,
    data_verifica DATE DEFAULT NULL,

    -- Note
    note TEXT DEFAULT NULL,

    -- Visibilita
    visibilita ENUM('condiviso', 'privato') DEFAULT 'condiviso',

    -- Timestamp
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (creato_da) REFERENCES utenti(id),
    FOREIGN KEY (entita_da) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (entita_a) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_id) REFERENCES tipi_connessione(id),

    INDEX idx_team (team_id),
    INDEX idx_entita_da (entita_da),
    INDEX idx_entita_a (entita_a),
    INDEX idx_periodo (data_inizio, data_fine),
    INDEX idx_certezza (certezza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NOTE PRIVATE (richiedono PIN)
-- =====================================================
CREATE TABLE note_private (
    id CHAR(36) PRIMARY KEY,
    utente_id CHAR(36) NOT NULL,
    entita_id CHAR(36) NOT NULL,
    testo TEXT NOT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    FOREIGN KEY (entita_id) REFERENCES entita(id) ON DELETE CASCADE,

    UNIQUE idx_utente_entita (utente_id, entita_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INVITI TEAM
-- =====================================================
CREATE TABLE inviti (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invitato_da CHAR(36) NOT NULL,
    stato ENUM('pendente', 'accettato', 'rifiutato') DEFAULT 'pendente',
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_scadenza TIMESTAMP DEFAULT NULL,

    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (invitato_da) REFERENCES utenti(id),

    INDEX idx_email (email),
    INDEX idx_stato (stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
