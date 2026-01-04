# Gestione Note

## Campi disponibili

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `neurone_id` | uuid | Entità associata (OBBLIGATORIO) |
| `contenuto` | testo | Testo della nota (OBBLIGATORIO) |
| `tipo` | select | `nota` / `attivita` / `promemoria` |
| `personale` | bool | `true` = visibile solo a me |

## Creare nota

```
create_note(
  entity_id="uuid-entita",
  contenuto="Testo della nota...",
  tipo="nota",
  personale=true
)
```

Tipi di nota:
- `nota` - appunto generico
- `attivita` - azione da fare / fatta
- `promemoria` - da ricordare

## Note personali vs aziendali

- `personale=true` → visibile solo a chi l'ha creata
- `personale=false` → visibile a tutto il team

## Vedere note di un'entità

Le note sono incluse nei dettagli entità:
```
get_entity_details(entity_id)
```

Oppure via query:
```
query_database("SELECT * FROM note WHERE neurone_id = 'uuid' ORDER BY creato_il DESC")
```

## Casi d'uso

1. **Dopo una telefonata**: "Ho parlato con Mario, interessato ai nuovi prodotti"
2. **Promemoria**: "Richiamare tra una settimana per preventivo"
3. **Attività**: "Inviato catalogo via email"

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="note")`
3. Se trovi la soluzione, salvala con `save_learning("note", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
