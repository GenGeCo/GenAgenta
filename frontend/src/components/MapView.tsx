// GenAgenTa - Map View Component (Mapbox GL JS) - 3D Native Layers

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Neurone, Sinapsi, FiltriMappa } from '../types';

// Token Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZ2VuYWdlbnRhIiwiYSI6ImNtamR6a3UwazBjNHEzZnF4aWxhYzlqMmUifQ.0RcP-1pxFW7rHYvVoJQG5g';

interface MapViewProps {
  neuroni: Neurone[];
  sinapsi: Sinapsi[];
  selectedId: string | null;
  onSelectNeurone: (neurone: Neurone) => void;
  filtri: FiltriMappa;
}

// Colori per tipo neurone
const COLORI_TIPO: Record<string, string> = {
  persona: '#10b981',
  impresa: '#3b82f6',
  luogo: '#f59e0b',
};

// Genera un poligono circolare (per cilindri)
function createCirclePolygon(lng: number, lat: number, radiusMeters: number, sides: number = 32): number[][] {
  const coords: number[][] = [];
  const earthRadius = 6371000; // metri

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
    [lng - dLng, lat - dLat], // chiudi il poligono
  ];
}

// Calcola altezza basata sui dati
function calculateHeight(neurone: Neurone, sinapsiCount: number): number {
  const baseHeight = 50; // altezza minima in metri
  const maxHeight = 500; // altezza massima

  let value = 0;

  if (neurone.tipo === 'impresa') {
    // Per imprese: basato su fatturato
    const fatturato = (neurone.dati_extra as { fatturato_annuo?: number })?.fatturato_annuo || 0;
    value = fatturato / 1000; // 1000€ = 1 metro
  } else if (neurone.tipo === 'luogo') {
    // Per cantieri: basato su importo lavori
    const importo = (neurone.dati_extra as { importo_lavori?: number })?.importo_lavori || 0;
    value = importo / 500; // 500€ = 1 metro
  } else {
    // Per persone: basato su numero di connessioni
    value = sinapsiCount * 30; // 30 metri per connessione
  }

  return Math.min(Math.max(baseHeight + value, baseHeight), maxHeight);
}

