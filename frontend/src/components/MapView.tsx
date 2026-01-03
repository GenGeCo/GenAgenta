// GenAgenTa - Map View Component (Mapbox GL JS) - 3D Native Layers v2

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Neurone, Sinapsi, FiltriMappa, Categoria, TipoNeuroneConfig, VenditaProdotto } from '../types';
import { api } from '../utils/api';
import { AddressSearch } from './AddressSearch';

// Token Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZ2VuYWdlbnRhIiwiYSI6ImNtamR6a3UwazBjNHEzZnF4aWxhYzlqMmUifQ.0RcP-1pxFW7rHYvVoJQG5g';

interface MapViewProps {
  neuroni: Neurone[];
  sinapsi: Sinapsi[];
  categorie: Categoria[];
  tipiNeurone: TipoNeuroneConfig[];
  selectedId: string | null; // ID del neurone nel DetailPanel (per logica click)
  filterSelectedId?: string | null; // ID per filtro connessioni (può essere diverso da selectedId)
  onSelectNeurone: (neurone: Neurone) => void;
  onFocusNeurone?: (id: string) => void; // Chiamato quando si clicca su un edificio (anche senza aprire dettagli)
  onClearFocus?: (lat?: number, lng?: number) => void; // Chiamato quando si clicca su zona vuota (deseleziona, con coordinate)
  onMapMove?: (center: { lat: number; lng: number }, zoom: number) => void; // Tracking movimento mappa per AI
  filtri: FiltriMappa;
  pickingMode?: boolean;
  onPickPosition?: (lat: number, lng: number) => void;
  flyToPosition?: { lat: number; lng: number; zoom?: number; pitch?: number; bearing?: number } | null;
  aiStyleChange?: string | null;
  onAiStyleApplied?: () => void;
  pickedPosition?: { lat: number; lng: number } | null;
  // Props per picking connessione (target su mappa)
  connectionPickingMode?: boolean;
  connectionSourceId?: string | null;
  onPickConnectionTarget?: (neurone: Neurone) => void;
  // Props per Quick Map Mode
  quickMapMode?: boolean;
  onQuickMapClick?: (lat: number, lng: number, screenX: number, screenY: number) => void;
  onQuickEntityClick?: (neurone: Neurone, screenX: number, screenY: number) => void;
  // Props per dettagli connessione
  onSelectSinapsi?: (sinapsiId: string) => void;
}

// Colore di default se la categoria non viene trovata
const DEFAULT_COLOR = '#64748b';

// Colori per ogni tipo di connessione (7 tipi)
const TIPO_CONNESSIONE_COLORS: Record<string, string> = {
  commerciale: '#3b82f6',   // blu
  fornisce: '#f97316',      // arancione
  influencer: '#eab308',    // giallo/oro
  prescrittore: '#a855f7',  // viola
  tecnico: '#6b7280',       // grigio
  partner: '#22c55e',       // verde
  collabora: '#14b8a6',     // teal
};

// Stili mappa disponibili (gratuiti)
const MAP_STYLES = [
  { id: 'light-v11', nome: 'Chiaro', icon: '☀️' },
  { id: 'dark-v11', nome: 'Scuro', icon: '🌙' },
  { id: 'streets-v12', nome: 'Strade', icon: '🛣️' },
  { id: 'outdoors-v12', nome: 'Outdoor', icon: '🏔️' },
  { id: 'satellite-streets-v12', nome: 'Satellite', icon: '🛰️' },
];

// Genera un poligono circolare (per cilindri)
function createCirclePolygon(lng: number, lat: number, radiusMeters: number, sides: number = 24): number[][] {
  const coords: number[][] = [];
  const earthRadius = 6371000;

  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);

    const dLat = dy / earthRadius * (180 / Math.PI);
    const dLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

    coords.push([lng + dLng, lat + dLat]);
  }

  return coords;
}

// Genera una parabola 3D tra due punti (coordinate + array elevazioni)
// baseHeight permette di alzare tutta la parabola (per parabole sovrapposte)
// lateralOffset permette di spostare lateralmente la parabola (per parabole affiancate)
function createParabola3D(
  lng1: number, lat1: number,
  lng2: number, lat2: number,
  numPoints: number = 15,
  maxHeight: number = 50, // altezza massima in metri al centro
  baseHeight: number = 0,  // altezza base da cui parte la parabola (per stacking verticale)
  lateralOffset: number = 0 // offset laterale in metri (per parabole affiancate)
): { coordinates: number[][]; elevation: number[] } {
  const coordinates: number[][] = [];
  const elevation: number[] = [];
  const earthRadius = 6371000;

  // Calcola vettore perpendicolare per offset laterale
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const perpLat = -dLng;
  const perpLng = dLat;
  const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);

  // Offset in gradi
  let offsetLat = 0;
  let offsetLng = 0;
  if (perpLength > 0 && lateralOffset !== 0) {
    offsetLat = (perpLat / perpLength) * (lateralOffset / earthRadius) * (180 / Math.PI);
    offsetLng = (perpLng / perpLength) * (lateralOffset / (earthRadius * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180))) * (180 / Math.PI);
  }

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Interpolazione lineare per lng/lat (linea dritta sul piano) + offset laterale
    const lng = lng1 + (lng2 - lng1) * t + offsetLng;
    const lat = lat1 + (lat2 - lat1) * t + offsetLat;
    coordinates.push([lng, lat]);

    // Parabola per l'altitudine: baseHeight + 4 * h * t * (1-t)
    // Massimo al centro (t=0.5), baseHeight agli estremi
    const alt = baseHeight + 4 * maxHeight * t * (1 - t);
    elevation.push(alt);
  }

  return { coordinates, elevation };
}

// Genera un poligono "ribbon" (nastro) tra due punti per hit detection 3D
// Il nastro è largo widthMeters e accorciato di marginMeters agli estremi
function createRibbonPolygon(
  lng1: number, lat1: number,
  lng2: number, lat2: number,
  widthMeters: number = 15,
  marginMeters: number = 30 // margine agli estremi per evitare sovrapposizione con entità
): number[][] {
  const earthRadius = 6371000;

  // Calcola direzione della linea
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;

  // Lunghezza in metri (approssimata)
  const lengthLat = dLat * (Math.PI / 180) * earthRadius;
  const lengthLng = dLng * (Math.PI / 180) * earthRadius * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const totalLength = Math.sqrt(lengthLat * lengthLat + lengthLng * lengthLng);

  // Se la linea è troppo corta, riduci il margine
  const effectiveMargin = Math.min(marginMeters, totalLength * 0.2);
  const marginRatio = effectiveMargin / totalLength;

  // Punti accorciati (con margine)
  const startLng = lng1 + dLng * marginRatio;
  const startLat = lat1 + dLat * marginRatio;
  const endLng = lng2 - dLng * marginRatio;
  const endLat = lat2 - dLat * marginRatio;

  // Vettore perpendicolare normalizzato
  const perpLat = -dLng;
  const perpLng = dLat;
  const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);

  if (perpLength === 0) return []; // Punti coincidenti

  // Offset in gradi per la larghezza
  const halfWidth = widthMeters / 2;
  const offsetLat = (perpLat / perpLength) * (halfWidth / earthRadius) * (180 / Math.PI);
  const offsetLng = (perpLng / perpLength) * (halfWidth / (earthRadius * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180))) * (180 / Math.PI);

  // 4 vertici del rettangolo
  return [
    [startLng - offsetLng, startLat - offsetLat], // bottom-left
    [endLng - offsetLng, endLat - offsetLat],     // bottom-right
    [endLng + offsetLng, endLat + offsetLat],     // top-right
    [startLng + offsetLng, startLat + offsetLat], // top-left
    [startLng - offsetLng, startLat - offsetLat], // chiudi il poligono
  ];
}

// Genera un quadrato (per parallelepipedi)
function createSquarePolygon(lng: number, lat: number, sizeMeters: number): number[][] {
  const earthRadius = 6371000;
  const half = sizeMeters / 2;

  const dLat = half / earthRadius * (180 / Math.PI);
  const dLng = half / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

// Genera un triangolo equilatero
function createTrianglePolygon(lng: number, lat: number, sizeMeters: number): number[][] {
  const earthRadius = 6371000;
  const radius = sizeMeters / 2;
  const coords: number[][] = [];

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * 2 * Math.PI - Math.PI / 2; // Punta verso l'alto
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    const dLat = dy / earthRadius * (180 / Math.PI);
    const dLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]); // Chiudi il poligono

  return coords;
}

// Genera una stella a 5 punte
function createStarPolygon(lng: number, lat: number, sizeMeters: number): number[][] {
  const earthRadius = 6371000;
  const outerRadius = sizeMeters / 2;
  const innerRadius = outerRadius * 0.4;
  const coords: number[][] = [];

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * 2 * Math.PI - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    const dLat = dy / earthRadius * (180 / Math.PI);
    const dLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);

  return coords;
}

// Genera una croce
function createCrossPolygon(lng: number, lat: number, sizeMeters: number): number[][] {
  const earthRadius = 6371000;
  const half = sizeMeters / 2;
  const arm = half * 0.3; // Spessore braccio

  const toCoord = (dx: number, dy: number): number[] => {
    const dLat = dy / earthRadius * (180 / Math.PI);
    const dLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    return [lng + dLng, lat + dLat];
  };

  return [
    toCoord(-arm, half),
    toCoord(arm, half),
    toCoord(arm, arm),
    toCoord(half, arm),
    toCoord(half, -arm),
    toCoord(arm, -arm),
    toCoord(arm, -half),
    toCoord(-arm, -half),
    toCoord(-arm, -arm),
    toCoord(-half, -arm),
    toCoord(-half, arm),
    toCoord(-arm, arm),
    toCoord(-arm, half), // Chiudi
  ];
}

