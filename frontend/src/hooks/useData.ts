// TanStack Query hooks per i dati principali
// Centralizza il fetching e la cache - tutti i componenti si aggiornano automaticamente

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { Neurone, Sinapsi, Categoria, TipoNeuroneConfig, FiltriMappa, NotaPersonale } from '../types';

// ========== QUERY KEYS ==========
// Centralizzati per evitare typo e facilitare invalidation
export const queryKeys = {
  neuroni: (filtri?: Partial<FiltriMappa>) => ['neuroni', filtri] as const,
  neurone: (id: string) => ['neurone', id] as const,
  sinapsi: (filtri?: Partial<FiltriMappa>) => ['sinapsi', filtri] as const,
  sinapsiNeurone: (neuroneId: string) => ['sinapsi', 'neurone', neuroneId] as const,
  sinapsiById: (id: string) => ['sinapsi', 'detail', id] as const,
  tipi: () => ['tipi'] as const,
  tipologie: () => ['tipologie'] as const,
  campiTipo: (tipoId: string) => ['campi', 'tipo', tipoId] as const,
  famiglieProdotto: () => ['famiglieProdotto'] as const,
  note: (neuroneId: string) => ['note', neuroneId] as const,
  vendite: (neuroneId: string) => ['vendite', neuroneId] as const,
};

// ========== NEURONI ==========

export function useNeuroni(filtri: Partial<FiltriMappa> = {}) {
  return useQuery({
    queryKey: queryKeys.neuroni(filtri),
    queryFn: async () => {
      const res = await api.getNeuroni({
        tipo: filtri.tipoNeurone || undefined,
        categoria: filtri.categoria || undefined,
        data_inizio: filtri.dataInizio || undefined,
        data_fine: filtri.dataFine || undefined,
        limit: 500,
      });
      return res.data as Neurone[];
    },
  });
}

export function useNeurone(id: string | null) {
  return useQuery({
    queryKey: queryKeys.neurone(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return await api.getNeurone(id) as Neurone;
    },
    enabled: !!id,
  });
}

// ========== SINAPSI ==========

export function useSinapsi(filtri: Partial<FiltriMappa> = {}) {
  return useQuery({
    queryKey: queryKeys.sinapsi(filtri),
    queryFn: async () => {
      const res = await api.getSinapsi({
        data_inizio: filtri.dataInizio || undefined,
        data_fine: filtri.dataFine || undefined,
        certezza: filtri.certezza || undefined,
        valore_min: filtri.valoreMin || undefined,
        limit: 1000,
      });
      return res.data as Sinapsi[];
    },
  });
}

export function useSinapsiNeurone(neuroneId: string | null) {
  return useQuery({
    queryKey: queryKeys.sinapsiNeurone(neuroneId || ''),
    queryFn: async () => {
      if (!neuroneId) return [];
      const res = await api.getNeuroneSinapsi(neuroneId);
      return res.data as Sinapsi[];
    },
    enabled: !!neuroneId,
  });
}

// Sinapsi singola per ID (usato in SinapsiDetailPanel)
export function useSinapsiById(id: string | null) {
  return useQuery({
    queryKey: queryKeys.sinapsiById(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return await api.getSinapsiById(id) as Sinapsi & {
        dati_oggettivi?: {
          volume_totale: number;
          numero_transazioni: number;
          ultima_transazione: string | null;
          prima_transazione: string | null;
        };
      };
    },
    enabled: !!id,
  });
}

// ========== TIPI E CATEGORIE ==========

export function useTipi() {
  return useQuery({
    queryKey: queryKeys.tipi(),
    queryFn: async () => {
      const res = await api.get('/tipi');
      return res.data.data.map((t: { id: string; nome: string; forma: string; ordine: number }) => ({
        id: t.id,
        nome: t.nome,
        forma: t.forma,
        ordine: t.ordine
      })) as TipoNeuroneConfig[];
    },
    staleTime: 1000 * 60 * 30, // 30 minuti - cambiano raramente
  });
}

export function useTipologie() {
  return useQuery({
    queryKey: queryKeys.tipologie(),
    queryFn: async () => {
      const res = await api.get('/tipologie');
      return res.data.data.map((tp: { id: string; tipo_id: string; nome: string; colore: string; ordine: number }) => ({
        id: tp.id,
        tipo_id: tp.tipo_id,
        nome: tp.nome,
        colore: tp.colore,
        ordine: tp.ordine
      })) as Categoria[];
    },
    staleTime: 1000 * 60 * 30, // 30 minuti
  });
}

// ========== CAMPI PERSONALIZZATI ==========

