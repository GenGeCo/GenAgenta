-- =====================================================
-- GenAgenTa - Migration 012: Tipi Connessione Semplificati
-- =====================================================
-- Semplifica i tipi di connessione a 6 categorie base:
-- - commerciale: rapporto di compravendita
-- - consulenza: relazione professionale/consulenza
-- - collaborazione: lavorano insieme
-- - conosce: conoscenza personale
-- - lavora_per: dipendente/collaboratore
-- - parente: relazione familiare
--
-- Le transazioni economiche (chi compra/vende cosa) vanno
-- nel tab Transazioni, non nelle connessioni.
-- =====================================================

-- STEP 1: Mapping tipi vecchi -> nuovi nelle sinapsi esistenti
-- Converte i tipi specifici in tipi generici

-- Tipi che diventano "commerciale"
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"fornisce"', '"commerciale"') WHERE tipo_connessione LIKE '%"fornisce"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"compra_da"', '"commerciale"') WHERE tipo_connessione LIKE '%"compra_da"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"vende_a"', '"commerciale"') WHERE tipo_connessione LIKE '%"vende_a"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"cliente"', '"commerciale"') WHERE tipo_connessione LIKE '%"cliente"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"fornitore"', '"commerciale"') WHERE tipo_connessione LIKE '%"fornitore"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"subappalta"', '"commerciale"') WHERE tipo_connessione LIKE '%"subappalta"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"subappalta_a"', '"commerciale"') WHERE tipo_connessione LIKE '%"subappalta_a"%';

-- Tipi che diventano "collaborazione"
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"collabora_con"', '"collaborazione"') WHERE tipo_connessione LIKE '%"collabora_con"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"partner"', '"collaborazione"') WHERE tipo_connessione LIKE '%"partner"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"costruisce"', '"collaborazione"') WHERE tipo_connessione LIKE '%"costruisce"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"progetta"', '"collaborazione"') WHERE tipo_connessione LIKE '%"progetta"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"dirige_lavori"', '"collaborazione"') WHERE tipo_connessione LIKE '%"dirige_lavori"%';

-- Tipi che diventano "lavora_per"
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"dipendente_di"', '"lavora_per"') WHERE tipo_connessione LIKE '%"dipendente_di"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"titolare_di"', '"lavora_per"') WHERE tipo_connessione LIKE '%"titolare_di"%';

-- Tipi che diventano "conosce"
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"segnalato_da"', '"conosce"') WHERE tipo_connessione LIKE '%"segnalato_da"%';
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"amico_di"', '"conosce"') WHERE tipo_connessione LIKE '%"amico_di"%';

-- Tipi che diventano "parente"
UPDATE sinapsi SET tipo_connessione = REPLACE(tipo_connessione, '"parente_di"', '"parente"') WHERE tipo_connessione LIKE '%"parente_di"%';

-- STEP 2: Elimina duplicati (se una sinapsi ha ["commerciale","commerciale"])
-- Questo richiede una procedura più complessa, lo facciamo via PHP se necessario

-- STEP 3: Elimina tipi vecchi dalla tabella tipi_sinapsi
DELETE FROM tipi_sinapsi WHERE nome IN (
    'fornisce', 'compra_da', 'vende_a', 'cliente', 'fornitore',
    'subappalta', 'subappalta_a', 'collabora_con', 'partner',
    'costruisce', 'progetta', 'dirige_lavori', 'dipendente_di',
    'titolare_di', 'segnalato_da', 'amico_di', 'parente_di'
);

-- STEP 4: Inserisci i 6 tipi base per ogni azienda che non li ha già
-- (usa INSERT IGNORE per evitare duplicati)

-- Per ogni azienda esistente, inserisce i tipi base se non esistono
INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'commerciale', '#3b82f6', 'aziendale', a.id, NULL, 1
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'commerciale'
);

INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'consulenza', '#8b5cf6', 'aziendale', a.id, NULL, 2
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'consulenza'
);

INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'collaborazione', '#10b981', 'aziendale', a.id, NULL, 3
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'collaborazione'
);

INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'conosce', '#f59e0b', 'aziendale', a.id, NULL, 4
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'conosce'
);

INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'lavora_per', '#6366f1', 'aziendale', a.id, NULL, 5
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'lavora_per'
);

INSERT IGNORE INTO tipi_sinapsi (id, nome, colore, visibilita, azienda_id, creato_da, ordine)
SELECT
    UUID(), 'parente', '#ec4899', 'aziendale', a.id, NULL, 6
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_sinapsi ts
    WHERE ts.azienda_id = a.id AND ts.nome = 'parente'
);

-- STEP 5: Aggiorna anche le sinapsi che hanno ancora tipi non mappati
-- a "commerciale" come fallback
UPDATE sinapsi
SET tipo_connessione = '["commerciale"]'
WHERE tipo_connessione NOT LIKE '%"commerciale"%'
  AND tipo_connessione NOT LIKE '%"consulenza"%'
  AND tipo_connessione NOT LIKE '%"collaborazione"%'
  AND tipo_connessione NOT LIKE '%"conosce"%'
  AND tipo_connessione NOT LIKE '%"lavora_per"%'
  AND tipo_connessione NOT LIKE '%"parente"%'
  AND tipo_connessione IS NOT NULL
  AND tipo_connessione != ''
  AND tipo_connessione != '[]';

-- =====================================================
-- NOTA: Eseguire questa migration sul database MySQL
-- I 6 tipi base sono:
-- 1. commerciale (blu) - rapporto di compravendita
-- 2. consulenza (viola) - relazione professionale
-- 3. collaborazione (verde) - lavorano insieme
-- 4. conosce (arancione) - conoscenza personale
-- 5. lavora_per (indaco) - dipendente/collaboratore
-- 6. parente (rosa) - relazione familiare
-- =====================================================
