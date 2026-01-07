/**
 * Hook per raccogliere il contesto CopilotKit e esporlo ad AiChat
 *
 * CopilotKit richiede un runtime GraphQL che non abbiamo (siamo su Netsons/PHP).
 * Questo hook simula l'approccio CopilotKit ma esponendo i dati
 * direttamente al nostro sistema di chat esistente.
 *
 * Vantaggi:
 * - Contesto strutturato e tipizzato
 * - Aggiornamenti live (useMemo + deps)
 * - Compatibile con chat.php esistente
 */

import { useMemo } from 'react';
import type { Neurone, FiltriMappa, UserAction, AiMarker } from '../types';

interface CopilotMapContext {
  entitaVisibili: Array<{
    id: string;
    nome: string;
    tipo: string;
    indirizzo: string;
  }>;
  connessioniVisibili: number;
  filtriAttivi: {
    tipi: string[] | 'tutti';
    categorie: string[] | 'tutte';
    ricerca: string | null;
    periodo: string;
  };
  totaleEntita: number;
  totaleConnessioni: number;
}

interface CopilotSelectionContext {
  entitaSelezionata: {
    id: string;
    nome: string;
    tipo: string;
    indirizzo?: string | null;
    categorie?: string[];
    telefono?: string | null;
    email?: string | null;
  } | null;
  pannelloAperto: 'dettaglio_entita' | 'dettaglio_connessione' | null;
  markerAI: number;
}

interface CopilotConfigContext {
  tipiDisponibili: string[];
  categorieDisponibili: Array<{ nome: string; colore: string }>;
}

export interface CopilotFullContext {
  mappa: CopilotMapContext;
  selezione: CopilotSelectionContext;
  azioniRecenti: UserAction[];
  configurazione: CopilotConfigContext;
  timestamp: string;
}

interface UseCopilotContextParams {
  neuroni: Neurone[];
  sinapsi: any[];
  filtri: FiltriMappa;
  selectedNeurone: Neurone | null;
  selectedSinapsiId: string | null;
  aiMarkers: AiMarker[];
  userActions: UserAction[];
  tipiNeurone: Array<{ nome: string }>;
  categorie: Array<{ nome: string; colore: string }>;
}

/**
 * Hook che prepara tutto il contesto dell'applicazione per l'AI
 * in un formato strutturato e ottimizzato.
 */
export function useCopilotContext({
  neuroni,
  sinapsi,
  filtri,
  selectedNeurone,
  selectedSinapsiId,
  aiMarkers,
  userActions,
  tipiNeurone,
  categorie
}: UseCopilotContextParams): CopilotFullContext {

  // Contesto mappa (max 50 entità per non sovraccaricare)
  const mappaContext = useMemo<CopilotMapContext>(() => ({
    entitaVisibili: neuroni.slice(0, 50).map(n => ({
      id: n.id,
      nome: n.nome,
      tipo: n.tipo,
      indirizzo: n.indirizzo || 'N/D'
    })),
    connessioniVisibili: sinapsi.length,
    filtriAttivi: {
      tipi: filtri.tipiSelezionati.length > 0 ? filtri.tipiSelezionati : 'tutti',
      categorie: filtri.categorieSelezionate.length > 0 ? filtri.categorieSelezionate : 'tutte',
      ricerca: filtri.ricerca || null,
      periodo: `${filtri.dataInizio} - ${filtri.dataFine}`
    },
    totaleEntita: neuroni.length,
    totaleConnessioni: sinapsi.length
  }), [neuroni, sinapsi, filtri]);

  // Contesto selezione
  const selezioneContext = useMemo<CopilotSelectionContext>(() => ({
    entitaSelezionata: selectedNeurone ? {
      id: selectedNeurone.id,
      nome: selectedNeurone.nome,
      tipo: selectedNeurone.tipo,
      indirizzo: selectedNeurone.indirizzo,
      categorie: selectedNeurone.categorie,
      telefono: selectedNeurone.telefono,
      email: selectedNeurone.email
    } : null,
    pannelloAperto: selectedNeurone ? 'dettaglio_entita' : (selectedSinapsiId ? 'dettaglio_connessione' : null),
    markerAI: aiMarkers.length
  }), [selectedNeurone, selectedSinapsiId, aiMarkers]);

  // Contesto configurazione
  const configContext = useMemo<CopilotConfigContext>(() => ({
    tipiDisponibili: tipiNeurone.map(t => t.nome),
    categorieDisponibili: categorie.map(c => ({ nome: c.nome, colore: c.colore }))
  }), [tipiNeurone, categorie]);

  // Contesto completo con timestamp
  const fullContext = useMemo<CopilotFullContext>(() => ({
    mappa: mappaContext,
    selezione: selezioneContext,
    azioniRecenti: userActions.slice(-5),
    configurazione: configContext,
    timestamp: new Date().toISOString()
  }), [mappaContext, selezioneContext, userActions, configContext]);

  return fullContext;
}

/**
 * Formatta il contesto CopilotKit in testo leggibile per il prompt AI.
 * Questo viene aggiunto al system prompt di Gemini.
 */
export function formatCopilotContextForPrompt(context: CopilotFullContext): string {
  const lines: string[] = [
    '=== CONTESTO LIVE APPLICAZIONE ===',
    ''
  ];

  // Mappa
  lines.push(`MAPPA: ${context.mappa.totaleEntita} entità, ${context.mappa.totaleConnessioni} connessioni visibili`);
  if (context.mappa.filtriAttivi.ricerca) {
    lines.push(`  Ricerca attiva: "${context.mappa.filtriAttivi.ricerca}"`);
  }
  if (context.mappa.filtriAttivi.tipi !== 'tutti') {
    lines.push(`  Filtro tipi: ${(context.mappa.filtriAttivi.tipi as string[]).join(', ')}`);
  }

  // Selezione
  if (context.selezione.entitaSelezionata) {
    const e = context.selezione.entitaSelezionata;
    lines.push('');
    lines.push(`ENTITÀ SELEZIONATA: "${e.nome}" (${e.tipo})`);
    lines.push(`  ID: ${e.id}`);
    if (e.indirizzo) lines.push(`  Indirizzo: ${e.indirizzo}`);
    if (e.telefono) lines.push(`  Tel: ${e.telefono}`);
    if (e.email) lines.push(`  Email: ${e.email}`);
    lines.push('  (Quando l\'utente dice "questo/questa" si riferisce a questa entità)');
  }

  // Prime entità visibili (per riferimento)
  if (context.mappa.entitaVisibili.length > 0) {
    lines.push('');
    lines.push('PRIME ENTITÀ VISIBILI:');
    context.mappa.entitaVisibili.slice(0, 10).forEach(e => {
      lines.push(`  - ${e.nome} (${e.tipo}) [ID: ${e.id}]`);
    });
    if (context.mappa.entitaVisibili.length > 10) {
      lines.push(`  ... e altre ${context.mappa.entitaVisibili.length - 10}`);
    }
  }

  // Azioni recenti
  if (context.azioniRecenti.length > 0) {
    lines.push('');
    lines.push('AZIONI RECENTI UTENTE:');
    context.azioniRecenti.forEach(a => {
      const time = new Date(a.timestamp).toLocaleTimeString('it-IT');
      lines.push(`  [${time}] ${a.type}: ${JSON.stringify(a.data)}`);
    });
  }

  // Marker AI
  if (context.selezione.markerAI > 0) {
    lines.push('');
    lines.push(`MARKER AI SULLA MAPPA: ${context.selezione.markerAI}`);
  }

  lines.push('');
  lines.push('=== FINE CONTESTO ===');

  return lines.join('\n');
}
