import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Users,
  Scissors,
  Download,
  Calendar,
  RefreshCcw,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const TABS = [
  { id: 'ventas',       label: 'Ventas',       icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'produccion',   label: 'Producción',    icon: <Scissors className="w-4 h-4" /> },
  { id: 'rentabilidad', label: 'Rentabilidad',  icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'morosidad',    label: 'Morosidad',     icon: <AlertTriangle className="w-4 h-4" /> },
];

function fmt(n) { return `$${parseFloat(n || 0).toFixed(2)}`; }

export default function Reportes() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  // Filtros de fecha
  const hoy = new Date().toISOString().split('T')[0];
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [diasMorosidad, setDiasMorosidad] = useState(0);

  // Acordeón en tablas largas
  const [expandedSection, setExpandedSection] = useState('cliente');

  const fetchReporte = async () => {
    setLoading(true);
    setErrorMsg('');
    setData(null);
    try {
      let res;
      if (activeTab === 'ventas') {
        res = await api.get(`/reportes/ventas?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
      } else if (activeTab === 'produccion') {
        res = await api.get(`/reportes/produccion?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
      } else if (activeTab === 'rentabilidad') {
        res = await api.get(`/reportes/rentabilidad?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
      } else if (activeTab === 'morosidad') {
        res = await api.get(`/reportes/morosidad?dias_vencimiento=${diasMorosidad}`);
      }
      setData(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, [activeTab]);

  const handleExportCSV = async () => {
    try {
      let url;
      if (activeTab === 'ventas') url = `/reportes/ventas/csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      else if (activeTab === 'produccion') url = `/reportes/produccion/csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      else if (activeTab === 'rentabilidad') url = `/reportes/rentabilidad/csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      else if (activeTab === 'morosidad') url = `/reportes/morosidad/csv?dias_vencimiento=${diasMorosidad}`;
      else return;

      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reporte_${activeTab}_${hoy}.csv`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setErrorMsg('Error al exportar CSV');
    }
  };

  const riesgoColor = (alerta) => {
    if (alerta === 'bloqueado') return 'bg-red-100 text-red-800';
    if (alerta === 'alerta') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Reportes & Rentabilidad</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Análisis de ventas, producción por operario, rentabilidad por pedido y morosidad de cartera.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
        {activeTab !== 'morosidad' ? (
          <>
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Desde:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Hasta:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Mostrar deuda con más de:</label>
            <input
              type="number"
              min="0"
              value={diasMorosidad}
              onChange={(e) => setDiasMorosidad(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-gray-600">días</span>
          </div>
        )}
        <button
          onClick={fetchReporte}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Generar
        </button>
      </div>

      {/* ─── CONTENIDO POR TAB ─── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl h-28" />
          ))}
        </div>
      ) : !data ? null : (

        <>
          {/* ─── VENTAS ─── */}
          {activeTab === 'ventas' && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Pedidos" value={data.total_pedidos} color="blue" icon={<Package className="w-5 h-5" />} />
                <KpiCard label="Facturado" value={`$${fmt(data.total_facturado)}`} color="green" icon={<DollarSign className="w-5 h-5" />} />
                <KpiCard label="Cobrado" value={`$${fmt(data.total_cobrado)}`} color="blue" icon={<CheckCircle2 className="w-5 h-5" />} />
                <KpiCard label="Cartera Pendiente" value={`$${fmt(data.total_cartera)}`} color="red" icon={<TrendingUp className="w-5 h-5" />} />
              </div>

              {/* Por Cliente */}
              <Acordeon title={`Por Cliente (${data.por_cliente.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Cliente', 'Documento', 'Pedidos', 'Facturado', 'Cobrado', 'Saldo']}>
                  {data.por_cliente.map((c) => (
                    <tr key={c.cliente_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.cliente_nombre}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.documento}</td>
                      <td className="px-4 py-3 text-center font-bold">{c.total_pedidos}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(c.total_facturado)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold">${fmt(c.total_cobrado)}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">${fmt(c.saldo_pendiente)}</td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              {/* Por Producto */}
              <Acordeon title={`Por Producto / SKU (${data.por_producto.length})`} icon={<Package className="w-4 h-4" />}>
                <TableWrapper headers={['SKU', 'Producto', 'Color', 'Talla', 'Unidades', 'Facturado']}>
                  {data.por_producto.map((p) => (
                    <tr key={p.variante_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{p.sku}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.producto_nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{p.color}</td>
                      <td className="px-4 py-3 text-gray-600">{p.talla}</td>
                      <td className="px-4 py-3 text-center font-bold">{p.unidades_vendidas}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(p.total_facturado)}</td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              {/* Por Vendedor */}
              <Acordeon title={`Por Vendedor (${data.por_vendedor.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Vendedor', 'Pedidos', 'Facturado', 'Cobrado']}>
                  {data.por_vendedor.map((v) => (
                    <tr key={v.vendedor_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{v.vendedor_nombre}</td>
                      <td className="px-4 py-3 text-center font-bold">{v.total_pedidos}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(v.total_facturado)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold">${fmt(v.total_cobrado)}</td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>
            </div>
          )}

          {/* ─── PRODUCCIÓN ─── */}
          {activeTab === 'produccion' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Órdenes Corte" value={data.total_ordenes_corte} color="amber" icon={<Scissors className="w-5 h-5" />} />
                <KpiCard label="Órdenes Impresión" value={data.total_ordenes_impresion} color="purple" icon={<Package className="w-5 h-5" />} />
                <KpiCard label="Órdenes Confección" value={data.total_ordenes_confeccion} color="blue" icon={<Package className="w-5 h-5" />} />
                <KpiCard label="Costo Total Producción" value={`$${fmt(data.costo_total_produccion)}`} color="red" icon={<DollarSign className="w-5 h-5" />} />
              </div>

              <Acordeon title={`Por Operario (${data.por_operario.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Trabajador', 'Rol', 'Órdenes', 'Piezas', 'Costo Total']}>
                  {data.por_operario.map((o, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{o.trabajador_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-md font-medium">
                          {o.rol_produccion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{o.total_ordenes}</td>
                      <td className="px-4 py-3 text-center">{o.total_piezas}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(o.costo_total)}</td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              {data.por_tecnica_impresion.length > 0 && (
                <Acordeon title={`Por Técnica de Impresión (${data.por_tecnica_impresion.length})`} icon={<Package className="w-4 h-4" />}>
                  <TableWrapper headers={['Técnica', 'Órdenes', 'Piezas', 'Costo Total']}>
                    {data.por_tecnica_impresion.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 text-sm">
                        <td className="px-4 py-3">
                          <span className="capitalize bg-purple-50 text-purple-800 text-xs px-2 py-0.5 rounded-md font-semibold">
                            {t.tecnica}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{t.total_ordenes}</td>
                        <td className="px-4 py-3 text-center">{t.total_piezas}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(t.costo_total)}</td>
                      </tr>
                    ))}
                  </TableWrapper>
                </Acordeon>
              )}
            </div>
          )}

          {/* ─── RENTABILIDAD ─── */}
          {activeTab === 'rentabilidad' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Facturado" value={`$${fmt(data.total_facturado)}`} color="blue" icon={<DollarSign className="w-5 h-5" />} />
                <KpiCard label="Costo Producción" value={`$${fmt(data.costo_total_produccion)}`} color="red" icon={<Scissors className="w-5 h-5" />} />
                <KpiCard label="Ganancia Bruta" value={`$${fmt(data.ganancia_bruta_total)}`} color="green" icon={<TrendingUp className="w-5 h-5" />} />
                <KpiCard label="Margen Promedio" value={`${data.margen_promedio}%`} color="amber" icon={<BarChart2 className="w-5 h-5" />} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">Detalle por Pedido ({data.pedidos.length})</h3>
                </div>
                {data.pedidos.length === 0 ? (
                  <p className="p-8 text-center text-gray-400 text-sm">
                    Sin pedidos confirmados en el período seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Facturado</th>
                          <th className="px-4 py-3 text-right">Costo Prod.</th>
                          <th className="px-4 py-3 text-right">Ganancia</th>
                          <th className="px-4 py-3 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.pedidos.map((p) => {
                          const margenColor =
                            p.margen_porcentaje >= 30 ? 'text-emerald-600' :
                            p.margen_porcentaje >= 10 ? 'text-amber-600' : 'text-red-600';
                          return (
                            <tr key={p.pedido_id} className="hover:bg-gray-50/60">
                              <td className="px-4 py-3 font-bold text-blue-600">#{p.pedido_id}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{p.cliente_nombre}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.fecha}</td>
                              <td className="px-4 py-3">
                                <span className="capitalize text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                                  {p.estado.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">${fmt(p.total_facturado)}</td>
                              <td className="px-4 py-3 text-right text-red-600">${fmt(p.costo_produccion)}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-700">${fmt(p.ganancia_bruta)}</td>
                              <td className={`px-4 py-3 text-right font-black text-base ${margenColor}`}>
                                {p.margen_porcentaje}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MOROSIDAD ─── */}
          {activeTab === 'morosidad' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <KpiCard
                  label="Clientes con Deuda"
                  value={data.total_clientes_morosos}
                  color="red"
                  icon={<Users className="w-5 h-5" />}
                />
                <KpiCard
                  label="Deuda Total Vencida"
                  value={`$${fmt(data.total_deuda_vencida)}`}
                  color="red"
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>

              {data.clientes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-bold text-gray-800">Sin morosidad</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Todos los pedidos con más de {diasMorosidad} días están al día.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="px-4 py-3">Fecha Pedido</th>
                          <th className="px-4 py-3 text-center">Días Vencido</th>
                          <th className="px-4 py-3 text-right">Saldo</th>
                          <th className="px-4 py-3 text-right">Cupo Máximo</th>
                          <th className="px-4 py-3">Alerta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.clientes.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{c.cliente_nombre}</p>
                              <p className="text-xs text-gray-400">{c.documento} {c.telefono && `• ${c.telefono}`}</p>
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-600">#{c.pedido_id}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{c.fecha_pedido}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold text-lg ${c.dias_vencimiento > 60 ? 'text-red-600' : c.dias_vencimiento > 30 ? 'text-amber-600' : 'text-gray-700'}`}>
                                {c.dias_vencimiento}d
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">${fmt(c.saldo_pedido)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">${fmt(c.credito_maximo)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${riesgoColor(c.alerta)}`}>
                                {c.alerta === 'bloqueado' && <ShieldAlert className="w-3 h-3" />}
                                {c.alerta === 'alerta' && <AlertTriangle className="w-3 h-3" />}
                                {c.alerta === 'normal' && <CheckCircle2 className="w-3 h-3" />}
                                {c.alerta}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ───
function KpiCard({ label, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color] || colors.blue}`}>{icon}</div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Acordeon({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && children}
    </div>
  );
}

function TableWrapper({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}
