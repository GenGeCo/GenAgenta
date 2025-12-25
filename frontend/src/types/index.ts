// GenAgenTa - Type definitions

// I tipi neurone sono ora configurabili dal database, quindi usiamo string
export type TipoNeurone = string;
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
  dimensione: number | null; // dimensione base in metri (default: 50 quadrato, 40 cerchio)
  potenziale: number | null; // potenziale di acquisto in euro
  venduto_totale?: number; // totale venduto (somma vendite_prodotto)
  data_creazione: string;
  data_modifica?: string;
  has_note?: boolean;
  note_count?: number;
  is_hidden?: boolean;
  // Natura commerciale (null = eredita dal tipo)
  is_acquirente?: boolean | null;
  is_venditore?: boolean | null;
  is_intermediario?: boolean | null;
  is_influencer?: boolean | null;
}

export interface Sinapsi {
  id: string;
  neurone_da: string;
  neurone_a: string;
  tipo_connessione: string[];  // Array di tipi (multi-select)
  famiglia_prodotto_id: string | null;  // Prodotto coinvolto nella relazione
  data_inizio: string;
  data_fine: string | null;
  valore: number | null;
  certezza: Certezza;
  fonte: string | null;  // "visto sul cantiere", "me l'ha detto Mario"
  data_verifica: string | null;  // Quando l'ipotesi è stata confermata
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
  prodotto_nome?: string;  // Nome del prodotto (da JOIN)
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
  foto_url?: string;
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

// Tipi connessione semplificati (6 categorie base)
// I tipi specifici sono ora gestiti dal database (tipi_sinapsi)
// Le transazioni economiche (chi compra/vende cosa) vanno nel tab Transazioni
export const TIPI_CONNESSIONE_BASE = [
  'commerciale',    // Rapporto di compravendita
  'consulenza',     // Relazione professionale/consulenza
  'collaborazione', // Lavorano insieme
  'conosce',        // Conoscenza personale
  'lavora_per',     // Dipendente/collaboratore
  'parente'         // Relazione familiare
] as const;

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

// Forme 3D disponibili per i tipi neurone
export type FormaNeurone = 'cerchio' | 'quadrato' | 'triangolo' | 'stella' | 'croce' | 'L' | 'C' | 'W' | 'Z';

// Tipo neurone personalizzabile (forma sulla mappa)
export interface TipoNeuroneConfig {
  id: string;
  nome: string;
  forma: FormaNeurone;
  visibilita: Visibilita;
  azienda_id: string | null;
  creato_da: string | null;
  ordine: number;
  num_categorie?: number;
  data_creazione: string;
}

// Categoria personalizzabile (colore)
export interface Categoria {
  id: string;
  tipo_id: string;
  nome: string;
  colore: string;
  visibilita: Visibilita;
  azienda_id: string | null;
  creato_da: string | null;
  ordine: number;
  tipo_nome?: string;
  tipo_forma?: FormaNeurone;
  data_creazione: string;
}

// Tipo sinapsi personalizzabile (colore connessione)
export interface TipoSinapsiConfig {
  id: string;
  nome: string;
  colore: string;
  visibilita: Visibilita;
  azienda_id: string | null;
  creato_da: string | null;
  ordine: number;
  num_sinapsi?: number;
  data_creazione: string;
}

// Famiglia prodotto gerarchica
export interface FamigliaProdotto {
  id: string;
  nome: string;
  parent_id: string | null;
  descrizione: string | null;
  colore: string | null; // colore per visualizzazione 3D
  ordine: number;
  visibilita: Visibilita;
  azienda_id: string | null;
  creato_da: string | null;
  num_figli?: number;
  parent_nome?: string;
  children?: FamigliaProdotto[];
  path?: { id: string; nome: string }[];
  data_creazione: string;
}

// Vendita per famiglia prodotto (con supporto transazioni bilaterali)
export interface VenditaProdotto {
  id: string;
  neurone_id: string;
  famiglia_id: string;
  importo: number;
  data_vendita: string;
  famiglia_nome?: string;
  colore?: string;
  data_aggiornamento?: string;
  // Campi per transazioni bilaterali
  sinapsi_id?: string | null;
  controparte_id?: string | null;
  controparte_vendita_id?: string | null;
  tipo_transazione?: 'acquisto' | 'vendita';
  controparte_nome?: string; // Nome della controparte (da JOIN)
}