export default function MapView({
  neuroni,
  sinapsi,
  selectedId,
  onSelectNeurone,
  filtri,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const neuroniRef = useRef<Neurone[]>(neuroni);

  // Mantieni riferimento aggiornato ai neuroni
  useEffect(() => {
    neuroniRef.current = neuroni;
  }, [neuroni]);

  // Conta sinapsi per neurone
  const getSinapsiCount = useCallback((neuroneId: string) => {
    return sinapsi.filter(s => s.neurone_da === neuroneId || s.neurone_a === neuroneId).length;
  }, [sinapsi]);

  // Inizializza mappa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [9.19, 45.46], // Milano
      zoom: 11,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Crea popup riutilizzabile
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    map.current.on('load', () => {
      // Aggiungi luce per effetto 3D
      map.current!.setLight({
        anchor: 'viewport',
        color: 'white',
        intensity: 0.4,
      });

      setMapReady(true);
    });

    return () => {
      popup.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Aggiorna layer quando cambiano i dati
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const m = map.current;

    // Rimuovi layer e source esistenti
    ['neuroni-3d', 'neuroni-outline', 'neuroni-labels'].forEach(layerId => {
      if (m.getLayer(layerId)) m.removeLayer(layerId);
    });
    if (m.getSource('neuroni')) m.removeSource('neuroni');

    ['sinapsi-lines'].forEach(layerId => {
      if (m.getLayer(layerId)) m.removeLayer(layerId);
    });
    if (m.getSource('sinapsi')) m.removeSource('sinapsi');

    // Filtra neuroni con coordinate
    const neuroniConCoord = neuroni.filter((n) => n.lat && n.lng);

    if (neuroniConCoord.length === 0) return;

    // Crea GeoJSON per neuroni (poligoni 3D)
    const neuroniFeatures = neuroniConCoord.map((neurone) => {
      const isLuogo = neurone.tipo === 'luogo';
      const baseSize = isLuogo ? 25 : 20; // metri
      const height = calculateHeight(neurone, getSinapsiCount(neurone.id));

      const polygon = isLuogo
        ? createSquarePolygon(neurone.lng!, neurone.lat!, baseSize)
        : createCirclePolygon(neurone.lng!, neurone.lat!, baseSize / 2, 24);

      return {
        type: 'Feature' as const,
        properties: {
          id: neurone.id,
          nome: neurone.nome,
          tipo: neurone.tipo,
          categorie: neurone.categorie.join(', '),
          color: COLORI_TIPO[neurone.tipo],
          height: height,
          selected: neurone.id === selectedId,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [polygon],
        },
      };
    });

    // Aggiungi source neuroni
    m.addSource('neuroni', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: neuroniFeatures,
      },
    });

    // Layer 3D extrusion
    m.addLayer({
      id: 'neuroni-3d',
      type: 'fill-extrusion',
      source: 'neuroni',
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-vertical-gradient': true,
      },
    });

    // Layer outline per selezione
    m.addLayer({
      id: 'neuroni-outline',
      type: 'line',
      source: 'neuroni',
      paint: {
        'line-color': [
          'case',
          ['get', 'selected'], '#1e293b',
          'rgba(255,255,255,0.5)'
        ],
        'line-width': [
          'case',
          ['get', 'selected'], 3,
          1
        ],
      },
    });

    // Sinapsi (linee)
    const sinapsiFeatures = sinapsi
      .filter((s) => {
        if (filtri.dataInizio && s.data_fine && s.data_fine < filtri.dataInizio) return false;
        if (filtri.dataFine && s.data_inizio > filtri.dataFine) return false;
        return s.lat_da && s.lng_da && s.lat_a && s.lng_a;
      })
      .map((s) => ({
        type: 'Feature' as const,
        properties: {
          id: s.id,
          tipo: s.tipo_connessione,
          valore: s.valore || 1,
          certezza: s.certezza,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [s.lng_da!, s.lat_da!],
            [s.lng_a!, s.lat_a!],
          ],
        },
      }));

    if (sinapsiFeatures.length > 0) {
      m.addSource('sinapsi', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: sinapsiFeatures,
        },
      });

      // Inserisci le linee sotto i neuroni 3D
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'valore'],
            0, 2,
            10000, 4,
            100000, 8,
          ],
          'line-opacity': 0.7,
        },
      }, 'neuroni-3d'); // inserisci prima del layer neuroni
    }

    // Event handlers
    m.on('mouseenter', 'neuroni-3d', (e) => {
      m.getCanvas().style.cursor = 'pointer';

      if (e.features && e.features[0]) {
        const props = e.features[0].properties;
        const coordinates = e.lngLat;

        popup.current!
          .setLngLat(coordinates)
          .setHTML(`
            <strong>${props?.nome}</strong><br/>
            <span style="color: #64748b; font-size: 12px;">${props?.categorie}</span>
          `)
          .addTo(m);
      }
    });

    m.on('mouseleave', 'neuroni-3d', () => {
      m.getCanvas().style.cursor = '';
      popup.current!.remove();
    });

    m.on('click', 'neuroni-3d', (e) => {
      if (e.features && e.features[0]) {
        const id = e.features[0].properties?.id;
        const neurone = neuroniRef.current.find(n => n.id === id);
        if (neurone) {
          onSelectNeurone(neurone);
        }
      }
    });

  }, [neuroni, sinapsi, selectedId, mapReady, filtri, getSinapsiCount, onSelectNeurone]);

  // Centra su neurone selezionato
  useEffect(() => {
    if (!map.current || !selectedId) return;

    const neurone = neuroni.find((n) => n.id === selectedId);
    if (neurone?.lat && neurone?.lng) {
      map.current.flyTo({
        center: [neurone.lng, neurone.lat],
        zoom: 15,
        pitch: 60,
        duration: 1000,
      });
    }
  }, [selectedId, neuroni]);

  return (
    <div className="map-container" ref={mapContainer}>
      {!mapReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-secondary)',
        }}>
          Caricamento mappa...
        </div>
      )}

      {/* Legenda */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '16px',
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        zIndex: 1,
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Legenda</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORI_TIPO.persona }} />
          <span>Persone (cilindro)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORI_TIPO.impresa }} />
          <span>Imprese (cilindro)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '2px', background: COLORI_TIPO.luogo }} />
          <span>Cantieri (torre)</span>
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          Altezza = valore/relazioni
        </div>
      </div>
    </div>
  );
}
