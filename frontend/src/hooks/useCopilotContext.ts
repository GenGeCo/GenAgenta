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

// Viewport corrente della mappa
interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number;
}

interface CopilotMapContext {
  viewport: {
    centro: { lat: number; lng: number };
    zoom: number;
    raggioApprossimativoKm: number;
  } | null;
  entitaNellaViewport: Array<{
    id: string;
    nome: string;
    tipo: string;
    distanzaDalCentroKm: number;
  }>;
  connessioniVisibili: number;
  filtriAttivi: {
    tipi: string[] | 'tutti';
    categorie: string[] | 'tutte';
    ricerca: string | null;
    periodo: string;
  };
  totaleEntitaCaricate: number;
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
    // Dati commerciali (visibili nel pannello Transazioni)
    potenziale?: number | null;
    venduto_totale?: number;
    percentuale_raggiunta?: number;
    // Natura commerciale (spunte nel pannello Info)
    is_acquirente?: boolean | null;
    is_venditore?: boolean | null;
    is_intermediario?: boolean | null;
    is_influencer?: boolean | null;
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
  mapViewport: MapViewport | null;
  categorie: Array<{ nome: string; colore: string }>;
}

/**
 * Calcola la distanza in km tra due punti usando la formula di Haversine
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Stima il raggio visibile in km in base al livello di zoom
 * Zoom 20 = ~0.1km, Zoom 15 = ~1km, Zoom 10 = ~30km, Zoom 5 = ~500km
 */
