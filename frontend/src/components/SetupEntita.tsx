// GenAgenTa - Setup Entità (Tipi, Tipologie, Campi)
// Interfaccia ad albero unificata

import { useState, useEffect } from 'react';
import { api } from '../utils/api';

// Tipi
interface Tipo {
  id: string;
  nome: string;
  forma: string;
  ordine: number;
  num_tipologie?: number;
  // Natura commerciale
  is_acquirente?: boolean;
  is_venditore?: boolean;
  is_intermediario?: boolean;
  is_influencer?: boolean;
}

interface Tipologia {
  id: string;
  tipo_id: string;
  nome: string;
  colore: string;
  ordine: number;
}

interface Campo {
  id: string;
  tipo_id: string;
  nome: string;
  etichetta: string;
  tipo_dato: 'testo' | 'textarea' | 'numero' | 'data' | 'email' | 'telefono' | 'url' | 'select';
  opzioni?: string[];
  obbligatorio: boolean;
  ordine: number;
}

interface TipoConnessione {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
  num_connessioni?: number;
}

// Forme disponibili con simboli
const FORME: Record<string, string> = {
  cerchio: '●',
  quadrato: '■',
  triangolo: '▲',
  stella: '★',
  croce: '✚',
  esagono: '⬡',
};

export default function SetupEntita() {
  // Dati
  const [tipi, setTipi] = useState<Tipo[]>([]);
  const [tipologie, setTipologie] = useState<Tipologia[]>([]);
  const [campiPerTipo, setCampiPerTipo] = useState<Record<string, Campo[]>>({});
  const [tipiConnessione, setTipiConnessione] = useState<TipoConnessione[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [expandedTipi, setExpandedTipi] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showNewTipo, setShowNewTipo] = useState(false);
  const [showNewTipologia, setShowNewTipologia] = useState<string | null>(null);
  const [showNewConnessione, setShowNewConnessione] = useState(false);
  const [showCampi, setShowCampi] = useState<string | null>(null);
  const [showNewCampo, setShowNewCampo] = useState(false);

  // Form state
  const [newNome, setNewNome] = useState('');
  const [newForma, setNewForma] = useState('cerchio');
  const [newColore, setNewColore] = useState('#3b82f6');
  const [newCampoNome, setNewCampoNome] = useState('');
  const [newCampoEtichetta, setNewCampoEtichetta] = useState('');
  const [newCampoTipo, setNewCampoTipo] = useState<Campo['tipo_dato']>('testo');
  // Natura commerciale
  const [newIsAcquirente, setNewIsAcquirente] = useState(false);
  const [newIsVenditore, setNewIsVenditore] = useState(false);
  const [newIsIntermediario, setNewIsIntermediario] = useState(false);
  const [newIsInfluencer, setNewIsInfluencer] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carica dati
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tipiRes, tipologieRes, connRes] = await Promise.all([
        api.get('/tipi-neurone'),
        api.get('/categorie'),
        api.get('/tipi-sinapsi'),
      ]);
      setTipi(tipiRes.data.data);
      setTipologie(tipologieRes.data.data);
      setTipiConnessione(connRes.data.data);

      // Espandi tutti i tipi di default
      setExpandedTipi(new Set(tipiRes.data.data.map((t: Tipo) => t.id)));
    } catch (error) {
      console.error('Errore caricamento:', error);
      showMessage('error', 'Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const loadCampi = async (tipoId: string) => {
    try {
      const res = await api.get(`/campi?tipo=${tipoId}`);
      setCampiPerTipo(prev => ({ ...prev, [tipoId]: res.data.data }));
    } catch (error) {
      console.error('Errore caricamento campi:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle espansione tipo
  const toggleTipo = (tipoId: string) => {
    setExpandedTipi(prev => {
      const next = new Set(prev);
      if (next.has(tipoId)) {
        next.delete(tipoId);
      } else {
        next.add(tipoId);
      }
      return next;
    });
  };

  // CRUD Tipi
  const createTipo = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/tipi', {
        nome: newNome.trim(),
        forma: newForma,
        is_acquirente: newIsAcquirente,
        is_venditore: newIsVenditore,
        is_intermediario: newIsIntermediario,
        is_influencer: newIsInfluencer,
      });
      setTipi(prev => [...prev, {
        id: res.data.id,
        nome: newNome.trim(),
        forma: newForma,
        ordine: prev.length,
        is_acquirente: newIsAcquirente,
        is_venditore: newIsVenditore,
        is_intermediario: newIsIntermediario,
        is_influencer: newIsInfluencer,
      }]);
      setExpandedTipi(prev => new Set([...prev, res.data.id]));
      setNewNome('');
      setNewIsAcquirente(false);
      setNewIsVenditore(false);
      setNewIsIntermediario(false);
      setNewIsInfluencer(false);
      setShowNewTipo(false);
      showMessage('success', 'Tipo creato');
    } catch (error) {
      showMessage('error', 'Errore creazione tipo');
    } finally {
      setSaving(false);
    }
  };

  const updateTipo = async (id: string, updates: Partial<Tipo>) => {
    setSaving(true);
    try {
      await api.put(`/tipi/${id}`, updates);
      setTipi(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      setEditingId(null);
      showMessage('success', 'Tipo aggiornato');
    } catch (error) {
      showMessage('error', 'Errore aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const deleteTipo = async (id: string) => {
    if (!confirm('Eliminare questo tipo e tutte le sue tipologie?')) return;
    setSaving(true);
    try {
      await api.delete(`/tipi/${id}`);
      setTipi(prev => prev.filter(t => t.id !== id));
      setTipologie(prev => prev.filter(tp => tp.tipo_id !== id));
      showMessage('success', 'Tipo eliminato');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Errore eliminazione');
    } finally {
      setSaving(false);
    }
  };

  // CRUD Tipologie
  const createTipologia = async (tipoId: string) => {
    if (!newNome.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/tipologie', {
        tipo_id: tipoId,
        nome: newNome.trim(),
        colore: newColore,
      });
      setTipologie(prev => [...prev, {
        id: res.data.id,
        tipo_id: tipoId,
        nome: newNome.trim(),
        colore: newColore,
        ordine: prev.filter(tp => tp.tipo_id === tipoId).length
      }]);
      setNewNome('');
      setNewColore('#3b82f6');
      setShowNewTipologia(null);
      showMessage('success', 'Tipologia creata');
    } catch (error) {
      showMessage('error', 'Errore creazione tipologia');
    } finally {
      setSaving(false);
    }
  };

  const updateTipologia = async (id: string, updates: Partial<Tipologia>) => {
    setSaving(true);
    try {
      await api.put(`/tipologie/${id}`, updates);
      setTipologie(prev => prev.map(tp => tp.id === id ? { ...tp, ...updates } : tp));
      setEditingId(null);
      showMessage('success', 'Tipologia aggiornata');
    } catch (error) {
      showMessage('error', 'Errore aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const deleteTipologia = async (id: string) => {
    if (!confirm('Eliminare questa tipologia?')) return;
    setSaving(true);
    try {
      await api.delete(`/tipologie/${id}`);
      setTipologie(prev => prev.filter(tp => tp.id !== id));
      showMessage('success', 'Tipologia eliminata');
    } catch (error) {
      showMessage('error', 'Errore eliminazione');
    } finally {
      setSaving(false);
    }
  };

  // CRUD Tipi Connessione
  const createTipoConnessione = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/tipi-connessione', {
        nome: newNome.trim(),
        colore: newColore,
      });
      setTipiConnessione(prev => [...prev, {
        id: res.data.id,
        nome: newNome.trim(),
        colore: newColore,
        ordine: prev.length
      }]);
      setNewNome('');
      setNewColore('#64748b');
      setShowNewConnessione(false);
      showMessage('success', 'Tipo connessione creato');
    } catch (error) {
      showMessage('error', 'Errore creazione');
    } finally {
      setSaving(false);
    }
  };

  const deleteTipoConnessione = async (id: string) => {
    if (!confirm('Eliminare questo tipo connessione?')) return;
    setSaving(true);
    try {
      await api.delete(`/tipi-connessione/${id}`);
      setTipiConnessione(prev => prev.filter(tc => tc.id !== id));
      showMessage('success', 'Tipo connessione eliminato');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Errore eliminazione');
    } finally {
      setSaving(false);
    }
  };

  // CRUD Campi
  const createCampo = async (tipoId: string) => {
    if (!newCampoNome.trim() || !newCampoEtichetta.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/campi', {
        tipo_id: tipoId,
        nome: newCampoNome.trim().toLowerCase().replace(/\s+/g, '_'),
        etichetta: newCampoEtichetta.trim(),
        tipo_dato: newCampoTipo,
      });
      const newCampo: Campo = {
        id: res.data.id,
        tipo_id: tipoId,
        nome: newCampoNome.trim().toLowerCase().replace(/\s+/g, '_'),
        etichetta: newCampoEtichetta.trim(),
        tipo_dato: newCampoTipo,
        obbligatorio: false,
        ordine: (campiPerTipo[tipoId]?.length || 0),
      };
      setCampiPerTipo(prev => ({
        ...prev,
        [tipoId]: [...(prev[tipoId] || []), newCampo],
      }));
      setNewCampoNome('');
      setNewCampoEtichetta('');
      setNewCampoTipo('testo');
      setShowNewCampo(false);
      showMessage('success', 'Campo creato');
    } catch (error) {
      showMessage('error', 'Errore creazione campo');
    } finally {
      setSaving(false);
    }
  };

  const updateCampo = async (campoId: string, tipoId: string, updates: Partial<Campo>) => {
    setSaving(true);
    try {
      await api.put(`/campi/${campoId}`, updates);
      setCampiPerTipo(prev => ({
        ...prev,
        [tipoId]: prev[tipoId].map(c => c.id === campoId ? { ...c, ...updates } : c),
      }));
      setEditingId(null);
      showMessage('success', 'Campo aggiornato');
    } catch (error) {
      showMessage('error', 'Errore aggiornamento campo');
    } finally {
      setSaving(false);
    }
  };

  const deleteCampo = async (campoId: string, tipoId: string) => {
    if (!confirm('Eliminare questo campo?')) return;
    setSaving(true);
    try {
      await api.delete(`/campi/${campoId}`);
      setCampiPerTipo(prev => ({
        ...prev,
        [tipoId]: prev[tipoId].filter(c => c.id !== campoId),
      }));
      showMessage('success', 'Campo eliminato');
    } catch (error) {
      showMessage('error', 'Errore eliminazione');
    } finally {
      setSaving(false);
    }
  };

  // Render
  if (loading) {
    return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 600 }}>
      {/* Messaggio feedback */}
      {message && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          borderRadius: 8,
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
        }}>
          {message.text}
        </div>
      )}

      {/* SEZIONE TIPI ENTITÀ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Tipi Entità</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewTipo(true)}
            style={{ padding: '6px 12px', fontSize: 13 }}
          >
            + Nuovo Tipo
          </button>
        </div>

        {/* Form nuovo tipo */}
        {showNewTipo && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Nome</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="es: Cantiere"
                  autoFocus
                />
              </div>
              <div style={{ width: 120 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Forma</label>
                <select
                  className="form-input"
                  value={newForma}
                  onChange={(e) => setNewForma(e.target.value)}
                >
                  {Object.entries(FORME).map(([key, symbol]) => (
                    <option key={key} value={key}>{symbol} {key}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Natura commerciale */}
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>
                Natura commerciale (default per questo tipo)
              </label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newIsAcquirente} onChange={(e) => setNewIsAcquirente(e.target.checked)} />
                  <span title="Compra prodotti/servizi">🛒 Acquirente</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newIsVenditore} onChange={(e) => setNewIsVenditore(e.target.checked)} />
                  <span title="Vende prodotti/servizi">🏭 Venditore</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newIsIntermediario} onChange={(e) => setNewIsIntermediario(e.target.checked)} />
                  <span title="Compra e rivende">🔄 Intermediario</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newIsInfluencer} onChange={(e) => setNewIsInfluencer(e.target.checked)} />
                  <span title="Prescrive/influenza acquisti">💡 Influencer</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-primary"
                onClick={createTipo}
                disabled={saving || !newNome.trim()}
              >
                Crea
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowNewTipo(false); setNewNome(''); }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Lista tipi ad albero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tipi.map((tipo) => {
            const isExpanded = expandedTipi.has(tipo.id);
            const tipologieTipo = tipologie.filter(tp => tp.tipo_id === tipo.id);

            return (
              <div key={tipo.id} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                {/* Header tipo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isExpanded ? 'var(--bg-primary)' : 'transparent',
                }}
                onClick={() => toggleTipo(tipo.id)}
                >
                  <span style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    width: 16,
                    textAlign: 'center'
                  }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>

                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
                    {FORME[tipo.forma] || '●'}
                  </span>

                  {editingId === tipo.id ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => {
                        if (editingValue.trim() && editingValue !== tipo.nome) {
                          updateTipo(tipo.id, { nome: editingValue.trim() });
                        } else {
                          setEditingId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateTipo(tipo.id, { nome: editingValue.trim() });
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontWeight: 500 }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(tipo.id);
                        setEditingValue(tipo.nome);
                      }}
                    >
                      {tipo.nome}
                    </span>
                  )}

                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {tipologieTipo.length} tipologie
                  </span>

                  {/* Badge natura commerciale */}
                  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, cursor: 'pointer', padding: '2px 4px', background: tipo.is_acquirente ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-primary)', borderRadius: 4 }} title="Acquirente">
                      <input type="checkbox" checked={!!tipo.is_acquirente} onChange={(e) => updateTipo(tipo.id, { is_acquirente: e.target.checked })} style={{ width: 12, height: 12 }} />
                      🛒
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, cursor: 'pointer', padding: '2px 4px', background: tipo.is_venditore ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-primary)', borderRadius: 4 }} title="Venditore">
                      <input type="checkbox" checked={!!tipo.is_venditore} onChange={(e) => updateTipo(tipo.id, { is_venditore: e.target.checked })} style={{ width: 12, height: 12 }} />
                      🏭
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, cursor: 'pointer', padding: '2px 4px', background: tipo.is_intermediario ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-primary)', borderRadius: 4 }} title="Intermediario">
                      <input type="checkbox" checked={!!tipo.is_intermediario} onChange={(e) => updateTipo(tipo.id, { is_intermediario: e.target.checked })} style={{ width: 12, height: 12 }} />
                      🔄
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, cursor: 'pointer', padding: '2px 4px', background: tipo.is_influencer ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-primary)', borderRadius: 4 }} title="Influencer">
                      <input type="checkbox" checked={!!tipo.is_influencer} onChange={(e) => updateTipo(tipo.id, { is_influencer: e.target.checked })} style={{ width: 12, height: 12 }} />
                      💡
                    </label>
                  </div>

                  <select
                    className="form-input"
                    value={tipo.forma}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTipo(tipo.id, { forma: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                  >
                    {Object.entries(FORME).map(([key, symbol]) => (
                      <option key={key} value={key}>{symbol} {key}</option>
                    ))}
                  </select>

                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCampi(showCampi === tipo.id ? null : tipo.id); if (!campiPerTipo[tipo.id]) loadCampi(tipo.id); }}
                    style={{
                      padding: '4px 8px',
                      background: showCampi === tipo.id ? 'var(--primary)' : 'var(--bg-primary)',
                      color: showCampi === tipo.id ? 'white' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                    title="Campi personalizzati"
                  >
                    Campi
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTipo(tipo.id); }}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Campi personalizzati */}
                {showCampi === tipo.id && (
                  <div style={{
                    padding: 16,
                    background: 'var(--bg-primary)',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Campi personalizzati</span>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowNewCampo(true)}
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        + Campo
                      </button>
                    </div>

                    {showNewCampo && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Etichetta (es: Progettista)"
                          value={newCampoEtichetta}
                          onChange={(e) => {
                            setNewCampoEtichetta(e.target.value);
                            setNewCampoNome(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                          }}
                          style={{ flex: 1, minWidth: 150 }}
                        />
                        <select
                          className="form-input"
                          value={newCampoTipo}
                          onChange={(e) => setNewCampoTipo(e.target.value as Campo['tipo_dato'])}
                          style={{ width: 100 }}
                        >
                          <option value="testo">Testo</option>
                          <option value="textarea">Area testo</option>
                          <option value="numero">Numero</option>
                          <option value="data">Data</option>
                          <option value="email">Email</option>
                          <option value="telefono">Telefono</option>
                          <option value="url">URL</option>
                          <option value="select">Select</option>
                        </select>
                        <button className="btn btn-primary" onClick={() => createCampo(tipo.id)} disabled={saving}>Crea</button>
                        <button className="btn btn-secondary" onClick={() => setShowNewCampo(false)}>✕</button>
                      </div>
                    )}

                    {(campiPerTipo[tipo.id] || []).length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
                        Nessun campo personalizzato
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(campiPerTipo[tipo.id] || []).map(campo => (
                          <div key={campo.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 4,
                            fontSize: 12
                          }}>
                            {editingId === campo.id ? (
                              <input
                                type="text"
                                className="form-input"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => {
                                  if (editingValue.trim() && editingValue !== campo.etichetta) {
                                    updateCampo(campo.id, tipo.id, { etichetta: editingValue.trim() });
                                  } else {
                                    setEditingId(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCampo(campo.id, tipo.id, { etichetta: editingValue.trim() });
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                autoFocus
                                style={{ flex: 1, fontSize: 12 }}
                              />
                            ) : (
                              <span style={{ flex: 1 }}>
                                {campo.etichetta}
                              </span>
                            )}
                            <select
                              className="form-input"
                              value={campo.tipo_dato}
                              onChange={(e) => updateCampo(campo.id, tipo.id, { tipo_dato: e.target.value as Campo['tipo_dato'] })}
                              style={{ width: 90, padding: '2px 4px', fontSize: 11 }}
                            >
                              <option value="testo">Testo</option>
                              <option value="textarea">Area testo</option>
                              <option value="numero">Numero</option>
                              <option value="data">Data</option>
                              <option value="email">Email</option>
                              <option value="telefono">Telefono</option>
                              <option value="url">URL</option>
                              <option value="select">Select</option>
                            </select>
                            <button
                              onClick={() => {
                                setEditingId(campo.id);
                                setEditingValue(campo.etichetta);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}
                              title="Modifica etichetta"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteCampo(campo.id, tipo.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                              title="Elimina campo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tipologie (espanse) */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 12px 48px' }}>
                    {tipologieTipo.map((tipologia) => (
                      <div
                        key={tipologia.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>├─</span>

                        <input
                          type="color"
                          value={tipologia.colore}
                          onChange={(e) => updateTipologia(tipologia.id, { colore: e.target.value })}
                          style={{
                            width: 24,
                            height: 24,
                            padding: 0,
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        />

                        {editingId === tipologia.id ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              if (editingValue.trim() && editingValue !== tipologia.nome) {
                                updateTipologia(tipologia.id, { nome: editingValue.trim() });
                              } else {
                                setEditingId(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTipologia(tipologia.id, { nome: editingValue.trim() });
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                            autoFocus
                            style={{ flex: 1, fontSize: 13 }}
                          />
                        ) : (
                          <span
                            style={{ flex: 1, fontSize: 13 }}
                            onDoubleClick={() => {
                              setEditingId(tipologia.id);
                              setEditingValue(tipologia.nome);
                            }}
                          >
                            {tipologia.nome}
                          </span>
                        )}

                        <button
                          onClick={() => deleteTipologia(tipologia.id)}
                          style={{
                            padding: '2px 6px',
                            background: 'none',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 11,
                            opacity: 0.6
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Aggiungi tipologia */}
                    {showNewTipologia === tipo.id ? (
                      <div style={{ display: 'flex', gap: 8, padding: '8px 0', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>└─</span>
                        <input
                          type="color"
                          value={newColore}
                          onChange={(e) => setNewColore(e.target.value)}
                          style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nome tipologia"
                          value={newNome}
                          onChange={(e) => setNewNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') createTipologia(tipo.id);
                            if (e.key === 'Escape') { setShowNewTipologia(null); setNewNome(''); }
                          }}
                          autoFocus
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button className="btn btn-primary" onClick={() => createTipologia(tipo.id)} style={{ padding: '4px 8px', fontSize: 11 }}>✓</button>
                        <button className="btn btn-secondary" onClick={() => { setShowNewTipologia(null); setNewNome(''); }} style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewTipologia(tipo.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 0',
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontSize: 12,
                          width: '100%'
                        }}
                      >
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>└─</span>
                        + Aggiungi tipologia
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {tipi.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>
              Nessun tipo definito. Crea il primo tipo per iniziare.
            </p>
          )}
        </div>
      </div>

      {/* SEPARATORE */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

      {/* SEZIONE TIPI CONNESSIONE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Tipi Connessione</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewConnessione(true)}
            style={{ padding: '6px 12px', fontSize: 13 }}
          >
            + Nuovo Tipo
          </button>
        </div>

        {/* Form nuovo tipo connessione */}
        {showNewConnessione && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Nome</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="es: Fornisce"
                  autoFocus
                />
              </div>
              <input
                type="color"
                value={newColore}
                onChange={(e) => setNewColore(e.target.value)}
                style={{ width: 40, height: 38, padding: 0, border: 'none', borderRadius: 4 }}
              />
              <button
                className="btn btn-primary"
                onClick={createTipoConnessione}
                disabled={saving || !newNome.trim()}
              >
                Crea
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowNewConnessione(false); setNewNome(''); setNewColore('#64748b'); }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Lista tipi connessione */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tipiConnessione.map((tc) => (
            <div
              key={tc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{
                width: 40,
                height: 4,
                background: tc.colore,
                borderRadius: 2
              }} />

              <input
                type="color"
                value={tc.colore}
                onChange={(e) => {
                  const updates = { colore: e.target.value };
                  api.put(`/tipi-connessione/${tc.id}`, updates);
                  setTipiConnessione(prev => prev.map(t => t.id === tc.id ? { ...t, ...updates } : t));
                }}
                style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
              />

              <span style={{ flex: 1, fontWeight: 500 }}>{tc.nome}</span>

              {tc.num_connessioni !== undefined && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {tc.num_connessioni} connessioni
                </span>
              )}

              <button
                onClick={() => deleteTipoConnessione(tc.id)}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {tipiConnessione.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>
              Nessun tipo connessione definito.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
