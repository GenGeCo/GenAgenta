// GenAgenTa - Form per creare/modificare Neurone

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, TipoNeuroneConfig, Categoria, FormaNeurone } from '../types';

// Tipo per i campi personalizzati
interface CampoPersonalizzato {
  id: string;
  tipo_id: string;
  nome: string;
  etichetta: string;
  tipo_dato: 'testo' | 'textarea' | 'numero' | 'data' | 'select' | 'email' | 'telefono' | 'url';
  opzioni?: string[];
  obbligatorio: boolean;
  ordine: number;
}

// Tipo per categoria con colore (per testata colorata)
interface CategoriaConfig {
  id: string;
  tipo_id: string;
  nome: string;
  colore: string;
  ordine: number;
}

interface NeuroneFormModalProps {
  neurone?: Neurone;
  categorie?: CategoriaConfig[]; // Per colore testata
  onSave: (neurone: Neurone) => void;
  onClose: () => void;
  onDelete?: () => void; // Per eliminare entità
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
  categorie = [],
  onSave,
  onClose,
  onDelete,
  onRequestMapPick,
  pickedPosition,
  isPickingMap = false,
  onPositionFound,
}: NeuroneFormModalProps) {
  const isEdit = !!neurone;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Stato per eliminazione con doppio avviso
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);

  // Ottieni colore testata dalla categoria dell'entità
  const getHeaderColor = () => {
    if (neurone?.categorie && neurone.categorie.length > 0 && categorie.length > 0) {
      const primaCat = neurone.categorie[0];
      const catConfig = categorie.find(c => c.nome.toLowerCase() === primaCat.toLowerCase());
      if (catConfig?.colore) {
        return catConfig.colore;
      }
    }
    // Colore default per tipo
    const coloriTipo: Record<string, string> = {
      persona: '#3b82f6',
      impresa: '#22c55e',
      cantiere: '#f97316',
      ente: '#8b5cf6',
    };
    return coloriTipo[neurone?.tipo || ''] || '#6366f1';
  };

  const headerColor = isEdit ? getHeaderColor() : '#6366f1';

  // Handler eliminazione
  const handleDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    // Step 2: eliminazione effettiva
    setDeleting(true);
    try {
      await onDelete?.();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
      setDeleteStep(0);
    }
  };

  const cancelDelete = () => {
    setDeleteStep(0);
  };

  // Dati dal database
  const [tipiNeurone, setTipiNeurone] = useState<TipoNeuroneConfig[]>([]);
  const [categorieDB, setCategorieDB] = useState<Categoria[]>([]);
  const [loadingTipi, setLoadingTipi] = useState(true);

  // Form state
  const [tipoId, setTipoId] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  // Valori originali per modifica (per avviso cambio tipo/categoria)
  const [tipoIdOriginale, setTipoIdOriginale] = useState<string>('');
  const [categoriaIdOriginale, setCategoriaIdOriginale] = useState<string>('');
  const [nome, setNome] = useState(neurone?.nome || '');
  const [indirizzo, setIndirizzo] = useState(neurone?.indirizzo || '');
  const [telefono, setTelefono] = useState(neurone?.telefono || '');
  const [email, setEmail] = useState(neurone?.email || '');
  const [visibilita, setVisibilita] = useState<'aziendale' | 'personale'>(neurone?.visibilita || 'aziendale');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [geocoding, setGeocoding] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [lat, setLat] = useState<number | null>(neurone?.lat != null ? Number(neurone.lat) : null);
  const [lng, setLng] = useState<number | null>(neurone?.lng != null ? Number(neurone.lng) : null);
  const [dimensione, setDimensione] = useState<string>(neurone?.dimensione != null ? String(neurone.dimensione) : '');

  // Campi personalizzati dinamici
  const [campiPersonalizzati, setCampiPersonalizzati] = useState<CampoPersonalizzato[]>([]);
  const [loadingCampi, setLoadingCampi] = useState(false);
  // Valori dei campi personalizzati (chiave = nome campo, valore = valore inserito)
  const datiExtraIniziali = (neurone?.dati_extra as Record<string, unknown>) || {};
  const [valoriCampi, setValoriCampi] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(datiExtraIniziali).map(([k, v]) => [k, v != null ? String(v) : ''])
    )
  );

  // Aggiorna tutti i campi del form quando cambia l'entità selezionata
  useEffect(() => {
    if (neurone) {
      // Reset campi base
      setNome(neurone.nome || '');
      setIndirizzo(neurone.indirizzo || '');
      setTelefono(neurone.telefono || '');
      setEmail(neurone.email || '');
      setVisibilita(neurone.visibilita || 'aziendale');
      setLat(neurone.lat != null ? Number(neurone.lat) : null);
      setLng(neurone.lng != null ? Number(neurone.lng) : null);
      setDimensione(neurone.dimensione != null ? String(neurone.dimensione) : '');

      // Reset campi personalizzati
      const datiExtra = (neurone.dati_extra as Record<string, unknown>) || {};
      setValoriCampi(
        Object.fromEntries(
          Object.entries(datiExtra).map(([k, v]) => [k, v != null ? String(v) : ''])
        )
      );

      // Reset stato eliminazione
      setDeleteStep(0);
      setError('');

      // Re-imposta tipo e categoria se i tipi sono già caricati
      if (tipiNeurone.length > 0) {
        const tipoMatch = tipiNeurone.find(t => t.nome.toLowerCase() === neurone.tipo?.toLowerCase());
        if (tipoMatch) {
          setTipoId(tipoMatch.id);
          setTipoIdOriginale(tipoMatch.id);
          const catMatch = categorieDB.find(c =>
            c.tipo_id === tipoMatch.id &&
            neurone.categorie?.includes(c.nome.toLowerCase())
          );
          if (catMatch) {
            setCategoriaId(catMatch.id);
            setCategoriaIdOriginale(catMatch.id);
          } else {
            setCategoriaId('');
            setCategoriaIdOriginale('');
          }
        }
      }
    }
  }, [neurone?.id]); // Si attiva solo quando cambia l'ID dell'entità

  // Carica tipi e categorie dal DB
  useEffect(() => {
    loadTipiCategorie();
  }, []);

  const loadTipiCategorie = async () => {
    setLoadingTipi(true);
    try {
      // Usa i metodi dedicati che puntano all'API corretta
      const [tipiRes, categorieRes] = await Promise.all([
        api.getTipiNeurone(),
        api.getCategorie()
      ]);

      const tipi = tipiRes.data;
      const categorie = categorieRes.data;

      setTipiNeurone(tipi);
      setCategorieDB(categorie);

      // Se stiamo modificando, imposta tipo e categoria correnti
      if (neurone) {
        // Cerca il tipo per nome (backward compatibility)
        const tipoMatch = tipi.find((t: TipoNeuroneConfig) =>
          t.nome.toLowerCase() === neurone.tipo?.toLowerCase()
        );
        if (tipoMatch) {
          setTipoId(tipoMatch.id);
          setTipoIdOriginale(tipoMatch.id); // Salva originale per avviso modifica
          // Cerca la tipologia
          const catMatch = categorie.find((c: Categoria) =>
            c.tipo_id === tipoMatch.id &&
            neurone.categorie?.includes(c.nome.toLowerCase())
          );
          if (catMatch) {
            setCategoriaId(catMatch.id);
            setCategoriaIdOriginale(catMatch.id); // Salva originale per avviso modifica
          }
        }
      } else if (tipi.length > 0) {
        // Nuovo neurone: seleziona primo tipo di default
        setTipoId(tipi[0].id);
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

  // Carica campi personalizzati quando cambia il tipo
  useEffect(() => {
    if (!tipoId) {
      setCampiPersonalizzati([]);
      return;
    }

    const loadCampi = async () => {
      setLoadingCampi(true);
      try {
        const res = await api.get(`/campi?tipo=${tipoId}`);
        setCampiPersonalizzati(res.data.data || []);
      } catch (err) {
        console.error('Errore caricamento campi:', err);
        setCampiPersonalizzati([]);
      } finally {
        setLoadingCampi(false);
      }
    };

    loadCampi();
  }, [tipoId]);

  // Aggiorna un valore campo personalizzato
  const updateValoreCampo = (nomeCampo: string, valore: string) => {
    setValoriCampi(prev => ({ ...prev, [nomeCampo]: valore }));
  };

  // Handler per cambio tipo con conferma (solo in modifica)
  const handleTipoChange = (nuovoTipoId: string) => {
    // Se non siamo in modifica o è lo stesso tipo, cambia direttamente
    if (!isEdit || nuovoTipoId === tipoIdOriginale) {
      setTipoId(nuovoTipoId);
      setCategoriaId('');
      return;
    }
    // In modifica con tipo diverso: chiedi conferma
    if (window.confirm('Attenzione: stai cambiando il tipo dell\'entità. Questo potrebbe influenzare la visualizzazione sulla mappa e i campi personalizzati. Vuoi procedere?')) {
      setTipoId(nuovoTipoId);
      setCategoriaId('');
    }
  };

  // Handler per cambio categoria con conferma (solo in modifica)
  const handleCategoriaChange = (nuovaCategoriaId: string) => {
    // Se non siamo in modifica o è la stessa categoria, cambia direttamente
    if (!isEdit || nuovaCategoriaId === categoriaIdOriginale) {
      setCategoriaId(nuovaCategoriaId);
      return;
    }
    // In modifica con categoria diversa: chiedi conferma
    if (window.confirm('Attenzione: stai cambiando la categoria dell\'entità. Questo potrebbe influenzare il colore e il raggruppamento. Vuoi procedere?')) {
      setCategoriaId(nuovaCategoriaId);
    }
  };

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

    // Costruisci dati_extra dai campi personalizzati
    let datiExtraPayload: Record<string, unknown> | null = null;
    if (campiPersonalizzati.length > 0) {
      datiExtraPayload = {};
      for (const campo of campiPersonalizzati) {
        const valore = valoriCampi[campo.nome];
        if (valore !== undefined && valore !== '') {
          // Converti in base al tipo
          if (campo.tipo_dato === 'numero') {
            datiExtraPayload[campo.nome] = parseFloat(valore) || null;
          } else {
            datiExtraPayload[campo.nome] = valore;
          }
        }
      }
      // Se non ci sono valori, metti null
      if (Object.keys(datiExtraPayload).length === 0) {
        datiExtraPayload = null;
      }
    }

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
        dimensione: dimensione ? parseFloat(dimensione) : null,
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

  // Renderizza un singolo campo personalizzato
  const renderCampoPersonalizzato = (campo: CampoPersonalizzato, compact = false) => {
    const valore = valoriCampi[campo.nome] || '';
    const inputStyle = compact
      ? { fontSize: '12px', padding: '6px 8px' }
      : {};

    switch (campo.tipo_dato) {
      case 'textarea':
        return (
          <textarea
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        );
      case 'numero':
        return (
          <input
            type="number"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            style={inputStyle}
          />
        );
      case 'data':
        return (
          <input
            type="date"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            style={inputStyle}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            style={inputStyle}
          />
        );
      case 'telefono':
        return (
          <input
            type="tel"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            style={inputStyle}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            style={inputStyle}
          />
        );
      case 'select':
        return (
          <select
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleziona...</option>
            {(campo.opzioni || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default: // testo
        return (
          <input
            type="text"
            className="form-input"
            value={valore}
            onChange={(e) => updateValoreCampo(campo.nome, e.target.value)}
            placeholder={campo.etichetta}
            style={inputStyle}
          />
        );
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
          {/* Header con colore categoria */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: isEdit ? `linear-gradient(135deg, ${headerColor}20 0%, ${headerColor}05 100%)` : undefined,
            borderLeft: isEdit ? `4px solid ${headerColor}` : undefined,
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: isEdit ? headerColor : undefined }}>
              {isEdit ? 'Modifica' : 'Nuovo'} {tipoSelezionato ? tipoSelezionato.nome : 'Neurone'}
            </h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: isEdit ? headerColor : 'var(--text-secondary)', padding: '2px 6px' }}>✕</button>
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
                        onClick={() => handleTipoChange(t.id)}
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
                            onClick={() => handleCategoriaChange(cat.id)}
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
                {lat != null && lng != null && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>📍 {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</div>}

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

                {/* Dimensione (mobile) */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Dimensione (m)</label>
                  <input type="number" className="form-input" value={dimensione} onChange={(e) => setDimensione(e.target.value)} placeholder="Auto" min="10" max="200" step="5" style={{ fontSize: '12px', padding: '6px 8px' }} />
                </div>

                {/* Campi personalizzati */}
                {campiPersonalizzati.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                      Dettagli {tipoSelezionato?.nome || 'entità'}
                    </label>
                    {loadingCampi ? (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Caricamento...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {campiPersonalizzati.map((campo) => (
                          <div key={campo.id}>
                            <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              {campo.etichetta}{campo.obbligatorio && ' *'}
                            </label>
                            {renderCampoPersonalizzato(campo, true)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px' }}>{error}</div>}

                {/* Sezione Elimina - solo in modifica */}
                {isEdit && onDelete && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--border-color)',
                  }}>
                    {deleteStep > 0 && (
                      <div style={{
                        padding: '8px',
                        marginBottom: '8px',
                        background: deleteStep === 1 ? '#fef3c7' : '#fee2e2',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: deleteStep === 1 ? '#92400e' : '#b91c1c',
                      }}>
                        {deleteStep === 1 ? (
                          <><strong>Attenzione!</strong> Stai per eliminare "{neurone?.nome}". Clicca di nuovo per confermare.</>
                        ) : (
                          <><strong>ULTIMA CONFERMA!</strong> L'eliminazione è irreversibile.</>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: deleteStep > 0 ? 'none' : '1px solid #ef4444',
                          borderRadius: '6px',
                          background: deleteStep > 0 ? '#ef4444' : 'transparent',
                          color: deleteStep > 0 ? 'white' : '#ef4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {deleting ? '...' : deleteStep === 0 ? '🗑️ Elimina' : deleteStep === 1 ? 'Conferma?' : 'ELIMINA!'}
                      </button>
                      {deleteStep > 0 && (
                        <button
                          onClick={cancelDelete}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Annulla
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>Annulla</button>
                <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: isEdit ? headerColor : 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>{saving ? '...' : 'Salva'}</button>
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
        {/* Header con colore categoria */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isEdit ? `linear-gradient(135deg, ${headerColor}20 0%, ${headerColor}05 100%)` : undefined,
          borderLeft: isEdit ? `4px solid ${headerColor}` : undefined,
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: isEdit ? headerColor : undefined }}>
            {isEdit ? 'Modifica' : 'Nuovo'} {tipoSelezionato ? tipoSelezionato.nome : 'Neurone'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: isEdit ? headerColor : 'var(--text-secondary)', padding: '4px 8px' }}>✕</button>
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
                      onClick={() => handleTipoChange(t.id)}
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
                          onClick={() => handleCategoriaChange(cat.id)}
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
                {lat != null && lng != null && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Coordinate: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</div>}
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

              {/* Dimensione sulla mappa */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Dimensione (m)</label>
                <input
                  type="number"
                  className="form-input"
                  value={dimensione}
                  onChange={(e) => setDimensione(e.target.value)}
                  placeholder="50"
                  min="10"
                  max="200"
                  step="10"
                  style={{ width: '80px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>10-200</span>
              </div>

              {/* Campi personalizzati */}
              {campiPersonalizzati.length > 0 && (
                <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>
                    Dettagli {tipoSelezionato?.nome || ''}
                  </label>
                  {loadingCampi ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Caricamento...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {campiPersonalizzati.map((campo) => (
                        <div key={campo.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '100px', flexShrink: 0 }}>
                            {campo.etichetta}{campo.obbligatorio && '*'}
                          </label>
                          <div style={{ flex: 1 }}>{renderCampoPersonalizzato(campo)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px' }}>{error}</div>}

              {/* Sezione Elimina - solo in modifica */}
              {isEdit && onDelete && (
                <div style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px dashed var(--border-color)',
                }}>
                  {deleteStep > 0 && (
                    <div style={{
                      padding: '12px',
                      marginBottom: '12px',
                      background: deleteStep === 1 ? '#fef3c7' : '#fee2e2',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: deleteStep === 1 ? '#92400e' : '#b91c1c',
                    }}>
                      {deleteStep === 1 ? (
                        <><strong>Attenzione!</strong> Stai per eliminare "{neurone?.nome}". Clicca di nuovo per confermare.</>
                      ) : (
                        <><strong>ULTIMA CONFERMA!</strong> L'eliminazione è irreversibile.</>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        padding: '10px 16px',
                        border: deleteStep > 0 ? 'none' : '1px solid #ef4444',
                        borderRadius: '8px',
                        background: deleteStep > 0 ? '#ef4444' : 'transparent',
                        color: deleteStep > 0 ? 'white' : '#ef4444',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {deleting ? 'Eliminazione...' : deleteStep === 0 ? '🗑️ Elimina entità' : deleteStep === 1 ? 'Conferma?' : 'ELIMINA!'}
                    </button>
                    {deleteStep > 0 && (
                      <button
                        onClick={cancelDelete}
                        style={{
                          padding: '10px 16px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Annulla
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>Annulla</button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: isEdit ? headerColor : 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
