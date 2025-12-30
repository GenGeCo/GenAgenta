-- Migration 015: Aggiunge session_token per gestione sessione singola
-- Quando un utente fa login da un nuovo dispositivo, il vecchio viene disconnesso

ALTER TABLE utenti ADD COLUMN session_token VARCHAR(64) NULL;

-- Indice per query veloci durante verifica auth
CREATE INDEX idx_utenti_session_token ON utenti(session_token);
