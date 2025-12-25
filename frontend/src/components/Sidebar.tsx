// GenAgenTa - Sidebar Component

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Neurone, FiltriMappa, TipoNeuroneConfig, Categoria } from '../types';

interface SidebarProps {
  neuroni: Neurone[];
  selectedId: string | null;
  onSelect: (neurone: Neurone) => void;
  filtri: FiltriMappa;
  onFiltriChange: (filtri: FiltriMappa) => void;
  loading: boolean;
  onAddNeurone?: () => void;
  onQuickMapMode?: () => void;
  tipiNeurone: TipoNeuroneConfig[];
  categorie: Categoria[];
}

export default function Sidebar({
  neuroni,
  selectedId,
  onSelect,
  filtri,
  onFiltriChange,
  loading,
  onAddNeurone,
  onQuickMapMode,
  tipiNeurone,
  categorie,
}: SidebarProps) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    if (showQuickMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuickMenu]);

  // Filtra neuroni in base ai filtri attivi
  const neuroniFiltrati = useMemo(() => {
    let result = neuroni;

    // Filtro per tipi selezionati
    if (filtri.tipiSelezionati.length > 0) {
      result = result.filter(n => filtri.tipiSelezionati.includes(n.tipo));
    }

    // Filtro per categorie selezionate
    if (filtri.categorieSelezionate.length > 0) {
      result = result.filter(n =>
        n.categorie.some(cat =>
          filtri.categorieSelezionate.some(fc => fc.toLowerCase() === cat.toLowerCase())
        )
      );
    }

    // Filtro per ricerca
    if (filtri.ricerca.trim()) {
      const searchLower = filtri.ricerca.toLowerCase().trim();
      result = result.filter(n =>
        n.nome.toLowerCase().includes(searchLower) ||
        n.indirizzo?.toLowerCase().includes(searchLower) ||
        n.categorie.some(c => c.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [neuroni, filtri.tipiSelezionati, filtri.categorieSelezionate, filtri.ricerca]);

  // Raggruppa neuroni per tipo
  const neuroniPerTipo = useMemo(() => {
    const grouped: Record<string, Neurone[]> = {};
    tipiNeurone.forEach(tipo => {
      grouped[tipo.nome] = neuroniFiltrati.filter(n => n.tipo === tipo.nome);
    });
    return grouped;
  }, [neuroniFiltrati, tipiNeurone]);

  // Toggle tipo selezionato
  const toggleTipo = (tipoNome: string) => {
    const nuovi = filtri.tipiSelezionati.includes(tipoNome)
      ? filtri.tipiSelezionati.filter(t => t !== tipoNome)
      : [...filtri.tipiSelezionati, tipoNome];
    onFiltriChange({ ...filtri, tipiSelezionati: nuovi });
  };

  // Toggle categoria selezionata
  const toggleCategoria = (catNome: string) => {
    const nuovi = filtri.categorieSelezionate.includes(catNome)
      ? filtri.categorieSelezionate.filter(c => c !== catNome)
      : [...filtri.categorieSelezionate, catNome];
    onFiltriChange({ ...filtri, categorieSelezionate: nuovi });
  };

  // Categorie filtrate per i tipi selezionati
  const categorieVisibili = useMemo(() => {
    if (filtri.tipiSelezionati.length === 0) {
      return categorie;
    }
    const tipiIds = tipiNeurone
      .filter(t => filtri.tipiSelezionati.includes(t.nome))
      .map(t => t.id);
    return categorie.filter(c => tipiIds.includes(c.tipo_id));
  }, [categorie, filtri.tipiSelezionati, tipiNeurone]);

  return (
    <aside className="sidebar">
      {/* Logo e titolo */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
              GenAgenTa
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Rete Neurale Commerciale
            </p>
          </div>
          {(onAddNeurone || onQuickMapMode) && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="btn btn-primary"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  padding: 0,
                  fontSize: '24px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: showQuickMenu ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
                title="Aggiungi"
              >
                +
              </button>

              {/* Quick Menu Popup */}
              {showQuickMenu && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  minWidth: '180px',
                  zIndex: 1000,
                }}>
                  {onAddNeurone && (
                    <button
                      onClick={() => {
                        setShowQuickMenu(false);
                        onAddNeurone();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '18px' }}>📝</span>
                      Nuova entità
                    </button>
                  )}
                  {onQuickMapMode && (
                    <button
                      onClick={() => {
                        setShowQuickMenu(false);
                        onQuickMapMode();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '18px' }}>📍</span>
                      Nuovo su mappa
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filtri */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
        {/* Ricerca */}
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <input
            type="search"
            className="form-input"
            placeholder="Cerca nome, indirizzo..."
            value={filtri.ricerca}
            onChange={(e) => onFiltriChange({ ...filtri, ricerca: e.target.value })}
            style={{ fontSize: '13px', padding: '8px 10px' }}
          />
        </div>

        {/* Tipi con checkbox */}
        {tipiNeurone.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              Tipi
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {tipiNeurone.map((tipo) => {
                const isSelected = filtri.tipiSelezionati.length === 0 || filtri.tipiSelezionati.includes(tipo.nome);
                const count = neuroni.filter(n => n.tipo === tipo.nome).length;
                return (
                  <button
                    key={tipo.id}
                    onClick={() => toggleTipo(tipo.nome)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary)' : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      opacity: isSelected ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tipo.nome} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categorie con checkbox colorati */}
        {categorieVisibili.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              Categorie
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {categorieVisibili.map((cat) => {
                const isSelected = filtri.categorieSelezionate.length === 0 || filtri.categorieSelezionate.includes(cat.nome);
                const count = neuroni.filter(n => n.categorie.some(c => c.toLowerCase() === cat.nome.toLowerCase())).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategoria(cat.nome)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: isSelected ? `2px solid ${cat.colore}` : '2px solid transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? cat.colore : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      opacity: isSelected ? 1 : 0.5,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.nome} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toggle connessioni */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filtri.mostraConnessioni}
              onChange={(e) => onFiltriChange({ ...filtri, mostraConnessioni: e.target.checked })}
            />
            Mostra connessioni
          </label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer',
            opacity: filtri.mostraConnessioni ? 1 : 0.5,
          }}>
            <input
              type="checkbox"
              checked={filtri.soloConnessioniSelezionate}
              onChange={(e) => onFiltriChange({ ...filtri, soloConnessioniSelezionate: e.target.checked })}
              disabled={!filtri.mostraConnessioni}
            />
            Solo del selezionato
          </label>
        </div>
      </div>

      {/* Lista neuroni */}
      <div className="neurone-list">
        {loading ? (
          <p style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Caricamento...
          </p>
        ) : neuroniFiltrati.length === 0 ? (
          <p style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Nessun risultato
          </p>
        ) : (
          <>
            {tipiNeurone.map((tipo) => {
              const neuroniTipo = neuroniPerTipo[tipo.nome] || [];
              if (neuroniTipo.length === 0) return null;
              return (
                <NeuroneGroup
                  key={tipo.id}
                  titolo={tipo.nome}
                  neuroni={neuroniTipo}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  categorie={categorie}
                />
              );
            })}
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
        {neuroniFiltrati.length === neuroni.length
          ? `${neuroni.length} entità`
          : `${neuroniFiltrati.length} di ${neuroni.length} entità`}
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
  categorie,
}: {
  titolo: string;
  neuroni: Neurone[];
  selectedId: string | null;
  onSelect: (neurone: Neurone) => void;
  categorie: Categoria[];
}) {
  // Trova colore categoria
  const getCategoriaColore = (catNome: string) => {
    const cat = categorie.find(c => c.nome.toLowerCase() === catNome.toLowerCase());
    return cat?.colore || '#6b7280';
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      <h3 style={{
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--text-secondary)',
        padding: '8px 12px 4px',
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
          <div className="neurone-item-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {neurone.categorie.slice(0, 2).map((cat, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getCategoriaColore(cat),
                }}
                title={cat}
              />
            ))}
            <span style={{ marginLeft: '2px' }}>
              {neurone.categorie.slice(0, 2).join(', ')}
            </span>
          </div>
        </div>
      ))}

      {neuroni.length > 50 && (
        <p style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          +{neuroni.length - 50} altri...
        </p>
      )}
    </div>
  );
}
