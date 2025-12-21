-- Migration 008: Collegamento prodotti alle sinapsi
-- Permette di specificare quale prodotto è coinvolto in una relazione
-- Es: "Impresa X ha comprato [Idropittura ABC] per Cantiere Y"

-- Aggiunge riferimento a famiglia prodotto
ALTER TABLE sinapsi
ADD COLUMN famiglia_prodotto_id CHAR(36) DEFAULT NULL AFTER tipo_connessione;

-- Foreign key (opzionale, commenta se dà problemi)
ALTER TABLE sinapsi
ADD CONSTRAINT fk_sinapsi_prodotto
FOREIGN KEY (famiglia_prodotto_id) REFERENCES famiglie_prodotto(id) ON DELETE SET NULL;

-- Indice per ricerche per prodotto
CREATE INDEX idx_sinapsi_prodotto ON sinapsi(famiglia_prodotto_id);
