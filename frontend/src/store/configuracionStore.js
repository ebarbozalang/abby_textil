import { create } from 'zustand';
import api from '../services/api';

export const DEFAULT_CONFIG = {
  nombre_empresa: 'Inversiones AbbySoft Textil C.A.',
  rif: 'J-40812345-6',
  direccion: 'Av. Bolívar Este, C.C. Galerías Plaza, Nivel 1, Local 42, Maracay, Aragua, Venezuela',
  correo: 'contacto@abbysoft.com.ve',
  telefonos: '+58 412 1234567 / +58 243 2345678',
  slogan: 'Tu Visión, Nuestro Código.',
  logo_url: '/logo.png',
  theme_mode: 'dark', // Predeterminado: Modo Oscuro (Dark)
  color_primario: '#7B0078', // Predeterminado: Violeta AbbySoft oficial
};

// Paletas predefinidas recomendadas
export const PALETAS_PREDEFINIDAS = [
  { id: 'abby', nombre: 'AbbySoft Violeta Real', color: '#7B0078', badge: 'Predeterminado' },
  { id: 'indigo', nombre: 'Azul Índigo Textil', color: '#2563EB', badge: 'Corporativo' },
  { id: 'emerald', nombre: 'Verde Esmeralda', color: '#059669', badge: 'Comercial' },
  { id: 'purple', nombre: 'Púrpura Neón', color: '#9333EA', badge: 'Moderno' },
  { id: 'amber', nombre: 'Naranja Confección', color: '#EA580C', badge: 'Industrial' },
  { id: 'rose', nombre: 'Rojo Rubí / Borgoña', color: '#DC2626', badge: 'Premium' },
  { id: 'cyan', nombre: 'Cian / Turquesa', color: '#0891B2', badge: 'Vibrante' },
];

function aplicarTemaDOM(themeMode, colorPrimario) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Aplicar o remover clase 'dark'
  if (themeMode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // 2. Aplicar variable CSS de color primario
  if (colorPrimario) {
    root.style.setProperty('--color-primary', colorPrimario);
  }
}

export const useConfiguracionStore = create((set, get) => {
  // Inicialización con localStorage si existe, o valores por defecto (Dark + AbbySoft)
  let initialConfig = { ...DEFAULT_CONFIG };
  try {
    const cached = localStorage.getItem('abby_configuracion');
    if (cached) {
      initialConfig = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
    }
  } catch (e) {
    console.warn('No se pudo leer configuración local:', e);
  }

  // Aplicar inmediatamente al cargar el script
  aplicarTemaDOM(initialConfig.theme_mode, initialConfig.color_primario);

  return {
    config: initialConfig,
    cargando: false,
    guardando: false,
    error: null,
    mensajeExito: null,

    cargarConfiguracion: async () => {
      set({ cargando: true, error: null });
      try {
        const res = await api.get('/configuracion');
        if (res.data) {
          const nuevaConfig = { ...DEFAULT_CONFIG, ...res.data };
          set({ config: nuevaConfig, cargando: false });
          localStorage.setItem('abby_configuracion', JSON.stringify(nuevaConfig));
          aplicarTemaDOM(nuevaConfig.theme_mode, nuevaConfig.color_primario);
        }
      } catch (err) {
        console.warn('Usando configuración local de empresa:', err);
        set({ cargando: false });
      }
    },

    actualizarCampoLocal: (campo, valor) => {
      set((state) => {
        const nuevaConfig = { ...state.config, [campo]: valor };
        if (campo === 'theme_mode' || campo === 'color_primario') {
          aplicarTemaDOM(
            campo === 'theme_mode' ? valor : state.config.theme_mode,
            campo === 'color_primario' ? valor : state.config.color_primario
          );
        }
        return { config: nuevaConfig };
      });
    },

    guardarConfiguracion: async (datos) => {
      set({ guardando: true, error: null, mensajeExito: null });
      try {
        const res = await api.put('/configuracion', datos);
        const configGuardada = { ...DEFAULT_CONFIG, ...res.data };
        set({
          config: configGuardada,
          guardando: false,
          mensajeExito: '¡Configuración de empresa y apariencia guardada exitosamente!',
        });
        localStorage.setItem('abby_configuracion', JSON.stringify(configGuardada));
        aplicarTemaDOM(configGuardada.theme_mode, configGuardada.color_primario);
        setTimeout(() => set({ mensajeExito: null }), 5000);
        return { success: true };
      } catch (err) {
        const msg = err.response?.data?.detail || 'Error al guardar la configuración.';
        set({ guardando: false, error: msg });
        setTimeout(() => set({ error: null }), 5000);
        return { success: false, error: msg };
      }
    },

    restablecerPredeterminados: async () => {
      set({ guardando: true, error: null });
      try {
        const res = await api.post('/configuracion/restablecer');
        const configReset = { ...DEFAULT_CONFIG, ...res.data };
        set({
          config: configReset,
          guardando: false,
          mensajeExito: '¡Configuración restablecida a los valores oficiales de AbbySoft!',
        });
        localStorage.setItem('abby_configuracion', JSON.stringify(configReset));
        aplicarTemaDOM(configReset.theme_mode, configReset.color_primario);
        setTimeout(() => set({ mensajeExito: null }), 5000);
        return { success: true };
      } catch (err) {
        // Fallback local
        set({
          config: { ...DEFAULT_CONFIG },
          guardando: false,
          mensajeExito: 'Valores oficiales restablecidos localmente.',
        });
        localStorage.setItem('abby_configuracion', JSON.stringify(DEFAULT_CONFIG));
        aplicarTemaDOM(DEFAULT_CONFIG.theme_mode, DEFAULT_CONFIG.color_primario);
        return { success: true };
      }
    },
  };
});
