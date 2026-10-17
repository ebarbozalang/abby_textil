import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  ShoppingBag,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  Printer,
  Shirt,
  Clock,
  ShieldAlert,
  Activity,
  CreditCard,
  RefreshCcw,
  BadgeAlert,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/');
      setData(res.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh cada 2 minutos
    const interval = setInterval(fetchDashboard, 120000);
    return () => clearInterval(interval);
  }, []);

  const kpis = data?.kpis;
  const alertas = data?.alertas || [];
  const alertasAltas = alertas.filter((a) => a.severidad === 'alta');

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            ¡Bienvenido, {user?.nombre?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{today}</p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors bg-white border border-gray-200 px-3 py-2 rounded-xl"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lastUpdate
            ? `Actualizado a las ${lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
            : 'Actualizar'}
        </button>
      </div>

      {/* ALERTAS CRÍTICAS */}
      {alertasAltas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertasAltas.map((alerta, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm"
            >
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p>{alerta.mensaje}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPIs PRINCIPALES */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl h-28" />
          ))}
        </div>
      ) : (
        <>
          {/* Fila 1: Pedidos */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              Pedidos
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Nuevos Hoy"
                value={kpis?.pedidos_hoy ?? '—'}
                icon={<ShoppingBag className="w-5 h-5" />}
                color="blue"
              />
              <KpiCard
                label="En Producción"
                value={kpis?.pedidos_en_produccion ?? '—'}
                icon={<Activity className="w-5 h-5" />}
                color="amber"
              />
              <KpiCard
                label="Pendientes de Cobro"
                value={kpis?.pedidos_pendientes_cobro ?? '—'}
                icon={<CreditCard className="w-5 h-5" />}
                color="red"
              />
              <KpiCard
                label="Entregados (mes)"
                value={kpis?.pedidos_entregados_mes ?? '—'}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="green"
              />
            </div>
          </div>

          {/* Fila 2: Tesorería */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Tesorería
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                  Recaudo Hoy
                </span>
                <p className="text-3xl font-black mt-2">
                  ${parseFloat(kpis?.recaudo_hoy ?? 0).toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-emerald-200 mt-1">Pagos y abonos del día</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
                  Recaudo del Mes
                </span>
                <p className="text-3xl font-black mt-2">
                  ${parseFloat(kpis?.recaudo_mes ?? 0).toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-blue-200 mt-1">Acumulado del mes en curso</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">Cartera Total</span>
                  <TrendingUp className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-black text-red-600 mt-1">
                  ${parseFloat(kpis?.cartera_total ?? 0).toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-gray-400 mt-1">Saldos pendientes (todos los pedidos)</p>
              </div>
            </div>
          </div>

          {/* Fila 3: Producción activa */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Producción Activa Ahora
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">
                    {kpis?.ordenes_corte_activas ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Órdenes en Corte</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">
                    {kpis?.ordenes_impresion_activas ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Órdenes en Impresión</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Shirt className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">
                    {kpis?.ordenes_confeccion_activas ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Órdenes en Confección</p>
                </div>
              </div>
            </div>
          </div>

          {/* Todas las alertas */}
          {alertas.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BadgeAlert className="w-4 h-4 text-amber-500" />
                Alertas del Sistema
              </h2>
              <div className="space-y-2">
                {alertas.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
                      a.severidad === 'alta'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : a.severidad === 'media'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p>{a.mensaje}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertas.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="font-medium">
                Todo en orden. No hay alertas críticas pendientes en este momento.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>{icon}</div>
      <div>
        <p className="text-3xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}