// Genera un esagono
function createHexagonPolygon(lng: number, lat: number, sizeMeters: number): number[][] {
  const earthRadius = 6371000;
  const radius = sizeMeters / 2;
  const coords: number[][] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * 2 * Math.PI;
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    const dLat = dy / earthRadius * (180 / Math.PI);
    const dLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);

  return coords;
}

// Calcola altezza basata sui dati - usa potenziale se disponibile
function calculateHeight(neurone: Neurone, sinapsiCount: number): number {
  const baseHeight = 35;  // altezza minima
  const maxHeight = 350;  // altezza massima

  // Se ha potenziale, usa quello per l'altezza (ogni 5000€ = 10m)
  if (neurone.potenziale && neurone.potenziale > 0) {
    const altezzaPotenziale = baseHeight + (neurone.potenziale / 500);
    return Math.min(Math.max(altezzaPotenziale, baseHeight), maxHeight);
  }

  // Fallback al vecchio sistema
  let value = 0;
  if (neurone.tipo === 'impresa') {
    const fatturato = (neurone.dati_extra as { fatturato_annuo?: number })?.fatturato_annuo || 0;
    value = fatturato / 1500;
  } else if (neurone.tipo === 'luogo') {
    const importo = (neurone.dati_extra as { importo_lavori?: number })?.importo_lavori || 0;
    value = importo / 750;
  } else {
    value = sinapsiCount * 20;
  }

  return Math.min(Math.max(baseHeight + value, baseHeight), maxHeight);
}

// Calcola altezza venduto proporzionale all'altezza totale
function calculateVendutoHeight(neurone: Neurone, totalHeight: number): number {
  if (!neurone.potenziale || neurone.potenziale <= 0) return 0;
  if (!neurone.venduto_totale || neurone.venduto_totale <= 0) return 0;

  const ratio = Math.min(neurone.venduto_totale / neurone.potenziale, 1);
  return ratio * totalHeight;
}

// Genera un anello (ring) per la linea venduto esterna
function createRingPolygon(lng: number, lat: number, innerRadius: number, outerRadius: number, sides: number = 24): number[][][] {
  const earthRadius = 6371000;
  const outer: number[][] = [];
  const inner: number[][] = [];

  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;

    // Outer ring
    const dxOuter = outerRadius * Math.cos(angle);
    const dyOuter = outerRadius * Math.sin(angle);
    const dLatOuter = dyOuter / earthRadius * (180 / Math.PI);
    const dLngOuter = dxOuter / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    outer.push([lng + dLngOuter, lat + dLatOuter]);

    // Inner ring (clockwise = hole)
    const dxInner = innerRadius * Math.cos(angle);
    const dyInner = innerRadius * Math.sin(angle);
    const dLatInner = dyInner / earthRadius * (180 / Math.PI);
    const dLngInner = dxInner / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    inner.push([lng + dLngInner, lat + dLatInner]);
  }

  // Polygon con hole: [outer_ring, inner_ring(reversed)]
  return [outer, inner.reverse()];
}

// Genera un anello quadrato per edifici quadrati
function createSquareRing(lng: number, lat: number, innerSize: number, outerSize: number): number[][][] {
  const earthRadius = 6371000;

  const halfInner = innerSize / 2;
  const halfOuter = outerSize / 2;

  const dLatInner = halfInner / earthRadius * (180 / Math.PI);
  const dLngInner = halfInner / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  const dLatOuter = halfOuter / earthRadius * (180 / Math.PI);
  const dLngOuter = halfOuter / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

  const outer = [
    [lng - dLngOuter, lat - dLatOuter],
    [lng + dLngOuter, lat - dLatOuter],
    [lng + dLngOuter, lat + dLatOuter],
    [lng - dLngOuter, lat + dLatOuter],
    [lng - dLngOuter, lat - dLatOuter],
  ];

  const inner = [
    [lng - dLngInner, lat - dLatInner],
    [lng - dLngInner, lat + dLatInner],
    [lng + dLngInner, lat + dLatInner],
    [lng + dLngInner, lat - dLatInner],
    [lng - dLngInner, lat - dLatInner],
  ];

  return [outer, inner];
}

