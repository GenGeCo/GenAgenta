-- Migration 013: Aggiunge campi soggettivi alle sinapsi
-- I dati oggettivi (volume, transazioni) si calcolano via JOIN con vendite
-- I dati soggettivi sono valutazioni qualitative inserite dall'utente

-- Campi soggettivi (1-5 stelle)
ALTER TABLE sinapsi ADD COLUMN influenza TINYINT NULL COMMENT 'Livello influenza 1-5';
ALTER TABLE sinapsi ADD COLUMN qualita_relazione TINYINT NULL COMMENT 'Qualità rapporto 1-5';
ALTER TABLE sinapsi ADD COLUMN importanza_strategica TINYINT NULL COMMENT 'Importanza strategica 1-5';
ALTER TABLE sinapsi ADD COLUMN affidabilita TINYINT NULL COMMENT 'Affidabilità pagamenti/impegni 1-5';
ALTER TABLE sinapsi ADD COLUMN potenziale TINYINT NULL COMMENT 'Potenziale crescita 1-5';
ALTER TABLE sinapsi ADD COLUMN note_relazione TEXT NULL COMMENT 'Note libere sulla relazione';

-- Flag direzionale sui tipi di connessione
ALTER TABLE tipi_sinapsi ADD COLUMN direzionale BOOLEAN DEFAULT FALSE COMMENT 'Se true, la direzione A->B ha significato';

-- Imposta direzionale=true per tipi asimmetrici
UPDATE tipi_sinapsi SET direzionale = TRUE WHERE nome IN ('influencer', 'fornitore', 'cliente', 'tecnico', 'prescrittore');
UPDATE tipi_sinapsi SET direzionale = FALSE WHERE nome IN ('commerciale', 'partner', 'collaborazione', 'conoscenza');
