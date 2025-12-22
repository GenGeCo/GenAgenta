-- =====================================================
-- GenAgenTa - Migrazione da Schema v1 a v2
-- =====================================================
-- ATTENZIONE: Eseguire su database di produzione con backup!
--
-- Questo script:
-- 1. Crea le nuove tabelle v2
-- 2. Migra i dati da v1 a v2
-- 3. NON elimina le vecchie tabelle (per sicurezza)
-- =====================================================

-- =====================================================
-- STEP 1: Crea tabella team (ex aziende)
-- =====================================================
CREATE TABLE IF NOT EXISTS team (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codice_invito VARCHAR(20) NOT NULL UNIQUE,
    piano ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    max_utenti INT DEFAULT 3,
    attivo TINYINT(1) DEFAULT 1,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_codice (codice_invito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra dati da aziende a team
INSERT IGNORE INTO team (id, nome, codice_invito, piano, max_utenti, attivo, data_creazione)
SELECT id, nome, codice_pairing, piano, max_utenti, attiva, data_creazione
FROM aziende;

-- =====================================================
-- STEP 2: Crea tabella team_membri
-- =====================================================
CREATE TABLE IF NOT EXISTS team_membri (
    team_id CHAR(36) NOT NULL,
    utente_id CHAR(36) NOT NULL,
    ruolo ENUM('responsabile', 'membro') DEFAULT 'membro',
    data_ingresso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, utente_id),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra membri dalle colonne utenti.azienda_id e ruolo_azienda
INSERT IGNORE INTO team_membri (team_id, utente_id, ruolo)
SELECT azienda_id, id,
       CASE ruolo_azienda WHEN 'admin' THEN 'responsabile' ELSE 'membro' END
FROM utenti
WHERE azienda_id IS NOT NULL;

-- =====================================================
-- STEP 3: Crea tabella tipi (nuova struttura)
-- =====================================================
CREATE TABLE IF NOT EXISTS tipi (
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

-- Migra tipi_neurone a tipi
INSERT IGNORE INTO tipi (id, team_id, nome, forma, ordine, data_creazione)
SELECT id, azienda_id, nome, forma, ordine, data_creazione
FROM tipi_neurone
WHERE azienda_id IS NOT NULL;

-- =====================================================
-- STEP 4: Crea tabella tipologie (ex categorie)
-- =====================================================
CREATE TABLE IF NOT EXISTS tipologie (
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

-- Migra categorie a tipologie
INSERT IGNORE INTO tipologie (id, tipo_id, nome, colore, ordine, data_creazione)
SELECT id, tipo_id, nome, colore, ordine, data_creazione
FROM categorie
WHERE tipo_id IN (SELECT id FROM tipi);

-- =====================================================
-- STEP 5: Crea tabella campi_tipo
-- =====================================================
CREATE TABLE IF NOT EXISTS campi_tipo (
    id CHAR(36) PRIMARY KEY,
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    etichetta VARCHAR(100) NOT NULL,
    tipo_dato ENUM('testo', 'numero', 'data', 'email', 'telefono', 'url', 'select') NOT NULL DEFAULT 'testo',
    opzioni JSON DEFAULT NULL,
    obbligatorio TINYINT(1) DEFAULT 0,
    ordine INT DEFAULT 0,
    FOREIGN KEY (tipo_id) REFERENCES tipi(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo_id),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STEP 6: Crea tabella entita (ex neuroni)
-- =====================================================
CREATE TABLE IF NOT EXISTS entita (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    creato_da CHAR(36) NOT NULL,
    tipo_id CHAR(36) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 8) DEFAULT NULL,
    lng DECIMAL(11, 8) DEFAULT NULL,
    indirizzo TEXT DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    sito_web VARCHAR(255) DEFAULT NULL,
    valore DECIMAL(12, 2) DEFAULT NULL,
    valore_tipo ENUM('totale', 'annuo') DEFAULT 'totale',
    data_inizio DATE DEFAULT NULL,
    data_fine DATE DEFAULT NULL,
    visibilita ENUM('condiviso', 'privato') DEFAULT 'condiviso',
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

-- Migra neuroni a entita (richiede lookup del tipo_id)
INSERT IGNORE INTO entita (
    id, team_id, creato_da, tipo_id, nome, lat, lng, indirizzo,
    telefono, email, sito_web, valore, valore_tipo, data_inizio, data_fine,
    visibilita, data_creazione, data_modifica
)
SELECT
    n.id,
    n.azienda_id,
    COALESCE(n.creato_da, (SELECT id FROM utenti LIMIT 1)),
    COALESCE(
        (SELECT t.id FROM tipi t WHERE t.nome = n.tipo AND t.team_id = n.azienda_id LIMIT 1),
        (SELECT t.id FROM tipi t WHERE t.team_id = n.azienda_id LIMIT 1)
    ),
    n.nome,
    n.lat,
    n.lng,
    n.indirizzo,
    n.telefono,
    n.email,
    n.sito_web,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(n.dati_extra, '$.importo_lavori')),
        JSON_UNQUOTE(JSON_EXTRACT(n.dati_extra, '$.fatturato_annuo'))
    ),
    CASE
        WHEN n.tipo = 'luogo' OR n.tipo LIKE '%cantiere%' THEN 'totale'
        ELSE 'annuo'
    END,
    STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(n.dati_extra, '$.data_inizio')), '%Y-%m-%d'),
    STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(n.dati_extra, '$.data_fine')), '%Y-%m-%d'),
    CASE n.visibilita WHEN 'personale' THEN 'privato' ELSE 'condiviso' END,
    n.data_creazione,
    n.data_modifica
