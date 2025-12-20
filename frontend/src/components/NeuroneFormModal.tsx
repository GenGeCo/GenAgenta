// GenAgenTa - Form per creare/modificare Neurone

import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone } from '../types';

interface NeuroneFormModalProps {
  neurone?: Neurone; // Se presente, modifica. Altrimenti, crea nuovo
  onSave: (neurone: Neurone) => void;
  onClose: () => void;
}

type TipoNeurone = 'persona' | 'impresa' | 'luogo';

const CATEGORIE_SUGGERITE: Record<TipoNeurone, string[]> = {
  persona: ['imbianchino', 'cartongessista', 'muratore', 'elettricista', 'idraulico', 'architetto', 'geometra', 'ingegnere', 'committente', 'agente'],
  impresa: ['colorificio', 'ferramenta', 'impresa edile', 'studio tecnico', 'showroom', 'grossista', 'produttore'],
  luogo: ['cantiere residenziale', 'cantiere commerciale', 'ristrutturazione', 'nuova costruzione', 'manutenzione'],
};

export default function NeuroneFormModal({ neurone, onSave, onClose }: NeuroneFormModalProps) {
  const isEdit = !!neurone;

  const [tipo, setTipo] = useState<TipoNeurone>(neurone?.tipo || 'persona');
  const [nome, setNome] = useState(neurone?.nome || '');
  const [categorie, setCategorie] = useState<string[]>(neurone?.categorie || []);
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [indirizzo, setIndirizzo] = useState(neurone?.indirizzo || '');
  const [telefono, setTelefono] = useState(neurone?.telefono || '');
  const [email, setEmail] = useState(neurone?.email || '');
  const [sitoWeb, setSitoWeb] = useState(neurone?.sito_web || '');
  const [visibilita, setVisibilita] = useState<'aziendale' | 'personale'>(neurone?.visibilita || 'aziendale');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Geocoding e posizione
  const [geocoding, setGeocoding] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [lat, setLat] = useState<number | null>(neurone?.lat || null);
  const [lng, setLng] = useState<number | null>(neurone?.lng || null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Geocoding da indirizzo
  const handleGeocoding = async () => {
    if (!indirizzo.trim()) return;

    setGeocoding(true);
    setError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}&limit=1`
      );
      const results = await response.json();
      if (results.length > 0) {
        setLat(parseFloat(results[0].lat));
        setLng(parseFloat(results[0].lon));
        setIndirizzo(results[0].display_name);
      } else {
        setError('Indirizzo non trovato. Prova a essere piu specifico.');
      }
    } catch {
      setError('Errore durante la ricerca dell\'indirizzo');
    } finally {
      setGeocoding(false);
    }
  };

  // Posizione GPS attuale
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata dal browser');
      return;
    }

    setGettingGps(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setLat(newLat);
        setLng(newLng);

        // Reverse geocoding per ottenere l'indirizzo
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`
          );
          const result = await response.json();
          if (result.display_name) {
            setIndirizzo(result.display_name);
          }
        } catch {
          // Ignora errori reverse geocoding
        }
        setGettingGps(false);
      },
      (err) => {
        setError('Errore GPS: ' + err.message);
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Callback per selezione da mappa
  const handleMapSelect = async (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setShowMapPicker(false);

    // Reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`
      );
      const result = await response.json();
      if (result.display_name) {
        setIndirizzo(result.display_name);
      }
    } catch {
      // Ignora errori
    }
  };

  const toggleCategoria = (cat: string) => {
    if (categorie.includes(cat)) {
      setCategorie(categorie.filter(c => c !== cat));
    } else {
      setCategorie([...categorie, cat]);
    }
  };

  const addCategoriaCustom = () => {
    const cat = categoriaCustom.trim().toLowerCase();
    if (cat && !categorie.includes(cat)) {
      setCategorie([...categorie, cat]);
      setCategoriaCustom('');
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!nome.trim()) {
      setError('Il nome e obbligatorio');
      return;
    }

    if (categorie.length === 0) {
      setError('Seleziona almeno una categoria');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        tipo,
        categorie,
        visibilita,
        indirizzo: indirizzo || null,
        lat: lat || null,
        lng: lng || null,
        telefono: telefono || null,
        email: email || null,
        sito_web: sitoWeb || null,
      };

      if (isEdit && neurone) {
        await api.updateNeurone(neurone.id, payload);
        onSave({ ...neurone, ...payload } as Neurone);
      } else {
        const result = await api.createNeurone(payload);
        onSave({ id: result.id, ...payload } as Neurone);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
            {isEdit ? 'Modifica' : 'Aggiungi'} {tipo === 'persona' ? 'Persona' : tipo === 'impresa' ? 'Impresa' : 'Cantiere'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['persona', 'impresa', 'luogo'] as TipoNeurone[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${tipo === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setTipo(t);
                    setCategorie([]); // Reset categorie quando cambia tipo
                  }}
                  style={{ flex: 1 }}
                >
                  {t === 'persona' ? 'Persona' : t === 'impresa' ? 'Impresa' : 'Cantiere'}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              type="text"
              className="form-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipo === 'persona' ? 'Mario Rossi' : tipo === 'impresa' ? 'Colorificio Rossi S.r.l.' : 'Cantiere Via Roma 1'}
            />
          </div>

          {/* Categorie */}
          <div className="form-group">
            <label className="form-label">Categorie *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {CATEGORIE_SUGGERITE[tipo].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategoria(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: categorie.includes(cat) ? 'var(--primary)' : 'var(--bg-primary)',
                    color: categorie.includes(cat) ? 'white' : 'var(--text-primary)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
                placeholder="Aggiungi categoria..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategoriaCustom())}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addCategoriaCustom}
                disabled={!categoriaCustom.trim()}
              >
                +
              </button>
            </div>
            {categorie.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Selezionate: {categorie.join(', ')}
              </div>
            )}
          </div>

          {/* Indirizzo */}
          <div className="form-group">
            <label className="form-label">Posizione</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={indirizzo}
                onChange={(e) => { setIndirizzo(e.target.value); setLat(null); setLng(null); }}
                placeholder="Via Roma 1, Milano"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGeocoding}
                disabled={geocoding || !indirizzo.trim()}
                title="Cerca indirizzo"
              >
                {geocoding ? '...' : '🔍'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGetGps}
                disabled={gettingGps}
                style={{ flex: 1, fontSize: '13px' }}
              >
                {gettingGps ? 'Localizzazione...' : '📍 Usa posizione attuale'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMapPicker(true)}
                style={{ flex: 1, fontSize: '13px' }}
              >
                🗺️ Scegli su mappa
              </button>
            </div>
            {lat && lng && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Coordinate: </span>
                <span style={{ fontFamily: 'monospace' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            )}
          </div>

          {/* Map Picker Modal */}
          {showMapPicker && (
            <MapPickerModal
              initialLat={lat || 45.4642}
              initialLng={lng || 9.19}
              onSelect={handleMapSelect}
              onClose={() => setShowMapPicker(false)}
            />
          )}

          {/* Contatti */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Telefono</label>
              <input
                type="tel"
                className="form-input"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esempio.it"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sito web</label>
            <input
              type="url"
              className="form-input"
              value={sitoWeb}
              onChange={(e) => setSitoWeb(e.target.value)}
              placeholder="https://www.esempio.it"
            />
          </div>

          {/* Visibilita */}
          <div className="form-group">
            <label className="form-label">Visibilita</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="visibilita"
                  checked={visibilita === 'aziendale'}
                  onChange={() => setVisibilita('aziendale')}
                />
                <span style={{ fontSize: '14px' }}>Aziendale (visibile ai colleghi)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="visibilita"
                  checked={visibilita === 'personale'}
                  onChange={() => setVisibilita('personale')}
                />
                <span style={{ fontSize: '14px' }}>Personale (solo tu)</span>
              </label>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente per selezionare posizione su mappa
function MapPickerModal({
  initialLat,
  initialLng,
  onSelect,
  onClose,
}: {
  initialLat: number;
  initialLng: number;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Importa mapbox dinamicamente
    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = 'pk.eyJ1IjoiZ2VuYWdlbnRhIiwiYSI6ImNtNGsxdjV6cDA2aHUycW9mNjRuZnBtNnEifQ.hMfmXfSB8jXfX8WJibz30g';

      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLng, initialLat],
        zoom: 14,
      });

      // Marker trascinabile
      const marker = new mapboxgl.default.Marker({ draggable: true, color: '#6366f1' })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setSelectedLat(lngLat.lat);
        setSelectedLng(lngLat.lng);
      });

      // Click sulla mappa per spostare marker
      map.on('click', (e) => {
        marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setSelectedLat(e.lngLat.lat);
        setSelectedLng(e.lngLat.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
    };
  }, [initialLat, initialLng]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '600px',
          height: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Seleziona posizione</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            x
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            Clicca o trascina il marker per selezionare la posizione
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSelect(selectedLat, selectedLng)}
            style={{ flex: 1 }}
          >
            Conferma posizione
          </button>
        </div>
      </div>
    </div>
  );
}
