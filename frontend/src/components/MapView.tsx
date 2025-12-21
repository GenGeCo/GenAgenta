// GenAgenTa - Map View Component (Mapbox GL JS) - 3D Native Layers v2

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Neurone, Sinapsi, FiltriMappa, Categoria, TipoNeuroneConfig } from '../types';

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
}

// Colore di default se la categoria non viene trovata
const DEFAULT_COLOR = '#64748b';

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

// Calcola altezza basata sui dati (ridotta del 30%)
function calculateHeight(neurone: Neurone, sinapsiCount: number): number {
  const baseHeight = 35;  // era 50
  const maxHeight = 350;  // era 500

  let value = 0;

  if (neurone.tipo === 'impresa') {
    // Fatturato: ogni 15.000€ = 10m di altezza
    const fatturato = (neurone.dati_extra as { fatturato_annuo?: number })?.fatturato_annuo || 0;
    value = fatturato / 1500;
  } else if (neurone.tipo === 'luogo') {
    // Importo lavori: ogni 7.500€ = 10m di altezza
    const importo = (neurone.dati_extra as { importo_lavori?: number })?.importo_lavori || 0;
    value = importo / 750;
  } else {
    // Persone: ogni connessione = 20m
    value = sinapsiCount * 20;
  }

  return Math.min(Math.max(baseHeight + value, baseHeight), maxHeight);
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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const neuroniRef = useRef<Neurone[]>(neuroni);
  const handlersAdded = useRef(false);
  const pickingModeRef = useRef(pickingMode);
  const onPickPositionRef = useRef(onPickPosition);

  // Aggiorna refs per picking mode
  useEffect(() => {
    pickingModeRef.current = pickingMode;
    onPickPositionRef.current = onPickPosition;
  }, [pickingMode, onPickPosition]);

  useEffect(() => {
    neuroniRef.current = neuroni;
  }, [neuroni]);

  const getSinapsiCount = useCallback((neuroneId: string) => {
    return sinapsi.filter(s => s.neurone_da === neuroneId || s.neurone_a === neuroneId).length;
  }, [sinapsi]);

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

    map.current.on('load', () => {
      console.log('Mappa caricata');
      setMapReady(true);
    });

    // Click generico sulla mappa per picking mode
    map.current.on('click', (e) => {
      if (pickingModeRef.current && onPickPositionRef.current) {
        onPickPositionRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      popup.current?.remove();
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

  // Cambia cursore in picking mode
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const canvas = map.current.getCanvas();
    if (pickingMode) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }
  }, [pickingMode, mapReady]);

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
      if (m.getSource('neuroni')) m.removeSource('neuroni');
      if (m.getLayer('sinapsi-lines')) m.removeLayer('sinapsi-lines');
      if (m.getSource('sinapsi')) m.removeSource('sinapsi');
    } catch {
      // Layer non esistenti, ignora
    }

    // Aspetta che tipiNeurone sia caricato per determinare le forme corrette
    if (neuroniConCoord.length === 0 || tipiNeurone.length === 0) return;

    // Funzione per ottenere il colore dalla prima categoria del neurone (case-insensitive)
    const getCategoriaColor = (neuroneCategorie: string[]): string => {
      if (!neuroneCategorie || neuroneCategorie.length === 0) return DEFAULT_COLOR;
      const primaCategoria = neuroneCategorie[0].toLowerCase();
      const cat = categorie.find(c => c.nome.toLowerCase() === primaCategoria);
      return cat?.colore || DEFAULT_COLOR;
    };

    // DEBUG: log tutti i neuroni e tipi disponibili
    console.log('DEBUG MapView:', {
      neuroniCaricati: neuroniConCoord.map(n => ({ nome: n.nome, tipo: n.tipo })),
      tipiDisponibili: tipiNeurone.map(t => ({ nome: t.nome, forma: t.forma }))
    });

    // Funzione per ottenere la forma dal tipo neurone (case-insensitive)
    const getTipoForma = (tipoNome: string): 'quadrato' | 'cerchio' => {
      const tipo = tipiNeurone.find(t => t.nome.toLowerCase() === tipoNome.toLowerCase());
      // Se il tipo ha forma quadrato, triangolo, stella, croce, L, C, W, Z usa quadrato
      // Altrimenti usa cerchio
      if (tipo?.forma && ['quadrato', 'triangolo', 'stella', 'croce', 'L', 'C', 'W', 'Z'].includes(tipo.forma)) {
        return 'quadrato';
      }
      return 'cerchio';
    };

    // Crea GeoJSON per neuroni
    const neuroniFeatures = neuroniConCoord.map((neurone) => {
      const forma = getTipoForma(neurone.tipo);
      const isQuadrato = forma === 'quadrato';
      const baseSize = isQuadrato ? 105 : 80; // metri - +30% (era 80/60)
      const height = calculateHeight(neurone, getSinapsiCount(neurone.id));

      const polygon = isQuadrato
        ? createSquarePolygon(neurone.lng!, neurone.lat!, baseSize)
        : createCirclePolygon(neurone.lng!, neurone.lat!, baseSize / 2, 24);

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

    // Sinapsi - applica filtri visibilità
    let sinapsiFiltered = sinapsi.filter((s) => {
      if (filtri.dataInizio && s.data_fine && s.data_fine < filtri.dataInizio) return false;
      if (filtri.dataFine && s.data_inizio > filtri.dataFine) return false;
      return s.lat_da && s.lng_da && s.lat_a && s.lng_a;
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
      const sinapsiFeatures = sinapsiFiltered.map((s) => ({
        type: 'Feature' as const,
        properties: {
          id: s.id,
          tipo: s.tipo_connessione,
          valore: Number(s.valore) || 1,
          certezza: s.certezza,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [Number(s.lng_da), Number(s.lat_da)],
            [Number(s.lng_a), Number(s.lat_a)],
          ],
        },
      }));

      m.addSource('sinapsi', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: sinapsiFeatures,
        },
      });

      m.addLayer({
        id: 'sinapsi-lines',
        type: 'line',
        source: 'sinapsi',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'certezza'], 'certo'], '#22c55e',
            ['==', ['get', 'certezza'], 'probabile'], '#eab308',
            '#94a3b8',
          ],
          'line-width': 3,
          'line-opacity': 0.8,
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

      // Click singolo: solo seleziona (senza zoom) - ignora se in picking mode
      m.on('click', 'neuroni-3d', (e) => {
        // Se siamo in picking mode, non gestire click sui neuroni
        if (pickingModeRef.current) return;

        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          const neurone = neuroniRef.current.find(n => n.id === id);

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
            clickTimeout = setTimeout(() => {
              clickTimeout = null;
              // È un click singolo - solo seleziona
              if (neurone) {
                onSelectNeurone(neurone);
              }
            }, 250);
          }
        }
      });

      handlersAdded.current = true;
    }

  }, [neuroni, sinapsi, categorie, tipiNeurone, selectedId, mapReady, filtri, getSinapsiCount, onSelectNeurone]);

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
    </div>
  );
}
