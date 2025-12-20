// GenAgenTa - Type definitions

export type TipoNeurone = 'persona' | 'impresa' | 'luogo';
export type Visibilita = 'aziendale' | 'personale';
export type Certezza = 'certo' | 'probabile' | 'ipotesi';
export type Livello = 'aziendale' | 'personale';

export interface Neurone {
  id: string;
  nome: string;
  tipo: TipoNeurone;
  categorie: string[];
  visibilita: Visibilita;
  lat: number | null;
  lng: number | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  sito_web: string | null;
  dati_extra: Record<string, unknown> | null;
  data_creazione: string;
  data_modifica?: string;
  has_note?: boolean;
  note_count?: number;
  is_hidden?: boolean;
}

export interface Sinapsi {
  id: string;
  neurone_da: string;
  neurone_a: string;
  tipo_connessione: string;
  data_inizio: string;
  data_fine: string | null;
  valore: number | null;
  certezza: Certezza;
  livello: Livello;
  note: string | null;
  data_creazione: string;
  // Campi da JOIN
  nome_da?: string;
  tipo_da?: TipoNeurone;
  lat_da?: number;
  lng_da?: number;
  nome_a?: string;
  tipo_a?: TipoNeurone;
  lat_a?: number;
  lng_a?: number;
}

export interface NotaPersonale {
  id: string;
  utente_id: string;
  neurone_id: string;
  testo: string;
  data_creazione: string;
  data_modifica: string;
  neurone_nome?: string;
  neurone_tipo?: TipoNeurone;
}

export interface User {
  id: string;
  email: string;
  nome: string;
  ruolo: 'admin' | 'commerciale';
  ruolo_azienda?: 'admin' | 'membro';
  azienda_id?: string;
  nome_azienda?: string;
  codice_pairing?: string;
  has_pin: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  personalAccess: boolean;
  isLoading: boolean;
}

export interface FiltriMappa {
  dataInizio: string | null;
  dataFine: string | null;
  tipoNeurone: TipoNeurone | null;
  categoria: string | null;
  certezza: Certezza | null;
  valoreMin: number | null;
  raggio: number | null;
  centro: { lat: number; lng: number } | null;
  mostraConnessioni: boolean;
  soloConnessioniSelezionate: boolean;
}

export interface DashboardStats {
  totali: {
    neuroni: number;
    sinapsi: number;
    cantieri_attivi: number;
    valore_totale: number;
    note_personali: number;
  };
  neuroni_per_tipo: { tipo: TipoNeurone; count: number }[];
  sinapsi_per_tipo: { tipo_connessione: string; count: number }[];
}

// Tipi connessione predefiniti
export const TIPI_CONNESSIONE = {
  cantiere: [
    'progetta', 'dirige_lavori', 'costruisce', 'subappalta', 'fornisce',
    'applica_pittura', 'applica_cartongesso', 'applica_piastrelle',
    'impianto_elettrico', 'impianto_idraulico', 'movimento_terra', 'verde',
    'commissiona', 'amministra', 'segnala', 'preventivo_fatto',
    'preventivo_accettato', 'preventivo_rifiutato'
  ],
  persona_impresa: [
    'lavora_per', 'titolare_di', 'collabora_con', 'dipendente_di'
  ],
  commerciale: [
    'compra_da', 'vende_a', 'subappalta_a', 'partner', 'consiglia',
    'rappresenta', 'visita', 'segue_zona', 'usa_prodotto', 'consiglia_marca', 'venduto_tramite'
  ],
  personale: [
    'conosce', 'segnalato_da', 'parente_di', 'amico_di'
  ]
} as const;

// Categorie neuroni
export const CATEGORIE_PERSONA = [
  'imbianchino', 'cartongessista', 'muratore', 'impiantista', 'idraulico',
  'elettricista', 'movimento_terra', 'giardiniere', 'carpentiere', 'piastrellista',
  'tecnico', 'amministratore_condominio', 'agente_immobiliare', 'rappresentante',
  'commerciale', 'altro'
] as const;

export const CATEGORIE_IMPRESA = [
  'impresa_edile', 'studio_tecnico', 'amministrazione_condomini', 'agenzia_immobiliare',
  'colorificio', 'ferramenta', 'noleggio_attrezzature', 'marca', 'altro'
] as const;

export const CATEGORIE_LUOGO = ['cantiere', 'condominio'] as const;
