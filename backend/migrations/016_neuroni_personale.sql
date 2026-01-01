-- Migration 016: Aggiunge colonna 'personale' a neuroni
-- Se personale=1, l'entità è visibile solo al creatore (con PIN)
-- Se personale=0 (default), l'entità è visibile a tutta l'azienda

ALTER TABLE neuroni ADD COLUMN personale TINYINT(1) DEFAULT 0;

-- Indice per filtrare velocemente i dati personali
CREATE INDEX idx_neuroni_personale ON neuroni(personale);
