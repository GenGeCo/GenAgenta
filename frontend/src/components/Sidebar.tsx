// GenAgenTa - Sidebar Component

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Neurone, FiltriMappa, TipoNeuroneConfig, Categoria } from '../types';

// Componente Dropdown Multi-Select compatto
interface DropdownOption {
  id: string;
  label: string;
  count: number;
  colore?: string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  placeholder,
  onSelectAll,
}: {
  label: string;
  options: DropdownOption[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
  onSelectAll?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedCount = selected.length;
  const buttonLabel = selectedCount === 0
    ? (placeholder || label)
    : selectedCount === options.length
      ? 'Tutti'
      : `${selectedCount} ${label.toLowerCase()}`;

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: '12px',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          background: selectedCount > 0 ? 'var(--primary)' : 'var(--bg-secondary)',
          color: selectedCount > 0 ? 'white' : 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {buttonLabel}
        </span>
        <span style={{
          fontSize: '10px',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s ease',
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {/* Opzione "Tutti" per deselezionare tutto */}
          {onSelectAll && (
            <div
              onClick={() => {
                onSelectAll();
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                borderBottom: '2px solid var(--border-color)',
                background: selected.length === 0 ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: selected.length === 0 ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (selected.length > 0) e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selected.length === 0 ? 'var(--bg-tertiary)' : 'transparent';
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                Tutti
              </span>
            </div>
          )}
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? 'var(--bg-tertiary)' : 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(opt.id)}
                  style={{ accentColor: opt.colore || 'var(--primary)' }}
                />
                {opt.colore && (
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: opt.colore,
                    flexShrink: 0,
                  }} />
                )}
                <span style={{
                  flex: 1,
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}>
                  {opt.label}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}>
                  {opt.count}
                </span>
              </label>
            );
          })}
          {options.length === 0 && (
            <div style={{
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}>
              Nessuna opzione
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

      {/* Filtri compatti */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        {/* Ricerca */}
        <input
          type="search"
          className="form-input"
          placeholder="Cerca..."
          value={filtri.ricerca}
          onChange={(e) => onFiltriChange({ ...filtri, ricerca: e.target.value })}
          style={{ fontSize: '12px', padding: '6px 10px', marginBottom: '8px' }}
        />

        {/* Dropdown Tipi e Categorie in verticale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          <MultiSelectDropdown
            label="Tipi"
            placeholder="Tutti i tipi"
            options={tipiNeurone.map(t => ({
              id: t.nome,
              label: t.nome,
              count: neuroni.filter(n => n.tipo === t.nome).length,
            }))}
            selected={filtri.tipiSelezionati}
            onToggle={toggleTipo}
            onSelectAll={() => onFiltriChange({ ...filtri, tipiSelezionati: [] })}
          />
          <MultiSelectDropdown
            label="Categorie"
            placeholder="Tutte le categorie"
            options={categorieVisibili.map(c => ({
              id: c.nome,
              label: c.nome,
              count: neuroni.filter(n => n.categorie.some(cat => cat.toLowerCase() === c.nome.toLowerCase())).length,
              colore: c.colore,
            }))}
            selected={filtri.categorieSelezionate}
            onToggle={toggleCategoria}
            onSelectAll={() => onFiltriChange({ ...filtri, categorieSelezionate: [] })}
          />
        </div>

        {/* Toggle connessioni compatti */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filtri.mostraConnessioni}
              onChange={(e) => onFiltriChange({ ...filtri, mostraConnessioni: e.target.checked })}
              style={{ width: '14px', height: '14px' }}
            />
            Connessioni
          </label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            opacity: filtri.mostraConnessioni ? 1 : 0.4,
          }}>
            <input
              type="checkbox"
              checked={filtri.soloConnessioniSelezionate}
              onChange={(e) => onFiltriChange({ ...filtri, soloConnessioniSelezionate: e.target.checked })}
              disabled={!filtri.mostraConnessioni}
              style={{ width: '14px', height: '14px' }}
            />
            Solo selezionato
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
