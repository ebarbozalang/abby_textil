import React, { useState, useEffect, useRef } from 'react';
import {
  useConfiguracionStore,
  PALETAS_PREDEFINIDAS,
  DEFAULT_CONFIG,
} from '../store/configuracionStore';
import {
  Building2,
  Image as ImageIcon,
  Palette,
  Moon,
  Sun,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export default function Configuracion() {
  const {
    config,
    cargando,
    guardando,
    error,
    mensajeExito,
    cargarConfiguracion,
    guardarConfiguracion,
    actualizarCampoLocal,
    restablecerPredeterminados,
  } = useConfiguracionStore();

  const [formData, setFormData] = useState({ ...config });
  const [activeTab, setActiveTab] = useState('empresa'); // 'empresa' | 'apariencia'
  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  const handleChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
    // Si cambia el tema o color primario, reflejar de inmediato en el DOM para previsualización instantánea
    if (campo === 'theme_mode' || campo === 'color_primario') {
      actualizarCampoLocal(campo, valor);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        handleChange('logo_url', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRestaurarLogoOficial = () => {
    handleChange('logo_url', '/logo.png');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await guardarConfiguracion(formData);
  };

  const handleRestablecerTodo = async () => {
    if (
      window.confirm(
        '¿Desea restablecer todos los datos a la identidad original de Inversiones AbbySoft Textil C.A. con el tema Dark y los colores oficiales?'
      )
    ) {
      await restablecerPredeterminados();
      setFormData({ ...DEFAULT_CONFIG });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <span
            className="p-3 rounded-xl text-white shadow-md"
            style={{ backgroundColor: formData.color_primario || '#7B0078' }}
          >
            <Building2 className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Configuración & Identidad Corporativa
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Personalice el nombre comercial, logotipo oficial, RIF, datos de contacto y el tema visual del sistema.
            </p>
          </div>
        </div>

        {/* Botones de Acción Global */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRestablecerTodo}
            disabled={guardando}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
            title="Restablecer al logo y colores originales de AbbySoft"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restablecer AbbySoft</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
            style={{ backgroundColor: formData.color_primario || '#7B0078' }}
          >
            <Save className={`w-4 h-4 ${guardando ? 'animate-spin' : ''}`} />
            <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Alertas de Éxito / Error */}
      {mensajeExito && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{mensajeExito}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-sm shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'empresa'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos de la Empresa & Logotipo</span>
        </button>

        <button
          onClick={() => setActiveTab('apariencia')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'apariencia'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Colores & Tema (Dark / Light)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 1: DATOS DE LA EMPRESA & LOGOTIPO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'empresa' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Carga y Previsualización de Logotipo */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-2 self-start font-bold text-gray-900 dark:text-white text-sm">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <span>Logotipo de la Empresa</span>
              </div>

              {/* Contenedor del Logo */}
              <div className="relative group my-2">
                <div
                  className="w-36 h-36 rounded-full p-2.5 flex items-center justify-center shadow-xl border-4 border-white dark:border-gray-800 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: formData.color_primario || '#7B0078' }}
                >
                  <img
                    src={formData.logo_url || '/logo.png'}
                    alt="Logo Empresa"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/logo.png';
                    }}
                  />
                </div>
                <span className="absolute bottom-1 right-1 p-2 bg-white dark:bg-gray-800 text-purple-600 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>

              <div className="w-full space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Nueva Imagen</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestaurarLogoOficial}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar logo oficial de AbbySoft</span>
                </button>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                Formatos recomendados: PNG o SVG transparente. Tamaño máximo: 2 MB.
              </p>
            </div>

            {/* Columna Derecha: Formulario de Datos */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Información Legal y Comercial
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre de la Empresa */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Nombre Oficial de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_empresa}
                    onChange={(e) => handleChange('nombre_empresa', e.target.value)}
                    placeholder="Ej: Inversiones AbbySoft Textil C.A."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* RIF */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    RIF (Registro de Información Fiscal) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rif}
                    onChange={(e) => handleChange('rif', e.target.value.toUpperCase())}
                    placeholder="J-40812345-6"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-mono font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Lema / Slogan Corporativo
                  </label>
                  <input
                    type="text"
                    value={formData.slogan || ''}
                    onChange={(e) => handleChange('slogan', e.target.value)}
                    placeholder="Ej: Tu Visión, Nuestro Código."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Correo Electrónico */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.correo}
                    onChange={(e) => handleChange('correo', e.target.value)}
                    placeholder="contacto@abbysoft.com.ve"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Teléfonos */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Teléfonos de Contacto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefonos}
                    onChange={(e) => handleChange('telefonos', e.target.value)}
                    placeholder="+58 412 1234567 / +58 243 2345678"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Dirección Fiscal y Planta *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    placeholder="Av. Bolívar Este, C.C. Galerías Plaza, Nivel 1, Local 42, Maracay, Aragua, Venezuela"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 2: APARIENCIA, TEMA Y COLORES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'apariencia' && (
          <div className="space-y-6">
            {/* Selector de Modo: Dark / Light */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Modo de Tema (Apariencia)
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                  Predeterminado: Dark Theme
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción Dark (Predeterminada) */}
                <button
                  type="button"
                  onClick={() => handleChange('theme_mode', 'dark')}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                    formData.theme_mode === 'dark'
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-2 ring-purple-600/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-900 text-amber-400 rounded-xl shadow-inner">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-base">
                          Modo Oscuro (Dark)
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-600 text-white">
                          Por defecto
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Ideal para talleres, baja fatiga visual y alto contraste.
                      </p>
                    </div>
                  </div>
                  {formData.theme_mode === 'dark' && (
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  )}
                </button>

                {/* Opción Light */}
                <button
                  type="button"
                  onClick={() => handleChange('theme_mode', 'light')}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                    formData.theme_mode === 'light'
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-2 ring-purple-600/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shadow-inner">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        Modo Claro (Light)
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Fondo blanco clásico y elementos con alto brillo.
                      </p>
                    </div>
                  </div>
                  {formData.theme_mode === 'light' && (
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Paletas de Color */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Color Primario de la Marca
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Color activo:</span>
                  <span
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: formData.color_primario }}
                  />
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    {formData.color_primario}
                  </span>
                </div>
              </div>

              {/* Grid de Paletas Predefinidas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {PALETAS_PREDEFINIDAS.map((p) => {
                  const isSelected = formData.color_primario?.toLowerCase() === p.color.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleChange('color_primario', p.color)}
                      className={`p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all text-left ${
                        isSelected
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 shadow-md ring-2 ring-gray-400/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-lg shadow-sm flex-shrink-0 flex items-center justify-center text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {p.nombre}
                        </p>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {p.color}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Color Personalizado Libre */}
                <div className="p-3.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color_primario || '#7B0078'}
                    onChange={(e) => handleChange('color_primario', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    title="Elegir color personalizado"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Personalizado</p>
                    <span className="text-[10px] text-gray-400 font-mono">Selector libre</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Previsualización en Vivo */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Eye className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Previsualización en Vivo de Componentes
                </h3>
              </div>

              {/* Muestra de Componentes con el Tema */}
              <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.logo_url || '/logo.png'}
                      alt="Logo"
                      className="w-10 h-10 rounded-full object-contain p-0.5"
                      style={{ backgroundColor: formData.color_primario }}
                    />
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white text-base">
                        {formData.nombre_empresa || 'Inversiones AbbySoft Textil C.A.'}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono">
                        {formData.rif || 'J-40812345-6'} • {formData.slogan || 'Tu Visión, Nuestro Código.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md"
                      style={{ backgroundColor: formData.color_primario }}
                    >
                      Botón de Acción
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
                    >
                      Botón Secundario
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <span className="text-[11px] font-semibold text-gray-500">Métrica KPI</span>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">$ 1,250.00</p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white mt-1 inline-block"
                      style={{ backgroundColor: formData.color_primario }}
                    >
                      +15% Producción
                    </span>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <span className="text-[11px] font-semibold text-gray-500">Tasa de Cambio</span>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Bs. 45.00 / $</p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                      ✓ Sincronizado BCV
                    </span>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <span className="text-[11px] font-semibold text-gray-500">Estado de Seguridad</span>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Activo</p>
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mt-1 inline-block">
                      Sistema Protegido
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra Inferior de Guardado */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Los cambios se aplicarán en todos los módulos, reportes y notas de entrega del sistema.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRestablecerTodo}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar / Predeterminados
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
              style={{ backgroundColor: formData.color_primario || '#7B0078' }}
            >
              <Save className={`w-4 h-4 ${guardando ? 'animate-spin' : ''}`} />
              <span>{guardando ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