export default function MapView({
  neuroni,
  sinapsi,
  categorie,
  tipiNeurone,
  selectedId,
  filterSelectedId,
  onSelectNeurone,
  onFocusNeurone,
  onClearFocus,
  onMapMove,
  filtri,
  pickingMode = false,
  onPickPosition,
  flyToPosition,
  aiStyleChange,
  onAiStyleApplied,
  pickedPosition,
  connectionPickingMode = false,
  connectionSourceId = null,
  onPickConnectionTarget,
  quickMapMode = false,
  onQuickMapClick,
  onQuickEntityClick,
  onSelectSinapsi,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const salesPopup = useRef<mapboxgl.Popup | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState('light-v11');
  const [styleLoaded, setStyleLoaded] = useState(0); // incrementa per forzare re-render dopo cambio stile
  const [mapOpacity, setMapOpacity] = useState(100); // Opacità mappa 0-100
  const [showMapControls, setShowMapControls] = useState(false); // Mostra/nascondi controlli avanzati
  const [controlsFading, setControlsFading] = useState(false); // Per dissolvenza pannello controlli
  const [showLegend, setShowLegend] = useState(false); // Mostra/nascondi legenda categorie
  const [preferenzeCaricate, setPreferenzeCaricate] = useState(false);
  const savePositionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsAutoCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveOpacityTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMapPositionRef = useRef<() => void>(() => {});
  const neuroniRef = useRef<Neurone[]>(neuroni);
  const handlersAdded = useRef(false);
  const pickingModeRef = useRef(pickingMode);
  const onPickPositionRef = useRef(onPickPosition);
  const onSelectNeuroneRef = useRef(onSelectNeurone);
  // Refs per connection picking
  const connectionPickingModeRef = useRef(connectionPickingMode);
  const connectionSourceIdRef = useRef(connectionSourceId);
  const onPickConnectionTargetRef = useRef(onPickConnectionTarget);
  // Refs per Quick Map Mode
  const quickMapModeRef = useRef(quickMapMode);
  const onQuickMapClickRef = useRef(onQuickMapClick);
  const onQuickEntityClickRef = useRef(onQuickEntityClick);
  // Ref per dettagli sinapsi
  const onSelectSinapsiRef = useRef(onSelectSinapsi);
  // Ref per tracking movimento mappa
  const onMapMoveRef = useRef(onMapMove);
  const mapMoveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref per selectedId (per cambiare panel al click su altra entità)
  const selectedIdRef = useRef(selectedId);
  // Ref per onFocusNeurone (per tracciare edificio cliccato)
  const onFocusNeuroneRef = useRef(onFocusNeurone);
  const onClearFocusRef = useRef(onClearFocus);

  // Colori default per le famiglie prodotto nel popup
  const coloriProdotti = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

  // Aggiorna refs per picking mode e callbacks
  useEffect(() => {
    pickingModeRef.current = pickingMode;
    onPickPositionRef.current = onPickPosition;
  }, [pickingMode, onPickPosition]);

  useEffect(() => {
    onSelectNeuroneRef.current = onSelectNeurone;
  }, [onSelectNeurone]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    onFocusNeuroneRef.current = onFocusNeurone;
    onClearFocusRef.current = onClearFocus;
  }, [onFocusNeurone, onClearFocus]);

  // Aggiorna refs per connection picking
  useEffect(() => {
    connectionPickingModeRef.current = connectionPickingMode;
    connectionSourceIdRef.current = connectionSourceId;
    onPickConnectionTargetRef.current = onPickConnectionTarget;
    console.log('DEBUG MapView: connectionPickingMode aggiornato a:', connectionPickingMode, 'sourceId:', connectionSourceId);
  }, [connectionPickingMode, connectionSourceId, onPickConnectionTarget]);

  // Aggiorna refs per Quick Map Mode
  useEffect(() => {
    quickMapModeRef.current = quickMapMode;
    onQuickMapClickRef.current = onQuickMapClick;
    onQuickEntityClickRef.current = onQuickEntityClick;
  }, [quickMapMode, onQuickMapClick, onQuickEntityClick]);

  // Aggiorna ref per dettagli sinapsi
  useEffect(() => {
    onSelectSinapsiRef.current = onSelectSinapsi;
  }, [onSelectSinapsi]);

  // Aggiorna ref per tracking movimento mappa
  useEffect(() => {
    onMapMoveRef.current = onMapMove;
  }, [onMapMove]);

  useEffect(() => {
    neuroniRef.current = neuroni;
  }, [neuroni]);


  const getSinapsiCount = useCallback((neuroneId: string) => {
    return sinapsi.filter(s => s.neurone_da === neuroneId || s.neurone_a === neuroneId).length;
  }, [sinapsi]);

  // Cambia stile mappa e salva nel DB
  const changeMapStyle = useCallback((styleId: string) => {
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${styleId}`);
      setMapStyle(styleId);
      // Quando lo stile è caricato, forza re-render dei layer
      map.current.once('style.load', () => {
        setStyleLoaded(prev => prev + 1);
      });
      // Salva preferenza nel DB
      api.savePreferenze({ mappa_stile: styleId }).catch(console.error);
    }
  }, []);

  // Applica opacità alla mappa base (tutti i tipi di layer)
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const m = map.current;
    const style = m.getStyle();
    if (!style?.layers) return;

    const opacity = mapOpacity / 100;

    // I nostri layer custom da NON toccare
    const customLayers = ['neuroni-3d', 'neuroni-borders', 'venduto-rings', 'sinapsi-lines', 'sinapsi-lines-shadow', 'sinapsi-hit'];

    // Applica opacità a tutti i layer della mappa base
    style.layers.forEach(layer => {
      // Salta i nostri layer custom
      if (customLayers.some(cl => layer.id.includes(cl))) return;

      try {
        switch (layer.type) {
          case 'background':
            m.setPaintProperty(layer.id, 'background-opacity', opacity);
            break;
          case 'fill':
            m.setPaintProperty(layer.id, 'fill-opacity', opacity);
            break;
          case 'line':
            m.setPaintProperty(layer.id, 'line-opacity', opacity);
            break;
          case 'symbol':
            m.setPaintProperty(layer.id, 'icon-opacity', opacity);
            m.setPaintProperty(layer.id, 'text-opacity', opacity);
            break;
          case 'raster':
            m.setPaintProperty(layer.id, 'raster-opacity', opacity);
            break;
          case 'fill-extrusion':
            m.setPaintProperty(layer.id, 'fill-extrusion-opacity', opacity);
            break;
        }
      } catch (e) {
        // Ignora errori per layer che non supportano la proprietà
      }
    });
  }, [mapOpacity, mapReady, styleLoaded]);

  // Salva posizione mappa (debounced)
  const saveMapPosition = useCallback(() => {
    if (!map.current) return;

    if (savePositionTimeout.current) {
      clearTimeout(savePositionTimeout.current);
    }

    savePositionTimeout.current = setTimeout(() => {
      if (!map.current) return;
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      const pitch = map.current.getPitch();
      const bearing = map.current.getBearing();

      api.savePreferenze({
        mappa_center: [center.lng, center.lat],
        mappa_zoom: zoom,
        mappa_pitch: pitch,
        mappa_bearing: bearing,
      }).catch(console.error);
    }, 1000); // Salva dopo 1 secondo di inattività
  }, []);

  // Aggiorna la ref per il salvataggio posizione
  useEffect(() => {
    saveMapPositionRef.current = saveMapPosition;
  }, [saveMapPosition]);

  // Salva trasparenza mappa (debounced)
  useEffect(() => {
    if (!preferenzeCaricate) return; // Non salvare durante il caricamento iniziale

    if (saveOpacityTimeout.current) {
      clearTimeout(saveOpacityTimeout.current);
    }

    saveOpacityTimeout.current = setTimeout(() => {
      api.savePreferenze({ mappa_trasparenza: mapOpacity }).catch(console.error);
    }, 500);

    return () => {
      if (saveOpacityTimeout.current) {
        clearTimeout(saveOpacityTimeout.current);
      }
    };
  }, [mapOpacity, preferenzeCaricate]);

  // Auto-chiusura pannello controlli dopo 2 secondi di inattività
  const resetControlsTimer = useCallback(() => {
    if (controlsAutoCloseTimeout.current) {
      clearTimeout(controlsAutoCloseTimeout.current);
    }
    setControlsFading(false);

    controlsAutoCloseTimeout.current = setTimeout(() => {
      // Inizia dissolvenza
      setControlsFading(true);
      // Dopo 300ms (durata animazione), chiudi
      setTimeout(() => {
        setShowMapControls(false);
        setControlsFading(false);
      }, 300);
    }, 2000);
  }, []);

  // Resetta timer quando si aprono i controlli
  useEffect(() => {
    if (showMapControls) {
      resetControlsTimer();
    } else {
      if (controlsAutoCloseTimeout.current) {
        clearTimeout(controlsAutoCloseTimeout.current);
      }
    }
    return () => {
      if (controlsAutoCloseTimeout.current) {
        clearTimeout(controlsAutoCloseTimeout.current);
      }
    };
  }, [showMapControls, resetControlsTimer]);

  // Carica preferenze utente all'avvio
  useEffect(() => {
    const loadPreferenze = async () => {
      try {
        const pref = await api.getPreferenze();
        if (map.current && preferenzeCaricate === false) {
          // Applica lo stile salvato
          if (pref?.mappa_stile) {
            map.current.setStyle(`mapbox://styles/mapbox/${pref.mappa_stile}`);
            setMapStyle(pref.mappa_stile);
            map.current.once('style.load', () => {
              setStyleLoaded(prev => prev + 1);
            });
          }
          // Applica posizione salvata
          if (pref?.mappa_center && pref?.mappa_zoom) {
            map.current.jumpTo({
              center: pref.mappa_center,
              zoom: pref.mappa_zoom,
              pitch: pref.mappa_pitch ?? 60,
              bearing: pref.mappa_bearing ?? -17.6,
            });
          }
          // Applica trasparenza salvata
          if (pref?.mappa_trasparenza != null) {
            setMapOpacity(pref.mappa_trasparenza);
          }
        }
        setPreferenzeCaricate(true);
      } catch (error) {
        console.error('Errore caricamento preferenze:', error);
        setPreferenzeCaricate(true);
      }
    };

    // Carica preferenze quando la mappa è pronta
    if (mapReady && !preferenzeCaricate) {
      loadPreferenze();
    }
  }, [mapReady, preferenzeCaricate]);

  // Inizializza mappa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [9.19, 45.46],
      zoom: 12,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    // Popup per le vendite (con close button, si chiude cliccando fuori)
    salesPopup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: [0, -20],
      maxWidth: '280px',
      className: 'sales-popup',
    });

    map.current.on('load', () => {
      console.log('Mappa caricata');
      setMapReady(true);
    });

    // Click generico sulla mappa per picking mode e quick mode
    map.current.on('click', (e) => {
      if (pickingModeRef.current && onPickPositionRef.current) {
        onPickPositionRef.current(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      // Verifica se il click è su un neurone
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ['neuroni-3d'] });
      const clickedOnEmpty = !features || features.length === 0;

      // Click su zona vuota - deseleziona e chiudi popup
      if (clickedOnEmpty) {
        // Chiudi popup se aperto
        if (popup.current) {
          popup.current.remove();
        }
        // Notifica Dashboard per resettare focusedNeuroneId (con coordinate per logging)
        if (onClearFocusRef.current) {
          onClearFocusRef.current(e.lngLat.lat, e.lngLat.lng);
        }

        // Quick Map Mode - click su zona vuota
        if (quickMapModeRef.current && onQuickMapClickRef.current) {
          onQuickMapClickRef.current(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y);
        }
      }
    });

    // Salva posizione quando l'utente sposta la mappa + tracking per AI (con debounce)
    map.current.on('moveend', () => {
      saveMapPositionRef.current();

      // Tracking movimento per AI (debounce 1 secondo per non loggare ogni micro-movimento)
      if (mapMoveDebounceRef.current) {
        clearTimeout(mapMoveDebounceRef.current);
      }
      mapMoveDebounceRef.current = setTimeout(() => {
        if (map.current && onMapMoveRef.current) {
          const center = map.current.getCenter();
          const zoom = map.current.getZoom();
          onMapMoveRef.current({ lat: center.lat, lng: center.lng }, zoom);
        }
      }, 1000);
    });

    return () => {
      popup.current?.remove();
      salesPopup.current?.remove();
      if (savePositionTimeout.current) {
        clearTimeout(savePositionTimeout.current);
      }
      if (mapMoveDebounceRef.current) {
        clearTimeout(mapMoveDebounceRef.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Vola a una posizione quando flyToPosition cambia (con parametri opzionali)
  useEffect(() => {
    if (!map.current || !mapReady || !flyToPosition) return;

    map.current.flyTo({
      center: [flyToPosition.lng, flyToPosition.lat],
      zoom: flyToPosition.zoom ?? 14,
      pitch: flyToPosition.pitch ?? 60,
      bearing: flyToPosition.bearing ?? map.current.getBearing(),
      duration: 1500,
    });
  }, [flyToPosition, mapReady]);

  // Cambia stile mappa quando richiesto dall'AI
  useEffect(() => {
    if (!map.current || !mapReady || !aiStyleChange) return;

    console.log('AI: Cambio stile mappa a', aiStyleChange);
    map.current.setStyle(`mapbox://styles/mapbox/${aiStyleChange}`);
    setMapStyle(aiStyleChange);

    // Quando lo stile è caricato, notifica il parent
    map.current.once('style.load', () => {
      setStyleLoaded(prev => prev + 1);
      onAiStyleApplied?.();
    });
  }, [aiStyleChange, mapReady, onAiStyleApplied]);

  // Cambia cursore in picking mode o quick mode
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const canvas = map.current.getCanvas();
    const container = map.current.getContainer();

    if (pickingMode) {
      // Forza cursore crosshair su canvas e container
      canvas.style.cursor = 'crosshair';
      container.style.cursor = 'crosshair';
      container.classList.add('picking-mode');
    } else if (quickMapMode) {
      // Cursore crosshair per quick map mode (sulla mappa vuota)
      // Il cursore pointer sulle entità viene gestito da mouseenter/mouseleave
      canvas.style.cursor = 'crosshair';
      container.style.cursor = 'crosshair';
      container.classList.add('quick-map-mode');
    } else {
      canvas.style.cursor = '';
      container.style.cursor = '';
      container.classList.remove('picking-mode');
      container.classList.remove('quick-map-mode');
    }
  }, [pickingMode, quickMapMode, mapReady]);

  // Mostra marker temporaneo quando si seleziona posizione
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Rimuovi marker esistente
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Crea nuovo marker se c'è una posizione
    if (pickedPosition) {
      // Crea elemento HTML per il marker (spillo rosso)
      const el = document.createElement('div');
      el.innerHTML = `
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.716 23.284 0 15 0z" fill="#ef4444"/>
          <circle cx="15" cy="14" r="6" fill="white"/>
        </svg>
      `;
      el.style.cursor = 'pointer';

      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pickedPosition.lng, pickedPosition.lat])
        .addTo(map.current);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [pickedPosition, mapReady]);

  // Aggiorna layer quando cambiano i dati
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const m = map.current;

    // Aspetta che lo stile sia completamente caricato
    if (!m.isStyleLoaded()) {
      console.log('DEBUG MapView: stile non ancora caricato, riprovo tra 100ms...');
      // Riprova dopo un breve delay
      const timer = setTimeout(() => {
        console.log('DEBUG MapView: riprovo dopo delay, isStyleLoaded:', m.isStyleLoaded());
        setStyleLoaded(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }

    // Filtra neuroni con coordinate
    let neuroniConCoord = neuroni.filter((n) => n.lat && n.lng);

    console.log('DEBUG MapView neuroni:', {
      totali: neuroni.length,
      conCoordinate: neuroniConCoord.length,
      tipiNeuroneCaricati: tipiNeurone.length,
      primi: neuroni.slice(0, 2).map(n => ({ id: n.id, nome: n.nome, lat: n.lat, lng: n.lng }))
    });

    // Applica filtri se attivi (case-insensitive)
    if (filtri.tipiSelezionati.length > 0) {
      const tipiLower = filtri.tipiSelezionati.map(t => t.toLowerCase());
      neuroniConCoord = neuroniConCoord.filter(n => tipiLower.includes(n.tipo?.toLowerCase()));
    }
    if (filtri.categorieSelezionate.length > 0) {
      neuroniConCoord = neuroniConCoord.filter(n =>
        n.categorie.some(cat =>
          filtri.categorieSelezionate.some(fc => fc.toLowerCase() === cat.toLowerCase())
        )
      );
    }
    if (filtri.ricerca.trim()) {
      const searchLower = filtri.ricerca.toLowerCase().trim();
      neuroniConCoord = neuroniConCoord.filter(n =>
        n.nome.toLowerCase().includes(searchLower) ||
        n.indirizzo?.toLowerCase().includes(searchLower) ||
        n.categorie.some(c => c.toLowerCase().includes(searchLower))
      );
    }

    // Aspetta che tipiNeurone sia caricato per determinare le forme corrette
    if (tipiNeurone.length === 0) return;

    console.log('DEBUG MapView: inizia creazione features, neuroniConCoord:', neuroniConCoord.length);

    try {
    // Funzione per ottenere il colore dalla prima categoria del neurone (case-insensitive)
    const getCategoriaColor = (neuroneCategorie: string[]): string => {
      if (!neuroneCategorie || neuroneCategorie.length === 0) return DEFAULT_COLOR;
      const primaCategoria = neuroneCategorie[0].toLowerCase();
      const cat = categorie.find(c => c.nome.toLowerCase() === primaCategoria);
      return cat?.colore || DEFAULT_COLOR;
    };

    // Funzione per ottenere la forma dal tipo neurone (case-insensitive)
    type Forma = 'cerchio' | 'quadrato' | 'triangolo' | 'stella' | 'croce' | 'esagono';
    const getTipoForma = (tipoNome: string): Forma => {
      const tipo = tipiNeurone.find(t => t.nome.toLowerCase() === tipoNome.toLowerCase());
      if (tipo?.forma && ['cerchio', 'quadrato', 'triangolo', 'stella', 'croce', 'esagono'].includes(tipo.forma)) {
        return tipo.forma as Forma;
      }
      return 'cerchio';
    };

    // Crea il poligono in base alla forma
    const createPolygon = (forma: Forma, lng: number, lat: number, size: number): number[][] => {
      switch (forma) {
        case 'quadrato': return createSquarePolygon(lng, lat, size);
        case 'triangolo': return createTrianglePolygon(lng, lat, size);
        case 'stella': return createStarPolygon(lng, lat, size);
        case 'croce': return createCrossPolygon(lng, lat, size);
        case 'esagono': return createHexagonPolygon(lng, lat, size);
        case 'cerchio':
        default: return createCirclePolygon(lng, lat, size / 2, 24);
      }
    };

    // Crea GeoJSON per neuroni
    const neuroniFeatures = neuroniConCoord.map((neurone) => {
      const forma = getTipoForma(neurone.tipo);
      const isQuadrato = forma !== 'cerchio'; // Tutte le forme non-cerchio hanno size simile
      // Usa dimensione personalizzata se presente, altrimenti default
      const defaultSize = isQuadrato ? 50 : 40; // metri
      const baseSize = neurone.dimensione ? Number(neurone.dimensione) : defaultSize;
      const height = calculateHeight(neurone, getSinapsiCount(neurone.id));

      // IMPORTANTE: converti lat/lng a numeri (potrebbero essere stringhe dal DB)
      const lng = Number(neurone.lng);
      const lat = Number(neurone.lat);
      const polygon = createPolygon(forma, lng, lat, baseSize);

      // Usa il colore della prima categoria del neurone
      const neuroneCategorie = Array.isArray(neurone.categorie) ? neurone.categorie : [];
      const color = getCategoriaColor(neuroneCategorie);

      return {
        type: 'Feature' as const,
        properties: {
          id: neurone.id,
          nome: neurone.nome,
          tipo: neurone.tipo,
          categorie: neuroneCategorie.join(', '),
          color: color,
          height: height,
          base_height: 0,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [polygon],
        },
      };
    });

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: neuroniFeatures,
    };

    // Usa setData se la source esiste già, altrimenti crea source e layers
    const existingSource = m.getSource('neuroni') as mapboxgl.GeoJSONSource | undefined;
    console.log('DEBUG MapView source neuroni:', existingSource ? 'esiste, aggiorno dati' : 'non esiste, creo layer');
    if (existingSource) {
      // Aggiorna solo i dati, non ricreare i layer
      existingSource.setData(geojsonData);
    } else {
      // Prima volta: crea source e layers
      m.addSource('neuroni', {
        type: 'geojson',
        data: geojsonData,
      });

      // Layer 3D extrusion con altezze dinamiche
      m.addLayer({
        id: 'neuroni-3d',
        type: 'fill-extrusion',
        source: 'neuroni',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true, // Gradiente verticale (più chiaro in alto)
        },
      });

      // Layer bordo 2D alla base per definire meglio le forme
      m.addLayer({
        id: 'neuroni-outline',
        type: 'line',
        source: 'neuroni',
        paint: {
          'line-color': '#1e293b', // Grigio scuro
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    }

    // Crea anelli venduto (solo per neuroni con venduto > 0)
    const vendutoRingFeatures = neuroniConCoord
      .filter(n => n.venduto_totale && n.venduto_totale > 0 && n.potenziale && n.potenziale > 0)
      .map((neurone) => {
        const forma = getTipoForma(neurone.tipo);
        const isQuadrato = forma === 'quadrato';
        const defaultSize = isQuadrato ? 50 : 40;
        const baseSize = neurone.dimensione ? Number(neurone.dimensione) : defaultSize;
        const height = calculateHeight(neurone, getSinapsiCount(neurone.id));
        const vendutoHeight = calculateVendutoHeight(neurone, height);

        // IMPORTANTE: converti lat/lng a numeri
        const lng = Number(neurone.lng);
        const lat = Number(neurone.lat);

        // Ring leggermente più grande dell'edificio
        const ringWidth = 3; // metri di spessore dell'anello
        const ringPolygon = isQuadrato
          ? createSquareRing(lng, lat, baseSize, baseSize + ringWidth * 2)
          : createRingPolygon(lng, lat, baseSize / 2, (baseSize / 2) + ringWidth, 24);

        return {
          type: 'Feature' as const,
          properties: {
            id: neurone.id,
            venduto_height: vendutoHeight,
            ring_height: 4, // altezza dell'anello in metri
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: ringPolygon,
          },
        };
      });

    // Aggiorna o crea layer anelli venduto
    const vendutoGeoJson = {
      type: 'FeatureCollection' as const,
      features: vendutoRingFeatures,
    };
    const existingVendutoSource = m.getSource('venduto-rings') as mapboxgl.GeoJSONSource | undefined;
    if (existingVendutoSource) {
      existingVendutoSource.setData(vendutoGeoJson);
    } else if (vendutoRingFeatures.length > 0) {
      m.addSource('venduto-rings', {
        type: 'geojson',
        data: vendutoGeoJson,
      });

      // Layer anello venduto (3D)
      m.addLayer({
        id: 'venduto-ring',
        type: 'fill-extrusion',
        source: 'venduto-rings',
        paint: {
          'fill-extrusion-color': '#22c55e', // Verde success
          'fill-extrusion-height': ['+', ['get', 'venduto_height'], ['get', 'ring_height']],
          'fill-extrusion-base': ['get', 'venduto_height'],
          'fill-extrusion-opacity': 0.95,
        },
      });
    }

    // Sinapsi - applica filtri visibilità
    // NOTA: il backend già filtra per data, qui filtriamo solo per coordinate valide
    let sinapsiFiltered = sinapsi.filter((s) => {
      const hasCoords = s.lat_da && s.lng_da && s.lat_a && s.lng_a;
      if (!hasCoords) {
        console.warn('DEBUG sinapsi senza coordinate:', {
          id: s.id,
          nome_da: s.nome_da,
          nome_a: s.nome_a,
          lat_da: s.lat_da,
          lng_da: s.lng_da,
          lat_a: s.lat_a,
          lng_a: s.lng_a
        });
      }
      return hasCoords;
    });

    // ID da usare per il filtro connessioni (può essere diverso da selectedId)
    const idPerFiltro = filterSelectedId ?? selectedId;

    console.log('DEBUG MapView sinapsi - stato completo:', {
      mostraConnessioni: filtri.mostraConnessioni,
      soloConnessioniSelezionate: filtri.soloConnessioniSelezionate,
      selectedId: selectedId,
      filterSelectedId: filterSelectedId,
      idPerFiltro: idPerFiltro,
      sinapsiTotali: sinapsi.length,
      sinapsiConCoord: sinapsiFiltered.length,
    });

    // Nascondi tutte le connessioni se il flag è disattivato
    if (!filtri.mostraConnessioni) {
      console.log('DEBUG: mostraConnessioni=false -> nascondo tutte');
      sinapsiFiltered = [];
    }
    // Mostra solo connessioni del neurone selezionato/in focus
    else if (filtri.soloConnessioniSelezionate) {
      if (idPerFiltro) {
        const prima = sinapsiFiltered.length;
        console.log('DEBUG soloConnessioniSelezionate: filtro per idPerFiltro=', idPerFiltro);
        sinapsiFiltered = sinapsiFiltered.filter(
          (s) => s.neurone_da === idPerFiltro || s.neurone_a === idPerFiltro
        );
        console.log('DEBUG soloConnessioniSelezionate: da', prima, 'a', sinapsiFiltered.length);
      } else {
        console.log('DEBUG soloConnessioniSelezionate=true ma idPerFiltro=null -> nascondo tutte');
        sinapsiFiltered = [];
      }
    }

    if (sinapsiFiltered.length > 0) {
      // Crea una mappa per lookup veloce dei neuroni per ID
      const neuroniMap = new Map(neuroni.map(n => [n.id, n]));

      // Altezza parabole e spaziatura
      const PARABOLA_HEIGHT = 40;  // altezza di ogni parabola
      const STACK_SPACING = 20;    // spaziatura verticale tra livelli
      const LATERAL_SPACING = 8;   // spaziatura laterale tra parabole affiancate (metri)

      // Colori auto-generati per famiglie prodotto senza colore
      const FAMIGLIA_COLORS = [
        '#ef4444', // rosso
        '#f97316', // arancione
        '#eab308', // giallo
        '#22c55e', // verde
        '#14b8a6', // teal
        '#3b82f6', // blu
        '#8b5cf6', // viola
        '#ec4899', // rosa
      ];

      const sinapsiFeatures: GeoJSON.Feature[] = [];
      const volumeFeatures: GeoJSON.Feature[] = [];

      sinapsiFiltered.forEach((s) => {
        // Usa le coordinate aggiornate dai neuroni (non quelle salvate nella sinapsi)
        const neuroneDa = neuroniMap.get(s.neurone_da);
        const neuroneA = neuroniMap.get(s.neurone_a);

        // Se troviamo i neuroni, usa le loro coordinate aggiornate
        // Altrimenti fallback alle coordinate salvate nella sinapsi
        const lngDa = neuroneDa?.lng ?? Number(s.lng_da);
        const latDa = neuroneDa?.lat ?? Number(s.lat_da);
        const lngA = neuroneA?.lng ?? Number(s.lng_a);
        const latA = neuroneA?.lat ?? Number(s.lat_a);

        // Famiglie prodotto delle transazioni (per parabole affiancate al livello base)
        const famiglieTransazioni = s.famiglie_transazioni || [];

        // Tipi di connessione NON commerciali (per parabole sovrapposte sopra)
        const tipiConnessione: string[] = Array.isArray(s.tipo_connessione) && s.tipo_connessione.length > 0
          ? s.tipo_connessione.filter(t => t.toLowerCase() !== 'commerciale')
          : [];

        // Properties comuni per hit detection (include tutti i tipi)
        const commonProps = {
          id: s.id,
          tipo: s.tipo_connessione,
          valore: Number(s.valore) || 1,
          certezza: s.certezza,
          neurone_da_nome: neuroneDa?.nome || 'Sconosciuto',
          neurone_a_nome: neuroneA?.nome || 'Sconosciuto',
          neurone_da_tipo: neuroneDa?.tipo || '',
          neurone_a_tipo: neuroneA?.tipo || '',
        };

        // === LIVELLO BASE: Parabole AFFIANCATE per famiglie prodotto ===
        // Se non ci sono famiglie transazioni ma c'è tipo commerciale, mostra una parabola generica
        const hasFamiglieTransazioni = famiglieTransazioni.length > 0;
        const hasCommerciale = (s.tipo_connessione || []).some(t => t.toLowerCase() === 'commerciale');

        if (hasFamiglieTransazioni) {
          // Calcola offset laterale per centrare le parabole affiancate
          const numFamiglie = famiglieTransazioni.length;
          const totalWidth = (numFamiglie - 1) * LATERAL_SPACING;
          const startOffset = -totalWidth / 2;

          famiglieTransazioni.forEach((fam, famIndex) => {
            // Offset laterale per questa famiglia
            const lateralOffset = startOffset + famIndex * LATERAL_SPACING;

            // Colore: usa quello della famiglia o genera automaticamente
            const famigliaColor = fam.famiglia_colore || FAMIGLIA_COLORS[famIndex % FAMIGLIA_COLORS.length];

            // Crea parabola 3D al livello base con offset laterale
            const parabola = createParabola3D(
              lngDa, latDa,
              lngA, latA,
              15,             // 15 punti per curva fluida
              PARABOLA_HEIGHT, // altezza dell'arco
              0,              // livello base (altezza 0)
              lateralOffset   // offset laterale per affiancare
            );

            // Properties per questa parabola famiglia
            const props = {
              ...commonProps,
              tipoSingolo: 'transazione',
              famigliaNome: fam.famiglia_nome,
              famigliaId: fam.famiglia_id,
              tipoColor: famigliaColor,
              baseHeight: 0,
              elevation: parabola.elevation,
              volume: fam.volume,
            };

            sinapsiFeatures.push({
              type: 'Feature' as const,
              properties: props,
              geometry: {
                type: 'LineString' as const,
                coordinates: parabola.coordinates,
              },
            });
          });
        } else if (hasCommerciale || tipiConnessione.length === 0) {
          // Nessuna transazione: mostra parabola generica al livello base
          // (anche se non è esplicitamente commerciale, serve per visualizzare la connessione)
          const parabola = createParabola3D(
            lngDa, latDa,
            lngA, latA,
            15,
            PARABOLA_HEIGHT,
            0,
            0
          );

          const props = {
            ...commonProps,
            tipoSingolo: hasCommerciale ? 'commerciale' : 'connessione',
            tipoColor: hasCommerciale
              ? (TIPO_CONNESSIONE_COLORS['commerciale'] || '#3b82f6')
              : '#94a3b8', // grigio per connessioni generiche
            baseHeight: 0,
            elevation: parabola.elevation,
          };

          sinapsiFeatures.push({
            type: 'Feature' as const,
            properties: props,
            geometry: {
              type: 'LineString' as const,
              coordinates: parabola.coordinates,
            },
          });
        }

        // === LIVELLI SUPERIORI: Parabole SOVRAPPOSTE per tipi di connessione (non commerciali) ===
        tipiConnessione.forEach((tipo, index) => {
          // Calcola altezza base: livello 1+ (sopra le transazioni)
          const baseHeight = (index + 1) * (PARABOLA_HEIGHT + STACK_SPACING);

          // Crea parabola 3D a questa altezza
          const parabola = createParabola3D(
            lngDa, latDa,
            lngA, latA,
            15,
            PARABOLA_HEIGHT,
            baseHeight,
            0  // nessun offset laterale per i tipi connessione
          );

          // Colore basato sul tipo di connessione
          const tipoLower = tipo.toLowerCase();
          const tipoColor = TIPO_CONNESSIONE_COLORS[tipoLower] || '#94a3b8';

          const props = {
            ...commonProps,
            tipoSingolo: tipo,
            tipoColor: tipoColor,
            baseHeight: baseHeight,
            elevation: parabola.elevation,
          };

          sinapsiFeatures.push({
            type: 'Feature' as const,
            properties: props,
            geometry: {
              type: 'LineString' as const,
              coordinates: parabola.coordinates,
            },
          });
        });

        // Feature volume per hit detection 3D
        // Altezza che copre tutti i livelli (famiglie + tipi connessione)
        const numLivelli = 1 + tipiConnessione.length; // livello base + tipi sopra
        const maxVolumeHeight = numLivelli * (PARABOLA_HEIGHT + STACK_SPACING);
        const ribbonCoords = createRibbonPolygon(lngDa, latDa, lngA, latA, 20, 35);
        if (ribbonCoords.length > 0) {
          volumeFeatures.push({
            type: 'Feature' as const,
            properties: { ...commonProps, maxHeight: maxVolumeHeight },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [ribbonCoords],
            },
          });
        }
      });

      const sinapsiGeoJson = {
        type: 'FeatureCollection' as const,
        features: sinapsiFeatures,
      };
      const volumesGeoJson = {
        type: 'FeatureCollection' as const,
        features: volumeFeatures,
      };

      // Usa setData se le sources esistono già
      const existingSinapsiSource = m.getSource('sinapsi') as mapboxgl.GeoJSONSource | undefined;
      const existingVolumesSource = m.getSource('sinapsi-volumes') as mapboxgl.GeoJSONSource | undefined;

      if (existingSinapsiSource && existingVolumesSource) {
        existingSinapsiSource.setData(sinapsiGeoJson);
        existingVolumesSource.setData(volumesGeoJson);
      } else {
        // Prima volta: crea sources e layers
        m.addSource('sinapsi', {
          type: 'geojson',
          lineMetrics: true, // necessario per line-z-offset
          data: sinapsiGeoJson,
        });

        // Source per volumi hit detection 3D
        m.addSource('sinapsi-volumes', {
          type: 'geojson',
          data: volumesGeoJson,
        });

        // Layer ombra/bordo (sotto) - dà profondità alla linea
        // Usa baseHeight per alzare ogni parabola al suo livello
        m.addLayer({
          id: 'sinapsi-lines-shadow',
          type: 'line',
          source: 'sinapsi',
          layout: {
            'line-z-offset': [
              '+',
              ['coalesce', ['get', 'baseHeight'], 0],
              [
                'interpolate',
                ['linear'],
                ['line-progress'],
                ...Array.from({ length: 16 }, (_, i) => {
                  const t = i / 15;
                  return [t, 4 * 40 * t * (1 - t) - 3]; // parabola (40m) - 3m per ombra
                }).flat()
              ]
            ],
          },
          paint: {
            'line-color': '#000000',
            'line-width': 6,
            'line-opacity': 0.3,
            'line-blur': 2,
          },
        });

        // Layer principale colorato - colore basato sul tipo di connessione
        m.addLayer({
          id: 'sinapsi-lines',
          type: 'line',
          source: 'sinapsi',
          layout: {
            'line-z-offset': [
              '+',
              ['coalesce', ['get', 'baseHeight'], 0],
              [
                'interpolate',
                ['linear'],
                ['line-progress'],
                ...Array.from({ length: 16 }, (_, i) => {
                  const t = i / 15;
                  return [t, 4 * 40 * t * (1 - t)]; // parabola (40m)
                }).flat()
              ]
            ],
          },
          paint: {
            // Colore dal tipo di connessione (tipoColor)
            'line-color': ['coalesce', ['get', 'tipoColor'], '#94a3b8'],
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });

        // Layer hit 3D - volume trasparente per hit detection su tutta l'altezza
        m.addLayer({
          id: 'sinapsi-hit',
          type: 'fill-extrusion',
          source: 'sinapsi-volumes',
          paint: {
            'fill-extrusion-color': '#ff0000',
            'fill-extrusion-height': ['coalesce', ['get', 'maxHeight'], 60], // altezza dinamica
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0, // invisibile ma cliccabile!
          },
        });
      }
    } else {
      // Nessuna sinapsi da mostrare - se le sources esistono, svuotale
      const existingSinapsiSource = m.getSource('sinapsi') as mapboxgl.GeoJSONSource | undefined;
      const existingVolumesSource = m.getSource('sinapsi-volumes') as mapboxgl.GeoJSONSource | undefined;
      if (existingSinapsiSource) {
        existingSinapsiSource.setData({ type: 'FeatureCollection', features: [] });
      }
      if (existingVolumesSource) {
        existingVolumesSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Event handlers (solo una volta)
    if (!handlersAdded.current) {
      let clickTimeout: ReturnType<typeof setTimeout> | null = null;

      m.on('mouseenter', 'neuroni-3d', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0] && popup.current) {
          const props = e.features[0].properties;

          // Calcola offset dinamico: popup deve stare sopra la CIMA dell'edificio
          const buildingHeight = props?.height || 35;
          const pitch = m.getPitch();
          const zoom = m.getZoom();
          // Conversione altezza edificio (metri) in pixel sullo schermo
          // Fattore zoom: scala più dolcemente per evitare popup troppo alti a zoom bassi
          const zoomFactor = Math.pow(2, (zoom - 14) * 0.7); // esponente ridotto
          const pitchFactor = Math.sin((pitch * Math.PI) / 180);
          // Fattore 0.35 calibrato per stare appena sopra la cima
          const heightPixels = buildingHeight * zoomFactor * pitchFactor * 0.35;
          // Margine fisso ridotto (20px) + altezza proporzionale
          const totalOffset = 20 + Math.min(heightPixels, 120);

          popup.current.setOffset([0, -totalOffset]);
          popup.current
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${props?.nome}</strong><br/><span style="color:#64748b;font-size:12px">${props?.categorie}</span>`)
            .addTo(m);
        }
      });

      m.on('mouseleave', 'neuroni-3d', () => {
        m.getCanvas().style.cursor = '';
        popup.current?.remove();
      });

      // Click singolo: mostra popup vendite - ignora se in picking mode
      m.on('click', 'neuroni-3d', (e) => {
        // Se siamo in picking mode per posizione, non gestire click sui neuroni
        if (pickingModeRef.current) return;

        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          const neurone = neuroniRef.current.find(n => n.id === id);

          // IMPORTANTE: connectionPickingMode va controllato PRIMA di quickMapMode
          // perché è una modalità più specifica attivata da quick actions
          if (connectionPickingModeRef.current && neurone) {
            console.log('DEBUG MapView click: connectionPickingMode attivo, neurone:', neurone.nome, 'sourceId:', connectionSourceIdRef.current);
            // Non permettere di selezionare se stesso
            if (neurone.id === connectionSourceIdRef.current) {
              alert('Non puoi collegare un\'entità a se stessa!');
              return;
            }
            // Chiama callback per target selezionato
            if (onPickConnectionTargetRef.current) {
              console.log('DEBUG MapView: chiamando onPickConnectionTarget per:', neurone.nome);
              onPickConnectionTargetRef.current(neurone);
            }
            return;
          }

          // Se siamo in Quick Map Mode, mostra popup azioni per l'entità
          if (quickMapModeRef.current && neurone && onQuickEntityClickRef.current) {
            onQuickEntityClickRef.current(neurone, e.point.x, e.point.y);
            return;
          }

          // Aspetta per vedere se è un doppio click
          if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            // È un doppio click - zoom
            if (neurone?.lat && neurone?.lng) {
              m.flyTo({
                center: [neurone.lng, neurone.lat],
                zoom: 16,
                pitch: 60,
                duration: 1000,
              });
            }
          } else {
            clickTimeout = setTimeout(async () => {
              clickTimeout = null;
              // È un click singolo
              // Se il DetailPanel è già aperto (selectedId è impostato) e si clicca su un altro edificio,
              // cambia direttamente il panel senza mostrare il popup
              if (neurone && selectedIdRef.current && neurone.id !== selectedIdRef.current) {
                salesPopup.current?.remove();
                onSelectNeuroneRef.current(neurone);
                return;
              }

              // Mostra popup vendite
              if (neurone && neurone.lat && neurone.lng && salesPopup.current) {
                // Chiudi popup hover
                popup.current?.remove();

                // Notifica che questo neurone è "in focus" (per filtro connessioni)
                if (onFocusNeuroneRef.current) {
                  onFocusNeuroneRef.current(neurone.id);
                }

                // Calcola offset dinamico: popup deve stare sopra la CIMA dell'edificio
                const buildingHeight = calculateHeight(neurone, getSinapsiCount(neurone.id));
                const pitch = m.getPitch();
                const zoom = m.getZoom();
                // Fattore zoom: scala più dolcemente per evitare popup troppo alti a zoom bassi
                const zoomFactor = Math.pow(2, (zoom - 14) * 0.7); // esponente ridotto
                const pitchFactor = Math.sin((pitch * Math.PI) / 180);
                // Fattore 0.35 calibrato per stare appena sopra la cima
                const heightPixels = buildingHeight * zoomFactor * pitchFactor * 0.35;
                // Margine fisso ridotto (20px) + altezza proporzionale
                const totalOffset = 20 + Math.min(heightPixels, 120);

                salesPopup.current.setOffset([0, -totalOffset]);

                // Mostra popup con loading
                const loadingHtml = `
                  <div style="padding: 8px; min-width: 200px;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${neurone.nome}</div>
                    <div style="color: #64748b; font-size: 12px;">Caricamento...</div>
                  </div>
                `;
                salesPopup.current
                  .setLngLat([neurone.lng, neurone.lat])
                  .setHTML(loadingHtml)
                  .addTo(m);

                // Carica dati vendite
                try {
                  const venditeRes = await api.get(`/vendite?neurone_id=${neurone.id}`);
                  const vendite: VenditaProdotto[] = venditeRes.data.data || [];
                  const potenziale = venditeRes.data.potenziale || 0;
                  const totaleVenduto = venditeRes.data.totale_venduto || 0;
                  const percentuale = potenziale > 0 ? Math.round((totaleVenduto / potenziale) * 100) : 0;

                  // Genera HTML colonne prodotti (se ci sono vendite)
                  let colonneHtml = '';
                  if (vendite.length > 0) {
                    colonneHtml = '<div style="display: flex; align-items: flex-end; gap: 3px; height: 50px; margin: 8px 0;">';
                    const maxImporto = potenziale > 0 ? potenziale : Math.max(...vendite.map(v => v.importo), 1);
                    vendite.forEach((v, i) => {
                      const altezza = Math.max((v.importo / maxImporto) * 100, 5);
                      const colore = coloriProdotti[i % coloriProdotti.length];
                      colonneHtml += `<div title="${v.famiglia_nome || 'Prodotto'}: €${v.importo.toLocaleString('it-IT')}" style="width: 20px; height: ${altezza}%; background: ${colore}; border-radius: 2px 2px 0 0;"></div>`;
                    });
                    colonneHtml += '</div>';
                  }

                  // Genera HTML popup completo
                  // Mostra dati vendite se ci sono vendite OPPURE se c'è un potenziale impostato
                  const hasDatiVendite = totaleVenduto > 0 || potenziale > 0;
                  const popupHtml = `
                    <div style="padding: 8px; min-width: 220px;">
                      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${neurone.nome}</div>
                      <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">${neurone.tipo} ${neurone.categorie?.length ? '• ' + neurone.categorie.join(', ') : ''}</div>

                      ${hasDatiVendite ? `
                        <div style="margin-bottom: 4px;">
                          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                            <span>Venduto: €${totaleVenduto.toLocaleString('it-IT')}</span>
                            ${potenziale > 0 ? `<span style="font-weight: 600; color: ${percentuale >= 100 ? '#22c55e' : '#1e293b'};">${percentuale}%</span>` : ''}
                          </div>
                          ${potenziale > 0 ? `
                            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 2px;">
                              <div style="height: 100%; width: ${Math.min(percentuale, 100)}%; background: ${percentuale >= 100 ? '#22c55e' : percentuale >= 50 ? '#eab308' : '#ef4444'}; border-radius: 3px;"></div>
                            </div>
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Potenziale: €${potenziale.toLocaleString('it-IT')}</div>
                          ` : ''}
                        </div>
                        ${colonneHtml}
                      ` : `
                        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">Nessun dato vendite</div>
                      `}

                      <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button id="btn-quick-${neurone.id}" style="width: 40px; padding: 8px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 18px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                          +
                        </button>
                        <button id="btn-dettagli-${neurone.id}" style="flex: 1; padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;">
                          Dettagli →
                        </button>
                      </div>
                    </div>
                  `;

                  salesPopup.current?.setHTML(popupHtml);

                  // Aggiungi event listener ai bottoni
                  setTimeout(() => {
                    const btnDettagli = document.getElementById(`btn-dettagli-${neurone.id}`);
                    if (btnDettagli) {
                      btnDettagli.onclick = () => {
                        salesPopup.current?.remove();
                        onSelectNeuroneRef.current(neurone);
                      };
                    }
                    const btnQuick = document.getElementById(`btn-quick-${neurone.id}`);
                    if (btnQuick && onQuickEntityClickRef.current && map.current) {
                      btnQuick.onclick = () => {
                        // Calcola posizione screen del neurone PRIMA di rimuovere il popup
                        const point = map.current?.project([neurone.lng!, neurone.lat!]);
                        salesPopup.current?.remove();
                        if (point) {
                          onQuickEntityClickRef.current!(neurone, point.x, point.y);
                        }
                      };
                    }
                  }, 50);

                } catch (error) {
                  console.error('Errore caricamento vendite per popup:', error);
                  // In caso di errore, mostra comunque i bottoni
                  const errorHtml = `
                    <div style="padding: 8px; min-width: 200px;">
                      <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${neurone.nome}</div>
                      <div style="display: flex; gap: 8px;">
                        <button id="btn-quick-${neurone.id}" style="width: 40px; padding: 8px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 18px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                          +
                        </button>
                        <button id="btn-dettagli-${neurone.id}" style="flex: 1; padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;">
                          Dettagli →
                        </button>
                      </div>
                    </div>
                  `;
                  salesPopup.current?.setHTML(errorHtml);
                  setTimeout(() => {
                    const btnDettagli = document.getElementById(`btn-dettagli-${neurone.id}`);
                    if (btnDettagli) {
                      btnDettagli.onclick = () => {
                        salesPopup.current?.remove();
                        onSelectNeuroneRef.current(neurone);
                      };
                    }
                    const btnQuick = document.getElementById(`btn-quick-${neurone.id}`);
                    if (btnQuick && onQuickEntityClickRef.current && map.current) {
                      btnQuick.onclick = () => {
                        const point = map.current?.project([neurone.lng!, neurone.lat!]);
                        salesPopup.current?.remove();
                        if (point) {
                          onQuickEntityClickRef.current!(neurone, point.x, point.y);
                        }
                      };
                    }
                  }, 50);
                }
              }
            }, 250);
          }
        }
      });

      // Handler per le connessioni (sinapsi) - hover e click
      // Usa layer 'sinapsi-hit' che è più largo e facile da colpire
      m.on('mouseenter', 'sinapsi-hit', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0] && popup.current) {
          const props = e.features[0].properties;
          const tipo = props?.tipo || 'Connessione';
          const certezza = props?.certezza || '';
          const neuroneDA = props?.neurone_da_nome || '';
          const neuroneA = props?.neurone_a_nome || '';

          // Popup breve con tipo connessione
          const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1);
          const certezzaColor = certezza === 'certo' ? '#22c55e' : certezza === 'probabile' ? '#eab308' : '#94a3b8';

          popup.current.setOffset([0, -10]);
          popup.current
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="padding: 4px 8px;">
                <strong style="font-size: 13px;">${tipoLabel}</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  ${neuroneDA} → ${neuroneA}
                </div>
                ${certezza ? `<div style="font-size: 10px; color: ${certezzaColor}; margin-top: 2px;">● ${certezza}</div>` : ''}
              </div>
            `)
            .addTo(m);
        }
      });

      m.on('mouseleave', 'sinapsi-hit', () => {
        m.getCanvas().style.cursor = '';
        popup.current?.remove();
      });

      // Click su connessione - mostra popup dettagliato con dati oggettivi/soggettivi
      m.on('click', 'sinapsi-hit', async (e) => {
        if (pickingModeRef.current || connectionPickingModeRef.current || quickMapModeRef.current) return;

        if (e.features && e.features[0] && salesPopup.current) {
          const props = e.features[0].properties;
          const sinapsiId = props?.id;
          let tipoRaw = props?.tipo || 'Connessione';
          const certezza = props?.certezza || '';
          const neuroneDA = props?.neurone_da_nome || 'Sconosciuto';
          const neuroneA = props?.neurone_a_nome || 'Sconosciuto';
          const tipoDA = props?.neurone_da_tipo || '';
          const tipoA = props?.neurone_a_tipo || '';

          // Chiudi popup hover
          popup.current?.remove();

          // Parse tipo (può essere JSON array)
          let tipoLabel = 'Connessione';
          try {
            if (typeof tipoRaw === 'string' && tipoRaw.startsWith('[')) {
              const tipoArr = JSON.parse(tipoRaw);
              if (Array.isArray(tipoArr) && tipoArr.length > 0) {
                tipoLabel = tipoArr.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
              }
            } else if (typeof tipoRaw === 'string') {
              tipoLabel = tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1);
            }
          } catch {
            tipoLabel = String(tipoRaw);
          }

          const certezzaColor = certezza === 'certo' ? '#22c55e' : certezza === 'probabile' ? '#eab308' : '#94a3b8';
          const certezzaLabel = certezza === 'certo' ? 'Certo' : certezza === 'probabile' ? 'Probabile' : 'Ipotetico';

          // Icona in base al tipo di connessione
          let tipoIcon = '🔗';
          const tipoLower = tipoLabel.toLowerCase();
          if (tipoLower.includes('vendita') || tipoLower.includes('acquisto') || tipoLower.includes('commerciale')) {
            tipoIcon = '💰';
          } else if (tipoLower.includes('collabora')) {
            tipoIcon = '🤝';
          } else if (tipoLower.includes('influencer') || tipoLower.includes('influenza') || tipoLower.includes('prescrittore')) {
            tipoIcon = '⭐';
          } else if (tipoLower.includes('partner')) {
            tipoIcon = '🤝';
          } else if (tipoLower.includes('forni')) {
            tipoIcon = '📦';
          } else if (tipoLower.includes('client')) {
            tipoIcon = '👤';
          } else if (tipoLower.includes('tecnico')) {
            tipoIcon = '🔧';
          }

          // Mostra popup base con loading
          const loadingHtml = `
            <div style="padding: 10px; min-width: 220px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${tipoIcon}</span>
                <span style="font-weight: 600; font-size: 15px;">${tipoLabel}</span>
              </div>
              <div style="background: #f8fafc; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                <div style="font-size: 13px; font-weight: 500;">${neuroneDA}</div>
                <div style="text-align: center; color: #94a3b8; margin: 4px 0;">↕</div>
                <div style="font-size: 13px; font-weight: 500;">${neuroneA}</div>
              </div>
              <div style="text-align: center; color: #94a3b8; font-size: 11px;">Caricamento dati...</div>
            </div>
          `;

          salesPopup.current.setOffset([0, -10]);
          salesPopup.current
            .setLngLat(e.lngLat)
            .setHTML(loadingHtml)
            .addTo(m);

          // Carica dati completi dalla API
          try {
            const response = await api.getSinapsiById(sinapsiId);
            const sinapsi = response;

            // Dati oggettivi (calcolati dalle vendite)
            const datiOgg = sinapsi.dati_oggettivi || { volume_totale: 0, numero_transazioni: 0, ultima_transazione: null };
            const volumeTotale = datiOgg.volume_totale || 0;
            const numTransazioni = datiOgg.numero_transazioni || 0;
            const ultimaTrans = datiOgg.ultima_transazione;

            // Dati soggettivi (valutazioni 1-5)
            const influenza = sinapsi.influenza || 0;
            const qualitaRel = sinapsi.qualita_relazione || 0;
            const importanzaStr = sinapsi.importanza_strategica || 0;
            const affidabilita = sinapsi.affidabilita || 0;
            const potenziale = sinapsi.potenziale || 0;

            // Helper per stelline
            const renderStars = (val: number, label: string) => {
              if (val === 0) return '';
              const stars = '★'.repeat(val) + '☆'.repeat(5 - val);
              return `<div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
                <span style="color: #64748b;">${label}</span>
                <span style="color: #f59e0b;">${stars}</span>
              </div>`;
            };

            // Sezione dati soggettivi
            const hasSoggettivi = influenza || qualitaRel || importanzaStr || affidabilita || potenziale;
            const soggettiviHtml = hasSoggettivi ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">Valutazione Soggettiva</div>
                ${renderStars(influenza, 'Influenza')}
                ${renderStars(qualitaRel, 'Qualità rel.')}
                ${renderStars(importanzaStr, 'Strategicità')}
                ${renderStars(affidabilita, 'Affidabilità')}
                ${renderStars(potenziale, 'Potenziale')}
              </div>
            ` : '';

            // Sezione dati oggettivi
            const hasOggettivi = volumeTotale > 0 || numTransazioni > 0;
            const oggettiviHtml = hasOggettivi ? `
              <div style="margin-top: 8px; padding: 8px; background: #f0fdf4; border-radius: 6px;">
                <div style="font-size: 10px; color: #22c55e; margin-bottom: 4px; text-transform: uppercase;">Dati Oggettivi</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                  <span>Volume</span>
                  <span style="font-weight: 600;">€${volumeTotale.toLocaleString('it-IT')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                  <span>Transazioni</span>
                  <span style="font-weight: 600;">${numTransazioni}</span>
                </div>
                ${ultimaTrans ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">Ultima: ${new Date(ultimaTrans).toLocaleDateString('it-IT')}</div>` : ''}
              </div>
            ` : '';

            const noDataHtml = !hasOggettivi && !hasSoggettivi ? `
              <div style="margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #94a3b8;">Nessun dato registrato</div>
              </div>
            ` : '';

            const fullHtml = `
              <div style="padding: 10px; min-width: 220px; max-width: 280px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">${tipoIcon}</span>
                  <span style="font-weight: 600; font-size: 15px;">${tipoLabel}</span>
                  <span style="margin-left: auto; font-size: 10px; color: ${certezzaColor};">● ${certezzaLabel}</span>
                </div>

                <div style="background: #f8fafc; border-radius: 6px; padding: 8px;">
                  <div style="font-size: 13px; font-weight: 500;">${neuroneDA}</div>
                  ${tipoDA ? `<div style="font-size: 10px; color: #94a3b8;">${tipoDA}</div>` : ''}
                  <div style="text-align: center; color: #94a3b8; margin: 4px 0;">↕</div>
                  <div style="font-size: 13px; font-weight: 500;">${neuroneA}</div>
                  ${tipoA ? `<div style="font-size: 10px; color: #94a3b8;">${tipoA}</div>` : ''}
                </div>

                ${oggettiviHtml}
                ${soggettiviHtml}
                ${noDataHtml}

                <button id="btn-sinapsi-dettagli-${sinapsiId}" style="
                  width: 100%;
                  margin-top: 10px;
                  padding: 8px 12px;
                  background: #6366f1;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                ">
                  Dettagli <span style="font-size: 16px;">→</span>
                </button>
              </div>
            `;

            salesPopup.current?.setHTML(fullHtml);

            // Collega event handler al bottone
            setTimeout(() => {
              const btnDettagli = document.getElementById(`btn-sinapsi-dettagli-${sinapsiId}`);
              if (btnDettagli && onSelectSinapsiRef.current) {
                btnDettagli.onclick = () => {
                  salesPopup.current?.remove();
                  onSelectSinapsiRef.current!(sinapsiId);
                };
              }
            }, 50);

          } catch (error) {
            console.error('Errore caricamento dati sinapsi:', error);
            // In caso di errore, mostra popup base
            const errorHtml = `
              <div style="padding: 10px; min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">${tipoIcon}</span>
                  <span style="font-weight: 600; font-size: 15px;">${tipoLabel}</span>
                </div>
                <div style="background: #f8fafc; border-radius: 6px; padding: 8px;">
                  <div style="font-size: 13px; font-weight: 500;">${neuroneDA}</div>
                  <div style="text-align: center; color: #94a3b8; margin: 4px 0;">↕</div>
                  <div style="font-size: 13px; font-weight: 500;">${neuroneA}</div>
                </div>
                <div style="font-size: 11px; color: ${certezzaColor}; margin-top: 8px;">● ${certezzaLabel}</div>
              </div>
            `;
            salesPopup.current?.setHTML(errorHtml);
          }
        }
      });

      handlersAdded.current = true;
    }

    } catch (error) {
      console.error('DEBUG MapView ERRORE nella creazione layer:', error);
    }

  }, [neuroni, sinapsi, categorie, tipiNeurone, selectedId, filterSelectedId, mapReady, filtri, getSinapsiCount, styleLoaded]);

  // Non fare più zoom automatico sulla selezione
  // Lo zoom si fa solo con doppio click

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Barra di ricerca indirizzi - alto centro */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          maxWidth: 'calc(100% - 20px)',
          zIndex: 10,
        }}
      >
        <AddressSearch
          placeholder="Cerca indirizzo sulla mappa..."
          onSelect={(result) => {
            // Vola alla posizione trovata
            if (map.current && result.lat && result.lng) {
              map.current.flyTo({
                center: [result.lng, result.lat],
                zoom: 17,
                pitch: 60,
                duration: 2000,
              });
            }
          }}
        />
      </div>

      {/* Legenda: contenuto che appare SOPRA il bottone */}
      {categorie.length > 0 && showLegend && (
        <div style={{
          position: 'absolute',
          bottom: '66px', // Sopra il bottone (30px + 36px altezza bottone)
          left: '10px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          zIndex: 10,
          padding: '10px 12px',
          maxHeight: '180px',
          overflowY: 'auto',
        }}>
          {categorie.slice(0, 10).map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '3px', background: cat.colore, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', fontSize: '11px', color: '#334155' }}>{cat.nome}</span>
            </div>
          ))}
          {categorie.length > 10 && (
            <div style={{ fontSize: '10px', color: '#64748b' }}>+{categorie.length - 10} altre...</div>
          )}
          <div style={{ fontSize: '9px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
            Altezza = valore/relazioni
          </div>
        </div>
      )}

      {/* Bottone Legenda - SEMPRE fisso in basso */}
      {categorie.length > 0 && (
        <div
          onClick={() => setShowLegend(!showLegend)}
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '10px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>Legenda</span>
          <span style={{
            fontSize: '8px',
            color: '#64748b',
            transform: showLegend ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}>▲</span>
        </div>
      )}

      {/* Controlli mappa - basso destra */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10,
      }}>
        {/* Slider trasparenza (sopra) - con dissolvenza auto-chiusura */}
        {showMapControls && (
          <div
            onMouseMove={resetControlsTimer}
            onTouchStart={resetControlsTimer}
            style={{
              background: 'white',
              padding: '10px 12px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: '180px',
              opacity: controlsFading ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Trasparenza mappa</span>
              <span style={{ fontWeight: 600 }}>{100 - mapOpacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={mapOpacity}
              onChange={(e) => {
                setMapOpacity(Number(e.target.value));
                resetControlsTimer();
              }}
              style={{
                width: '100%',
                height: '6px',
                cursor: 'pointer',
                accentColor: '#3b82f6',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
              <span>3D visibile</span>
              <span>Mappa solida</span>
            </div>
          </div>
        )}

        {/* Stili mappa + toggle controlli */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'white',
          padding: '6px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {/* Toggle controlli avanzati */}
          <button
            onClick={() => setShowMapControls(!showMapControls)}
            title={showMapControls ? 'Nascondi controlli' : 'Trasparenza mappa'}
            style={{
              width: '32px',
              height: '32px',
              border: showMapControls ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              borderRadius: '6px',
              background: showMapControls ? '#eff6ff' : 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🎚️
          </button>

          <div style={{ width: '1px', background: '#e2e8f0', margin: '4px 2px' }} />

          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => changeMapStyle(style.id)}
              title={style.nome}
              style={{
                width: '32px',
                height: '32px',
                border: mapStyle === style.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '6px',
                background: mapStyle === style.id ? '#eff6ff' : 'white',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {style.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
