// GenAgenTa - Time Slider Component

import { useState, useEffect } from 'react';

interface TimeSliderProps {
  dataInizio: string;
  dataFine: string;
  onChange: (inizio: string, fine: string) => void;
}

export default function TimeSlider({ dataInizio, dataFine, onChange }: TimeSliderProps) {
  // Range totale: ultimi 3 anni
  const oggi = new Date();
  const treAnniFA = new Date(oggi.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);

  const minTimestamp = treAnniFA.getTime();
  const maxTimestamp = oggi.getTime();

  // Converti date in valori slider
  const inizioValue = dataInizio
    ? new Date(dataInizio).getTime()
    : minTimestamp;
  const fineValue = dataFine
    ? new Date(dataFine).getTime()
    : maxTimestamp;

  const [localInizio, setLocalInizio] = useState(inizioValue);
  const [localFine, setLocalFine] = useState(fineValue);

  // Aggiorna quando cambiano le props
  useEffect(() => {
    setLocalInizio(dataInizio ? new Date(dataInizio).getTime() : minTimestamp);
    setLocalFine(dataFine ? new Date(dataFine).getTime() : maxTimestamp);
  }, [dataInizio, dataFine, minTimestamp, maxTimestamp]);

  // Formatta data per display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Handler per rilascio slider
  const handleChange = () => {
    onChange(
      new Date(localInizio).toISOString().split('T')[0],
      new Date(localFine).toISOString().split('T')[0]
    );
  };

  // Presets
  const setPreset = (months: number) => {
    const fine = oggi;
    const inizio = new Date(oggi.getTime() - months * 30 * 24 * 60 * 60 * 1000);
    setLocalInizio(inizio.getTime());
    setLocalFine(fine.getTime());
    onChange(
      inizio.toISOString().split('T')[0],
      fine.toISOString().split('T')[0]
    );
  };

  return (
    <div className="time-slider">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          Periodo: {formatDate(localInizio)} - {formatDate(localFine)}
        </span>

        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset(1)}
          >
            1 mese
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset(3)}
          >
            3 mesi
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset(6)}
          >
            6 mesi
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset(12)}
          >
            1 anno
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset(36)}
          >
            Tutto
          </button>
        </div>
      </div>

      {/* Dual range slider (semplificato - singolo range per ora) */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '70px' }}>
          {formatDate(minTimestamp)}
        </span>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Slider inizio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', width: '40px' }}>Da:</span>
            <input
              type="range"
              min={minTimestamp}
              max={maxTimestamp}
              value={localInizio}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < localFine) {
                  setLocalInizio(val);
                }
              }}
              onMouseUp={handleChange}
              onTouchEnd={handleChange}
              style={{ flex: 1 }}
            />
          </div>

          {/* Slider fine */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', width: '40px' }}>A:</span>
            <input
              type="range"
              min={minTimestamp}
              max={maxTimestamp}
              value={localFine}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > localInizio) {
                  setLocalFine(val);
                }
              }}
              onMouseUp={handleChange}
              onTouchEnd={handleChange}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '70px', textAlign: 'right' }}>
          {formatDate(maxTimestamp)}
        </span>
      </div>
    </div>
  );
}
