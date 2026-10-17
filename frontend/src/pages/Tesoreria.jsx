import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileText,
  Clock,
  ShieldAlert,
  Wallet,
  Smartphone,
  Landmark,
  Banknote,
  Receipt
} from 'lucide-react';

export default function Tesoreria() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('caja'); // 'caja', 'cuentas', 'pagos'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Estado Cierre de Caja
  const today = new Date().toISOString().split('T')[0];
  const [fechaCaja, setFechaCaja] = useState(today);
  const [cierreData, setCierreData] = useState(null);

  // 2. Estado Cuentas por Cobrar
  const [cuentas, setCuentas] = useState([]);
  const [searchCartera, setSearchCartera] = useState('');

  // 3. Estado Historial Pagos
  const [pagos, setPagos] = useState([]);
  const [abonos, setAbonos] = useState([]);

  // Modales
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);

  // Datos para formularios
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [clientesList, setClientesList] = useState([]);

  // Form Pago Pedido
  const [formPago, setFormPago] = useState({
    pedido_id: '',
    monto: '',
    metodo: 'efectivo',
    referencia: '',
  });

  // Form Abono Crédito
  const [formAbono, setFormAbono] = useState({
    cliente_id: '',
    pedido_id: '',
    monto: '',
    metodo: 'efectivo',
    referencia: '',
    notas: '',
  });

  const fetchCierreCaja = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tesoreria/cierre-caja?fecha=${fechaCaja}`);
      setCierreData(res.data);
    } catch (err) {
      setErrorMsg('Error al consultar el cierre de caja');
    } finally {
      setLoading(false);
    }
  };

  const fetchCuentasPorCobrar = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tesoreria/cuentas-por-cobrar');
      setCuentas(res.data);
    } catch (err) {
      setErrorMsg('Error al consultar cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const [resPagos, resAbonos] = await Promise.all([
        api.get('/tesoreria/pagos'),
        api.get('/tesoreria/abonos'),
      ]);
      setPagos(resPagos.data);
      setAbonos(resAbonos.data);
    } catch (err) {
      setErrorMsg('Error al cargar historial de movimientos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectData = async () => {
    try {
      const [pedRes, cliRes] = await Promise.all([
        api.get('/pedidos'),
        api.get('/clientes'),
      ]);
      // Filtrar pedidos que no estén cancelados y tengan saldo pendiente
      const pendientes = pedRes.data.filter(
        (p) => p.estado !== 'cancelado' && parseFloat(p.saldo_pendiente) > 0
      );
      setPedidosPendientes(pendientes);
      setClientesList(cliRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    if (activeTab === 'caja') {
      fetchCierreCaja();
    } else if (activeTab === 'cuentas') {
      fetchCuentasPorCobrar();
    } else if (activeTab === 'pagos') {
      fetchHistorial();
    }
  }, [activeTab, fechaCaja]);

  const handleOpenPagoModal = (preselectedPedidoId = '') => {
    fetchSelectData();
    setFormPago({
      pedido_id: preselectedPedidoId ? String(preselectedPedidoId) : '',
      monto: '',
      metodo: 'efectivo',
      referencia: '',
    });
    setModalPagoOpen(true);
  };

  const handleOpenAbonoModal = (preselectedClienteId = '') => {
    fetchSelectData();
    setFormAbono({
      cliente_id: preselectedClienteId ? String(preselectedClienteId) : '',
      pedido_id: '',
      monto: '',
      metodo: 'efectivo',
      referencia: '',
      notas: '',
    });
    setModalAbonoOpen(true);
  };

  const submitPagoPedido = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/tesoreria/pagos', {
        pedido_id: parseInt(formPago.pedido_id),
        monto: parseFloat(formPago.monto),
        metodo: formPago.metodo,
        referencia: formPago.referencia || null,
      });
      setSuccessMsg('¡Pago registrado correctamente y saldo actualizado!');
      setModalPagoOpen(false);
      if (activeTab === 'caja') fetchCierreCaja();
      if (activeTab === 'cuentas') fetchCuentasPorCobrar();
      if (activeTab === 'pagos') fetchHistorial();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al registrar el pago');
    }
  };

  const submitAbonoCredito = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/tesoreria/abonos', {
        cliente_id: parseInt(formAbono.cliente_id),
        pedido_id: formAbono.pedido_id ? parseInt(formAbono.pedido_id) : null,
        monto: parseFloat(formAbono.monto),
        metodo: formAbono.metodo,
        referencia: formAbono.referencia || null,
        notas: formAbono.notas || null,
      });
      setSuccessMsg('¡Abono a crédito registrado exitosamente!');
      setModalAbonoOpen(false);
      if (activeTab === 'caja') fetchCierreCaja();
      if (activeTab === 'cuentas') fetchCuentasPorCobrar();
      if (activeTab === 'pagos') fetchHistorial();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al registrar abono a crédito');
    }
  };

  // Pedido seleccionado para preview en modal de pago
  const selectedPedidoObj = pedidosPendientes.find(
    (p) => String(p.id) === String(formPago.pedido_id)
  );

  // Cliente seleccionado para preview en modal de abono
  const selectedClienteObj = clientesList.find(
    (c) => String(c.id) === String(formAbono.cliente_id)
  );

  const getMetodoIcon = (metodo) => {
    switch (metodo) {
      case 'efectivo':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'nequi':
      case 'daviplata':
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      case 'transferencia':
        return <Landmark className="w-4 h-4 text-blue-600" />;
      case 'tarjeta':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      default:
        return <Wallet className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredCuentas = cuentas.filter(
    (c) =>
      c.cliente_nombre.toLowerCase().includes(searchCartera.toLowerCase()) ||
      c.documento.includes(searchCartera)
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Tesorería & Cuentas por Cobrar</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Control de caja diario, abonos a pedidos, amortización de créditos y seguimiento de cartera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenPagoModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Pago a Pedido
          </button>
          <button
            onClick={() => handleOpenAbonoModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            Abono a Crédito
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('caja')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'caja'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Cierre de Caja Diario
        </button>
        <button
          onClick={() => setActiveTab('cuentas')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cuentas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Cuentas por Cobrar ({cuentas.length})
        </button>
        <button
          onClick={() => setActiveTab('pagos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pagos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Historial de Movimientos
        </button>
      </div>

      {/* TAB 1: CIERRE DE CAJA DIARIO */}
      {activeTab === 'caja' && (
        <div className="space-y-6">
          {/* Selector de fecha */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Fecha del Arqueo / Cierre:</span>
              <input
                type="date"
                value={fechaCaja}
                onChange={(e) => setFechaCaja(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={fetchCierreCaja}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Actualizar Caja
            </button>
          </div>

          {/* Tarjetas KPI */}
          {cierreData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
                  Total Recaudado
                </span>
                <p className="text-2xl font-black mt-2">
                  ${parseFloat(cierreData.total_recaudado).toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  {cierreData.movimientos.length} transacción(es) en el día
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Efectivo en Caja</span>
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${parseFloat(cierreData.total_efectivo).toLocaleString('es-CO')}
                </p>
                <span className="text-xs text-gray-400">Billetes y monedas</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Nequi & Daviplata</span>
                  <Smartphone className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${parseFloat(cierreData.total_billeteras_digitales).toLocaleString('es-CO')}
                </p>
                <span className="text-xs text-gray-400">Billeteras móviles</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Transferencias</span>
                  <Landmark className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${parseFloat(cierreData.total_transferencias).toLocaleString('es-CO')}
                </p>
                <span className="text-xs text-gray-400">Bancos / PSE</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Tarjetas & Otros</span>
                  <CreditCard className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${(
                    parseFloat(cierreData.total_tarjetas) + parseFloat(cierreData.total_otros)
                  ).toLocaleString('es-CO')}
                </p>
                <span className="text-xs text-gray-400">Datáfono y varios</span>
              </div>
            </div>
          )}

          {/* Tabla de movimientos del día */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">
                Movimientos del Día ({cierreData?.movimientos?.length || 0})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Cargando cierre de caja...</div>
            ) : !cierreData || cierreData.movimientos.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Sin movimientos registrados para esta fecha</p>
                <p className="text-xs text-gray-400 mt-1">
                  Usa los botones superiores para registrar pagos de pedidos o abonos a crédito.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Pedido / Ref</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Registrado Por</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cierreData.movimientos.map((m) => (
                      <tr key={`${m.tipo}-${m.id}`} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              m.tipo === 'pago_pedido'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {m.tipo === 'pago_pedido' ? (
                              <>
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Pago Pedido
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3.5 h-3.5" /> Abono Crédito
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{m.cliente_nombre}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {m.pedido_id ? (
                            <span className="font-semibold text-blue-600">Pedido #{m.pedido_id}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">Abono General</span>
                          )}
                          {m.referencia && (
                            <p className="text-xs text-gray-400 font-mono">Ref: {m.referencia}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                            {getMetodoIcon(m.metodo)}
                            {m.metodo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {m.registrado_por_nombre || 'Sistema'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          ${parseFloat(m.monto).toLocaleString('es-CO')}
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

      {/* TAB 2: CUENTAS POR COBRAR */}
      {activeTab === 'cuentas' && (
        <div className="space-y-6">
          {/* Buscador de Cartera */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre o documento..."
                value={searchCartera}
                onChange={(e) => setSearchCartera(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Total Cartera:{' '}
              <span className="font-bold text-gray-900 text-sm">
                $
                {cuentas
                  .reduce((acc, c) => acc + parseFloat(c.saldo_pendiente_global), 0)
                  .toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Tabla de Cuentas por Cobrar */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {filteredCuentas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">¡Al día! No hay cuentas pendientes de cobro</p>
                <p className="text-xs text-gray-400 mt-1">
                  Todos los clientes tienen sus saldos y créditos cancelados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Saldo Deuda</th>
                      <th className="px-4 py-3">Cupo Asignado</th>
                      <th className="px-4 py-3">Uso del Crédito</th>
                      <th className="px-4 py-3">Estado de Riesgo</th>
                      <th className="px-4 py-3">Pedidos Pendientes</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCuentas.map((c) => (
                      <tr key={c.cliente_id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{c.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">
                            Doc: {c.documento} {c.telefono && `• Tel: ${c.telefono}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-bold text-red-600">
                          ${parseFloat(c.saldo_pendiente_global).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          ${parseFloat(c.credito_maximo).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-gray-700">{c.porcentaje_cupo_usado}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.alerta_riesgo === 'bloqueado'
                                  ? 'bg-red-500'
                                  : c.alerta_riesgo === 'alerta'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, c.porcentaje_cupo_usado)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.alerta_riesgo === 'bloqueado' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              <ShieldAlert className="w-3 h-3" /> Bloqueado
                            </span>
                          ) : c.alerta_riesgo === 'alerta' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> Cerca del Límite
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <p className="font-semibold">{c.pedidos_pendientes_count} pedido(s)</p>
                          {c.pedido_mas_antiguo_fecha && (
                            <p className="text-gray-400">Desde: {c.pedido_mas_antiguo_fecha}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenAbonoModal(c.cliente_id)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Abonar Deuda
                          </button>
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

      {/* TAB 3: HISTORIAL DE PAGOS & ABONOS */}
      {activeTab === 'pagos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pagos a Pedidos */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Pagos a Pedidos Registrados</h3>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  {pagos.length}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 text-sm">
                {pagos.length === 0 ? (
                  <p className="p-6 text-center text-gray-400 text-xs">No hay pagos registrados</p>
                ) : (
                  pagos.map((p) => (
                    <div key={p.id} className="p-4 hover:bg-gray-50/60 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Pedido #{p.pedido_id}</span>
                          <span className="text-xs text-gray-400">• {p.fecha}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{p.cliente_nombre}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span className="capitalize">{p.metodo}</span>
                          {p.referencia && <span>Ref: {p.referencia}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-600">
                          +${parseFloat(p.monto).toLocaleString('es-CO')}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Por: {p.registrado_por_nombre || 'Sistema'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Abonos a Crédito */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Abonos a Cuentas de Crédito</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  {abonos.length}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 text-sm">
                {abonos.length === 0 ? (
                  <p className="p-6 text-center text-gray-400 text-xs">No hay abonos a crédito registrados</p>
                ) : (
                  abonos.map((a) => (
                    <div key={a.id} className="p-4 hover:bg-gray-50/60 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{a.cliente_nombre}</span>
                          <span className="text-xs text-gray-400">• {a.fecha}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.pedido_id ? `Imputado a Pedido #${a.pedido_id}` : 'Abono a cupo global'}
                        </p>
                        {a.notas && <p className="text-xs text-gray-400 italic">"{a.notas}"</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600">
                          +${parseFloat(a.monto).toLocaleString('es-CO')}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Por: {a.registrado_por_nombre || 'Sistema'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR PAGO A PEDIDO */}
      {modalPagoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">Registrar Pago a Pedido</h3>
              </div>
              <button
                onClick={() => setModalPagoOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPagoPedido} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Seleccionar Pedido con Saldo Pendiente *
                </label>
                <select
                  required
                  value={formPago.pedido_id}
                  onChange={(e) => setFormPago({ ...formPago, pedido_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Seleccione un pedido --</option>
                  {pedidosPendientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      Pedido #{p.id} - {p.cliente?.nombre || 'Cliente'} (Saldo:{' '}
                      ${parseFloat(p.saldo_pendiente).toLocaleString('es-CO')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPedidoObj && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total del Pedido:</span>
                    <span className="font-bold text-gray-900">
                      ${parseFloat(selectedPedidoObj.total).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Anticipo Actual:</span>
                    <span className="font-semibold text-emerald-700">
                      ${parseFloat(selectedPedidoObj.anticipo).toLocaleString('es-CO')} (
                      {selectedPedidoObj.porcentaje_anticipo}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo Pendiente:</span>
                    <span className="font-bold text-red-600">
                      ${parseFloat(selectedPedidoObj.saldo_pendiente).toLocaleString('es-CO')}
                    </span>
                  </div>
                  {selectedPedidoObj.estado === 'borrador' && (
                    <p className="text-[11px] text-amber-700 font-medium mt-1">
                      ⚠️ El pedido está en borrador. Requiere un anticipo acumulado del 30% ($
                      {(parseFloat(selectedPedidoObj.total) * 0.3).toLocaleString('es-CO')}) para iniciar
                      producción.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Monto a Pagar ($ COP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  placeholder="Ej: 150000"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formPago.metodo}
                    onChange={(e) => setFormPago({ ...formPago, metodo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    No. Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REC-10293"
                    value={formPago.referencia}
                    onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalPagoOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO A CRÉDITO */}
      {modalAbonoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-lg">Registrar Abono a Crédito</h3>
              </div>
              <button
                onClick={() => setModalAbonoOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAbonoCredito} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={formAbono.cliente_id}
                  onChange={(e) => setFormAbono({ ...formAbono, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Seleccione un cliente --</option>
                  {clientesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} (Deuda: ${parseFloat(c.saldo_pendiente_global).toLocaleString('es-CO')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClienteObj && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cupo de Crédito Máximo:</span>
                    <span className="font-bold text-gray-900">
                      ${parseFloat(selectedClienteObj.credito_maximo).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deuda Global Actual:</span>
                    <span className="font-bold text-red-600">
                      ${parseFloat(selectedClienteObj.saldo_pendiente_global).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Monto del Abono ($ COP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  placeholder="Ej: 200000"
                  value={formAbono.monto}
                  onChange={(e) => setFormAbono({ ...formAbono, monto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formAbono.metodo}
                    onChange={(e) => setFormAbono({ ...formAbono, metodo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Comprobante / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: NEQ-7788"
                    value={formAbono.referencia}
                    onChange={(e) => setFormAbono({ ...formAbono, referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej: Abono a cuota #2 del acuerdo de crédito..."
                  value={formAbono.notas}
                  onChange={(e) => setFormAbono({ ...formAbono, notas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalAbonoOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
