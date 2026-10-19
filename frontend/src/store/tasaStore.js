import { create } from 'zustand';
import api from '../services/api';

/**
 * Formateador de moneda en Dólares (USD)
 */
export const formatUSD = (valor) => {
  const num = parseFloat(valor) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formateador de moneda en Bolívares (Bs.)
 */
export const formatBS = (valorUSD, tasa = null) => {
  const numUSD = parseFloat(valorUSD) || 0;
  const tasaAplicada = tasa ? parseFloat(tasa) : 0;
  const numBS = tasaAplicada > 0 ? numUSD * tasaAplicada : numUSD;
  return `Bs. ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numBS)}`;
};

/**
 * Formateador dual: "$ 10.00 (Bs. 8,810.66)"
 */
export const formatDual = (valorUSD, tasa = null) => {
  return `${formatUSD(valorUSD)} (${formatBS(valorUSD, tasa)})`;
};

export const useTasaStore = create((set, get) => ({
  tasa: 45.0,
  fuente: 'default',
  fechaActualizacion: null,
  actualizadoPor: null,
  historial: [],
  cargando: false,
  error: null,

  cargarTasa: async () => {
    set({ cargando: true, error: null });
    try {
      const response = await api.get('/tasa');
      const data = response.data;
      if (data && data.tasa_actual) {
        set({
          tasa: parseFloat(data.tasa_actual.tasa),
          fuente: data.tasa_actual.fuente,
          fechaActualizacion: data.tasa_actual.fecha_actualizacion,
          actualizadoPor: data.tasa_actual.actualizado_por_nombre,
          historial: data.historial || [],
          cargando: false,
        });
      }
    } catch (err) {
      console.warn('No se pudo cargar la tasa BCV del backend:', err);
      set({ cargando: false, error: 'No se pudo sincronizar la tasa activa' });
    }
  },

  sincronizarBCV: async () => {
    set({ cargando: true, error: null });
    try {
      const response = await api.post('/tasa/bcv');
      const data = response.data;
      set({
        tasa: parseFloat(data.tasa),
        fuente: data.fuente,
        fechaActualizacion: data.fecha_actualizacion,
        actualizadoPor: data.actualizado_por_nombre,
        cargando: false,
      });
      // Recargar historial
      get().cargarTasa();
      return { success: true, tasa: data.tasa };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al sincronizar con el BCV.';
      set({ cargando: false, error: msg });
      return { success: false, error: msg };
    }
  },

  fijarTasaManual: async (nuevaTasa, motivo = 'Ajuste manual administrativo') => {
    set({ cargando: true, error: null });
    try {
      const response = await api.post('/tasa/manual', {
        tasa: parseFloat(nuevaTasa),
        motivo,
      });
      const data = response.data;
      set({
        tasa: parseFloat(data.tasa),
        fuente: 'manual',
        fechaActualizacion: data.fecha_actualizacion,
        actualizadoPor: data.actualizado_por_nombre,
        cargando: false,
      });
      // Recargar historial
      get().cargarTasa();
      return { success: true, tasa: data.tasa };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al fijar tasa manual.';
      set({ cargando: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Conversiones directas
  convertirUSDABs: (montoUSD, customTasa = null) => {
    const t = customTasa || get().tasa || 1;
    return (parseFloat(montoUSD) || 0) * t;
  },

  convertirBsAUSD: (montoBs, customTasa = null) => {
    const t = customTasa || get().tasa || 1;
    if (t <= 0) return 0;
    return (parseFloat(montoBs) || 0) / t;
  },
}));
