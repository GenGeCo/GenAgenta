// GenAgenTa - Dashboard principale

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import Sidebar from '../components/Sidebar';
import MapView from '../components/MapView';
import DetailPanel from '../components/DetailPanel';
import TimeSlider from '../components/TimeSlider';
import PinModal from '../components/PinModal';
import type { Neurone, Sinapsi, FiltriMappa } from '../types';

export default function Dashboard() {
  const { user, personalAccess, verifyPin, exitPersonalMode, logout } = useAuth();

  // State
  const [neuroni, setNeuroni] = useState<Neurone[]>([]);
  const [sinapsi, setSinapsi] = useState<Sinapsi[]>([]);
  const [selectedNeurone, setSelectedNeurone] = useState<Neurone | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [filtri, setFiltri] = useState<FiltriMappa>({
    dataInizio: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 anno fa
    dataFine: new Date().toISOString().split('T')[0], // oggi
    tipoNeurone: null,
    categoria: null,
    certezza: null,
    valoreMin: null,
    raggio: null,
    centro: null,
  });

  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [neuroniRes, sinapsiRes] = await Promise.all([
          api.getNeuroni({
            tipo: filtri.tipoNeurone || undefined,
            categoria: filtri.categoria || undefined,
            limit: 500,
          }),
          api.getSinapsi({
            data_inizio: filtri.dataInizio || undefined,
            data_fine: filtri.dataFine || undefined,
            certezza: filtri.certezza || undefined,
            valore_min: filtri.valoreMin || undefined,
            limit: 1000,
          }),
        ]);

        setNeuroni(neuroniRes.data);
        setSinapsi(sinapsiRes.data);
      } catch (error) {
        console.error('Errore caricamento dati:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filtri.tipoNeurone, filtri.categoria, filtri.dataInizio, filtri.dataFine, filtri.certezza, filtri.valoreMin]);

  // Handler selezione neurone
  const handleSelectNeurone = async (neurone: Neurone) => {
    try {
      const fullNeurone = await api.getNeurone(neurone.id);
      setSelectedNeurone(fullNeurone);
    } catch (error) {
      console.error('Errore caricamento dettaglio:', error);
    }
  };

  // Handler verifica PIN
  const handleVerifyPin = async (pin: string) => {
    try {
      await verifyPin(pin);
      setShowPinModal(false);
      // Ricarica dati con accesso personale
      window.location.reload();
    } catch {
      throw new Error('PIN non valido');
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        neuroni={neuroni}
        selectedId={selectedNeurone?.id || null}
        onSelect={handleSelectNeurone}
        filtri={filtri}
        onFiltriChange={setFiltri}
        loading={loading}
      />

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>GenAgenTa</h1>

          <div style={{ flex: 1 }} />

          {/* Indicatore accesso personale */}
          {personalAccess ? (
            <button
              className="btn btn-secondary"
              onClick={exitPersonalMode}
              style={{ fontSize: '12px' }}
            >
              Esci modalita personale
            </button>
          ) : user?.has_pin ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowPinModal(true)}
              style={{ fontSize: '12px' }}
            >
              Accedi area personale
            </button>
          ) : null}

          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {user?.nome}
          </span>

          <button className="btn btn-secondary" onClick={logout}>
            Esci
          </button>
        </header>

        {/* Area contenuto */}
        <div className="content-area">
          {/* Mappa */}
          <MapView
            neuroni={neuroni}
            sinapsi={sinapsi}
            selectedId={selectedNeurone?.id || null}
            onSelectNeurone={handleSelectNeurone}
            filtri={filtri}
          />

          {/* Pannello dettaglio */}
          {selectedNeurone && (
            <DetailPanel
              neurone={selectedNeurone}
              personalAccess={personalAccess}
              onClose={() => setSelectedNeurone(null)}
              onSelectNeurone={async (id) => {
                // Cerca prima tra i neuroni già caricati
                const trovato = neuroni.find(n => n.id === id);
                if (trovato) {
                  handleSelectNeurone(trovato);
                } else {
                  // Altrimenti carica il neurone dall'API
                  try {
                    const fullNeurone = await api.getNeurone(id);
                    setSelectedNeurone(fullNeurone);
                  } catch (error) {
                    console.error('Errore caricamento neurone:', error);
                  }
                }
              }}
            />
          )}
        </div>

        {/* Slider temporale */}
        <TimeSlider
          dataInizio={filtri.dataInizio || ''}
          dataFine={filtri.dataFine || ''}
          onChange={(inizio, fine) => setFiltri((f) => ({
            ...f,
            dataInizio: inizio,
            dataFine: fine,
          }))}
        />
      </div>

      {/* Modal PIN */}
      {showPinModal && (
        <PinModal
          onVerify={handleVerifyPin}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}
