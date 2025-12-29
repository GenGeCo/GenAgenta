-- Migration 014: Aggiunge colonna colore a famiglie_prodotto
-- Permette di impostare un colore per ogni famiglia prodotto
-- per visualizzare parabole affiancate con colori diversi sulla mappa

ALTER TABLE famiglie_prodotto ADD COLUMN IF NOT EXISTS colore VARCHAR(7) DEFAULT NULL;

-- Commento: il colore è in formato esadecimale (#RRGGBB)
