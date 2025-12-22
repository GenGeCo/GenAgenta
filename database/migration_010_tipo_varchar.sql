-- =====================================================
-- GenAgenTa - Migration 010: Tipo neurone VARCHAR
-- =====================================================
-- Il campo 'tipo' era un ENUM('persona', 'impresa', 'luogo')
-- ma ora i tipi sono configurabili e possono avere nomi diversi.
-- Cambiamo da ENUM a VARCHAR per supportare nomi personalizzati.

-- Prima rimuovi il constraint ENUM cambiando a VARCHAR
ALTER TABLE neuroni
    MODIFY COLUMN tipo VARCHAR(100) NOT NULL;

-- Nota: i dati esistenti con valori 'persona', 'impresa', 'luogo'
-- restano validi e compatibili.
