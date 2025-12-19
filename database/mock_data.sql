-- =====================================================
-- GenAgenTa - Dati Mock per Test
-- Dati fittizi realistici per il settore edile
-- =====================================================
--
-- PER RESET COMPLETO: eseguire prima questo blocco
-- che svuota tutte le tabelle mantenendo la struttura
-- =====================================================

-- RESET: Svuota tutte le tabelle (in ordine corretto per foreign keys)
DELETE FROM note_personali;
DELETE FROM sinapsi;
DELETE FROM neuroni;
-- NON cancelliamo utenti per mantenere il login

-- =====================================================
-- NEURONI - IMPRESE
-- =====================================================

-- Colorifici / Rivendite
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('i001', 'Colorificio Rossi Srl', 'impresa', '["colorificio", "rivendita_materiali"]', 'aziendale',
 45.4642, 9.1900, 'Via Milano 45, Milano', '02-12345678', 'info@colorificiorossi.it',
 '{"partita_iva": "IT01234567890", "fatturato_annuo": 850000}'),

('i002', 'Edil Color SpA', 'impresa', '["colorificio", "rivendita_materiali"]', 'aziendale',
 45.4784, 9.2250, 'Via Padova 120, Milano', '02-87654321', 'vendite@edilcolor.it',
 '{"partita_iva": "IT09876543210", "fatturato_annuo": 1200000}'),

('i003', 'Ferramenta Bianchi', 'impresa', '["ferramenta", "rivendita_materiali"]', 'aziendale',
 45.4500, 9.1700, 'Corso Lodi 88, Milano', '02-55544433', 'info@ferramentabianchi.it',
 '{"partita_iva": "IT11223344556", "fatturato_annuo": 320000}');

-- Imprese Edili
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('i004', 'Costruzioni Verdi Srl', 'impresa', '["impresa_edile"]', 'aziendale',
 45.4800, 9.2100, 'Via Bergamo 22, Milano', '02-33322211', 'info@costruzioniverdi.it',
 '{"partita_iva": "IT22334455667", "fatturato_annuo": 2500000}'),

('i005', 'Edilizia Moderna Srl', 'impresa', '["impresa_edile"]', 'aziendale',
 45.4900, 9.1500, 'Via Torino 150, Milano', '02-99988877', 'commerciale@ediliziamoderna.it',
 '{"partita_iva": "IT33445566778", "fatturato_annuo": 1800000}');

-- Studi Tecnici
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('i006', 'Studio Tecnico Arch. Neri', 'impresa', '["studio_tecnico"]', 'aziendale',
 45.4700, 9.1850, 'Piazza Duomo 5, Milano', '02-11122233', 'studio@archneri.it',
 '{"partita_iva": "IT44556677889"}'),

('i007', 'Studio Ing. Marrone & Associati', 'impresa', '["studio_tecnico"]', 'aziendale',
 45.4650, 9.1950, 'Via Montenapoleone 10, Milano', '02-44455566', 'info@studiomarrone.it',
 '{"partita_iva": "IT55667788990"}');

-- Marche / Produttori
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('i008', 'Weber Saint-Gobain', 'impresa', '["marca", "produttore"]', 'aziendale',
 45.5200, 9.2100, 'Via Industriale 1, Segrate', '02-77788899', 'info@weber.it',
 '{"settore": "impermeabilizzanti, cappotti, malte"}'),

('i009', 'Mapei SpA', 'impresa', '["marca", "produttore"]', 'aziendale',
 45.5500, 9.3200, 'Via Cafiero 22, Milano', '02-66677788', 'info@mapei.it',
 '{"settore": "adesivi, impermeabilizzanti, prodotti per edilizia"}'),

('i010', 'San Marco Pitture', 'impresa', '["marca", "produttore"]', 'aziendale',
 45.6500, 11.5000, 'Via Vernice 100, Marcon VE', '041-1234567', 'info@sanmarco.it',
 '{"settore": "pitture, vernici, decorativi"}');

-- Amministrazioni Condomini
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('i011', 'Studio Amministrazioni Gialli', 'impresa', '["amministrazione_condomini"]', 'aziendale',
 45.4550, 9.1800, 'Corso Buenos Aires 50, Milano', '02-22233344', 'info@ammgialli.it',
 '{"condomini_gestiti": 45}');

-- =====================================================
-- NEURONI - PERSONE
-- =====================================================

