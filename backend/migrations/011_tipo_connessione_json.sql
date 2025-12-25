-- Migration 011: Converti tipo_connessione da stringa singola a JSON array
-- Eseguire su MySQL

-- Aggiorna i record esistenti: converti stringhe singole in JSON array
-- Es: "commerciale" diventa '["commerciale"]'
UPDATE sinapsi
SET tipo_connessione = CONCAT('["', tipo_connessione, '"]')
WHERE tipo_connessione IS NOT NULL
  AND tipo_connessione != ''
  AND tipo_connessione NOT LIKE '[%';

-- Nota: i nuovi record saranno già salvati come JSON array dal backend
-- Il backend gestisce anche la retrocompatibilità in lettura
