// GenAgenTa - Map View Component (Mapbox GL JS) - 3D Native Layers v2

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Neurone, Sinapsi, FiltriMappa, Categoria, TipoNeuroneConfig, VenditaProdotto } from '../types';
import { api } from '../utils/api';

// Token Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZ2VuYWdlbnRhIiwiYSI6ImNtamR6a3UwazBjNHEzZnF4aWxhYzlqMmUifQ.0RcP-1pxFW7rHYvVoJQG5g';

interface MapViewProps {
  neuroni: Neurone[];
  sinapsi: Sinapsi[];
  categorie: Categoria[];
  tipiNeurone: TipoNeuroneConfig[];
  selectedId: string | null;
  onSelectNeurone: (neurone: Neurone) => void;
  filtri: FiltriMappa;
  pickingMode?: boolean;
  onPickPosition?: (lat: number, lng: number) => void;
  flyToPosition?: { lat: number; lng: number } | null;
  pickedPosition?: { lat: number; lng: number } | null;
  // Props per picking connessione (target su mappa)
  connectionPickingMode?: boolean;
  connectionSourceId?: string | null;
  onPickConnectionTarget?: (neurone: Neurone) => void;
  // Props per Quick Map Mode
  quickMapMode?: boolean;
  onQuickMapClick?: (lat: number, lng: number, screenX: number, screenY: number) => void;
  onQuickEntityClick?: (neurone: Neurone, screenX: number, screenY: number) => void;
}