-- Tecnici
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('p001', 'Arch. Marco Neri', 'persona', '["tecnico"]', 'aziendale',
 45.4700, 9.1850, 'Piazza Duomo 5, Milano', '335-1234567', 'marco.neri@archneri.it',
 '{"specializzazione": "ristrutturazioni"}'),

('p002', 'Ing. Laura Marrone', 'persona', '["tecnico"]', 'aziendale',
 45.4650, 9.1950, 'Via Montenapoleone 10, Milano', '338-7654321', 'l.marrone@studiomarrone.it',
 '{"specializzazione": "strutture"}'),

('p003', 'Geom. Paolo Grigi', 'persona', '["tecnico"]', 'aziendale',
 45.4600, 9.2000, 'Via Roma 30, Milano', '339-1112233', 'paolo.grigi@gmail.com',
 '{"specializzazione": "catasto, pratiche edilizie"}');

-- Imbianchini / Pittori
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('p004', 'Giovanni Pittore', 'persona', '["imbianchino"]', 'aziendale',
 45.4400, 9.2200, 'Via Lambrate 15, Milano', '340-5556677', 'giovanni.pittore@email.it',
 '{"anni_esperienza": 15, "specializzazione": "decorativi"}'),

('p005', 'Mario Colore', 'persona', '["imbianchino", "cartongessista"]', 'aziendale',
 45.4350, 9.1600, 'Via Lorenteggio 80, Milano', '347-8889900', 'mario.colore@email.it',
 '{"anni_esperienza": 20}'),

('p006', 'Luca Pennello', 'persona', '["imbianchino"]', 'aziendale',
 45.4250, 9.2300, 'Via Mecenate 50, Milano', '348-1231231', 'luca.pennello@email.it',
 '{"anni_esperienza": 8}');

-- Muratori / Edili
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('p007', 'Franco Muratore', 'persona', '["muratore"]', 'aziendale',
 45.4450, 9.2100, 'Via Rubattino 20, Milano', '342-4445566', NULL,
 '{"anni_esperienza": 25}'),

('p008', 'Roberto Muro', 'persona', '["muratore", "cartongessista"]', 'aziendale',
 45.4550, 9.1900, 'Via Washington 100, Milano', '345-7778899', NULL,
 '{"anni_esperienza": 12}');

-- Rappresentanti
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('p009', 'Andrea Agente', 'persona', '["rappresentante"]', 'aziendale',
 45.4800, 9.2000, 'Milano', '335-9990011', 'a.agente@weber.it',
 '{"zona": "Milano Nord", "marca": "Weber"}'),

('p010', 'Simone Vendita', 'persona', '["rappresentante"]', 'aziendale',
 45.4600, 9.1800, 'Milano', '336-2223344', 's.vendita@mapei.it',
 '{"zona": "Milano Centro-Sud", "marca": "Mapei"}'),

('p011', 'Carla Commerciale', 'persona', '["rappresentante"]', 'aziendale',
 45.4700, 9.2200, 'Milano', '337-5556677', 'c.commerciale@sanmarco.it',
 '{"zona": "Milano Est", "marca": "San Marco"}');

-- Amministratori
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, email, dati_extra) VALUES
('p012', 'Dott. Alberto Gialli', 'persona', '["amministratore_condominio"]', 'aziendale',
 45.4550, 9.1800, 'Corso Buenos Aires 50, Milano', '02-22233344', 'a.gialli@ammgialli.it',
 '{"condomini_seguiti": 45}');

-- Persone PERSONALI (fonti, contatti informali) - visibili solo con PIN
INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, dati_extra) VALUES
('p013', 'Maria Informatrice', 'persona', '["altro"]', 'personale',
 NULL, NULL, NULL, '333-0001111',
 '{"ruolo": "fonte informale"}'),

('p014', 'Giuseppe Segnalatore', 'persona', '["altro"]', 'personale',
 NULL, NULL, NULL, '333-0002222',
 '{"ruolo": "ex dipendente colorificio"}');

-- =====================================================
-- NEURONI - LUOGHI (Cantieri)
-- =====================================================

INSERT INTO neuroni (id, nome, tipo, categorie, visibilita, lat, lng, indirizzo, telefono, dati_extra) VALUES
('c001', 'Cantiere Via Roma 25', 'luogo', '["cantiere"]', 'aziendale',
 45.4650, 9.1900, 'Via Roma 25, Milano', NULL,
 '{"data_inizio": "2024-03-01", "data_fine": "2024-09-30", "importo_lavori": 180000, "tipo_lavoro": "ristrutturazione condominio"}'),

