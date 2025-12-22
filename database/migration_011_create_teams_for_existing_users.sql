-- =====================================================
-- Migrazione: Crea team per utenti esistenti
-- Eseguire una sola volta sul database di produzione
-- =====================================================

-- Per ogni azienda esistente, crea un team corrispondente
INSERT INTO team (id, nome, codice_invito, piano, max_utenti, attivo, data_creazione)
SELECT
    UUID() as id,
    a.nome,
    a.codice_pairing as codice_invito,
    a.piano,
    a.max_utenti,
    a.attiva as attivo,
    a.data_creazione
FROM aziende a
WHERE NOT EXISTS (
    SELECT 1 FROM team t WHERE t.codice_invito = a.codice_pairing
);

-- Per ogni utente, aggiungilo al team corrispondente
INSERT INTO team_membri (team_id, utente_id, ruolo, data_ingresso)
SELECT
    t.id as team_id,
    u.id as utente_id,
    CASE WHEN u.ruolo_azienda = 'admin' THEN 'responsabile' ELSE 'membro' END as ruolo,
    NOW() as data_ingresso
FROM utenti u
INNER JOIN aziende a ON u.azienda_id = a.id
INNER JOIN team t ON t.codice_invito = a.codice_pairing
WHERE NOT EXISTS (
    SELECT 1 FROM team_membri tm WHERE tm.utente_id = u.id AND tm.team_id = t.id
);

-- Verifica risultati
SELECT 'Team creati:' as info, COUNT(*) as count FROM team;
SELECT 'Membri team:' as info, COUNT(*) as count FROM team_membri;
