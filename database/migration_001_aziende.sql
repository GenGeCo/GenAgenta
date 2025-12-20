-- =====================================================
-- GenAgenTa - Migration 001: Sistema Multi-Azienda
-- Aggiunge supporto per aziende e pairing colleghi
-- =====================================================

-- =====================================================
-- NUOVA TABELLA: AZIENDE
-- =====================================================
CREATE TABLE IF NOT EXISTS aziende (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,

    -- Codice per pairing colleghi (tipo Bluetooth)
    -- Es: "GEA-7X4K2M" - unico per azienda
    codice_pairing CHAR(10) UNIQUE NOT NULL,

    -- Limiti piano
    piano ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    max_utenti INT DEFAULT 3,  -- free = 3, pro = 10, enterprise = illimitato

    -- Stato
    attiva TINYINT(1) DEFAULT 1,

    -- Audit
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_codice (codice_pairing),
    INDEX idx_attiva (attiva)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- MODIFICA TABELLA: UTENTI
-- Aggiunge collegamento ad azienda
-- =====================================================
ALTER TABLE utenti
    ADD COLUMN azienda_id CHAR(36) DEFAULT NULL AFTER id,
    ADD COLUMN ruolo_azienda ENUM('admin', 'membro') DEFAULT 'membro' AFTER ruolo,
    ADD FOREIGN KEY fk_utente_azienda (azienda_id) REFERENCES aziende(id) ON DELETE SET NULL,
    ADD INDEX idx_azienda (azienda_id);


-- =====================================================
-- MODIFICA TABELLA: NEURONI
-- Aggiunge appartenenza ad azienda
-- =====================================================
ALTER TABLE neuroni
    ADD COLUMN azienda_id CHAR(36) DEFAULT NULL AFTER id,
    ADD FOREIGN KEY fk_neurone_azienda (azienda_id) REFERENCES aziende(id) ON DELETE CASCADE,
    ADD INDEX idx_neurone_azienda (azienda_id);


-- =====================================================
-- MODIFICA TABELLA: SINAPSI
-- Aggiunge appartenenza ad azienda
-- =====================================================
ALTER TABLE sinapsi
    ADD COLUMN azienda_id CHAR(36) DEFAULT NULL AFTER id,
    ADD FOREIGN KEY fk_sinapsi_azienda (azienda_id) REFERENCES aziende(id) ON DELETE CASCADE,
    ADD INDEX idx_sinapsi_azienda (azienda_id);


-- =====================================================
-- TABELLA: INVITI (per pairing in corso)
-- =====================================================
CREATE TABLE IF NOT EXISTS inviti_pairing (
    id CHAR(36) PRIMARY KEY,
    azienda_id CHAR(36) NOT NULL,

    -- Chi ha creato l'invito
    invitato_da CHAR(36) NOT NULL,

    -- Email del collega da invitare
    email_invitato VARCHAR(255) NOT NULL,

    -- Codice temporaneo 6 cifre (tipo Bluetooth)
    codice_temp CHAR(6) NOT NULL,

    -- Scadenza (24 ore)
    scade_il TIMESTAMP NOT NULL,

    -- Stato
    stato ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',

    -- Audit
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (azienda_id) REFERENCES aziende(id) ON DELETE CASCADE,
    FOREIGN KEY (invitato_da) REFERENCES utenti(id) ON DELETE CASCADE,

    INDEX idx_email (email_invitato),
    INDEX idx_codice (codice_temp),
    INDEX idx_stato (stato),
    INDEX idx_scadenza (scade_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- DATI INIZIALI: Azienda di default per admin esistente
-- =====================================================

-- Crea azienda Gruppo GEA
INSERT INTO aziende (id, nome, codice_pairing, piano, max_utenti) VALUES (
    'az-00000000-0000-0000-000000000001',
    'Gruppo GEA',
    'GEA-ADMIN1',
    'pro',
    10
);

-- Collega admin esistente all'azienda
UPDATE utenti
SET azienda_id = 'az-00000000-0000-0000-000000000001',
    ruolo_azienda = 'admin'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Assegna neuroni e sinapsi esistenti all'azienda
UPDATE neuroni
SET azienda_id = 'az-00000000-0000-0000-000000000001'
WHERE visibilita = 'aziendale';

UPDATE sinapsi
SET azienda_id = 'az-00000000-0000-0000-000000000001'
WHERE livello = 'aziendale';


-- =====================================================
-- NOTE SULLA MIGRATION
-- =====================================================
/*
COME FUNZIONA IL PAIRING (tipo Bluetooth):

1. METODO CODICE AZIENDA (semplice):
   - Ogni azienda ha un codice fisso (es: "GEA-ADMIN1")
   - Il collega si registra e inserisce il codice
   - Viene aggiunto automaticamente all'azienda

2. METODO INVITO PERSONALE (più sicuro):
   - Admin va in Impostazioni > Invita Collega
   - Inserisce email del collega
   - Sistema genera codice 6 cifre (es: "847291")
   - Collega riceve email/messaggio con codice
   - Collega si registra e inserisce codice
   - Codice scade dopo 24 ore

LOGICA ACCESSO DATI:
   - Dati "aziendali": visibili a tutti gli utenti con stesso azienda_id
   - Dati "personali": visibili SOLO al creatore (creato_da)

PROSSIMI STEP:
   1. Aggiornare API per filtrare per azienda_id
   2. Creare API /auth/register con supporto codice
   3. Creare API /inviti per gestire pairing
   4. Aggiungere UI per inviti nel frontend
*/