FROM neuroni n
WHERE n.azienda_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM tipi t WHERE t.team_id = n.azienda_id);

-- =====================================================
-- STEP 7: Crea tabella entita_tipologie (N:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS entita_tipologie (
    entita_id CHAR(36) NOT NULL,
    tipologia_id CHAR(36) NOT NULL,
    PRIMARY KEY (entita_id, tipologia_id),
    FOREIGN KEY (entita_id) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (tipologia_id) REFERENCES tipologie(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra da neuroni_categorie a entita_tipologie
INSERT IGNORE INTO entita_tipologie (entita_id, tipologia_id)
SELECT nc.neurone_id, nc.categoria_id
FROM neuroni_categorie nc
WHERE EXISTS (SELECT 1 FROM entita e WHERE e.id = nc.neurone_id)
  AND EXISTS (SELECT 1 FROM tipologie tp WHERE tp.id = nc.categoria_id);

-- =====================================================
-- STEP 8: Crea tabella entita_campi (valori)
-- =====================================================
CREATE TABLE IF NOT EXISTS entita_campi (
    entita_id CHAR(36) NOT NULL,
    campo_id CHAR(36) NOT NULL,
    valore TEXT,
    PRIMARY KEY (entita_id, campo_id),
    FOREIGN KEY (entita_id) REFERENCES entita(id) ON DELETE CASCADE,
    FOREIGN KEY (campo_id) REFERENCES campi_tipo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STEP 9: Crea tabella tipi_connessione
-- =====================================================
CREATE TABLE IF NOT EXISTS tipi_connessione (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    colore CHAR(7) NOT NULL DEFAULT '#64748b',
    ordine INT DEFAULT 0,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    INDEX idx_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra tipi_sinapsi a tipi_connessione
INSERT IGNORE INTO tipi_connessione (id, team_id, nome, colore, ordine, data_creazione)
SELECT id, azienda_id, nome, colore, ordine, data_creazione
FROM tipi_sinapsi
WHERE azienda_id IS NOT NULL;

-- =====================================================
-- STEP 10: Crea tabella connessioni (ex sinapsi)
-- =====================================================
CREATE TABLE IF NOT EXISTS connessioni (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    creato_da CHAR(36) NOT NULL,
    entita_da CHAR(36) NOT NULL,
    entita_a CHAR(36) NOT NULL,
    tipo_id CHAR(36) NOT NULL,
    certezza ENUM('confermato', 'probabile', 'da_verificare') DEFAULT 'confermato',
    data_inizio DATE NOT NULL,
    data_fine DATE DEFAULT NULL,
    valore DECIMAL(12, 2) DEFAULT NULL,
    fonte VARCHAR(255) DEFAULT NULL,
    data_verifica DATE DEFAULT NULL,
    note TEXT DEFAULT NULL,
    visibilita ENUM('condiviso', 'privato') DEFAULT 'condiviso',
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

-- Migra sinapsi a connessioni
INSERT IGNORE INTO connessioni (
    id, team_id, creato_da, entita_da, entita_a, tipo_id,
    certezza, data_inizio, data_fine, valore, fonte, data_verifica, note,
    visibilita, data_creazione, data_modifica
)
SELECT
    s.id,
    s.azienda_id,
    COALESCE(s.creato_da, (SELECT id FROM utenti LIMIT 1)),
    s.neurone_da,
    s.neurone_a,
    COALESCE(
        s.tipo_sinapsi_id,
        (SELECT tc.id FROM tipi_connessione tc WHERE tc.team_id = s.azienda_id LIMIT 1)
    ),
    CASE s.certezza
        WHEN 'certo' THEN 'confermato'
        WHEN 'probabile' THEN 'probabile'
        ELSE 'da_verificare'
    END,
    s.data_inizio,
    s.data_fine,
    s.valore,
    s.fonte,
    s.data_verifica,
    s.note,
    CASE s.livello WHEN 'personale' THEN 'privato' ELSE 'condiviso' END,
    s.data_creazione,
    s.data_modifica
FROM sinapsi s
WHERE s.azienda_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM entita e1 WHERE e1.id = s.neurone_da)
  AND EXISTS (SELECT 1 FROM entita e2 WHERE e2.id = s.neurone_a)
  AND EXISTS (SELECT 1 FROM tipi_connessione tc WHERE tc.team_id = s.azienda_id);

-- =====================================================
-- STEP 11: Crea tabella note_private (ex note_personali)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_private (
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

-- Migra note_personali a note_private
INSERT IGNORE INTO note_private (id, utente_id, entita_id, testo, data_creazione, data_modifica)
SELECT np.id, np.utente_id, np.neurone_id, np.testo, np.data_creazione, np.data_modifica
FROM note_personali np
WHERE EXISTS (SELECT 1 FROM entita e WHERE e.id = np.neurone_id);

-- =====================================================
-- STEP 12: Crea tabella inviti (aggiornata per v2)
-- =====================================================
-- La tabella inviti esiste già, non serve ricrearla

-- =====================================================
-- DONE!
-- =====================================================
-- Per verificare la migrazione:
-- SELECT 'team' as tabella, COUNT(*) as righe FROM team
-- UNION SELECT 'tipi', COUNT(*) FROM tipi
-- UNION SELECT 'tipologie', COUNT(*) FROM tipologie
-- UNION SELECT 'entita', COUNT(*) FROM entita
-- UNION SELECT 'connessioni', COUNT(*) FROM connessioni;
