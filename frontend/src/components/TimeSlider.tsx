// GenAgenTa - Time Slider Component

import { useState, useEffect, useRef } from 'react';

interface TimeSliderProps {
  dataInizio: string;
  dataFine: string;
  onChange: (inizio: string, fine: string) => void;
}

// Un giorno in millisecondi
const ONE_DAY = 24 * 60 * 60 * 1000;

// Range presets in anni
const RANGE_PRESETS = [
  { label: '1 anno', years: 1 },
  { label: '3 anni', years: 3 },
  { label: '5 anni', years: 5 },
  { label: '10 anni', years: 10 },
];

export default function TimeSlider({ dataInizio, dataFine, onChange }: TimeSliderProps) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  // State per range personalizzabile degli slider
  const [rangeYears, setRangeYears] = useState(3); // Default 3 anni
  const [showSettings, setShowSettings] = useState(false);
  const [customInizio, setCustomInizio] = useState(dataInizio);
  const [customFine, setCustomFine] = useState(dataFine);

  // Calcola min/max timestamp basati sul range selezionato
  const anniFA = new Date(oggi.getTime() - rangeYears * 365 * ONE_DAY);
  const unAnnoAvanti = new Date(oggi.getTime() + 365 * ONE_DAY);

  const minTimestamp = anniFA.getTime();
  const maxTimestamp = unAnnoAvanti.getTime();

  // Converti date in valori slider (in giorni dal minimo per precisione)
  const timestampToDay = (ts: number) => Math.round((ts - minTimestamp) / ONE_DAY);
  const dayToTimestamp = (day: number) => minTimestamp + day * ONE_DAY;

  const minDay = 0;
  const maxDay = timestampToDay(maxTimestamp);

  const inizioValue = dataInizio
    ? timestampToDay(new Date(dataInizio).getTime())
    : minDay;
  const fineValue = dataFine
    ? timestampToDay(new Date(dataFine).getTime())
    : maxDay;

  const [localInizio, setLocalInizio] = useState(inizioValue);
  const [localFine, setLocalFine] = useState(fineValue);
  const [isDragging, setIsDragging] = useState(false);
  const changeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggiorna quando cambiano le props
  useEffect(() => {
    if (!isDragging) {
      setLocalInizio(dataInizio ? timestampToDay(new Date(dataInizio).getTime()) : minDay);
      setLocalFine(dataFine ? timestampToDay(new Date(dataFine).getTime()) : maxDay);
    }
  }, [dataInizio, dataFine, isDragging]);

  // Aggiorna custom inputs quando cambiano i valori
  useEffect(() => {
    setCustomInizio(dataInizio);
    setCustomFine(dataFine);
  }, [dataInizio, dataFine]);

  // Formatta data per display
  const formatDate = (dayValue: number) => {
    const ts = dayToTimestamp(dayValue);
    return new Date(ts).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dayValue: number) => {
    const ts = dayToTimestamp(dayValue);
    return new Date(ts).toLocaleDateString('it-IT', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Handler per applicare il cambio - aggiornamento real-time durante il drag
  const applyChange = (inizio: number, fine: number) => {
    // Cancella eventuali timeout pendenti
    if (changeTimeout.current) {
      clearTimeout(changeTimeout.current);
    }
    // Aggiorna immediatamente usando requestAnimationFrame per performance ottimali
    changeTimeout.current = setTimeout(() => {
      requestAnimationFrame(() => {
        const dataIn = new Date(dayToTimestamp(inizio)).toISOString().split('T')[0];
        const dataFn = new Date(dayToTimestamp(fine)).toISOString().split('T')[0];
        onChange(dataIn, dataFn);
      });
    }, 50); // Debounce minimo 50ms per non sovraccaricare
  };

  // Handler immediato per rilascio slider
  const handleRelease = () => {
    setIsDragging(false);
    if (changeTimeout.current) {
      clearTimeout(changeTimeout.current);
    }
    const dataIn = new Date(dayToTimestamp(localInizio)).toISOString().split('T')[0];
    const dataFn = new Date(dayToTimestamp(localFine)).toISOString().split('T')[0];
    onChange(dataIn, dataFn);
  };

  // Presets - relativi alla data fine selezionata
  const setPreset = (months: number) => {
    // Usa la data fine corrente come riferimento
    const fineTs = dayToTimestamp(localFine);
    const fineDate = new Date(fineTs);
    const inizioDate = new Date(fineTs - months * 30 * ONE_DAY);

    // Assicura che inizio non sia prima del minimo slider
    const inizioTs = Math.max(inizioDate.getTime(), minTimestamp);
    const inizioDateClamped = new Date(inizioTs);

    const inizio = timestampToDay(inizioTs);
    setLocalInizio(inizio);
    onChange(
      inizioDateClamped.toISOString().split('T')[0],
      fineDate.toISOString().split('T')[0]
    );
  };

  // Applica date personalizzate
  const applyCustomDates = () => {
    if (customInizio && customFine) {
      const inizio = new Date(customInizio);
      const fine = new Date(customFine);

      if (inizio <= fine) {
        // Se le date sono fuori dal range slider, estendi il range
        const inizioTs = inizio.getTime();
        if (inizioTs < minTimestamp) {
          const yearsNeeded = Math.ceil((oggi.getTime() - inizioTs) / (365 * ONE_DAY));
          setRangeYears(Math.max(yearsNeeded, rangeYears));
        }

        onChange(customInizio, customFine);
        setShowSettings(false);
      }
    }
  };

  // Stile comune per slider
  const sliderStyle: React.CSSProperties = {
    flex: 1,
    height: '8px',
    borderRadius: '4px',
    background: 'linear-gradient(to right, #e2e8f0 0%, #3b82f6 50%, #e2e8f0 100%)',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

  return (
    <div className="time-slider" style={{
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      padding: '12px 16px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            background: showSettings ? 'var(--bg-secondary)' : 'transparent',
            border: '1px solid transparent',
            borderColor: showSettings ? 'var(--border)' : 'transparent',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          title="Clicca per impostare date personalizzate"
        >
          <span>Periodo: {formatDate(localInizio)} - {formatDate(localFine)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Presets */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: '1M', months: 1 },
            { label: '3M', months: 3 },
            { label: '6M', months: 6 },
            { label: '1A', months: 12 },
            { label: '2A', months: 24 },
            { label: 'Tutto', months: 36 },
          ].map(({ label, months }) => (
            <button
              key={label}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
                minWidth: '40px',
              }}
              onClick={() => setPreset(months)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Slider container */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        padding: '12px',
        borderRadius: '8px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '65px' }}>
          {formatShortDate(minDay)}
        </span>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Slider inizio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              width: '30px',
              color: '#3b82f6',
            }}>Da:</span>
            <input
              type="range"
              min={minDay}
              max={maxDay}
              step={1}
              value={localInizio}
              onChange={(e) => {
                setIsDragging(true);
                const val = Number(e.target.value);
                // Se si avvicina troppo a fine, trascina anche fine
                if (val >= localFine) {
                  const newFine = Math.min(val + 1, maxDay);
                  setLocalInizio(newFine - 1);
                  setLocalFine(newFine);
                  applyChange(newFine - 1, newFine);
                } else {
                  setLocalInizio(val);
                  applyChange(val, localFine);
                }
              }}
              onMouseUp={handleRelease}
              onTouchEnd={handleRelease}
              onBlur={handleRelease}
              style={sliderStyle}
            />
            <span style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              minWidth: '75px',
              textAlign: 'right',
            }}>
              {formatDate(localInizio)}
            </span>
          </div>

          {/* Slider fine */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              width: '30px',
              color: '#22c55e',
            }}>A:</span>
            <input
              type="range"
              min={minDay}
              max={maxDay}
              step={1}
              value={localFine}
              onChange={(e) => {
                setIsDragging(true);
                const val = Number(e.target.value);
                // Se si avvicina troppo a inizio, trascina anche inizio
                if (val <= localInizio) {
                  const newInizio = Math.max(val - 1, minDay);
                  setLocalInizio(newInizio);
                  setLocalFine(newInizio + 1);
                  applyChange(newInizio, newInizio + 1);
                } else {
                  setLocalFine(val);
                  applyChange(localInizio, val);
                }
              }}
              onMouseUp={handleRelease}
              onTouchEnd={handleRelease}
              onBlur={handleRelease}
              style={sliderStyle}
            />
            <span style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              minWidth: '75px',
              textAlign: 'right',
            }}>
              {formatDate(localFine)}
            </span>
          </div>
        </div>

        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '65px', textAlign: 'right' }}>
          {formatShortDate(maxDay)}
        </span>
      </div>

      {/* Pannello impostazioni */}
      {showSettings && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Date personalizzate */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Date personalizzate
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={customInizio}
                  onChange={(e) => setCustomInizio(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                <input
                  type="date"
                  value={customFine}
                  onChange={(e) => setCustomFine(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={applyCustomDates}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Applica
                </button>
              </div>
            </div>

            {/* Range slider */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Estensione slider
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {RANGE_PRESETS.map(({ label, years }) => (
                  <button
                    key={years}
                    onClick={() => setRangeYears(years)}
                    className={`btn ${rangeYears === years ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suggerimento */}
          <div style={{
            marginTop: '10px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            I preset (1M, 3M, ecc.) calcolano indietro dalla data "A:" selezionata
          </div>
        </div>
      )}

      {/* Stile per slider thumb */}
      <style>{`
        .time-slider input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: #e2e8f0;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
        .time-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.1s;
        }
        .time-slider input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .time-slider input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.25);
          background: #2563eb;
        }
        .time-slider input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .time-slider input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
}
