import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  HardHat,
  QrCode,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Banknote,
  AlertTriangle,
  Package,
  RefreshCcw,
  Layers,
} from 'lucide-react';

export default function PortalTrabajador() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codigoRastreo, setCodigoRastreo] = useState('');
  const [registroMsg, setRegistroMsg] = useState(null); // { tipo: 'ok'|'error', texto: '' }

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/portal-trabajador');
      setStats(res.data);
    } catch (err) {
      console.error('Error al cargar portal del trabajador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRegistrarProduccion = async (e) => {
    e.preventDefault();
    if (!codigoRastreo.trim()) return;
    setRegistroMsg(null);
    try {
      const res = await api.post('/produccion/escanear-qr', {
        codigo_rastreo: codigoRastreo.trim(),
        trabajador_id: stats?.trabajador_id,
      });
      setRegistroMsg({
        tipo: 'ok',
        texto: `¡Prenda "${codigoRastreo.trim()}" registrada correctamente en tu nómina!`,
      });
      setCodigoRastreo('');
      fetchStats(); // Actualizar conteos
    } catch (err) {
      setRegistroMsg({
        tipo: 'error',
        texto: err.response?.data?.detail || 'Código no encontrado o ya procesado.',
      });
    }
    setTimeout(() => setRegistroMsg(null), 4000);
  };

  const tipoLabel = (tipo) => {
    if (tipo === 'fijo') return 'Sueldo Fijo';
    if (tipo === 'produccion') return 'Pago por Producción';
    if (tipo === 'mixto') return 'Pago Mixto (Fijo + Producción)';
    return tipo;
  };

  const estadoNominaColor = (estado) => {
    if (estado === 'pagado') return 'bg-emerald-100 text-emerald-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="space-y-5">
      {/* Banner de Bienvenida */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <HardHat className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">
              Mi Producción
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{user?.nombre}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Modalidad:{' '}
            <span className="font-semibold text-gray-700">
              {loading ? '...' : tipoLabel(stats?.tipo_pago || '')}
            </span>
            {stats?.tipo_pago === 'fijo' || stats?.tipo_pago === 'mixto' ? (
              <span className="ml-2 text-gray-400">
                (Salario fijo: ${parseFloat(stats?.salario_fijo || 0).toLocaleString('es-CO')}/período)
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-right">
            <p className="text-xs text-amber-700 font-medium">Ganancia Estimada del Mes</p>
            <p className="text-2xl font-black text-amber-600">
              {loading
                ? '...'
                : `$${parseFloat(stats?.mes_ganancia || 0).toLocaleString('es-CO')}`}
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Escáner QR / Registro Rápido */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="text-blue-600 w-5 h-5" />
          <h2 className="text-base font-bold text-gray-900">Registrar Prenda Confeccionada</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Escanea el código QR de la etiqueta o ingresa el código de rastreo único de la prenda.
        </p>

        {registroMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 border ${
              registroMsg.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {registroMsg.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{registroMsg.texto}</span>
          </div>
        )}

        <form onSubmit={handleRegistrarProduccion} className="flex gap-3">
          <input
            type="text"
            value={codigoRastreo}
            onChange={(e) => setCodigoRastreo(e.target.value.toUpperCase())}
            placeholder="Ej: RAS-PED12-CAMOXF-BLA-M-001"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={!codigoRastreo.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
          >
            Registrar
          </button>
        </form>
      </div>

      {/* Estadísticas de producción */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Hoy */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hoy</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats?.hoy_piezas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">prendas registradas</p>
            <p className="text-lg font-bold text-blue-600 mt-3">
              ${parseFloat(stats?.hoy_ganancia ?? 0).toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-gray-400">ganancia del día</p>
          </div>

          {/* Esta Semana */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Esta Semana
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats?.semana_piezas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">prendas registradas</p>
            <p className="text-lg font-bold text-amber-600 mt-3">
              ${parseFloat(stats?.semana_ganancia ?? 0).toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-gray-400">ganancia de la semana</p>
          </div>

          {/* Este Mes */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-100 uppercase tracking-wider">
                Este Mes
              </span>
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black">{stats?.mes_piezas ?? 0}</p>
            <p className="text-xs text-amber-100 mt-0.5">prendas registradas</p>
            <p className="text-xl font-black mt-3">
              ${parseFloat(stats?.mes_ganancia ?? 0).toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-amber-200">ganancia estimada del mes</p>
          </div>
        </div>
      )}

      {/* Historial de Nóminas Pagadas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-gray-900 text-sm">Mis Últimos Pagos de Nómina</h2>
        </div>

        {!stats?.nominas_recientes?.length ? (
          <div className="p-8 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-semibold">Sin nóminas generadas aún</p>
            <p className="text-xs text-gray-400 mt-1">
              Las nóminas se generan al cierre de cada período por el administrador.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.nominas_recientes.map((nom) => (
              <div key={nom.id} className="flex items-center justify-between p-4 hover:bg-gray-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoNominaColor(nom.estado)}`}
                    >
                      {nom.estado === 'pagado' ? '✓ Pagado' : 'Pendiente'}
                    </span>
                    <span className="text-xs text-gray-500">{nom.tipo}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {nom.periodo_inicio} → {nom.periodo_fin}
                  </p>
                  {nom.fecha_pago && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Pagado el: {nom.fecha_pago}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 text-lg">
                    ${parseFloat(nom.total).toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-gray-400">Nómina #{nom.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aviso de privacidad */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
        <Package className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
        <p>
          Este portal solo muestra tu información de producción y pagos. No tienes acceso a datos de
          clientes, precios de venta ni información confidencial del negocio.
        </p>
      </div>
    </div>
  );
}
