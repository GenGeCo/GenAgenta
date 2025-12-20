// GenAgenTa - API Client

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Neurone, Sinapsi, NotaPersonale, User, DashboardStats } from '../types';

const API_BASE = import.meta.env.PROD
  ? '/genagenta/backend/api/index.php'
  : '/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor per aggiungere token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Interceptor per gestire errori
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ error: string }>) => {
        if (error.response?.status === 401) {
          // Token scaduto
          this.token = null;
          localStorage.removeItem('token');
          window.location.href = '/genagenta/login';
        }
        return Promise.reject(error);
      }
    );

    // Recupera token da localStorage
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const { data } = await this.client.post('/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<User> {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  async verifyPin(pin: string): Promise<{ token: string; personal_access: boolean }> {
    const { data } = await this.client.post('/auth/verify-pin', { pin });
    this.setToken(data.token);
    return data;
}

  async register(params: {
    email: string;
    password: string;
    nome: string;
    nome_azienda?: string;
    codice_azienda?: string;
  }): Promise<{ token: string; user: User; azienda: { id: string; nome: string; codice_pairing: string } }> {
    const { data } = await this.client.post('/auth/register', params);
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Neuroni
  async getNeuroni(params?: {
    tipo?: string;
    categoria?: string;
    search?: string;
    lat?: number;
    lng?: number;
    raggio?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Neurone[]; pagination: { total: number; limit: number; offset: number } }> {
    const { data } = await this.client.get('/neuroni', { params });
    return data;
  }

  async getNeurone(id: string): Promise<Neurone> {
    const { data } = await this.client.get(`/neuroni/${id}`);
    return data;
  }

  async createNeurone(neurone: Partial<Neurone>): Promise<{ id: string }> {
    const { data } = await this.client.post('/neuroni', neurone);
    return data;
  }

  async updateNeurone(id: string, neurone: Partial<Neurone>): Promise<void> {
    await this.client.put(`/neuroni/${id}`, neurone);
  }

  async deleteNeurone(id: string): Promise<void> {
    await this.client.delete(`/neuroni/${id}`);
  }

  async getNeuroneSinapsi(id: string, params?: {
    data_inizio?: string;
    data_fine?: string;
    solo_attive?: boolean;
  }): Promise<{ data: Sinapsi[] }> {
    const { data } = await this.client.get(`/neuroni/${id}/sinapsi`, { params });
    return data;
  }

  // Sinapsi
  async getSinapsi(params?: {
    tipo?: string;
    data_inizio?: string;
    data_fine?: string;
    certezza?: string;
    valore_min?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Sinapsi[]; pagination: { total: number; limit: number; offset: number } }> {
    const { data } = await this.client.get('/sinapsi', { params });
    return data;
  }

  async createSinapsi(sinapsi: Partial<Sinapsi>): Promise<{ id: string }> {
    const { data } = await this.client.post('/sinapsi', sinapsi);
    return data;
  }

  async updateSinapsi(id: string, sinapsi: Partial<Sinapsi>): Promise<void> {
    await this.client.put(`/sinapsi/${id}`, sinapsi);
  }

  async deleteSinapsi(id: string): Promise<void> {
    await this.client.delete(`/sinapsi/${id}`);
  }

  // Note personali
  async getNote(neuroneId?: string): Promise<{ data: NotaPersonale[] }> {
    const { data } = await this.client.get('/note', {
      params: neuroneId ? { neurone_id: neuroneId } : undefined,
    });
    return data;
  }

  async createNota(neuroneId: string, testo: string): Promise<{ id: string }> {
    const { data } = await this.client.post('/note', { neurone_id: neuroneId, testo });
    return data;
  }

  async updateNota(id: string, testo: string): Promise<void> {
    await this.client.put(`/note/${id}`, { testo });
  }

  async deleteNota(id: string): Promise<void> {
    await this.client.delete(`/note/${id}`);
  }

  // Stats
  async getStats(): Promise<DashboardStats> {
    const { data } = await this.client.get('/stats');
    return data;
  }

  // Profilo utente
  async updateProfile(params: { nome: string; foto_url?: string }): Promise<{ success: boolean }> {
    const { data } = await this.client.put('/users/profile', params);
    return data;
  }

  async uploadFoto(file: File): Promise<{ success: boolean; foto_url: string }> {
    const formData = new FormData();
    formData.append('foto', file);
    const { data } = await this.client.post('/users/upload-foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async changePassword(params: {
    password_attuale: string;
    nuova_password: string;
    conferma_password: string;
  }): Promise<{ success: boolean }> {
    const { data } = await this.client.put('/users/password', params);
    return data;
  }

  // Azienda
  async getAziendaMembri(): Promise<{ data: Array<{
    id: string;
    nome: string;
    email: string;
    ruolo_azienda: 'admin' | 'membro';
    data_creazione: string;
    foto_url?: string;
    is_me: boolean;
  }>; total: number }> {
    const { data } = await this.client.get('/azienda/membri');
    return data;
  }

  async removeAziendaMembro(membroId: string): Promise<{ success: boolean }> {
    const { data } = await this.client.delete(`/azienda/membri/${membroId}`);
    return data;
  }

  // Inviti
  async invitaCollega(email: string): Promise<{ success: boolean; message: string; invito_id: string }> {
    const { data } = await this.client.post('/azienda/inviti', { email });
    return data;
  }

  async getInvitiPendenti(): Promise<{
    has_invite: boolean;
    invito?: {
      id: string;
      azienda_id: string;
      nome_azienda: string;
      invitato_da: string;
      data: string;
    };
  }> {
    const { data } = await this.client.get('/auth/inviti-pendenti');
    return data;
  }

  async accettaInvito(invitoId: string): Promise<{
    success: boolean;
    message: string;
    token: string;
    azienda: { id: string; nome: string };
  }> {
    const { data } = await this.client.post('/azienda/inviti/accetta', { invito_id: invitoId });
    this.setToken(data.token);
    return data;
  }

  async rifiutaInvito(invitoId: string): Promise<{ success: boolean }> {
    const { data } = await this.client.post('/azienda/inviti/rifiuta', { invito_id: invitoId });
    return data;
  }
}

export const api = new ApiClient();