('c002', 'Cantiere Piazza Napoli 10', 'luogo', '["cantiere"]', 'aziendale',
 45.4500, 9.1650, 'Piazza Napoli 10, Milano', NULL,
 '{"data_inizio": "2024-06-15", "data_fine": null, "importo_lavori": 95000, "tipo_lavoro": "rifacimento facciata"}'),

('c003', 'Cantiere Via Padova 200', 'luogo', '["cantiere"]', 'aziendale',
 45.4900, 9.2350, 'Via Padova 200, Milano', NULL,
 '{"data_inizio": "2024-01-10", "data_fine": "2024-05-20", "importo_lavori": 250000, "tipo_lavoro": "nuova costruzione"}'),

('c004', 'Cantiere Corso Lodi 150', 'luogo', '["cantiere"]', 'aziendale',
 45.4400, 9.2100, 'Corso Lodi 150, Milano', NULL,
 '{"data_inizio": "2024-09-01", "data_fine": null, "importo_lavori": 120000, "tipo_lavoro": "cappotto termico"}'),

('c005', 'Cantiere Via Torino 80', 'luogo', '["cantiere"]', 'aziendale',
 45.4580, 9.1750, 'Via Torino 80, Milano', NULL,
 '{"data_inizio": "2023-11-01", "data_fine": "2024-02-28", "importo_lavori": 75000, "tipo_lavoro": "pitturazione interna"}');

-- =====================================================
-- SINAPSI - CONNESSIONI
-- =====================================================

-- Tecnici lavorano per studi
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, livello) VALUES
('s001', 'p001', 'i006', 'titolare_di', '2010-01-01', 'aziendale'),
('s002', 'p002', 'i007', 'titolare_di', '2015-03-01', 'aziendale'),
('s003', 'p003', 'i006', 'collabora_con', '2020-06-01', 'aziendale');

-- Rappresentanti per marche
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, livello, note) VALUES
('s004', 'p009', 'i008', 'rappresenta', '2018-01-01', 'aziendale', 'Zona Milano Nord'),
('s005', 'p010', 'i009', 'rappresenta', '2019-06-01', 'aziendale', 'Zona Milano Centro-Sud'),
('s006', 'p011', 'i010', 'rappresenta', '2020-03-01', 'aziendale', 'Zona Milano Est');

-- Rappresentanti visitano clienti
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, livello) VALUES
('s007', 'p009', 'i001', 'visita', '2020-01-01', 'aziendale'),
('s008', 'p009', 'p001', 'visita', '2021-03-01', 'aziendale'),
('s009', 'p010', 'i002', 'visita', '2020-06-01', 'aziendale'),
('s010', 'p010', 'p004', 'visita', '2022-01-01', 'aziendale'),
('s011', 'p011', 'i001', 'visita', '2021-01-01', 'aziendale'),
('s012', 'p011', 'p005', 'visita', '2022-06-01', 'aziendale');

-- Pittori comprano da colorifici
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, valore, livello, certezza) VALUES
('s013', 'p004', 'i001', 'compra_da', '2022-01-01', 15000, 'aziendale', 'certo'),
('s014', 'p005', 'i001', 'compra_da', '2021-06-01', 22000, 'aziendale', 'certo'),
('s015', 'p005', 'i002', 'compra_da', '2023-01-01', 8000, 'aziendale', 'certo'),
('s016', 'p006', 'i002', 'compra_da', '2022-03-01', 12000, 'aziendale', 'certo');

-- Cantiere c001 - Via Roma 25
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, livello, certezza) VALUES
('s017', 'p001', 'c001', 'progetta', '2024-03-01', '2024-09-30', NULL, 'aziendale', 'certo'),
('s018', 'i004', 'c001', 'costruisce', '2024-03-01', '2024-09-30', 180000, 'aziendale', 'certo'),
('s019', 'p004', 'c001', 'applica_pittura', '2024-07-01', '2024-08-15', 18000, 'aziendale', 'certo'),
('s020', 'p012', 'c001', 'amministra', '2024-03-01', NULL, NULL, 'aziendale', 'certo');

