-- =====================================================
-- GenAgenTa - Migration 002: Foto Profilo
-- Aggiunge colonna per URL foto profilo utenti
-- =====================================================

ALTER TABLE utenti
    ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL AFTER nome;

-- NOTA: La foto può essere un URL esterno (es. Gravatar, URL cloud)
-- Per ora non gestiamo upload diretto di file
