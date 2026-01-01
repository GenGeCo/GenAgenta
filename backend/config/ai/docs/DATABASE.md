# Schema Database GenAgenta

## Tabelle principali

### neuroni (entità)
- id: UUID
- nome: VARCHAR(255)
- tipo: ENUM(persona, impresa, luogo, cantiere)
- categorie: JSON array di tag
- visibilita: ENUM(aziendale, personale)
- lat, lng: DECIMAL coordinate GPS
- indirizzo, telefono, email: VARCHAR
- azienda_id: UUID (filtro OBBLIGATORIO)
- creato_da: UUID utente

### sinapsi (connessioni)
- id: UUID
- neurone_da, neurone_a: UUID foreign key
- tipo_connessione: JSON array
- data_inizio, data_fine: DATE
- certezza: ENUM(certo, probabile, ipotesi)
- livello: ENUM(aziendale, personale)
- valore: DECIMAL importo economico
- note: TEXT

### vendite_prodotto (transazioni)
- id: UUID
- neurone_id: UUID cliente
- famiglia_id: UUID famiglia prodotto
- importo: DECIMAL
- data_vendita: DATE
- sinapsi_id: UUID connessione (opzionale)
- controparte_id: UUID per transazioni bilaterali
- tipo_transazione: ENUM(vendita, acquisto)

### famiglie_prodotto (gerarchiche)
- id: UUID
- nome: VARCHAR
- parent_id: UUID (per gerarchia)
- colore: VARCHAR per visualizzazione

## Query importanti

SEMPRE filtrare per azienda_id = '{{azienda_id}}'!

Top clienti per vendite:
```sql
SELECT n.nome, SUM(v.importo) as totale
FROM neuroni n
JOIN vendite_prodotto v ON v.neurone_id = n.id
WHERE n.azienda_id = '{{azienda_id}}'
GROUP BY n.id
ORDER BY totale DESC
LIMIT 10
```

Connessioni di un'entità:
```sql
SELECT * FROM sinapsi
WHERE (neurone_da = ? OR neurone_a = ?)
AND azienda_id = '{{azienda_id}}'
```