-- Cantiere c002 - Piazza Napoli 10
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, livello, certezza) VALUES
('s021', 'p002', 'c002', 'progetta', '2024-06-15', NULL, NULL, 'aziendale', 'certo'),
('s022', 'i005', 'c002', 'costruisce', '2024-06-15', NULL, 95000, 'aziendale', 'certo'),
('s023', 'p005', 'c002', 'applica_pittura', '2024-10-01', NULL, 12000, 'aziendale', 'probabile');

-- Cantiere c003 - Via Padova 200
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, livello, certezza) VALUES
('s024', 'p001', 'c003', 'progetta', '2024-01-10', '2024-05-20', NULL, 'aziendale', 'certo'),
('s025', 'i004', 'c003', 'costruisce', '2024-01-10', '2024-05-20', 250000, 'aziendale', 'certo'),
('s026', 'p007', 'c003', 'lavora_per', '2024-02-01', '2024-05-15', 35000, 'aziendale', 'certo');

-- Cantiere c004 - Corso Lodi 150 (in corso)
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, livello, certezza) VALUES
('s027', 'p003', 'c004', 'progetta', '2024-09-01', NULL, NULL, 'aziendale', 'certo'),
('s028', 'i005', 'c004', 'costruisce', '2024-09-01', NULL, 120000, 'aziendale', 'certo'),
('s029', 'p006', 'c004', 'applica_pittura', '2024-11-01', NULL, 15000, 'aziendale', 'ipotesi');

-- Cantiere c005 - Via Torino 80 (concluso)
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, data_fine, valore, livello, certezza) VALUES
('s030', 'p002', 'c005', 'progetta', '2023-11-01', '2024-02-28', NULL, 'aziendale', 'certo'),
('s031', 'p004', 'c005', 'applica_pittura', '2024-01-15', '2024-02-20', 8000, 'aziendale', 'certo');

-- Uso prodotti/marche
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, valore, livello, note) VALUES
('s032', 'c001', 'i008', 'usa_prodotto', '2024-03-01', 25000, 'aziendale', 'Cappotto Weber.therm'),
('s033', 'c002', 'i009', 'usa_prodotto', '2024-06-15', 15000, 'aziendale', 'Mapelastic'),
('s034', 'c004', 'i008', 'usa_prodotto', '2024-09-01', 30000, 'aziendale', 'Sistema cappotto completo'),
('s035', 'p001', 'i008', 'consiglia_marca', '2020-01-01', NULL, 'aziendale', 'Consiglia sempre Weber per cappotti');

-- Vendite tramite colorifici
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, valore, livello) VALUES
('s036', 'i008', 'i001', 'venduto_tramite', '2020-01-01', 45000, 'aziendale'),
('s037', 'i009', 'i002', 'venduto_tramite', '2020-01-01', 38000, 'aziendale'),
('s038', 'i010', 'i001', 'venduto_tramite', '2021-01-01', 28000, 'aziendale');

-- CONNESSIONI PERSONALI (visibili solo con PIN)
INSERT INTO sinapsi (id, neurone_da, neurone_a, tipo_connessione, data_inizio, livello, certezza, note) VALUES
('s039', 'p013', 'c001', 'segnala', '2024-02-15', 'personale', 'certo', 'Maria mi ha detto del cantiere, conosce amministratore'),
('s040', 'p014', 'i002', 'segnalato_da', '2023-06-01', 'personale', 'certo', 'Giuseppe ex dipendente, mi tiene informato'),
('s041', 'p001', 'p012', 'amico_di', '2018-01-01', 'personale', 'certo', 'Si conoscono da anni, giocano a tennis insieme'),
('s042', 'p004', 'p005', 'collabora_con', '2020-01-01', 'personale', 'certo', 'Spesso lavorano insieme, si passano lavori');

-- =====================================================
-- NOTE PERSONALI (esempio)
-- =====================================================
INSERT INTO note_personali (id, utente_id, neurone_id, testo) VALUES
('n001', 'a0000000-0000-0000-0000-000000000001', 'p001',
 'Arch. Neri molto disponibile, preferisce prodotti Weber. Chiedergli sempre prima di proporre altro.'),
('n002', 'a0000000-0000-0000-0000-000000000001', 'i001',
 'Colorificio Rossi: buoni prezzi ma consegne lente. Meglio ordinare con anticipo.'),
('n003', 'a0000000-0000-0000-0000-000000000001', 'p004',
 'Giovanni bravo nei decorativi, un po caro. Affidabile al 100%.');
