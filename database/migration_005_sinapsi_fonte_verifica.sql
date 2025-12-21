-- Migration 005: Aggiungi fonte e data_verifica alle sinapsi
-- Per tracciare l'origine dell'informazione e quando è stata verificata

-- Aggiungi colonna fonte (es: "visto sul cantiere", "me l'ha detto Mario")
ALTER TABLE sinapsi ADD COLUMN fonte VARCHAR(255) DEFAULT NULL AFTER certezza;

-- Aggiungi colonna data_verifica (quando l'ipotesi è stata confermata)
ALTER TABLE sinapsi ADD COLUMN data_verifica DATE DEFAULT NULL AFTER fonte;

-- Indice per query su data verifica
CREATE INDEX idx_data_verifica ON sinapsi(data_verifica);
