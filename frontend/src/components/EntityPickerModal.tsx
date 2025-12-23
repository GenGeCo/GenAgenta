// GenAgenTa - Modal per selezione entità con ricerca
// Usato per selezionare un'entità da collegare (testuale)

import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';

interface EntityOption {
  id: string;
  nome: string;
  tipo: string;
  categorie: string[];
  indirizzo?: string;
}

interface EntityPickerModalProps {
  excludeId?: string; // ID da escludere (es. neurone corrente)
  onSelect: (entity: EntityOption) => void;
  onClose: () => void;
  onSwitchToMap?: () => void; // Callback per passare alla modalità mappa
}

export default function EntityPickerModal({
  excludeId,
  onSelect,
  onClose,
  onSwitchToMap,
}: EntityPickerModalProps) {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);

  // Carica tutte le entità
  useEffect(() => {
    const loadEntities = async () => {
      setLoading(true);
      try {
        const { data } = await api.getNeuroni({ limit: 500 });
        setEntities(
          data
            .filter((n) => n.id !== excludeId)
            .map((n) => ({
              id: n.id,
              nome: n.nome,
              tipo: n.tipo,
              categorie: n.categorie || [],
              indirizzo: n.indirizzo || undefined,
            }))
        );
      } catch (err) {
        console.error('Errore caricamento entità:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEntities();
  }, [excludeId]);

  // Tipi unici per filtro
  const tipiUnici = useMemo(() => {
    const tipi = new Set(entities.map((e) => e.tipo));
    return Array.from(tipi).sort();
  }, [entities]);

  // Filtra entità
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Filtro per tipo
    if (selectedTipo) {
      filtered = filtered.filter((e) => e.tipo === selectedTipo);
    }

    // Filtro per ricerca testuale
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nome.toLowerCase().includes(term) ||
          e.tipo.toLowerCase().includes(term) ||
          e.categorie.some((c) => c.toLowerCase().includes(term)) ||
          (e.indirizzo && e.indirizzo.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [entities, selectedTipo, searchTerm]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            Seleziona entità
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Barra ricerca */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Cerca per nome, tipo, categoria, indirizzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{ fontSize: '15px' }}
          />

          {/* Filtri per tipo */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedTipo(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                background: selectedTipo === null ? 'var(--primary)' : 'var(--bg-primary)',
                color: selectedTipo === null ? 'white' : 'var(--text-primary)',
              }}
            >
              Tutti ({entities.length})
            </button>
            {tipiUnici.map((tipo) => {
              const count = entities.filter((e) => e.tipo === tipo).length;
              return (
                <button
                  key={tipo}
                  onClick={() => setSelectedTipo(selectedTipo === tipo ? null : tipo)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: selectedTipo === tipo ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedTipo === tipo ? 'white' : 'var(--text-primary)',
                  }}
                >
                  {tipo} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista risultati */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Caricamento...
            </div>
          ) : filteredEntities.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nessuna entità trovata
            </div>
          ) : (
            filteredEntities.map((entity) => (
              <div
                key={entity.id}
                onClick={() => onSelect(entity)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'var(--bg-primary)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.color = 'inherit';
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '2px' }}>{entity.nome}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {entity.tipo}
                  {entity.categorie.length > 0 && ` • ${entity.categorie.join(', ')}`}
                </div>
                {entity.indirizzo && (
                  <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
                    {entity.indirizzo}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer con opzione mappa */}
        {onSwitchToMap && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>oppure</span>
            <button
              onClick={onSwitchToMap}
              className="btn btn-primary"
              style={{ fontSize: '14px' }}
            >
              Seleziona su mappa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
