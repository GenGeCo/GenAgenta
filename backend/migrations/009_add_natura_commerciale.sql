-- =====================================================
-- GenAgenTa - Migration 009: Natura Commerciale
-- Aggiunge flag per classificare la natura commerciale
-- delle entità (Acquirente, Venditore, Intermediario, Influencer)
-- =====================================================

-- =====================================================
-- TIPI NEURONE (v1): Default per tipo
-- =====================================================
ALTER TABLE tipi_neurone
    ADD COLUMN is_acquirente BOOLEAN DEFAULT FALSE COMMENT 'Compra prodotti/servizi',
    ADD COLUMN is_venditore BOOLEAN DEFAULT FALSE COMMENT 'Vende prodotti/servizi',
    ADD COLUMN is_intermediario BOOLEAN DEFAULT FALSE COMMENT 'Compra e rivende',
    ADD COLUMN is_influencer BOOLEAN DEFAULT FALSE COMMENT 'Prescrive/influenza acquisti';

-- =====================================================
-- TIPI (v2): Default per tipo
-- =====================================================
ALTER TABLE tipi
    ADD COLUMN is_acquirente BOOLEAN DEFAULT FALSE COMMENT 'Compra prodotti/servizi',
    ADD COLUMN is_venditore BOOLEAN DEFAULT FALSE COMMENT 'Vende prodotti/servizi',
    ADD COLUMN is_intermediario BOOLEAN DEFAULT FALSE COMMENT 'Compra e rivende',
    ADD COLUMN is_influencer BOOLEAN DEFAULT FALSE COMMENT 'Prescrive/influenza acquisti';

-- =====================================================
-- NEURONI (v1): Override per singola entità (nullable = eredita)
-- =====================================================
ALTER TABLE neuroni
    ADD COLUMN is_acquirente BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_venditore BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_intermediario BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_influencer BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo';

-- =====================================================
-- ENTITA (v2): Override per singola entità (nullable = eredita)
-- =====================================================
ALTER TABLE entita
    ADD COLUMN is_acquirente BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_venditore BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_intermediario BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo',
    ADD COLUMN is_influencer BOOLEAN DEFAULT NULL COMMENT 'NULL = eredita da tipo';

-- =====================================================
-- INDICI per query veloci
-- =====================================================
ALTER TABLE tipi_neurone
    ADD INDEX idx_natura (is_acquirente, is_venditore, is_intermediario, is_influencer);

ALTER TABLE tipi
    ADD INDEX idx_natura (is_acquirente, is_venditore, is_intermediario, is_influencer);

ALTER TABLE neuroni
    ADD INDEX idx_natura (is_acquirente, is_venditore, is_intermediario, is_influencer);

ALTER TABLE entita
    ADD INDEX idx_natura (is_acquirente, is_venditore, is_intermediario, is_influencer);