export interface CampoTipo {
  id: string;
  tipo_id: string;
  nome: string;
  etichetta: string;
  tipo_dato: 'testo' | 'textarea' | 'numero' | 'data' | 'select' | 'email' | 'telefono' | 'url';
  opzioni: string[] | null;
  obbligatorio: boolean;
  ordine: number;
}

export function useCampiTipo(tipoId: string | null) {
  return useQuery({
    queryKey: queryKeys.campiTipo(tipoId || ''),
    queryFn: async () => {
      if (!tipoId) return [];
      const res = await api.getCampi(tipoId);
      return res.data as CampoTipo[];
    },
    enabled: !!tipoId,
    staleTime: 1000 * 60 * 30, // 30 minuti - cambiano raramente
  });
}

// ========== FAMIGLIE PRODOTTO ==========

export interface FamigliaProdottoFlat {
  id: string;
  nome: string;
  colore?: string | null;
  parent_id?: string;
}

// Tipo per la risposta API (con children)
interface FamigliaProdottoAPI {
  id: string;
  nome: string;
  colore?: string | null;
  parent_id?: string;
  children?: FamigliaProdottoAPI[];
}

export function useFamiglieProdotto() {
  return useQuery({
    queryKey: queryKeys.famiglieProdotto(),
    queryFn: async () => {
      const res = await api.getFamiglieProdotto({ flat: true });
      // Flatten della struttura ad albero
      const flatFamiglie: FamigliaProdottoFlat[] = [];
      const flatten = (items: FamigliaProdottoAPI[], level = 0) => {
        items.forEach(item => {
          flatFamiglie.push({
            id: item.id,
            nome: '  '.repeat(level) + item.nome,
            colore: item.colore,
            parent_id: item.parent_id,
          });
          if (item.children) {
            flatten(item.children, level + 1);
          }
        });
      };
      flatten(res.data as FamigliaProdottoAPI[]);
      return flatFamiglie;
    },
    staleTime: 1000 * 60 * 30, // 30 minuti - cambiano raramente
  });
}

// ========== NOTE ==========

export function useNote(neuroneId: string | null) {
  return useQuery({
    queryKey: queryKeys.note(neuroneId || ''),
    queryFn: async () => {
      if (!neuroneId) return [];
      const res = await api.getNote(neuroneId);
      return res.data as NotaPersonale[];
    },
    enabled: !!neuroneId,
  });
}

// ========== VENDITE ==========

export interface VenditeData {
  data: Array<{
    id: string;
    neurone_id: string;
    famiglia_id: string;
    importo: number;
    data_vendita: string;
    famiglia_nome?: string;
    colore?: string;
    controparte_nome?: string;
    controparte_id?: string;
    tipo_transazione?: 'acquisto' | 'vendita';
  }>;
  potenziale: number;
  totale_venduto: number;
  percentuale: number;
}

export function useVendite(neuroneId: string | null) {
  return useQuery({
    queryKey: queryKeys.vendite(neuroneId || ''),
    queryFn: async (): Promise<VenditeData> => {
      if (!neuroneId) return { data: [], potenziale: 0, totale_venduto: 0, percentuale: 0 };
      return await api.getVendite(neuroneId);
    },
    enabled: !!neuroneId,
  });
}

// ========== INVALIDATION HELPERS ==========
// Usati quando l'AI o l'utente modifica dati

export function useInvalidateData() {
  const queryClient = useQueryClient();

  return {
    // Invalida tutti i neuroni (lista + singoli)
    invalidateNeuroni: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'neuroni' || key === 'neurone';
        }
      });
    },

    // Invalida un neurone specifico
    invalidateNeurone: (id: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.neurone(id) });
    },

    // Invalida tutte le sinapsi (lista + singole + per neurone)
    invalidateSinapsi: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'sinapsi'
      });
    },

    // Invalida sinapsi di un neurone
    invalidateSinapsiNeurone: (neuroneId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sinapsiNeurone(neuroneId) });
    },

    // Invalida una sinapsi specifica
    invalidateSinapsiById: (id: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sinapsiById(id) });
    },

    // Invalida note di un neurone
    invalidateNote: (neuroneId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.note(neuroneId) });
    },

    // Invalida vendite di un neurone
    invalidateVendite: (neuroneId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendite(neuroneId) });
    },

    // Invalida TUTTO (dopo azioni AI che modificano più cose)
    invalidateAll: () => {
      // Usa predicate per invalidare TUTTE le query che contengono questi prefissi
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'neuroni' || key === 'neurone' ||
                 key === 'sinapsi' || key === 'note' || key === 'vendite';
        }
      });
    },

    // Invalida neuroni e sinapsi (caso più comune dopo azioni AI)
    // IMPORTANTE: invalida sia le liste che i singoli elementi!
    invalidateNeuroniESinapsi: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'neuroni' || key === 'neurone' || key === 'sinapsi';
        }
      });
    },
  };
}
