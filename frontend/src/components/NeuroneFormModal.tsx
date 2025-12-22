// GenAgenTa - Form per creare/modificare Neurone

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, TipoNeuroneConfig, Categoria, FormaNeurone } from '../types';

interface NeuroneFormModalProps {
  neurone?: Neurone;
  onSave: (neurone: Neurone) => void;
  onClose: () => void;
  onRequestMapPick?: () => void;
  pickedPosition?: { lat: number; lng: number } | null;
  isPickingMap?: boolean;
  onPositionFound?: (lat: number, lng: number) => void;
}

// Mappa forme ai simboli visivi
const formaLabels: Record<FormaNeurone, string> = {
  cerchio: '●',
  quadrato: '■',
  triangolo: '▲',
  stella: '★',
  croce: '✚',
  L: 'L',
  C: 'C',
  W: 'W',
  Z: 'Z'
};

export default function NeuroneFormModal({
  neurone,
  onSave,
  onClose,
  onRequestMapPick,
  pickedPosition,
  isPickingMap = false,
  onPositionFound,
}: NeuroneFormModalProps) {
  const isEdit = !!neurone;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Dati dal database
  const [tipiNeurone, setTipiNeurone] = useState<TipoNeuroneConfig[]>([]);
  const [categorieDB, setCategorieDB] = useState<Categoria[]>([]);
  const [loadingTipi, setLoadingTipi] = useState(true);

  // Form state
  const [tipoId, setTipoId] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [nome, setNome] = useState(neurone?.nome || '');
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

  // Campi extra per cantieri (tipo luogo)
  const datiExtra = neurone?.dati_extra as { data_inizio?: string; data_fine?: string; importo_lavori?: number } | null;
  const [dataInizioCantiere, setDataInizioCantiere] = useState(datiExtra?.data_inizio || '');
  const [dataFineCantiere, setDataFineCantiere] = useState(datiExtra?.data_fine || '');
  const [importoLavori, setImportoLavori] = useState(datiExtra?.importo_lavori?.toString() || '');

  // Carica tipi e categorie dal DB
  useEffect(() => {
    loadTipiCategorie();
  }, []);

  const loadTipiCategorie = async () => {
    setLoadingTipi(true);
    try {
      // Usa API v2 per tipi e tipologie
      const [tipiRes, tipologieRes] = await Promise.all([
        api.get('/tipi'),
        api.get('/tipologie')
      ]);

      // Mappa tipi v2 al formato TipoNeuroneConfig
      const tipiMapped = tipiRes.data.data.map((t: { id: string; nome: string; forma: string; ordine: number }) => ({
        id: t.id,
        nome: t.nome,
        forma: t.forma as FormaNeurone,
        ordine: t.ordine
      }));

      // Mappa tipologie v2 al formato Categoria
      const categorieMapped = tipologieRes.data.data.map((tp: { id: string; tipo_id: string; nome: string; colore: string; ordine: number }) => ({
        id: tp.id,
        tipo_id: tp.tipo_id,
        nome: tp.nome,
        colore: tp.colore,
        ordine: tp.ordine
      }));

      setTipiNeurone(tipiMapped);
      setCategorieDB(categorieMapped);

      // Se stiamo modificando, imposta tipo e categoria correnti
      if (neurone) {
        // Cerca il tipo per nome (backward compatibility)
        const tipoMatch = tipiMapped.find((t: TipoNeuroneConfig) =>
          t.nome.toLowerCase() === neurone.tipo?.toLowerCase()
        );
        if (tipoMatch) {
          setTipoId(tipoMatch.id);
          // Cerca la tipologia
          const catMatch = categorieMapped.find((c: Categoria) =>
            c.tipo_id === tipoMatch.id &&
            neurone.categorie?.includes(c.nome.toLowerCase())
          );
          if (catMatch) {
            setCategoriaId(catMatch.id);
          }
        }
      } else if (tipiMapped.length > 0) {
        // Nuovo neurone: seleziona primo tipo di default
        setTipoId(tipiMapped[0].id);
      }
    } catch (error) {
      console.error('Errore caricamento tipi:', error);
      setError('Errore caricamento tipi. Vai in Impostazioni → Categorie per crearli.');
    } finally {
      setLoadingTipi(false);
    }
  };

  // Categorie filtrate per il tipo selezionato
  const categoriePerTipo = categorieDB.filter(c => c.tipo_id === tipoId);

  // Tipo selezionato
  const tipoSelezionato = tipiNeurone.find(t => t.id === tipoId);

  // Rileva resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const newLat = parseFloat(results[0].lat);
        const newLng = parseFloat(results[0].lon);
        setLat(newLat);
        setLng(newLng);
        setIndirizzo(results[0].display_name);
        onPositionFound?.(newLat, newLng);
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
        onPositionFound?.(newLat, newLng);
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

  const handleSubmit = async () => {
    setError('');
    if (!nome.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }
    if (!tipoId) {
      setError('Seleziona un tipo');
      return;
    }
    if (!categoriaId) {
      setError('Seleziona una categoria');
      return;
    }

    // Trova nomi per il salvataggio
    const tipoNome = tipiNeurone.find(t => t.id === tipoId)?.nome || '';
    const categoriaNome = categorieDB.find(c => c.id === categoriaId)?.nome || '';
    const tipoLower = tipoNome.toLowerCase();

    // Costruisci dati_extra in base al tipo
    let datiExtraPayload: Record<string, unknown> | null = null;
    if (tipoLower === 'luogo' || tipoLower === 'cantiere') {
      datiExtraPayload = {
        data_inizio: dataInizioCantiere || null,
        data_fine: dataFineCantiere || null,
        importo_lavori: importoLavori ? parseFloat(importoLavori) : null,
      };
    }

    // DEBUG: log cosa viene inviato
    console.log('DEBUG salvataggio:', JSON.stringify({ tipoId, tipoNome, categoriaNome, tipiDisponibili: tipiNeurone.map(t => t.nome) }));

    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        tipo: tipoNome, // Invia il nome esatto del tipo (es. "Cantiere", non "cantiere")
        categorie: [categoriaNome],  // Anche categoria con nome esatto
        visibilita,
        indirizzo: indirizzo || null,
        lat: lat || null,
        lng: lng || null,
        telefono: telefono || null,
        email: email || null,
        dati_extra: datiExtraPayload,
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

  // Se siamo in modalità picking, mostra solo barra in alto
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

  // Messaggio se non ci sono tipi
  if (!loadingTipi && tipiNeurone.length === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
          }}
          onClick={e => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: '12px' }}>Configura prima le entità</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Per creare entità devi prima definire almeno un tipo e una tipologia.
            Vai in <strong>Impostazioni → Entità</strong> per configurarli.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Ho capito
          </button>
        </div>
      </div>
    );
  }

  // MOBILE: Drawer dall'alto compatto
  if (isMobile) {
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
        <div
          style={{
            background: 'var(--bg-secondary)',
            maxHeight: '60vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            borderRadius: '0 0 12px 12px',
          }}
        >
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              {isEdit ? 'Modifica' : 'Nuovo'} {tipoSelezionato ? tipoSelezionato.nome : 'Neurone'}
            </h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px 6px' }}>✕</button>
          </div>

          {loadingTipi ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
          ) : (
            <>
              {/* Form compatto */}
              <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
                {/* Tipo */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Tipo</label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {tipiNeurone.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setTipoId(t.id); setCategoriaId(''); }}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: tipoId === t.id ? 600 : 400,
                          cursor: 'pointer',
                          background: tipoId === t.id ? 'var(--primary)' : 'var(--bg-primary)',
                          color: tipoId === t.id ? 'white' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{formaLabels[t.forma]}</span> {t.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria */}
                {tipoId && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Categoria</label>
                    {categoriePerTipo.length === 0 ? (
                      <p style={{ fontSize: '11px', color: '#f59e0b' }}>Nessuna categoria per questo tipo. Creala in Impostazioni.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {categoriePerTipo.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoriaId(cat.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '8px',
                              border: categoriaId === cat.id ? '2px solid white' : 'none',
                              boxShadow: categoriaId === cat.id ? '0 0 0 2px var(--primary)' : 'none',
                              fontSize: '11px',
                              cursor: 'pointer',
                              background: cat.colore,
                              color: 'white',
                              fontWeight: 500,
                            }}
                          >
                            {cat.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nome */}
                <input type="text" className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome *" style={{ fontSize: '13px', marginBottom: '8px', padding: '8px 10px' }} />

                {/* Posizione */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <input type="text" className="form-input" value={indirizzo} onChange={(e) => { setIndirizzo(e.target.value); setLat(null); setLng(null); }} placeholder="Indirizzo..." style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                  <button type="button" onClick={handleGeocoding} disabled={geocoding || !indirizzo.trim()} style={{ padding: '6px 8px', border: 'none', borderRadius: '6px', background: 'var(--bg-primary)', cursor: 'pointer', fontSize: '12px' }}>{geocoding ? '...' : '🔍'}</button>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <button type="button" onClick={handleGetGps} disabled={gettingGps} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', background: 'var(--bg-primary)', cursor: 'pointer', fontSize: '11px' }}>{gettingGps ? '...' : '📍 GPS'}</button>
                  {onRequestMapPick && (
                    <button type="button" onClick={onRequestMapPick} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>🗺️ Mappa</button>
                  )}
                </div>
                {lat && lng && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>📍 {lat.toFixed(4)}, {lng.toFixed(4)}</div>}

                {/* Contatti */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <input type="tel" className="form-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Telefono" style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                </div>

                {/* Visibilita */}
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', marginBottom: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input type="radio" name="visibilita" checked={visibilita === 'aziendale'} onChange={() => setVisibilita('aziendale')} /> Aziendale
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input type="radio" name="visibilita" checked={visibilita === 'personale'} onChange={() => setVisibilita('personale')} /> Personale
                  </label>
                </div>

                {/* Campi extra per cantieri */}
                {tipoSelezionato && (tipoSelezionato.nome.toLowerCase() === 'luogo' || tipoSelezionato.nome.toLowerCase() === 'cantiere') && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Periodo cantiere</label>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Inizio</label>
                        <input type="date" className="form-input" value={dataInizioCantiere} onChange={(e) => setDataInizioCantiere(e.target.value)} style={{ fontSize: '12px', padding: '6px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Fine</label>
                        <input type="date" className="form-input" value={dataFineCantiere} onChange={(e) => setDataFineCantiere(e.target.value)} style={{ fontSize: '12px', padding: '6px' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Importo lavori</label>
                      <input type="number" className="form-input" value={importoLavori} onChange={(e) => setImportoLavori(e.target.value)} placeholder="50000" style={{ fontSize: '12px', padding: '6px' }} />
                    </div>
                  </div>
                )}

                {error && <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px' }}>{error}</div>}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>Annulla</button>
                <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>{saving ? '...' : 'Salva'}</button>
              </div>
            </>
          )}
        </div>

        {/* Sfondo cliccabile per chiudere */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      </div>
    );
  }

  // DESKTOP: Pannello laterale da sinistra (accanto alla sidebar)
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: '280px',
        bottom: 0,
        width: '380px',
        background: 'var(--bg-secondary)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInLeft 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Modifica' : 'Nuovo'} {tipoSelezionato ? tipoSelezionato.nome : 'Neurone'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px' }}>✕</button>
        </div>

        {loadingTipi ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento tipi...</div>
        ) : (
          <>
            {/* Form */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Tipo */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Tipo *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tipiNeurone.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTipoId(t.id); setCategoriaId(''); }}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: tipoId === t.id ? 600 : 400,
                        cursor: 'pointer',
                        background: tipoId === t.id ? 'var(--primary)' : 'var(--bg-primary)',
                        color: tipoId === t.id ? 'white' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{formaLabels[t.forma]}</span> {t.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoria */}
              {tipoId && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Categoria *</label>
                  {categoriePerTipo.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#f59e0b', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                      Nessuna categoria per questo tipo. Vai in Impostazioni → Categorie per crearne.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {categoriePerTipo.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoriaId(cat.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: categoriaId === cat.id ? '2px solid white' : '2px solid transparent',
                            boxShadow: categoriaId === cat.id ? '0 0 0 2px var(--primary)' : 'none',
                            fontSize: '13px',
                            cursor: 'pointer',
                            background: cat.colore,
                            color: 'white',
                            fontWeight: 500,
                          }}
                        >
                          {cat.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nome */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Nome *</label>
                <input type="text" className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Inserisci nome..." />
              </div>

              {/* Posizione */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Posizione</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input type="text" className="form-input" value={indirizzo} onChange={(e) => { setIndirizzo(e.target.value); setLat(null); setLng(null); }} placeholder="Via Roma 1, Milano" style={{ flex: 1 }} />
                  <button type="button" onClick={handleGeocoding} disabled={geocoding || !indirizzo.trim()} style={{ padding: '8px 12px', border: 'none', borderRadius: '8px', background: 'var(--bg-primary)', cursor: 'pointer' }}>{geocoding ? '...' : '🔍'}</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleGetGps} disabled={gettingGps} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--bg-primary)', cursor: 'pointer', fontSize: '13px' }}>{gettingGps ? 'Localizzazione...' : '📍 Posizione GPS'}</button>
                  {onRequestMapPick && (
                    <button type="button" onClick={onRequestMapPick} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>🗺️ Scegli su mappa</button>
                  )}
                </div>
                {lat && lng && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Coordinate: {lat.toFixed(5)}, {lng.toFixed(5)}</div>}
              </div>

              {/* Contatti */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Telefono</label>
                  <input type="tel" className="form-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 333 1234567" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@esempio.it" />
                </div>
              </div>

              {/* Visibilita */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Visibilità</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="visibilita-desktop" checked={visibilita === 'aziendale'} onChange={() => setVisibilita('aziendale')} /> Aziendale (visibile ai colleghi)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="visibilita-desktop" checked={visibilita === 'personale'} onChange={() => setVisibilita('personale')} /> Personale (solo tu)
                  </label>
                </div>
              </div>

              {/* Campi extra per cantieri */}
              {tipoSelezionato && (tipoSelezionato.nome.toLowerCase() === 'luogo' || tipoSelezionato.nome.toLowerCase() === 'cantiere') && (
                <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px', display: 'block', color: 'var(--text-secondary)' }}>Periodo cantiere</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Data inizio lavori</label>
                      <input type="date" className="form-input" value={dataInizioCantiere} onChange={(e) => setDataInizioCantiere(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Data fine lavori</label>
                      <input type="date" className="form-input" value={dataFineCantiere} onChange={(e) => setDataFineCantiere(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Importo lavori (€)</label>
                    <input type="number" className="form-input" value={importoLavori} onChange={(e) => setImportoLavori(e.target.value)} placeholder="Es: 50000" step="100" />
                  </div>
                </div>
              )}

              {error && <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>Annulla</button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
