// GenAgenTa - Sidebar Component

import type { Neurone, FiltriMappa } from '../types';

interface SidebarProps {
  neuroni: Neurone[];
  selectedId: string | null;
  onSelect: (neurone: Neurone) => void;
  filtri: FiltriMappa;
  onFiltriChange: (filtri: FiltriMappa) => void;
  loading: boolean;
}

export default function Sidebar({
  neuroni,
  selectedId,
  onSelect,
  filtri,
  onFiltriChange,
  loading,
}: SidebarProps) {
  // Raggruppa per tipo
  const neuroniPerTipo = {
    persona: neuroni.filter((n) => n.tipo === 'persona'),
    impresa: neuroni.filter((n) => n.tipo === 'impresa'),
    luogo: neuroni.filter((n) => n.tipo === 'luogo'),
  };

  return (
    <aside className="sidebar">
      {/* Logo e titolo */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
          GenAgenTa
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Rete Neurale Commerciale
        </p>
      </div>

      {/* Filtri */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ fontSize: '12px' }}>Tipo</label>
          <select
            className="form-input"
            value={filtri.tipoNeurone || ''}
            onChange={(e) => onFiltriChange({
              ...filtri,
              tipoNeurone: e.target.value as 'persona' | 'impresa' | 'luogo' || null,
            })}
            style={{ fontSize: '13px', padding: '6px 8px' }}
          >
            <option value="">Tutti</option>
            <option value="persona">Persone</option>
            <option value="impresa">Imprese</option>
            <option value="luogo">Cantieri/Luoghi</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '12px' }}>Cerca</label>
          <input
            type="search"
            className="form-input"
            placeholder="Nome, indirizzo..."
            style={{ fontSize: '13px', padding: '6px 8px' }}
          />
        </div>
      </div>

      {/* Lista neuroni */}
      <div className="neurone-list">
        {loading ? (
          <p style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Caricamento...
          </p>
        ) : (
          <>
            {/* Cantieri */}
            {neuroniPerTipo.luogo.length > 0 && (
              <NeuroneGroup
                titolo="Cantieri"
                neuroni={neuroniPerTipo.luogo}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}

            {/* Imprese */}
            {neuroniPerTipo.impresa.length > 0 && (
              <NeuroneGroup
                titolo="Imprese"
                neuroni={neuroniPerTipo.impresa}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}

            {/* Persone */}
            {neuroniPerTipo.persona.length > 0 && (
              <NeuroneGroup
                titolo="Persone"
                neuroni={neuroniPerTipo.persona}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
          </>
        )}
      </div>

      {/* Stats footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}>
        {neuroni.length} neuroni caricati
      </div>
    </aside>
  );
}

// Componente gruppo neuroni
function NeuroneGroup({
  titolo,
  neuroni,
  selectedId,
  onSelect,
}: {
  titolo: string;
  neuroni: Neurone[];
  selectedId: string | null;
  onSelect: (neurone: Neurone) => void;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--text-secondary)',
        padding: '8px 12px',
      }}>
        {titolo} ({neuroni.length})
      </h3>

      {neuroni.slice(0, 50).map((neurone) => (
        <div
          key={neurone.id}
          className={`neurone-item ${selectedId === neurone.id ? 'active' : ''}`}
          onClick={() => onSelect(neurone)}
        >
          <div className="neurone-item-name">
            {neurone.nome}
            {neurone.has_note && (
              <span className="icon-lock" title="Ha note personali">
                🔒
              </span>
            )}
          </div>
          <div className="neurone-item-meta">
            {neurone.categorie.slice(0, 2).join(', ')}
            {neurone.indirizzo && ` • ${neurone.indirizzo.split(',')[0]}`}
          </div>
        </div>
      ))}

      {neuroni.length > 50 && (
        <p style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          +{neuroni.length - 50} altri...
        </p>
      )}
    </div>
  );
}
