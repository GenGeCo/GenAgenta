// GenAgenTa - Tab Famiglie Prodotto (per SettingsModal)

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { FamigliaProdotto, Visibilita } from '../types';

export default function FamiglieProdottoTab() {
  const [famiglie, setFamiglie] = useState<FamigliaProdotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form nuova famiglia
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newDescrizione, setNewDescrizione] = useState('');
  const [newVisibilita, setNewVisibilita] = useState<Visibilita>('aziendale');

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescrizione, setEditDescrizione] = useState('');

  // Espansione albero
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFamiglie();
  }, []);

  const loadFamiglie = async () => {
    setLoading(true);
    try {
      const { data } = await api.getFamiglieProdotto();
      setFamiglie(data);
      // Espandi tutte le famiglie con figli
      const expandedIds = new Set<string>();
      const addExpanded = (items: FamigliaProdotto[]) => {
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            expandedIds.add(item.id);
            addExpanded(item.children);
          }
        });
      };
      addExpanded(data);
      setExpanded(expandedIds);
    } catch (error) {
      console.error('Errore caricamento famiglie:', error);
      setMessage({ type: 'error', text: 'Errore caricamento famiglie prodotto' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.createFamigliaProdotto({
        nome: newNome.trim(),
        parent_id: newParentId,
        descrizione: newDescrizione.trim() || undefined,
        visibilita: newVisibilita,
      });
      setMessage({ type: 'success', text: 'Famiglia creata!' });
      setNewNome('');
      setNewParentId(null);
      setNewDescrizione('');
      setNewVisibilita('aziendale');
      setShowNewForm(false);
      loadFamiglie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore creazione famiglia' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editNome.trim()) return;
    setSaving(true);
    try {
      await api.updateFamigliaProdotto(id, {
        nome: editNome.trim(),
        descrizione: editDescrizione.trim() || undefined,
      });
      setEditingId(null);
      loadFamiglie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore modifica famiglia' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string, numFigli: number) => {
    const msg = numFigli > 0
      ? `Eliminare "${nome}" e le sue ${numFigli} sottofamiglie?`
      : `Eliminare "${nome}"?`;
    if (!confirm(msg)) return;

    setSaving(true);
    try {
      await api.deleteFamigliaProdotto(id);
      loadFamiglie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setMessage({ type: 'error', text: err.response?.data?.error || 'Errore eliminazione famiglia' });
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEdit = (famiglia: FamigliaProdotto) => {
    setEditingId(famiglia.id);
    setEditNome(famiglia.nome);
    setEditDescrizione(famiglia.descrizione || '');
  };

  const startAddChild = (parentId: string) => {
    setNewParentId(parentId);
    setShowNewForm(true);
  };

  // Flatten per select parent
  const flattenFamiglie = (items: FamigliaProdotto[], level = 0): { id: string; nome: string; level: number }[] => {
    return items.flatMap(item => [
      { id: item.id, nome: item.nome, level },
      ...(item.children ? flattenFamiglie(item.children, level + 1) : [])
    ]);
  };

  const flatList = flattenFamiglie(famiglie);

  // Render ricorsivo dell'albero
  const renderTree = (items: FamigliaProdotto[], level = 0) => {
    return items.map(item => (
      <div key={item.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            paddingLeft: `${12 + level * 24}px`,
            background: level === 0 ? 'var(--bg-primary)' : 'transparent',
            borderRadius: level === 0 ? '8px' : '0',
            borderBottom: level > 0 ? '1px solid var(--border-color)' : 'none',
          }}
        >
          {/* Expand/Collapse */}
          {item.children && item.children.length > 0 ? (
            <button
              onClick={() => toggleExpand(item.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                width: '20px',
              }}
            >
              {expanded.has(item.id) ? '▼' : '▶'}
            </button>
          ) : (
            <span style={{ width: '20px' }} />
          )}

          {editingId === item.id ? (
            // Editing mode
            <>
              <input
                type="text"
                className="form-input"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                className="btn btn-primary"
                onClick={() => handleUpdate(item.id)}
                disabled={saving}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Salva
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingId(null)}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                ×
              </button>
            </>
          ) : (
            // View mode
            <>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{item.nome}</span>
                {item.descrizione && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    - {item.descrizione}
                  </span>
                )}
              </div>
              <button
                onClick={() => startAddChild(item.id)}
                title="Aggiungi sottofamiglia"
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                +
              </button>
              <button
                onClick={() => startEdit(item)}
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Modifica
              </button>
              <button
                onClick={() => handleDelete(item.id, item.nome, item.num_figli || 0)}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ×
              </button>
            </>
          )}
        </div>

        {/* Children */}
        {item.children && item.children.length > 0 && expanded.has(item.id) && (
          <div style={{ marginLeft: '0' }}>
            {renderTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Organizza i prodotti in famiglie e sottofamiglie gerarchiche
        </p>
        <button
          className="btn btn-primary"
          onClick={() => { setShowNewForm(true); setNewParentId(null); }}
          style={{ padding: '6px 12px', fontSize: '13px' }}
        >
          + Nuova Famiglia
        </button>
      </div>

      {/* Messaggio feedback */}
      {message && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' ? '#22c55e' : '#ef4444',
            marginBottom: '16px',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Form nuova famiglia */}
      {showNewForm && (
        <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            {newParentId ? 'Nuova sottofamiglia' : 'Nuova famiglia principale'}
          </h4>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nome</label>
              <input
                type="text"
                className="form-input"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="es: Pitture"
                autoFocus
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Famiglia padre</label>
              <select
                className="form-input"
                value={newParentId || ''}
                onChange={(e) => setNewParentId(e.target.value || null)}
              >
                <option value="">-- Nessuna (radice) --</option>
                {flatList.map(f => (
                  <option key={f.id} value={f.id}>
                    {'  '.repeat(f.level)}{f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Descrizione (opzionale)</label>
              <input
                type="text"
                className="form-input"
                value={newDescrizione}
                onChange={(e) => setNewDescrizione(e.target.value)}
                placeholder="es: Tutte le pitture per interni ed esterni"
              />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Visibilità</label>
              <select
                className="form-input"
                value={newVisibilita}
                onChange={(e) => setNewVisibilita(e.target.value as 'aziendale' | 'personale')}
              >
                <option value="aziendale">Aziendale</option>
                <option value="personale">Personale</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={saving || !newNome.trim()}
            >
              {saving ? '...' : 'Crea'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowNewForm(false); setNewNome(''); setNewParentId(null); setNewDescrizione(''); setNewVisibilita('aziendale'); }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Albero famiglie */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
      ) : famiglie.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p>Nessuna famiglia prodotto definita.</p>
          <p style={{ fontSize: '13px' }}>Crea la prima famiglia per organizzare i tuoi prodotti.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {renderTree(famiglie)}
        </div>
      )}

      {/* Esempi */}
      {famiglie.length === 0 && !showNewForm && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Esempio struttura:</h4>
          <pre style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
{`PITTURE
├── Idropitture
├── Smalti
└── Primer/Fissativi

CAPPOTTO
├── Pannelli EPS
├── Rasante
└── Finitura`}
          </pre>
        </div>
      )}
    </div>
  );
}
