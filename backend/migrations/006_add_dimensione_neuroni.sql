-- Migration 006: Aggiunge colonna dimensione ai neuroni
-- Eseguire su MySQL

ALTER TABLE neuroni
ADD COLUMN dimensione DECIMAL(10,2) NULL DEFAULT NULL
COMMENT 'Dimensione base in metri per visualizzazione 3D sulla mappa'
AFTER dati_extra;
