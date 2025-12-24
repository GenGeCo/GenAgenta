// GenAgenTa - Time Slider Component

import { useState, useEffect, useRef } from 'react';

interface TimeSliderProps {
  dataInizio: string;
  dataFine: string;
  onChange: (inizio: string, fine: string) => void;
}

// Un giorno in millisecondi
const ONE_DAY = 24 * 60 * 60 * 1000;

export default function TimeSlider({ dataInizio, dataFine, onChange }: TimeSliderProps) {
  // Range totale: ultimi 3 anni + 1 anno futuro
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const treAnniFA = new Date(oggi.getTime() - 3 * 365 * ONE_DAY);
  const unAnnoAvanti = new Date(oggi.getTime() + 365 * ONE_DAY);

  const minTimestamp = treAnniFA.getTime();
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

  // Handler per applicare il cambio (debounced)
  const applyChange = (inizio: number, fine: number) => {
    if (changeTimeout.current) {
      clearTimeout(changeTimeout.current);
    }
    changeTimeout.current = setTimeout(() => {
      const dataIn = new Date(dayToTimestamp(inizio)).toISOString().split('T')[0];
      const dataFn = new Date(dayToTimestamp(fine)).toISOString().split('T')[0];
      onChange(dataIn, dataFn);
    }, 300); // Debounce 300ms
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

  // Presets
  const setPreset = (months: number) => {
    const fineDate = oggi;
    const inizioDate = new Date(oggi.getTime() - months * 30 * ONE_DAY);
    const inizio = timestampToDay(inizioDate.getTime());
    const fine = timestampToDay(fineDate.getTime());
    setLocalInizio(inizio);
    setLocalFine(fine);
    onChange(
      inizioDate.toISOString().split('T')[0],
      fineDate.toISOString().split('T')[0]
    );
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
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Periodo: {formatDate(localInizio)} - {formatDate(localFine)}
        </span>

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
                if (val < localFine) {
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
                if (val > localInizio) {
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
