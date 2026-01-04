# Architettura Gestione Dati - TanStack Query

## Problema Risolto

Prima di questa implementazione, quando l'AI (Agea) modificava un'entità, connessione o transazione, i pannelli dell'UI non si aggiornavano automaticamente. L'utente doveva chiudere e riaprire il pannello per vedere le modifiche.

## Soluzione: TanStack Query (React Query)

TanStack Query è lo standard enterprise per la gestione del server state in React. Fornisce:
- **Cache centralizzata**: i dati vengono salvati in cache e condivisi tra componenti
- **Invalidation automatica**: quando i dati cambiano, tutti i componenti si aggiornano
- **Refetch intelligente**: ricarica automaticamente quando torni sulla tab

---

## File Chiave

### `frontend/src/App.tsx`
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti
      refetchOnWindowFocus: true,
    },
  },
});

// Wrappa tutta l'app
<QueryClientProvider client={queryClient}>
  ...
</QueryClientProvider>
```

### `frontend/src/hooks/useData.ts`
Contiene tutti gli hooks centralizzati per il fetching dei dati.

---

## Query Keys

Le chiavi sono centralizzate per evitare errori di battitura e facilitare l'invalidation:

```typescript
export const queryKeys = {
  neuroni: (filtri?) => ['neuroni', filtri],     // Lista neuroni
  neurone: (id) => ['neurone', id],              // Singolo neurone
  sinapsi: (filtri?) => ['sinapsi', filtri],     // Lista sinapsi
  sinapsiNeurone: (neuroneId) => ['sinapsi', 'neurone', neuroneId],
  sinapsiById: (id) => ['sinapsi', 'detail', id],
  tipi: () => ['tipi'],
  tipologie: () => ['tipologie'],
  famiglieProdotto: () => ['famiglieProdotto'],
  note: (neuroneId) => ['note', neuroneId],
  vendite: (neuroneId) => ['vendite', neuroneId],
};
```

---

## Hooks Disponibili

### Neuroni
- `useNeuroni(filtri)` - Lista tutti i neuroni (per la mappa)
- `useNeurone(id)` - Singolo neurone con dettagli

### Sinapsi
- `useSinapsi(filtri)` - Lista tutte le sinapsi (per le parabole sulla mappa)
- `useSinapsiNeurone(neuroneId)` - Sinapsi di un neurone specifico
- `useSinapsiById(id)` - Dettaglio singola sinapsi

### Configurazione (cache 30 min)
- `useTipi()` - Tipi di neuroni
- `useTipologie()` - Categorie/tipologie
- `useFamiglieProdotto()` - Famiglie prodotto (flat)

### Dati Pannelli
- `useNote(neuroneId)` - Note personali di un neurone
- `useVendite(neuroneId)` - Vendite/transazioni di un neurone

---

## Invalidation

Quando i dati cambiano (utente o AI), chiamare le funzioni di invalidation:

```typescript
const {
  invalidateNeuroni,
  invalidateNeurone,
  invalidateSinapsi,
  invalidateSinapsiNeurone,
  invalidateSinapsiById,
  invalidateNote,
  invalidateVendite,
  invalidateAll,
  invalidateNeuroniESinapsi,
} = useInvalidateData();
```

### Quando Invalidare

| Operazione | Cosa Invalidare |
|------------|-----------------|
| Crea/modifica neurone | `invalidateNeuroni()` + `invalidateNeurone(id)` |
| Elimina neurone | `invalidateNeuroniESinapsi()` |
| Crea/modifica sinapsi | `invalidateSinapsi()` + `invalidateSinapsiNeurone(id)` |
| Crea/elimina vendita | `invalidateVendite(neuroneId)` + `invalidateNeuroniESinapsi()` |
| Crea/modifica nota | `invalidateNote(neuroneId)` |
| Azione AI generica | `invalidateNeuroniESinapsi()` |

---

## Componenti Migrati

### Dashboard.tsx
```typescript
// Prima: useState + useEffect per caricare dati
const [neuroni, setNeuroni] = useState([]);
useEffect(() => { loadNeuroni(); }, [filtri]);

// Dopo: hook con cache automatica
const { data: neuroni = [] } = useNeuroni(filtri);
```

### DetailPanel.tsx
- `useNeurone(id)` per dati entità freschi
- `useSinapsiNeurone(id)` per connessioni
- `useNote(id)` per note personali

### VenditeTab (in DetailPanel)
- `useVendite(id)` per transazioni
- `useFamiglieProdotto()` per famiglie prodotto
- `useSinapsiNeurone(id)` per controparti

### SinapsiDetailPanel.tsx
- `useSinapsiById(id)` per dettaglio connessione

---

## Flusso Dati con AI

```
1. Utente parla con Agea: "imposta Mario come acquirente"
2. AI chiama update_entity(id, { is_acquirente: true })
3. Backend aggiorna DB
4. Frontend riceve action: refresh_neuroni
5. Dashboard chiama invalidateNeuroniESinapsi()
6. TanStack Query invalida cache neuroni
7. useNeurone(id) in DetailPanel ricarica automaticamente
8. InfoTab vede is_acquirente = true (senza chiudere pannello!)
```

---

## Aggiungere Nuovi Dati

### 1. Aggiungi Query Key
```typescript
// In useData.ts
export const queryKeys = {
  ...
  nuoviDati: (param) => ['nuoviDati', param],
};
```

### 2. Crea Hook
```typescript
export function useNuoviDati(param: string | null) {
  return useQuery({
    queryKey: queryKeys.nuoviDati(param || ''),
    queryFn: async () => {
      if (!param) return [];
      return await api.getNuoviDati(param);
    },
    enabled: !!param,
  });
}
```

### 3. Aggiungi Invalidation
```typescript
// In useInvalidateData()
invalidateNuoviDati: (param: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.nuoviDati(param) });
},
```

### 4. Usa nel Componente
```typescript
const { data: nuoviDati = [], isLoading } = useNuoviDati(id);
const { invalidateNuoviDati } = useInvalidateData();

// Dopo modifica
invalidateNuoviDati(id);
```

---

## Best Practices

1. **Usa sempre gli hooks** invece di chiamate API dirette nei componenti
2. **Invalida dopo ogni modifica** - non aspettare che l'utente ricarichi
3. **Stale time appropriato** - 5 min per dati che cambiano, 30 min per config
4. **enabled: !!id** - evita fetch con parametri null
5. **Default values** - `data: neuroni = []` per evitare undefined

---

## Riferimenti

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query in 100 Seconds](https://www.youtube.com/watch?v=novnyCaa7To)
