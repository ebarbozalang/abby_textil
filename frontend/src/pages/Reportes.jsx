import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTasaStore, formatUSD, formatBS } from '../store/tasaStore';
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
  Wallet,
  Calculator,
  Printer,
  CreditCard,
  Landmark,
  Layers,
  ArrowDownRight,
  Clock,
} from 'lucide-react';

const TABS = [
  { id: 'ventas',       label: 'Ventas',          icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'produccion',   label: 'Producción',       icon: <Scissors className="w-4 h-4" /> },
  { id: 'rentabilidad', label: 'Rentabilidad',     icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'morosidad',    label: 'Morosidad',        icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'caja',         label: 'Caja & Cobros',    icon: <Wallet className="w-4 h-4" /> },
  { id: 'nominas',      label: 'Nóminas',          icon: <Calculator className="w-4 h-4" /> },
];

export default function Reportes() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  // Store de tasa de cambio oficial (BCV)
  const { tasa, cargarTasa } = useTasaStore();

  // Filtros de fecha
  const hoy = new Date().toISOString().split('T')[0];
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [diasMorosidad, setDiasMorosidad] = useState(0);

  useEffect(() => {
    cargarTasa();
  }, [cargarTasa]);

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
      } else if (activeTab === 'caja') {
        res = await api.get(`/reportes/caja?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
      } else if (activeTab === 'nominas') {
        res = await api.get(`/reportes/nominas?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
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
      else if (activeTab === 'caja') url = `/reportes/caja/csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      else if (activeTab === 'nominas') url = `/reportes/nominas/csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
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

  const handlePrint = () => {
    window.print();
  };

  const riesgoColor = (alerta) => {
    if (alerta === 'bloqueado') return 'bg-red-100 text-red-800 border-red-200';
    if (alerta === 'alerta') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const formatearMetodoPago = (met) => {
    const mapa = {
      pago_movil: 'Pago Móvil (Bs.)',
      transferencia_bs: 'Transferencia Bancaria (Bs.)',
      efectivo_usd: 'Efectivo Divisas ($)',
      efectivo_bs: 'Efectivo Bolívares (Bs.)',
      punto_venta: 'Punto de Venta / Biopago',
      zelle: 'Zelle ($)',
      binance_pay: 'Binance Pay (USDT)',
      otro: 'Otro Método',
    };
    return mapa[met] || (met ? met.replace(/_/g, ' ') : '—');
  };

  const tabLabels = {
    ventas: 'Reporte de Ventas y Facturación',
    produccion: 'Reporte de Órdenes y Costos de Producción',
    rentabilidad: 'Reporte de Rentabilidad por Pedido',
    morosidad: 'Reporte de Morosidad y Saldos Pendientes',
    caja: 'Reporte de Caja y Métodos de Cobro Venezolanos',
    nominas: 'Reporte de Nóminas Liquidadas y Costos Laborales',
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 print:p-0 print:m-0 print:max-w-full">
      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-card {
            border: 1px solid #d1d5db !important;
            box-shadow: none !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px !important;
            border-bottom: 2px solid #7B0078 !important;
            padding-bottom: 12px !important;
          }
        }
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>

      {/* Encabezado visible exclusivamente en impresión */}
      <div className="print-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ color: '#7B0078' }}>
              INVERSIONES ABBYSOFT TEXTIL C.A.
            </h1>
            <p className="text-xs text-gray-600 font-mono">RIF: J-40812345-6 • Maracay, Estado Aragua, Venezuela</p>
            <p className="text-sm font-bold text-gray-800 mt-2">{tabLabels[activeTab]}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p className="font-semibold text-gray-900">Fecha de Emisión: {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</p>
            {activeTab !== 'morosidad' ? (
              <p>Período: {fechaInicio} al {fechaFin}</p>
            ) : (
              <p>Antigüedad mínima: {diasMorosidad} días</p>
            )}
            <p className="font-bold text-purple-900 mt-1">Tasa Oficial BCV: Bs. {parseFloat(tasa || 0).toFixed(2)} / USD</p>
          </div>
        </div>
      </div>

      {/* Header en pantalla */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
              <BarChart2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reportes & Analítica de Gestión</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Ventas, producción, rentabilidad, morosidad, flujo de caja venezolano y nóminas.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones e indicador de Tasa BCV */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50/80 border border-purple-200 rounded-xl text-xs font-semibold text-purple-900">
            <Landmark className="w-4 h-4 text-purple-700" />
            <span>Tasa BCV:</span>
            <span className="font-mono text-sm font-bold">Bs. {parseFloat(tasa || 0).toFixed(2)}</span>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            title="Imprimir reporte o exportar a PDF"
          >
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
      {errorMsg && (
        <div className="no-print flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="no-print flex gap-1.5 bg-gray-100 p-1.5 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de fecha / parámetros */}
      <div className="no-print flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {activeTab !== 'morosidad' ? (
          <>
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Desde:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Hasta:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Mostrar clientes con vencimiento superior a:</label>
            <input
              type="number"
              min="0"
              value={diasMorosidad}
              onChange={(e) => setDiasMorosidad(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <span className="text-sm text-gray-600">días</span>
          </div>
        )}

        <button
          onClick={fetchReporte}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Generar Reporte
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
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 1. VENTAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'ventas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Pedidos"
                  usd={data.total_pedidos}
                  isCurrency={false}
                  color="blue"
                  icon={<Package className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Facturado"
                  usd={data.total_facturado}
                  tasa={tasa}
                  color="purple"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Cobrado"
                  usd={data.total_cobrado}
                  tasa={tasa}
                  color="green"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                />
                <KpiCard
                  label="Cartera por Cobrar"
                  usd={data.total_cartera}
                  tasa={tasa}
                  color="red"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
              </div>

              <Acordeon title={`Ventas por Cliente (${data.por_cliente.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Cliente', 'RIF / C.I.', 'Pedidos', 'Facturado', 'Cobrado', 'Saldo']}>
                  {data.por_cliente.map((c) => (
                    <tr key={c.cliente_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.cliente_nombre}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.documento}</td>
                      <td className="px-4 py-3 text-center font-bold">{c.total_pedidos}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-gray-900">{formatUSD(c.total_facturado)}</div>
                        <div className="text-xs text-gray-500">{formatBS(c.total_facturado, tasa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-emerald-700">{formatUSD(c.total_cobrado)}</div>
                        <div className="text-xs text-emerald-600/80">{formatBS(c.total_cobrado, tasa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-red-600">{formatUSD(c.saldo_pendiente)}</div>
                        <div className="text-xs text-red-500/80">{formatBS(c.saldo_pendiente, tasa)}</div>
                      </td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              <Acordeon title={`Ventas por Producto / SKU (${data.por_producto.length})`} icon={<Package className="w-4 h-4" />}>
                <TableWrapper headers={['SKU', 'Producto', 'Color', 'Talla', 'Unidades', 'Facturado']}>
                  {data.por_producto.map((p) => (
                    <tr key={p.variante_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-mono text-xs text-purple-700 font-medium">{p.sku}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.producto_nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{p.color}</td>
                      <td className="px-4 py-3 text-gray-600">{p.talla}</td>
                      <td className="px-4 py-3 text-center font-bold">{p.unidades_vendidas}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-gray-900">{formatUSD(p.total_facturado)}</div>
                        <div className="text-xs text-gray-500">{formatBS(p.total_facturado, tasa)}</div>
                      </td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              <Acordeon title={`Ventas por Vendedor (${data.por_vendedor.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Vendedor', 'Pedidos', 'Facturado', 'Cobrado']}>
                  {data.por_vendedor.map((v) => (
                    <tr key={v.vendedor_id} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{v.vendedor_nombre}</td>
                      <td className="px-4 py-3 text-center font-bold">{v.total_pedidos}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-gray-900">{formatUSD(v.total_facturado)}</div>
                        <div className="text-xs text-gray-500">{formatBS(v.total_facturado, tasa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-emerald-700">{formatUSD(v.total_cobrado)}</div>
                        <div className="text-xs text-emerald-600/80">{formatBS(v.total_cobrado, tasa)}</div>
                      </td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 2. PRODUCCIÓN */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'produccion' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Órdenes Corte" usd={data.total_ordenes_corte} isCurrency={false} color="amber" icon={<Scissors className="w-5 h-5" />} />
                <KpiCard label="Órdenes Impresión" usd={data.total_ordenes_impresion} isCurrency={false} color="purple" icon={<Layers className="w-5 h-5" />} />
                <KpiCard label="Órdenes Confección" usd={data.total_ordenes_confeccion} isCurrency={false} color="blue" icon={<Package className="w-5 h-5" />} />
                <KpiCard label="Costo Total Mano de Obra" usd={data.costo_total_produccion} tasa={tasa} color="red" icon={<DollarSign className="w-5 h-5" />} />
              </div>

              <Acordeon title={`Producción por Operario (${data.por_operario.length})`} icon={<Users className="w-4 h-4" />}>
                <TableWrapper headers={['Trabajador', 'Rol', 'Órdenes', 'Piezas', 'Costo Mano de Obra']}>
                  {data.por_operario.map((o, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{o.trabajador_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md font-medium">
                          {o.rol_produccion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{o.total_ordenes}</td>
                      <td className="px-4 py-3 text-center font-medium">{o.total_piezas}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-gray-900">{formatUSD(o.costo_total)}</div>
                        <div className="text-xs text-gray-500">{formatBS(o.costo_total, tasa)}</div>
                      </td>
                    </tr>
                  ))}
                </TableWrapper>
              </Acordeon>

              {data.por_tecnica_impresion.length > 0 && (
                <Acordeon title={`Por Técnica de Impresión (${data.por_tecnica_impresion.length})`} icon={<Layers className="w-4 h-4" />}>
                  <TableWrapper headers={['Técnica', 'Órdenes', 'Piezas', 'Costo Total']}>
                    {data.por_tecnica_impresion.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 text-sm">
                        <td className="px-4 py-3">
                          <span className="capitalize bg-purple-50 text-purple-800 text-xs px-2.5 py-1 rounded-md font-semibold">
                            {t.tecnica}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{t.total_ordenes}</td>
                        <td className="px-4 py-3 text-center">{t.total_piezas}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-gray-900">{formatUSD(t.costo_total)}</div>
                          <div className="text-xs text-gray-500">{formatBS(t.costo_total, tasa)}</div>
                        </td>
                      </tr>
                    ))}
                  </TableWrapper>
                </Acordeon>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 3. RENTABILIDAD */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'rentabilidad' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Facturado Total" usd={data.total_facturado} tasa={tasa} color="blue" icon={<DollarSign className="w-5 h-5" />} />
                <KpiCard label="Costo Producción" usd={data.costo_total_produccion} tasa={tasa} color="red" icon={<Scissors className="w-5 h-5" />} />
                <KpiCard label="Ganancia Bruta" usd={data.ganancia_bruta_total} tasa={tasa} color="green" icon={<TrendingUp className="w-5 h-5" />} />
                <KpiCard label="Margen Bruto Promedio" usd={`${data.margen_promedio}%`} isCurrency={false} color="purple" icon={<BarChart2 className="w-5 h-5" />} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">Rentabilidad Detallada por Pedido ({data.pedidos.length})</h3>
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
                          <th className="px-4 py-3 text-right">Facturado ($ / Bs.)</th>
                          <th className="px-4 py-3 text-right">Costo Prod. ($ / Bs.)</th>
                          <th className="px-4 py-3 text-right">Ganancia Bruta</th>
                          <th className="px-4 py-3 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.pedidos.map((p) => {
                          const margenColor =
                            p.margen_porcentaje >= 35 ? 'text-emerald-600 bg-emerald-50' :
                            p.margen_porcentaje >= 15 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                          return (
                            <tr key={p.pedido_id} className="hover:bg-gray-50/60">
                              <td className="px-4 py-3 font-bold text-purple-700">#{p.pedido_id}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{p.cliente_nombre}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.fecha}</td>
                              <td className="px-4 py-3">
                                <span className="capitalize text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                                  {p.estado.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-bold text-gray-900">{formatUSD(p.total_facturado)}</div>
                                <div className="text-xs text-gray-500">{formatBS(p.total_facturado, tasa)}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-semibold text-red-600">{formatUSD(p.costo_produccion)}</div>
                                <div className="text-xs text-red-400">{formatBS(p.costo_produccion, tasa)}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-bold text-emerald-700">{formatUSD(p.ganancia_bruta)}</div>
                                <div className="text-xs text-emerald-600/80">{formatBS(p.ganancia_bruta, tasa)}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-block font-black text-xs px-2.5 py-1 rounded-md ${margenColor}`}>
                                  {p.margen_porcentaje}%
                                </span>
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 4. MOROSIDAD */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'morosidad' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <KpiCard
                  label="Clientes con Saldo Pendiente"
                  usd={data.total_clientes_morosos}
                  isCurrency={false}
                  color="red"
                  icon={<Users className="w-5 h-5" />}
                />
                <KpiCard
                  label="Deuda Total Vencida"
                  usd={data.total_deuda_vencida}
                  tasa={tasa}
                  color="red"
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>

              {data.clientes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-bold text-gray-800">Cartera de clientes al día</p>
                  <p className="text-sm text-gray-400 mt-1">
                    No existen saldos pendientes con antigüedad mayor a {diasMorosidad} días.
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
                          <th className="px-4 py-3 text-center">Antigüedad</th>
                          <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                          <th className="px-4 py-3 text-right">Límite Crédito</th>
                          <th className="px-4 py-3">Estado Alerta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.clientes.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{c.cliente_nombre}</p>
                              <p className="text-xs text-gray-400 font-mono">{c.documento} {c.telefono && `• ${c.telefono}`}</p>
                            </td>
                            <td className="px-4 py-3 font-bold text-purple-700">#{c.pedido_id}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs font-mono">{c.fecha_pedido}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold text-sm px-2 py-0.5 rounded ${c.dias_vencimiento > 60 ? 'bg-red-50 text-red-700' : c.dias_vencimiento > 30 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                                {c.dias_vencimiento} días
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-red-600">{formatUSD(c.saldo_pedido)}</div>
                              <div className="text-xs text-red-400">{formatBS(c.saldo_pedido, tasa)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-semibold text-gray-700">{formatUSD(c.credito_maximo)}</div>
                              <div className="text-xs text-gray-400">{formatBS(c.credito_maximo, tasa)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${riesgoColor(c.alerta)}`}>
                                {c.alerta === 'bloqueado' && <ShieldAlert className="w-3.5 h-3.5" />}
                                {c.alerta === 'alerta' && <AlertTriangle className="w-3.5 h-3.5" />}
                                {c.alerta === 'normal' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {c.alerta.toUpperCase()}
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 5. CAJA & COBROS (VENEZUELA) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'caja' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Recaudado (USD)"
                  usd={data.total_recaudado_usd}
                  tasa={tasa}
                  color="purple"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Registrado en Bolívares"
                  usd={data.total_recaudado_usd}
                  customValue={`Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(data.total_recaudado_bs || 0))}`}
                  subValue={`Eqv. ${formatUSD(data.total_recaudado_usd)}`}
                  isCurrency={false}
                  color="blue"
                  icon={<Landmark className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Transacciones"
                  usd={data.transacciones.length}
                  isCurrency={false}
                  color="green"
                  icon={<CreditCard className="w-5 h-5" />}
                />
                <KpiCard
                  label="Métodos Activos"
                  usd={data.por_metodo.length}
                  isCurrency={false}
                  color="amber"
                  icon={<Wallet className="w-5 h-5" />}
                />
              </div>

              {/* Resumen por Método de Pago */}
              <Acordeon title={`Distribución por Método de Cobro (${data.por_metodo.length})`} icon={<Wallet className="w-4 h-4" />}>
                <TableWrapper headers={['Método de Pago', 'Transacciones', 'Total USD', 'Total Bs. Registrado', '% Participación']}>
                  {data.por_metodo.map((m, idx) => {
                    const totalUsdGeneral = parseFloat(data.total_recaudado_usd || 1);
                    const pct = totalUsdGeneral > 0 ? ((parseFloat(m.total_usd) / totalUsdGeneral) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/60 text-sm">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">{formatearMetodoPago(m.metodo)}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">
                          {m.cantidad_transacciones}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatUSD(m.total_usd)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-purple-900 font-semibold">
                          Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(m.total_bs))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded text-xs">
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </TableWrapper>
              </Acordeon>

              {/* Detalle de Transacciones (Libro Diario) */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Libro Diario de Ingresos y Cobros ({data.transacciones.length})</h3>
                  <span className="text-xs text-gray-500 font-medium">Orden cronológico descendente</span>
                </div>
                {data.transacciones.length === 0 ? (
                  <p className="p-8 text-center text-gray-400 text-sm">
                    No se registran cobros en el período seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">ID / Fecha</th>
                          <th className="px-4 py-3">Concepto</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Método & Banco</th>
                          <th className="px-4 py-3">Referencia</th>
                          <th className="px-4 py-3 text-right">Monto USD</th>
                          <th className="px-4 py-3 text-right">Monto Bs.</th>
                          <th className="px-4 py-3 text-right">Tasa Aplicada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.transacciones.map((tx) => (
                          <tr key={`${tx.tipo}-${tx.id}`} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3">
                              <div className="font-bold text-purple-700">#{tx.id}</div>
                              <div className="text-xs text-gray-400 font-mono">{tx.fecha}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${tx.tipo === 'pago_pedido' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {tx.tipo === 'pago_pedido' ? `Pedido #${tx.pedido_id}` : 'Abono a Crédito'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {tx.cliente_nombre}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-800 text-xs">{formatearMetodoPago(tx.metodo)}</p>
                              {tx.banco && <p className="text-xs text-gray-500">{tx.banco}</p>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                              {tx.referencia || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {formatUSD(tx.monto_usd)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-purple-900 font-semibold">
                              Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(tx.monto_bs))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                              {parseFloat(tx.tasa_cambio).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 6. NÓMINAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'nominas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Nóminas Liquidadas"
                  usd={data.total_nominas}
                  isCurrency={false}
                  color="purple"
                  icon={<Calculator className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Nómina Pagada"
                  usd={data.total_pagado}
                  tasa={tasa}
                  color="green"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                />
                <KpiCard
                  label="Total Nómina Pendiente"
                  usd={data.total_pendiente}
                  tasa={tasa}
                  color="amber"
                  icon={<Clock className="w-5 h-5" />}
                />
                <KpiCard
                  label="Costo Laboral Total"
                  usd={data.total_general}
                  tasa={tasa}
                  color="blue"
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Historial de Liquidaciones de Nómina ({data.nominas.length})</h3>
                </div>
                {data.nominas.length === 0 ? (
                  <p className="p-8 text-center text-gray-400 text-sm">
                    No se registran nóminas liquidadas para el período seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">ID / Período</th>
                          <th className="px-4 py-3">Trabajador</th>
                          <th className="px-4 py-3">Modalidad</th>
                          <th className="px-4 py-3 text-center">Piezas</th>
                          <th className="px-4 py-3 text-right">Producción ($)</th>
                          <th className="px-4 py-3 text-right">Fijo ($)</th>
                          <th className="px-4 py-3 text-right">Total a Pagar</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                          <th className="px-4 py-3 text-center">Fecha Pago</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.nominas.map((n) => (
                          <tr key={n.id} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3">
                              <span className="font-bold text-purple-700">#{n.id}</span>
                              <p className="text-xs text-gray-400 font-mono">{n.periodo_inicio} al {n.periodo_fin}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{n.trabajador_nombre}</p>
                              <p className="text-xs text-gray-400 font-mono">{n.documento}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                                {n.tipo_pago}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-800">
                              {n.total_producido}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              {formatUSD(n.monto_produccion)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              {formatUSD(n.monto_fijo)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-gray-900">{formatUSD(n.total)}</div>
                              <div className="text-xs text-purple-900 font-medium">{formatBS(n.total, tasa)}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${n.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {n.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-mono text-gray-500">
                              {n.fecha_pago || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ───
function KpiCard({ label, usd, tasa = null, isCurrency = true, customValue = null, subValue = null, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const displayPrimary = customValue !== null ? customValue : (isCurrency ? formatUSD(usd) : usd);
  const displaySecondary = subValue !== null ? subValue : (isCurrency && tasa ? formatBS(usd, tasa) : null);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start gap-3.5 print-card">
      <div className={`p-2.5 rounded-xl border ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-black text-gray-900 truncate">{displayPrimary}</p>
        {displaySecondary && (
          <p className="text-xs font-semibold text-purple-900/80 truncate mt-0.5">
            {displaySecondary}
          </p>
        )}
        <p className="text-xs text-gray-500 font-medium mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function Acordeon({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm print-card print-break-inside-avoid">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors no-print"
      >
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      <div className="hidden print:block p-4 border-b border-gray-200 font-bold text-gray-900 text-sm">
        {title}
      </div>
      {open && children}
    </div>
  );
}

function TableWrapper({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200 print:bg-gray-100 print:text-gray-900">
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
