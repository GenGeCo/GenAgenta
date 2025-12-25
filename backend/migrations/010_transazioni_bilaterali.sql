-- Migration 010: Transazioni bilaterali (acquisto/vendita speculari)
-- Eseguire su MySQL

-- Aggiungi colonne per collegare vendite tra entità
ALTER TABLE vendite_prodotto
ADD COLUMN sinapsi_id VARCHAR(36) NULL COMMENT 'Connessione associata alla transazione',
ADD COLUMN controparte_id VARCHAR(36) NULL COMMENT 'Neurone controparte (venditore se acquisto, compratore se vendita)',
ADD COLUMN controparte_vendita_id VARCHAR(36) NULL COMMENT 'Record vendita speculare sulla controparte',
ADD COLUMN tipo_transazione ENUM('acquisto', 'vendita') DEFAULT 'vendita' COMMENT 'Tipo: acquisto (compro) o vendita (vendo)';

-- Indici per le nuove colonne
ALTER TABLE vendite_prodotto
ADD INDEX idx_sinapsi (sinapsi_id),
ADD INDEX idx_controparte (controparte_id),
ADD INDEX idx_controparte_vendita (controparte_vendita_id),
ADD INDEX idx_tipo_transazione (tipo_transazione);

-- Foreign keys (opzionali - commenta se non vuoi vincoli stretti)
-- ALTER TABLE vendite_prodotto ADD FOREIGN KEY (sinapsi_id) REFERENCES sinapsi(id) ON DELETE SET NULL;
-- ALTER TABLE vendite_prodotto ADD FOREIGN KEY (controparte_id) REFERENCES neuroni(id) ON DELETE SET NULL;
-- ALTER TABLE vendite_prodotto ADD FOREIGN KEY (controparte_vendita_id) REFERENCES vendite_prodotto(id) ON DELETE SET NULL;
