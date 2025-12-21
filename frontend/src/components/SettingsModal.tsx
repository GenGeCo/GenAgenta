// GenAgenTa - Settings Modal Component

import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import type { User, TipoNeuroneConfig, Categoria, TipoSinapsiConfig, FormaNeurone } from '../types';
import FamiglieProdottoTab from './FamiglieProdottoTab';

interface SettingsModalProps {
  user: User;
  onClose: () => void;
  onUserUpdate: (user: Partial<User>) => void;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
  ruolo_azienda: 'admin' | 'membro';
  data_creazione: string;
  foto_url?: string;
  is_me: boolean;
}

type Tab = 'profilo' | 'password' | 'team' | 'categorie' | 'prodotti';

export default function SettingsModal({ user, onClose, onUserUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profilo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profilo state
  const [nome, setNome] = useState(user.nome);
  const [fotoUrl, setFotoUrl] = useState(user.foto_url || '');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [passwordAttuale, setPasswordAttuale] = useState('');
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Team state
  const [membri, setMembri] = useState<Membro[]>([]);
  const [loadingMembri, setLoadingMembri] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Categorie state
  const [tipiNeurone, setTipiNeurone] = useState<TipoNeuroneConfig[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [tipiSinapsi, setTipiSinapsi] = useState<TipoSinapsiConfig[]>([]);
  const [formeDisponibili, setFormeDisponibili] = useState<FormaNeurone[]>([]);
  const [paletteColori, setPaletteColori] = useState<string[]>([]);
  const [loadingCategorie, setLoadingCategorie] = useState(false);
  const [categorieSubTab, setCategorieSubTab] = useState<'tipi' | 'categorie' | 'sinapsi'>('tipi');
  const [editingTipo, setEditingTipo] = useState<TipoNeuroneConfig | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [editingSinapsi, setEditingSinapsi] = useState<TipoSinapsiConfig | null>(null);
  const [showNewTipoForm, setShowNewTipoForm] = useState(false);
  const [showNewCategoriaForm, setShowNewCategoriaForm] = useState(false);
  const [showNewSinapsiForm, setShowNewSinapsiForm] = useState(false);
  const [newTipoNome, setNewTipoNome] = useState('');
  const [newTipoForma, setNewTipoForma] = useState<FormaNeurone>('cerchio');
  const [newTipoVisibilita, setNewTipoVisibilita] = useState<'aziendale' | 'personale'>('aziendale');
  const [newCategoriaNome, setNewCategoriaNome] = useState('');
  const [newCategoriaColore, setNewCategoriaColore] = useState('#3b82f6');
  const [newCategoriaTipoId, setNewCategoriaTipoId] = useState('');
  const [newCategoriaVisibilita, setNewCategoriaVisibilita] = useState<'aziendale' | 'personale'>('aziendale');
  const [newSinapsiNome, setNewSinapsiNome] = useState('');
  const [newSinapsiColore, setNewSinapsiColore] = useState('#64748b');
  const [newSinapsiVisibilita, setNewSinapsiVisibilita] = useState<'aziendale' | 'personale'>('aziendale');
  const [savingCategorie, setSavingCategorie] = useState(false);
  const [categorieMessage, setCategorieMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user.ruolo_azienda === 'admin';

  // Genera link di invito
  const inviteLink = user.codice_pairing
    ? `${window.location.origin}/genagenta/register?codice=${user.codice_pairing}`
    : '';

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback per browser più vecchi
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    const text = `Unisciti al team ${user.nome_azienda || 'aziendale'} su GenAgenTa!\n\nClicca qui per registrarti:\n${inviteLink}\n\nOppure usa il codice: ${user.codice_pairing}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    setInviteMessage(null);
    try {
      const result = await api.invitaCollega(inviteEmail.trim());
      setInviteMessage({ type: 'success', text: result.message });
      setInviteEmail('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setInviteMessage({ type: 'error', text: err.response?.data?.error || 'Errore invio invito' });
    } finally {
      setSendingInvite(false);
    }
  };

  // Carica membri quando si apre tab team
  useEffect(() => {
    if (activeTab === 'team' && user.azienda_id) {
      loadMembri();
    }
  }, [activeTab, user.azienda_id]);

  const loadMembri = async () => {
    setLoadingMembri(true);
    try {
      const response = await api.getAziendaMembri();
      setMembri(response.data);
    } catch (error) {
      console.error('Errore caricamento membri:', error);
    } finally {
      setLoadingMembri(false);
    }
  };

  // Carica dati categorie quando si apre tab
  useEffect(() => {
    if (activeTab === 'categorie') {
      loadCategorie();
    }
  }, [activeTab]);

  const loadCategorie = async () => {
    setLoadingCategorie(true);
    try {
      const [tipiRes, catRes, sinapsiRes] = await Promise.all([
        api.getTipiNeurone(),
        api.getCategorie(),
        api.getTipiSinapsi()
      ]);
      setTipiNeurone(tipiRes.data);
      setFormeDisponibili(tipiRes.forme_disponibili);
      setCategorie(catRes.data);
      setPaletteColori(catRes.palette);
      setTipiSinapsi(sinapsiRes.data);
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
    } finally {
      setLoadingCategorie(false);
    }
  };

  const handleCreateTipo = async () => {
    if (!newTipoNome.trim()) return;
    setSavingCategorie(true);
    setCategorieMessage(null);
    try {
      await api.createTipoNeurone({
        nome: newTipoNome.trim(),
        forma: newTipoForma,
        visibilita: newTipoVisibilita
      });
      setCategorieMessage({ type: 'success', text: 'Tipo creato!' });
      setNewTipoNome('');
      setNewTipoForma('cerchio');
      setShowNewTipoForm(false);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore creazione tipo' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleUpdateTipo = async (tipo: TipoNeuroneConfig) => {
    setSavingCategorie(true);
    try {
      await api.updateTipoNeurone(tipo.id, { nome: tipo.nome, forma: tipo.forma });
      setEditingTipo(null);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore modifica tipo' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleDeleteTipo = async (id: string) => {
    if (!confirm('Eliminare questo tipo? Le categorie associate verranno eliminate.')) return;
    setSavingCategorie(true);
    try {
      await api.deleteTipoNeurone(id);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore eliminazione tipo' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleCreateCategoria = async () => {
    if (!newCategoriaNome.trim() || !newCategoriaTipoId) return;
    setSavingCategorie(true);
    setCategorieMessage(null);
    try {
      await api.createCategoria({
        nome: newCategoriaNome.trim(),
        tipo_id: newCategoriaTipoId,
        colore: newCategoriaColore,
        visibilita: newCategoriaVisibilita
      });
      setCategorieMessage({ type: 'success', text: 'Categoria creata!' });
      setNewCategoriaNome('');
      setNewCategoriaTipoId('');
      setShowNewCategoriaForm(false);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore creazione categoria' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleUpdateCategoria = async (cat: Categoria) => {
    setSavingCategorie(true);
    try {
      await api.updateCategoria(cat.id, { nome: cat.nome, colore: cat.colore });
      setEditingCategoria(null);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore modifica categoria' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('Eliminare questa categoria?')) return;
    setSavingCategorie(true);
    try {
      await api.deleteCategoria(id);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore eliminazione categoria' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleCreateSinapsi = async () => {
    if (!newSinapsiNome.trim()) return;
    setSavingCategorie(true);
    setCategorieMessage(null);
    try {
      await api.createTipoSinapsi({
        nome: newSinapsiNome.trim(),
        colore: newSinapsiColore,
        visibilita: newSinapsiVisibilita
      });
      setCategorieMessage({ type: 'success', text: 'Tipo sinapsi creato!' });
      setNewSinapsiNome('');
      setShowNewSinapsiForm(false);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore creazione tipo sinapsi' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleUpdateSinapsi = async (sin: TipoSinapsiConfig) => {
    setSavingCategorie(true);
    try {
      await api.updateTipoSinapsi(sin.id, { nome: sin.nome, colore: sin.colore });
      setEditingSinapsi(null);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore modifica tipo sinapsi' });
    } finally {
      setSavingCategorie(false);
    }
  };

  const handleDeleteSinapsi = async (id: string) => {
    if (!confirm('Eliminare questo tipo sinapsi?')) return;
    setSavingCategorie(true);
    try {
      await api.deleteTipoSinapsi(id);
      loadCategorie();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCategorieMessage({ type: 'error', text: err.response?.data?.error || 'Errore eliminazione tipo sinapsi' });
    } finally {
      setSavingCategorie(false);
    }
  };

  // Mappa forme ai simboli visivi
  const formaLabels: Record<FormaNeurone, string> = {
    cerchio: '●',
    quadrato: '■',
    triangolo: '▲',
    stella: '★',
    croce: '✚',
    L: 'L',
    C: 'C',
    W: 'W',
    Z: 'Z'
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione client-side
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'File troppo grande (max 2MB)' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setProfileMessage({ type: 'error', text: 'Tipo file non permesso. Usa JPG, PNG, GIF o WebP' });
      return;
    }

    // Preview locale
    const reader = new FileReader();
    reader.onload = (e) => setFotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploadingFoto(true);
    setProfileMessage(null);
    try {
      const result = await api.uploadFoto(file);
      setFotoUrl(result.foto_url);
      setFotoPreview(null);
      onUserUpdate({ foto_url: result.foto_url });
      setProfileMessage({ type: 'success', text: 'Foto caricata!' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Errore caricamento foto' });
      setFotoPreview(null);
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      await api.updateProfile({ nome });
      onUserUpdate({ nome });
      setProfileMessage({ type: 'success', text: 'Profilo aggiornato!' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Errore aggiornamento profilo' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (nuovaPassword !== confermaPassword) {
      setPasswordMessage({ type: 'error', text: 'Le password non coincidono' });
      return;
    }
    if (nuovaPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La password deve essere di almeno 6 caratteri' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await api.changePassword({
        password_attuale: passwordAttuale,
        nuova_password: nuovaPassword,
        conferma_password: confermaPassword,
      });
      setPasswordMessage({ type: 'success', text: 'Password aggiornata!' });
      setPasswordAttuale('');
      setNuovaPassword('');
      setConfermaPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Errore cambio password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRemoveMembro = async (membroId: string, membroNome: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${membroNome} dall'azienda?`)) {
      return;
    }

    setRemovingId(membroId);
    try {
      await api.removeAziendaMembro(membroId);
      setMembri(membri.filter(m => m.id !== membroId));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Errore rimozione membro');
    } finally {
      setRemovingId(null);
    }
  };

  // Genera iniziali
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Impostazioni</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 24px',
          }}
        >
          {[
            { id: 'profilo' as Tab, label: '👤 Profilo' },
            { id: 'password' as Tab, label: '🔒 Password' },
            ...(user.azienda_id ? [{ id: 'team' as Tab, label: '👥 Team' }] : []),
            { id: 'categorie' as Tab, label: '🏷️ Categorie' },
            { id: 'prodotti' as Tab, label: '📦 Prodotti' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB: Profilo */}
          {activeTab === 'profilo' && (
            <div>
              {/* Avatar con upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: (fotoPreview || fotoUrl)
                        ? `url(${fotoPreview || fotoUrl}) center/cover`
                        : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: 'white',
                      opacity: uploadingFoto ? 0.5 : 1,
                    }}
                  >
                    {!(fotoPreview || fotoUrl) && getInitials(nome)}
                  </div>
                  {uploadingFoto && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: '12px' }}>...</div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{nome}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>{user.email}</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFoto}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {uploadingFoto ? 'Caricamento...' : 'Cambia foto'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nome visualizzato</label>
                <input
                  type="text"
                  className="form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Il tuo nome"
                />
              </div>

              {profileMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: profileMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: profileMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    marginBottom: '16px',
                  }}
                >
                  {profileMessage.text}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile || !nome.trim()}
                style={{ width: '100%' }}
              >
                {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          )}

          {/* TAB: Password */}
          {activeTab === 'password' && (
            <div>
              <div className="form-group">
                <label className="form-label">Password attuale</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordAttuale}
                  onChange={(e) => setPasswordAttuale(e.target.value)}
                  placeholder="Inserisci la password attuale"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nuova password</label>
                <input
                  type="password"
                  className="form-input"
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Conferma nuova password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confermaPassword}
                  onChange={(e) => setConfermaPassword(e.target.value)}
                  placeholder="Ripeti la nuova password"
                />
              </div>

              {passwordMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: passwordMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: passwordMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    marginBottom: '16px',
                  }}
                >
                  {passwordMessage.text}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={savingPassword || !passwordAttuale || !nuovaPassword || !confermaPassword}
                style={{ width: '100%' }}
              >
                {savingPassword ? 'Aggiornamento...' : 'Cambia password'}
              </button>
            </div>
          )}

          {/* TAB: Team */}
          {activeTab === 'team' && (
            <div>
              {/* Pulsante Invita collega (solo admin) */}
              {isAdmin && user.codice_pairing && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowInvitePopup(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span style={{ fontSize: '18px' }}>+</span>
                    Invita collega
                  </button>
                </div>
              )}

              {/* Popup invito */}
              {showInvitePopup && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000,
                  }}
                  onClick={(e) => e.target === e.currentTarget && setShowInvitePopup(false)}
                >
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      padding: '24px',
                      width: '90%',
                      maxWidth: '400px',
                    }}
                  >
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                      Invita un collega
                    </h3>

                    {/* Invito via email */}
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                        Inserisci l'email del collega. Quando aprirà l'app vedrà la richiesta di unirsi al team.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="email"
                          className="form-input"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@collega.it"
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={handleSendInvite}
                          disabled={sendingInvite || !inviteEmail.trim()}
                        >
                          {sendingInvite ? '...' : 'Invita'}
                        </button>
                      </div>
                      {inviteMessage && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            background: inviteMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: inviteMessage.type === 'success' ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {inviteMessage.text}
                        </div>
                      )}
                    </div>

                    {/* Separatore */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>oppure condividi</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>

                    {/* Codice */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Codice team:
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '20px',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          letterSpacing: '2px',
                        }}
                      >
                        {user.codice_pairing}
                      </div>
                    </div>

                    {/* Pulsanti azione */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={copyInviteLink}
                        style={{ flex: 1 }}
                      >
                        {linkCopied ? '✓ Copiato!' : 'Copia link'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={shareWhatsApp}
                        style={{ flex: 1, background: '#25D366' }}
                      >
                        WhatsApp
                      </button>
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={() => { setShowInvitePopup(false); setInviteMessage(null); setInviteEmail(''); }}
                      style={{ width: '100%' }}
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              )}

              {/* Lista membri */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                Membri del team ({membri.length})
              </h3>

              {loadingMembri ? (
                <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {membri.map((membro) => (
                    <div
                      key={membro.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        borderRadius: '8px',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: membro.foto_url
                            ? `url(${membro.foto_url}) center/cover`
                            : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {!membro.foto_url && getInitials(membro.nome)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {membro.nome}
                          {membro.is_me && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(tu)</span>
                          )}
                          {membro.ruolo_azienda === 'admin' && (
                            <span
                              style={{
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {membro.email}
                        </div>
                      </div>

                      {/* Azioni (solo admin, non su se stesso, non su altri admin) */}
                      {isAdmin && !membro.is_me && membro.ruolo_azienda !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMembro(membro.id, membro.nome)}
                          disabled={removingId === membro.id}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {removingId === membro.id ? '...' : 'Rimuovi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Categorie */}
          {activeTab === 'categorie' && (
            <div>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { id: 'tipi' as const, label: 'Tipi Neurone' },
                  { id: 'categorie' as const, label: 'Categorie' },
                  { id: 'sinapsi' as const, label: 'Tipi Sinapsi' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setCategorieSubTab(sub.id)}
                    style={{
                      padding: '8px 16px',
                      background: categorieSubTab === sub.id ? 'var(--primary)' : 'var(--bg-primary)',
                      color: categorieSubTab === sub.id ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Messaggio feedback */}
              {categorieMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: categorieMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: categorieMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    marginBottom: '16px',
                  }}
                >
                  {categorieMessage.text}
                </div>
              )}

              {loadingCategorie ? (
                <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
              ) : (
                <>
                  {/* TIPI NEURONE */}
                  {categorieSubTab === 'tipi' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                          I tipi determinano la forma sulla mappa (es: persona, impresa, luogo)
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowNewTipoForm(true)}
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          + Nuovo Tipo
                        </button>
                      </div>

                      {/* Form nuovo tipo */}
                      {showNewTipoForm && (
                        <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nome</label>
                              <input
                                type="text"
                                className="form-input"
                                value={newTipoNome}
                                onChange={(e) => setNewTipoNome(e.target.value)}
                                placeholder="es: Tecnico"
                              />
                            </div>
                            <div style={{ minWidth: '120px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Forma</label>
                              <select
                                className="form-input"
                                value={newTipoForma}
                                onChange={(e) => setNewTipoForma(e.target.value as FormaNeurone)}
                              >
                                {formeDisponibili.map(f => (
                                  <option key={f} value={f}>{formaLabels[f]} {f}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ minWidth: '120px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Visibilità</label>
                              <select
                                className="form-input"
                                value={newTipoVisibilita}
                                onChange={(e) => setNewTipoVisibilita(e.target.value as 'aziendale' | 'personale')}
                              >
                                <option value="aziendale">Aziendale</option>
                                <option value="personale">Personale</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-primary" onClick={handleCreateTipo} disabled={savingCategorie || !newTipoNome.trim()}>
                                {savingCategorie ? '...' : 'Crea'}
                              </button>
                              <button className="btn btn-secondary" onClick={() => { setShowNewTipoForm(false); setNewTipoNome(''); }}>
                                Annulla
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lista tipi */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tipiNeurone.map((tipo) => (
                          <div
                            key={tipo.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--bg-primary)',
                              borderRadius: '8px',
                            }}
                          >
                            <span style={{ fontSize: '24px', width: '32px', textAlign: 'center' }}>{formaLabels[tipo.forma]}</span>
                            {editingTipo?.id === tipo.id ? (
                              <>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editingTipo.nome}
                                  onChange={(e) => setEditingTipo({ ...editingTipo, nome: e.target.value })}
                                  style={{ flex: 1 }}
                                />
                                <select
                                  className="form-input"
                                  value={editingTipo.forma}
                                  onChange={(e) => setEditingTipo({ ...editingTipo, forma: e.target.value as FormaNeurone })}
                                  style={{ width: '100px' }}
                                >
                                  {formeDisponibili.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                                <button className="btn btn-primary" onClick={() => handleUpdateTipo(editingTipo)} style={{ padding: '6px 12px' }}>Salva</button>
                                <button className="btn btn-secondary" onClick={() => setEditingTipo(null)} style={{ padding: '6px 12px' }}>×</button>
                              </>
                            ) : (
                              <>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 500 }}>{tipo.nome}</span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                    ({tipo.visibilita})
                                  </span>
                                  {tipo.num_categorie !== undefined && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                      {tipo.num_categorie} cat.
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setEditingTipo({ ...tipo })}
                                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleDeleteTipo(tipo.id)}
                                  style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Elimina
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {tipiNeurone.length === 0 && (
                          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
                            Nessun tipo definito. Crea il primo tipo per iniziare.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CATEGORIE */}
                  {categorieSubTab === 'categorie' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                          Le categorie determinano il colore (es: ingegnere, muratore, colorificio)
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowNewCategoriaForm(true)}
                          disabled={tipiNeurone.length === 0}
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          + Nuova Categoria
                        </button>
                      </div>

                      {tipiNeurone.length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
                          Crea prima un tipo neurone per poter aggiungere categorie.
                        </p>
                      )}

                      {/* Form nuova categoria */}
                      {showNewCategoriaForm && tipiNeurone.length > 0 && (
                        <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <div style={{ minWidth: '150px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Tipo</label>
                              <select
                                className="form-input"
                                value={newCategoriaTipoId}
                                onChange={(e) => setNewCategoriaTipoId(e.target.value)}
                              >
                                <option value="">Seleziona tipo...</option>
                                {tipiNeurone.map(t => (
                                  <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nome Categoria</label>
                              <input
                                type="text"
                                className="form-input"
                                value={newCategoriaNome}
                                onChange={(e) => setNewCategoriaNome(e.target.value)}
                                placeholder="es: Ingegnere"
                              />
                            </div>
                            <div style={{ minWidth: '120px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Visibilità</label>
                              <select
                                className="form-input"
                                value={newCategoriaVisibilita}
                                onChange={(e) => setNewCategoriaVisibilita(e.target.value as 'aziendale' | 'personale')}
                              >
                                <option value="aziendale">Aziendale</option>
                                <option value="personale">Personale</option>
                              </select>
                            </div>
                          </div>
                          {/* Palette colori */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Colore</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {paletteColori.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewCategoriaColore(c)}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: c,
                                    border: newCategoriaColore === c ? '3px solid white' : 'none',
                                    boxShadow: newCategoriaColore === c ? '0 0 0 2px var(--primary)' : 'none',
                                    cursor: 'pointer',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" onClick={handleCreateCategoria} disabled={savingCategorie || !newCategoriaNome.trim() || !newCategoriaTipoId}>
                              {savingCategorie ? '...' : 'Crea'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowNewCategoriaForm(false); setNewCategoriaNome(''); setNewCategoriaTipoId(''); }}>
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lista categorie raggruppate per tipo */}
                      {tipiNeurone.map((tipo) => {
                        const catDelTipo = categorie.filter(c => c.tipo_id === tipo.id);
                        if (catDelTipo.length === 0) return null;
                        return (
                          <div key={tipo.id} style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{formaLabels[tipo.forma]}</span> {tipo.nome}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {catDelTipo.map((cat) => (
                                <div
                                  key={cat.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    background: 'var(--bg-primary)',
                                    borderRadius: '8px',
                                  }}
                                >
                                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: cat.colore }} />
                                  {editingCategoria?.id === cat.id ? (
                                    <>
                                      <input
                                        type="text"
                                        className="form-input"
                                        value={editingCategoria.nome}
                                        onChange={(e) => setEditingCategoria({ ...editingCategoria, nome: e.target.value })}
                                        style={{ flex: 1 }}
                                      />
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        {paletteColori.slice(0, 8).map((c) => (
                                          <button
                                            key={c}
                                            type="button"
                                            onClick={() => setEditingCategoria({ ...editingCategoria, colore: c })}
                                            style={{
                                              width: '20px',
                                              height: '20px',
                                              borderRadius: '4px',
                                              background: c,
                                              border: editingCategoria.colore === c ? '2px solid white' : 'none',
                                              cursor: 'pointer',
                                            }}
                                          />
                                        ))}
                                      </div>
                                      <button className="btn btn-primary" onClick={() => handleUpdateCategoria(editingCategoria)} style={{ padding: '4px 10px', fontSize: '12px' }}>Salva</button>
                                      <button className="btn btn-secondary" onClick={() => setEditingCategoria(null)} style={{ padding: '4px 10px', fontSize: '12px' }}>×</button>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ flex: 1, fontWeight: 500 }}>{cat.nome}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({cat.visibilita})</span>
                                      <button
                                        onClick={() => setEditingCategoria({ ...cat })}
                                        style={{ padding: '4px 10px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                      >
                                        Modifica
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategoria(cat.id)}
                                        style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                      >
                                        ×
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TIPI SINAPSI */}
                  {categorieSubTab === 'sinapsi' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                          I tipi sinapsi determinano il colore delle connessioni (es: lavora_per, fornisce)
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowNewSinapsiForm(true)}
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          + Nuovo Tipo
                        </button>
                      </div>

                      {/* Form nuovo tipo sinapsi */}
                      {showNewSinapsiForm && (
                        <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nome</label>
                              <input
                                type="text"
                                className="form-input"
                                value={newSinapsiNome}
                                onChange={(e) => setNewSinapsiNome(e.target.value)}
                                placeholder="es: lavora_per"
                              />
                            </div>
                            <div style={{ minWidth: '120px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Visibilità</label>
                              <select
                                className="form-input"
                                value={newSinapsiVisibilita}
                                onChange={(e) => setNewSinapsiVisibilita(e.target.value as 'aziendale' | 'personale')}
                              >
                                <option value="aziendale">Aziendale</option>
                                <option value="personale">Personale</option>
                              </select>
                            </div>
                          </div>
                          {/* Palette colori sinapsi */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Colore</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {['#64748b', '#475569', '#3b82f6', '#2563eb', '#22c55e', '#16a34a', '#f59e0b', '#d97706', '#ef4444', '#dc2626', '#8b5cf6', '#7c3aed'].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewSinapsiColore(c)}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: c,
                                    border: newSinapsiColore === c ? '3px solid white' : 'none',
                                    boxShadow: newSinapsiColore === c ? '0 0 0 2px var(--primary)' : 'none',
                                    cursor: 'pointer',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" onClick={handleCreateSinapsi} disabled={savingCategorie || !newSinapsiNome.trim()}>
                              {savingCategorie ? '...' : 'Crea'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowNewSinapsiForm(false); setNewSinapsiNome(''); }}>
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lista tipi sinapsi */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tipiSinapsi.map((sin) => (
                          <div
                            key={sin.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--bg-primary)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: sin.colore }} />
                            {editingSinapsi?.id === sin.id ? (
                              <>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editingSinapsi.nome}
                                  onChange={(e) => setEditingSinapsi({ ...editingSinapsi, nome: e.target.value })}
                                  style={{ flex: 1 }}
                                />
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {['#64748b', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'].map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEditingSinapsi({ ...editingSinapsi, colore: c })}
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        background: c,
                                        border: editingSinapsi.colore === c ? '2px solid white' : 'none',
                                        cursor: 'pointer',
                                      }}
                                    />
                                  ))}
                                </div>
                                <button className="btn btn-primary" onClick={() => handleUpdateSinapsi(editingSinapsi)} style={{ padding: '6px 12px' }}>Salva</button>
                                <button className="btn btn-secondary" onClick={() => setEditingSinapsi(null)} style={{ padding: '6px 12px' }}>×</button>
                              </>
                            ) : (
                              <>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 500 }}>{sin.nome}</span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                    ({sin.visibilita})
                                  </span>
                                  {sin.num_sinapsi !== undefined && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                      {sin.num_sinapsi} conn.
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setEditingSinapsi({ ...sin })}
                                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleDeleteSinapsi(sin.id)}
                                  style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Elimina
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {tipiSinapsi.length === 0 && (
                          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
                            Nessun tipo sinapsi definito. Crea il primo per iniziare.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB: Prodotti */}
          {activeTab === 'prodotti' && (
            <FamiglieProdottoTab />
          )}
        </div>
      </div>
    </div>
  );
}
