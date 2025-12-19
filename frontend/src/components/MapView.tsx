// GenAgenTa - Map View Component (Mapbox GL JS)

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Neurone, Sinapsi, FiltriMappa } from '../types';

// Token Mapbox (da mettere in .env in produzione)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZGVtby1nZW5hZ2VudGEiLCJhIjoiY2x0ZXN0MTIzIn0.demo';

interface MapViewProps {
  neuroni: Neurone[];
  sinapsi: Sinapsi[];
  selectedId: string | null;
  onSelectNeurone: (neurone: Neurone) => void;
  filtri: FiltriMappa;
}

// Colori per tipo neurone
const COLORI_TIPO = {
  persona: '#10b981',
  impresa: '#3b82f6',
  luogo: '#f59e0b',
};

export default function MapView({
  neuroni,
  sinapsi,
  selectedId,
  onSelectNeurone,
  filtri,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Inizializza mappa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [9.19, 45.46], // Milano
      zoom: 11,
      pitch: 45, // Inclinazione per 3D
      bearing: -17.6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Aggiorna marker quando cambiano i neuroni
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Rimuovi marker esistenti
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filtra neuroni con coordinate
    const neuroniConCoord = neuroni.filter((n) => n.lat && n.lng);

    // Crea nuovi marker
    neuroniConCoord.forEach((neurone) => {
      const el = document.createElement('div');
      el.className = 'map-marker';

      // Stile marker
      const size = neurone.tipo === 'luogo' ? 20 : 16;
      const color = COLORI_TIPO[neurone.tipo];
      const shape = neurone.tipo === 'luogo' ? 'square' : 'circle';
      const isSelected = neurone.id === selectedId;

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid ${isSelected ? '#1e293b' : 'white'};
        border-radius: ${shape === 'circle' ? '50%' : '4px'};
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: transform 0.15s ease;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', () => {
        onSelectNeurone(neurone);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([neurone.lng!, neurone.lat!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <strong>${neurone.nome}</strong><br/>
            <span style="color: #64748b; font-size: 12px;">${neurone.categorie.join(', ')}</span>
          `)
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Disegna linee per sinapsi
    drawSinapsi();

  }, [neuroni, sinapsi, selectedId, mapReady, filtri]);

  // Disegna linee sinapsi
  const drawSinapsi = () => {
    if (!map.current) return;

    // Rimuovi layer esistente
    if (map.current.getLayer('sinapsi-lines')) {
      map.current.removeLayer('sinapsi-lines');
    }
    if (map.current.getSource('sinapsi')) {
      map.current.removeSource('sinapsi');
    }

    // Crea GeoJSON per le linee
    const features = sinapsi
      .filter((s) => {
        // Filtra sinapsi per periodo
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

    if (features.length === 0) return;

    map.current.addSource('sinapsi', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    map.current.addLayer({
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
          0, 1,
          10000, 2,
          100000, 4,
        ],
        'line-opacity': 0.6,
        'line-dasharray': [
          'case',
          ['==', ['get', 'certezza'], 'ipotesi'], ['literal', [2, 2]],
          ['literal', [1, 0]],
        ],
      },
    });
  };

  // Centra su neurone selezionato
  useEffect(() => {
    if (!map.current || !selectedId) return;

    const neurone = neuroni.find((n) => n.id === selectedId);
    if (neurone?.lat && neurone?.lng) {
      map.current.flyTo({
        center: [neurone.lng, neurone.lat],
        zoom: 14,
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
          <span>Persone</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORI_TIPO.impresa }} />
          <span>Imprese</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '2px', background: COLORI_TIPO.luogo }} />
          <span>Cantieri</span>
        </div>
      </div>
    </div>
  );
}