function zoomToRadiusKm(zoom: number): number {
  // Formula approssimativa: raggio ≈ 40000 / (2^zoom)
  // A zoom 15: ~1.2km, zoom 12: ~10km, zoom 10: ~40km
  return 40000 / Math.pow(2, zoom);
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
  mapViewport,
  categorie
}: UseCopilotContextParams): CopilotFullContext {

  // Contesto mappa con viewport e entità filtrate
  const mappaContext = useMemo<CopilotMapContext>(() => {
    if (!mapViewport) {
      // Se non abbiamo viewport, restituisci solo totali
      return {
        viewport: null,
        entitaNellaViewport: [],
        connessioniVisibili: sinapsi.length,
        filtriAttivi: {
          tipi: filtri.tipiSelezionati.length > 0 ? filtri.tipiSelezionati : 'tutti',
          categorie: filtri.categorieSelezionate.length > 0 ? filtri.categorieSelezionate : 'tutte',
          ricerca: filtri.ricerca || null,
          periodo: `${filtri.dataInizio} - ${filtri.dataFine}`
        },
        totaleEntitaCaricate: neuroni.length,
        totaleConnessioni: sinapsi.length
      };
    }

    const { center, zoom } = mapViewport;
    const raggioKm = zoomToRadiusKm(zoom);

    // Filtra le entità che sono nella viewport (con coordinate)
    const entitaConDistanza = neuroni
      .filter(n => n.lat !== null && n.lng !== null)
      .map(n => ({
        id: n.id,
        nome: n.nome,
        tipo: n.tipo,
        distanzaDalCentroKm: haversineDistance(center.lat, center.lng, n.lat!, n.lng!)
      }))
      .filter(n => n.distanzaDalCentroKm <= raggioKm * 1.5) // Margine del 50%
      .sort((a, b) => a.distanzaDalCentroKm - b.distanzaDalCentroKm)
      .slice(0, 15); // Max 15 entità più vicine

    return {
      viewport: {
        centro: center,
        zoom,
        raggioApprossimativoKm: Math.round(raggioKm * 10) / 10
      },
      entitaNellaViewport: entitaConDistanza,
      connessioniVisibili: sinapsi.length,
      filtriAttivi: {
        tipi: filtri.tipiSelezionati.length > 0 ? filtri.tipiSelezionati : 'tutti',
        categorie: filtri.categorieSelezionate.length > 0 ? filtri.categorieSelezionate : 'tutte',
        ricerca: filtri.ricerca || null,
        periodo: `${filtri.dataInizio} - ${filtri.dataFine}`
      },
      totaleEntitaCaricate: neuroni.length,
      totaleConnessioni: sinapsi.length
    };
  }, [neuroni, sinapsi, filtri, mapViewport]);

  // Contesto selezione
  const selezioneContext = useMemo<CopilotSelectionContext>(() => {
    if (!selectedNeurone) {
      return {
        entitaSelezionata: null,
        pannelloAperto: selectedSinapsiId ? 'dettaglio_connessione' : null,
        markerAI: aiMarkers.length
      };
    }

    // Calcola percentuale raggiunta
    const potenziale = selectedNeurone.potenziale || 0;
    const venduto = selectedNeurone.venduto_totale || 0;
    const percentuale = potenziale > 0 ? Math.round((venduto / potenziale) * 100) : 0;

    return {
      entitaSelezionata: {
        id: selectedNeurone.id,
        nome: selectedNeurone.nome,
        tipo: selectedNeurone.tipo,
        indirizzo: selectedNeurone.indirizzo,
        categorie: selectedNeurone.categorie,
        telefono: selectedNeurone.telefono,
        email: selectedNeurone.email,
        // Dati commerciali
        potenziale: selectedNeurone.potenziale,
        venduto_totale: selectedNeurone.venduto_totale,
        percentuale_raggiunta: percentuale,
        // Natura commerciale
        is_acquirente: selectedNeurone.is_acquirente,
        is_venditore: selectedNeurone.is_venditore,
        is_intermediario: selectedNeurone.is_intermediario,
        is_influencer: selectedNeurone.is_influencer
      },
      pannelloAperto: 'dettaglio_entita',
      markerAI: aiMarkers.length
    };
  }, [selectedNeurone, selectedSinapsiId, aiMarkers]);

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

  // Viewport
  if (context.mappa.viewport) {
    const v = context.mappa.viewport;
    lines.push(`VIEWPORT MAPPA:`);
    lines.push(`  Centro: ${v.centro.lat.toFixed(5)}, ${v.centro.lng.toFixed(5)}`);
    lines.push(`  Zoom: ${v.zoom} (raggio visibile ~${v.raggioApprossimativoKm}km)`);
    lines.push(`  Totale entità caricate: ${context.mappa.totaleEntitaCaricate}`);
  } else {
    lines.push(`MAPPA: ${context.mappa.totaleEntitaCaricate} entità caricate`);
  }

  // Filtri attivi
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

    // Dati commerciali (visibili nel pannello Transazioni)
    lines.push('  --- DATI COMMERCIALI (tab Transazioni) ---');
    lines.push(`  Potenziale di acquisto: €${(e.potenziale || 0).toLocaleString('it-IT')}`);
    lines.push(`  Venduto totale: €${(e.venduto_totale || 0).toLocaleString('it-IT')}`);
    if (e.potenziale && e.potenziale > 0) {
      lines.push(`  Percentuale raggiunta: ${e.percentuale_raggiunta}%`);
    }

    // Natura commerciale (spunte nel pannello Info)
    const naturaFlags: string[] = [];
    if (e.is_acquirente) naturaFlags.push('Acquirente ✓');
    if (e.is_venditore) naturaFlags.push('Venditore ✓');
    if (e.is_intermediario) naturaFlags.push('Intermediario ✓');
    if (e.is_influencer) naturaFlags.push('Influencer ✓');
    if (naturaFlags.length > 0) {
      lines.push(`  Natura commerciale: ${naturaFlags.join(', ')}`);
    } else {
      lines.push(`  Natura commerciale: nessuna spunta attiva`);
    }

    lines.push('  (Quando l\'utente dice "questo/questa" si riferisce a questa entità)');
  }

  // Entità nella viewport (solo se abbiamo viewport)
  if (context.mappa.entitaNellaViewport.length > 0) {
    lines.push('');
    lines.push(`ENTITÀ VISIBILI NELLA VIEWPORT (${context.mappa.entitaNellaViewport.length}):`);
    context.mappa.entitaNellaViewport.forEach(e => {
      lines.push(`  - ${e.nome} (${e.tipo}) ~${e.distanzaDalCentroKm.toFixed(1)}km dal centro`);
    });
  } else if (context.mappa.viewport) {
    lines.push('');
    lines.push('NESSUNA ENTITÀ VISIBILE nella viewport corrente');
  }

  // Azioni recenti (senza map_move per non sovraccaricare)
  const azioniRilevanti = context.azioniRecenti.filter(a => a.type !== 'map_move');
  if (azioniRilevanti.length > 0) {
    lines.push('');
    lines.push('AZIONI RECENTI UTENTE:');
    azioniRilevanti.forEach(a => {
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