// Colore di default se la categoria non viene trovata
const DEFAULT_COLOR = '#64748b';

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
function createParabola3D(
  lng1: number, lat1: number,
  lng2: number, lat2: number,
  numPoints: number = 15,
  maxHeight: number = 50 // altezza massima in metri al centro
): { coordinates: number[][]; elevation: number[] } {
  const coordinates: number[][] = [];
  const elevation: number[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Interpolazione lineare per lng/lat (linea dritta sul piano)
    const lng = lng1 + (lng2 - lng1) * t;
    const lat = lat1 + (lat2 - lat1) * t;
    coordinates.push([lng, lat]);

    // Parabola per l'altitudine: 4 * h * t * (1-t)
    // Massimo al centro (t=0.5), zero agli estremi
    const alt = 4 * maxHeight * t * (1 - t);
    elevation.push(alt);
  }

  return { coordinates, elevation };
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
  onSelectNeurone,
  filtri,
  pickingMode = false,
  onPickPosition,
  flyToPosition,
  pickedPosition,
  connectionPickingMode = false,
  connectionSourceId = null,
  onPickConnectionTarget,
  quickMapMode = false,
  onQuickMapClick,
  onQuickEntityClick,
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
  const [preferenzeCaricate, setPreferenzeCaricate] = useState(false);
  const savePositionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const customLayers = ['neuroni-3d', 'neuroni-borders', 'venduto-rings', 'sinapsi-lines', 'sinapsi-lines-shadow'];

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

      // Quick Map Mode - click su zona vuota (non su entità)
      if (quickMapModeRef.current && onQuickMapClickRef.current) {
        // Verifica se il click è su un neurone (in tal caso verrà gestito dall'altro handler)
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['neuroni-3d'] });
        if (!features || features.length === 0) {
          // Click su zona vuota - passa coordinate geografiche e screen
          onQuickMapClickRef.current(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y);
        }
      }
    });

    // Salva posizione quando l'utente sposta la mappa
    map.current.on('moveend', () => {
      saveMapPositionRef.current();
    });

    return () => {
      popup.current?.remove();
      salesPopup.current?.remove();
      if (savePositionTimeout.current) {
        clearTimeout(savePositionTimeout.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Vola a una posizione quando flyToPosition cambia
  useEffect(() => {
    if (!map.current || !mapReady || !flyToPosition) return;

    map.current.flyTo({
      center: [flyToPosition.lng, flyToPosition.lat],
      zoom: 14,
      pitch: 60,
      duration: 1500,
    });
  }, [flyToPosition, mapReady]);

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

    // Filtra neuroni con coordinate
    const neuroniConCoord = neuroni.filter((n) => n.lat && n.lng);

    // Rimuovi source e layer esistenti
    try {
      if (m.getLayer('neuroni-3d')) m.removeLayer('neuroni-3d');
      if (m.getLayer('neuroni-2d')) m.removeLayer('neuroni-2d');
      if (m.getLayer('neuroni-outline')) m.removeLayer('neuroni-outline');
      if (m.getLayer('venduto-ring')) m.removeLayer('venduto-ring');
      if (m.getSource('neuroni')) m.removeSource('neuroni');
      if (m.getSource('venduto-rings')) m.removeSource('venduto-rings');
      if (m.getLayer('sinapsi-lines')) m.removeLayer('sinapsi-lines');
      if (m.getLayer('sinapsi-lines-shadow')) m.removeLayer('sinapsi-lines-shadow');
      if (m.getSource('sinapsi')) m.removeSource('sinapsi');
    } catch {
      // Layer non esistenti, ignora
    }

    // DEBUG: log PRIMA del check per vedere i dati (stringificato per leggibilità)
    console.log('DEBUG neuroni:', JSON.stringify(neuroniConCoord.map(n => ({ nome: n.nome, tipo: n.tipo }))));
    console.log('DEBUG tipi:', JSON.stringify(tipiNeurone.map(t => ({ nome: t.nome, forma: t.forma }))));

    // Aspetta che tipiNeurone sia caricato per determinare le forme corrette
    if (neuroniConCoord.length === 0 || tipiNeurone.length === 0) return;

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

      const polygon = createPolygon(forma, neurone.lng!, neurone.lat!, baseSize);

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

    // Aggiungi source
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

        // Ring leggermente più grande dell'edificio
        const ringWidth = 3; // metri di spessore dell'anello
        const ringPolygon = isQuadrato
          ? createSquareRing(neurone.lng!, neurone.lat!, baseSize, baseSize + ringWidth * 2)
          : createRingPolygon(neurone.lng!, neurone.lat!, baseSize / 2, (baseSize / 2) + ringWidth, 24);

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

    // Aggiungi layer anelli venduto se ci sono neuroni con vendite
    if (vendutoRingFeatures.length > 0) {
      m.addSource('venduto-rings', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: vendutoRingFeatures,
        },
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
      return s.lat_da && s.lng_da && s.lat_a && s.lng_a;
    });

    console.log('DEBUG MapView sinapsi:', {
      totali: sinapsi.length,
      conCoordinate: sinapsiFiltered.length,
      filtri: { dataInizio: filtri.dataInizio, dataFine: filtri.dataFine }
    });

    // Nascondi tutte le connessioni se il flag è disattivato
    if (!filtri.mostraConnessioni) {
      sinapsiFiltered = [];
    }
    // Mostra solo connessioni del neurone selezionato
    else if (filtri.soloConnessioniSelezionate && selectedId) {
      sinapsiFiltered = sinapsiFiltered.filter(
        (s) => s.neurone_da === selectedId || s.neurone_a === selectedId
      );
    }

    if (sinapsiFiltered.length > 0) {
      // Crea una mappa per lookup veloce dei neuroni per ID
      const neuroniMap = new Map(neuroni.map(n => [n.id, n]));

      const sinapsiFeatures = sinapsiFiltered.map((s) => {
        // Usa le coordinate aggiornate dai neuroni (non quelle salvate nella sinapsi)
        const neuroneDa = neuroniMap.get(s.neurone_da);
        const neuroneA = neuroniMap.get(s.neurone_a);

        // Se troviamo i neuroni, usa le loro coordinate aggiornate
        // Altrimenti fallback alle coordinate salvate nella sinapsi
        const lngDa = neuroneDa?.lng ?? Number(s.lng_da);
        const latDa = neuroneDa?.lat ?? Number(s.lat_da);
        const lngA = neuroneA?.lng ?? Number(s.lng_a);
        const latA = neuroneA?.lat ?? Number(s.lat_a);

        // Crea parabola 3D che si alza verso l'alto
        const parabola = createParabola3D(
          lngDa, latDa,
          lngA, latA,
          15,  // 15 punti per curva fluida
          50   // altezza massima 50 metri al centro
        );

        return {
          type: 'Feature' as const,
          properties: {
            id: s.id,
            tipo: s.tipo_connessione,
            valore: Number(s.valore) || 1,
            certezza: s.certezza,
            elevation: parabola.elevation, // array di altezze per line-z-offset
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: parabola.coordinates,
          },
        };
      });

      m.addSource('sinapsi', {
        type: 'geojson',
        lineMetrics: true, // necessario per line-z-offset
        data: {
          type: 'FeatureCollection',
          features: sinapsiFeatures,
        },
      });

      // Layer ombra/bordo (sotto) - dà profondità alla linea
      m.addLayer({
        id: 'sinapsi-lines-shadow',
        type: 'line',
        source: 'sinapsi',
        layout: {
          'line-z-offset': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            ...Array.from({ length: 16 }, (_, i) => {
              const t = i / 15;
              return [t, 4 * 60 * t * (1 - t) - 3]; // leggermente sotto (-3m)
            }).flat()
          ],
        },
        paint: {
          'line-color': '#000000',
          'line-width': 8,
          'line-opacity': 0.4,
          'line-blur': 2,
        },
      });

      // Layer principale colorato
      m.addLayer({
        id: 'sinapsi-lines',
        type: 'line',
        source: 'sinapsi',
        layout: {
          'line-z-offset': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            ...Array.from({ length: 16 }, (_, i) => {
              const t = i / 15;
              return [t, 4 * 60 * t * (1 - t)]; // parabola: 0 -> 60m -> 0
            }).flat()
          ],
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'certezza'], 'certo'], '#22c55e',
            ['==', ['get', 'certezza'], 'probabile'], '#eab308',
            '#94a3b8',
          ],
          'line-width': 5,
          'line-opacity': 1,
        },
      });
    }

    // Event handlers (solo una volta)
    if (!handlersAdded.current) {
      let clickTimeout: ReturnType<typeof setTimeout> | null = null;

      m.on('mouseenter', 'neuroni-3d', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0] && popup.current) {
          const props = e.features[0].properties;
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
              // È un click singolo - mostra popup vendite
              if (neurone && neurone.lat && neurone.lng && salesPopup.current) {
                // Chiudi popup hover
                popup.current?.remove();

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

                  // Genera HTML colonne prodotti
                  let colonneHtml = '';
                  if (vendite.length > 0 && potenziale > 0) {
                    colonneHtml = '<div style="display: flex; align-items: flex-end; gap: 3px; height: 50px; margin: 8px 0;">';
                    vendite.forEach((v, i) => {
                      const altezza = Math.max((v.importo / potenziale) * 100, 5);
                      const colore = coloriProdotti[i % coloriProdotti.length];
                      colonneHtml += `<div title="${v.famiglia_nome || 'Prodotto'}: €${v.importo.toLocaleString('it-IT')}" style="width: 20px; height: ${altezza}%; background: ${colore}; border-radius: 2px 2px 0 0;"></div>`;
                    });
                    colonneHtml += '</div>';
                  }

                  // Genera HTML popup completo
                  const popupHtml = `
                    <div style="padding: 8px; min-width: 220px;">
                      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${neurone.nome}</div>
                      <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">${neurone.tipo} ${neurone.categorie?.length ? '• ' + neurone.categorie.join(', ') : ''}</div>

                      ${potenziale > 0 ? `
                        <div style="margin-bottom: 4px;">
                          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                            <span>Venduto: €${totaleVenduto.toLocaleString('it-IT')}</span>
                            <span style="font-weight: 600; color: ${percentuale >= 100 ? '#22c55e' : '#1e293b'};">${percentuale}%</span>
                          </div>
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 2px;">
                            <div style="height: 100%; width: ${Math.min(percentuale, 100)}%; background: ${percentuale >= 100 ? '#22c55e' : percentuale >= 50 ? '#eab308' : '#ef4444'}; border-radius: 3px;"></div>
                          </div>
                          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Potenziale: €${potenziale.toLocaleString('it-IT')}</div>
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

      handlersAdded.current = true;
    }

  }, [neuroni, sinapsi, categorie, tipiNeurone, selectedId, mapReady, filtri, getSinapsiCount, styleLoaded]);

  // Non fare più zoom automatico sulla selezione
  // Lo zoom si fa solo con doppio click

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Legenda dinamica basata sulle categorie */}
      {categorie.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '16px',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Categorie</div>
          {categorie.slice(0, 10).map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '4px', background: cat.colore, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{cat.nome}</span>
            </div>
          ))}
          {categorie.length > 10 && (
            <div style={{ fontSize: '10px', color: '#64748b' }}>+{categorie.length - 10} altre...</div>
          )}
          <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
            Altezza = valore/relazioni
          </div>
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
        {/* Slider trasparenza (sopra) */}
        {showMapControls && (
          <div style={{
            background: 'white',
            padding: '10px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '180px',
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Trasparenza mappa</span>
              <span style={{ fontWeight: 600 }}>{100 - mapOpacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={mapOpacity}
              onChange={(e) => setMapOpacity(Number(e.target.value))}
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
