// GenAgenTa - Form per creare/modificare Neurone (Drawer dall'alto)

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone } from '../types';

interface NeuroneFormModalProps {
  neurone?: Neurone;
  onSave: (neurone: Neurone) => void;
  onClose: () => void;
  onRequestMapPick?: () => void;
  pickedPosition?: { lat: number; lng: number } | null;
  isPickingMap?: boolean;
}

type TipoNeurone = 'persona' | 'impresa' | 'luogo';

const CATEGORIE_SUGGERITE: Record<TipoNeurone, string[]> = {
  persona: ['imbianchino', 'cartongessista', 'muratore', 'elettricista', 'idraulico', 'architetto', 'geometra', 'ingegnere', 'committente', 'agente'],
  impresa: ['colorificio', 'ferramenta', 'impresa edile', 'studio tecnico', 'showroom', 'grossista', 'produttore'],
  luogo: ['cantiere residenziale', 'cantiere commerciale', 'ristrutturazione', 'nuova costruzione', 'manutenzione'],
};

export default function NeuroneFormModal({
  neurone,
  onSave,
  onClose,
  onRequestMapPick,
  pickedPosition,
  isPickingMap = false,
}: NeuroneFormModalProps) {
  const isEdit = !!neurone;

  const [tipo, setTipo] = useState<TipoNeurone>(neurone?.tipo || 'persona');
  const [nome, setNome] = useState(neurone?.nome || '');
  const [categorie, setCategorie] = useState<string[]>(neurone?.categorie || []);
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [indirizzo, setIndirizzo] = useState(neurone?.indirizzo || '');
  const [telefono, setTelefono] = useState(neurone?.telefono || '');
  const [email, setEmail] = useState(neurone?.email || '');
  const [visibilita, setVisibilita] = useState<'aziendale' | 'personale'>(neurone?.visibilita || 'aziendale');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [geocoding, setGeocoding] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [lat, setLat] = useState<number | null>(neurone?.lat || null);
  const [lng, setLng] = useState<number | null>(neurone?.lng || null);

  // Aggiorna posizione quando viene selezionata dalla mappa
  useEffect(() => {
    if (pickedPosition) {
      setLat(pickedPosition.lat);
      setLng(pickedPosition.lng);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pickedPosition.lat}&lon=${pickedPosition.lng}`)
        .then(res => res.json())
        .then(result => {
          if (result.display_name) {
            setIndirizzo(result.display_name);
          }
        })
        .catch(() => {});
    }
  }, [pickedPosition]);

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
        setError('Indirizzo non trovato');
      }
    } catch {
      setError('Errore ricerca indirizzo');
    } finally {
      setGeocoding(false);
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setError('GPS non supportato');
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
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`
          );
          const result = await response.json();
          if (result.display_name) {
            setIndirizzo(result.display_name);
          }
        } catch {}
        setGettingGps(false);
      },
      (err) => {
        setError('Errore GPS: ' + err.message);
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      setError(error.response?.data?.error || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Se siamo in modalità picking, mostra solo una barra minimizzata
  if (isPickingMap) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ fontWeight: 600 }}>Tocca la mappa per selezionare la posizione</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Annulla
        </button>
      </div>
    );
  }

  // Drawer normale dall'alto
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drawer dall'alto - max 60% altezza */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          maxHeight: '60vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          borderRadius: '0 0 16px 16px',
        }}
      >
        {/* Header compatto */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Modifica' : 'Nuovo'} {tipo === 'persona' ? 'Persona' : tipo === 'impresa' ? 'Impresa' : 'Cantiere'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form scrollabile */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
          {/* Tipo - pulsanti compatti */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['persona', 'impresa', 'luogo'] as TipoNeurone[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipo(t); setCategorie([]); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: tipo === t ? 600 : 400,
                    cursor: 'pointer',
                    background: tipo === t ? 'var(--primary)' : 'var(--bg-primary)',
                    color: tipo === t ? 'white' : 'var(--text-primary)',
                  }}
                >
                  {t === 'persona' ? 'Persona' : t === 'impresa' ? 'Impresa' : 'Cantiere'}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              className="form-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipo === 'persona' ? 'Nome persona *' : tipo === 'impresa' ? 'Nome impresa *' : 'Nome cantiere *'}
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* Categorie - chips */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
              {CATEGORIE_SUGGERITE[tipo].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategoria(cat)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '11px',
                    cursor: 'pointer',
                    background: categorie.includes(cat) ? 'var(--primary)' : 'var(--bg-primary)',
                    color: categorie.includes(cat) ? 'white' : 'var(--text-primary)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-input"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
                placeholder="Altra categoria..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategoriaCustom())}
                style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
              />
              <button
                type="button"
                onClick={addCategoriaCustom}
                disabled={!categoriaCustom.trim()}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Posizione */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                className="form-input"
                value={indirizzo}
                onChange={(e) => { setIndirizzo(e.target.value); setLat(null); setLng(null); }}
                placeholder="Indirizzo..."
                style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
              />
              <button
                type="button"
                onClick={handleGeocoding}
                disabled={geocoding || !indirizzo.trim()}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {geocoding ? '...' : '🔍'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleGetGps}
                disabled={gettingGps}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {gettingGps ? 'Localizzazione...' : '📍 GPS'}
              </button>
              {onRequestMapPick && (
                <button
                  type="button"
                  onClick={onRequestMapPick}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  🗺️ Scegli su mappa
                </button>
              )}
            </div>
            {lat && lng && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Coordinate: {lat.toFixed(5)}, {lng.toFixed(5)}
              </div>
            )}
          </div>

          {/* Contatti in riga */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <input
              type="tel"
              className="form-input"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Telefono"
              style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
            />
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
            />
          </div>

          {/* Visibilita inline */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="visibilita"
                checked={visibilita === 'aziendale'}
                onChange={() => setVisibilita('aziendale')}
              />
              Aziendale
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="visibilita"
                checked={visibilita === 'personale'}
                onChange={() => setVisibilita('personale')}
              />
              Personale
            </label>
          </div>

          {error && (
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer con pulsanti */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Area sotto il drawer - cliccabile per chiudere */}
      <div
        style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />
    </div>
  );
}
