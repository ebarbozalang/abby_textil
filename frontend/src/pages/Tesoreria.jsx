import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTasaStore, formatUSD, formatBS } from '../store/tasaStore';
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
  Receipt,
  RefreshCw,
  Edit3,
  Coins
} from 'lucide-react';

const BANCOS_VENEZUELA = [
  'Banesco',
  'Banco de Venezuela (BDV)',
  'Mercantil',
  'BBVA Provincial',
  'BNC (Banco Nacional de Crédito)',
  'Bancaribe',
  'Banplus',
  'Banco Exterior',
  'Banco del Tesoro',
  'Otro Banco'
];

export default function Tesoreria() {
  const { user } = useAuthStore();
  const {
    tasa,
    fuente,
    cargarTasa,
    sincronizarBCV,
    fijarTasaManual,
    cargando: tasaCargando,
    convertirUSDABs,
    convertirBsAUSD
  } = useTasaStore();

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
  const [modalTasaOpen, setModalTasaOpen] = useState(false);
  const [nuevaTasaInput, setNuevaTasaInput] = useState('');
  const [motivoTasaInput, setMotivoTasaInput] = useState('');

  // Datos para formularios
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [clientesList, setClientesList] = useState([]);

  // Form Pago Pedido (Dual Moneda Venezuela)
  const [formPago, setFormPago] = useState({
    pedido_id: '',
    moneda_pago: 'USD', // 'USD' o 'BS'
    monto: '',
    tasa_cambio: '',
    metodo: 'efectivo_usd',
    banco: '',
    telefono: '',
    referencia: '',
  });

  // Form Abono Crédito (Dual Moneda Venezuela)
  const [formAbono, setFormAbono] = useState({
    cliente_id: '',
    pedido_id: '',
    moneda_pago: 'USD',
    monto: '',
    tasa_cambio: '',
    metodo: 'efectivo_usd',
    banco: '',
    telefono: '',
    referencia: '',
    notas: '',
  });

  useEffect(() => {
    cargarTasa();
  }, []);

  const fetchCierreCaja = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tesoreria/cierre-caja?fecha=${fechaCaja}`);
      setCierreData(res.data);
    } catch (err) {
      setErrorMsg('Error al consultar el arqueo de caja');
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
    const currentRate = tasa || 45.0;
    setFormPago({
      pedido_id: preselectedPedidoId ? String(preselectedPedidoId) : '',
      moneda_pago: 'USD',
      monto: '',
      tasa_cambio: currentRate.toFixed(2),
      metodo: 'efectivo_usd',
      banco: '',
      telefono: '',
      referencia: '',
    });
    setModalPagoOpen(true);
  };

  const handleOpenAbonoModal = (preselectedClienteId = '') => {
    fetchSelectData();
    const currentRate = tasa || 45.0;
    setFormAbono({
      cliente_id: preselectedClienteId ? String(preselectedClienteId) : '',
      pedido_id: '',
      moneda_pago: 'USD',
      monto: '',
      tasa_cambio: currentRate.toFixed(2),
      metodo: 'efectivo_usd',
      banco: '',
      telefono: '',
      referencia: '',
      notas: '',
    });
    setModalAbonoOpen(true);
  };

  const handleSyncBCV = async () => {
    setErrorMsg('');
    const res = await sincronizarBCV();
    if (res.success) {
      setSuccessMsg(`¡Tasa BCV sincronizada con éxito: Bs. ${parseFloat(res.tasa).toFixed(2)} / $!`);
      if (activeTab === 'caja') fetchCierreCaja();
    } else {
      setErrorMsg(res.error || 'No se pudo sincronizar con el BCV.');
    }
  };

  const handleGuardarTasaManual = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nuevaTasaInput || parseFloat(nuevaTasaInput) <= 0) {
      setErrorMsg('La tasa debe ser mayor a cero.');
      return;
    }
    const res = await fijarTasaManual(nuevaTasaInput, motivoTasaInput);
    if (res.success) {
      setSuccessMsg(`¡Tasa de cambio fijada manualmente a Bs. ${parseFloat(res.tasa).toFixed(2)} / $!`);
      setModalTasaOpen(false);
      setNuevaTasaInput('');
      setMotivoTasaInput('');
      if (activeTab === 'caja') fetchCierreCaja();
    } else {
      setErrorMsg(res.error || 'Error al fijar tasa manual.');
    }
  };

  const submitPagoPedido = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/tesoreria/pagos', {
        pedido_id: parseInt(formPago.pedido_id),
        monto: parseFloat(formPago.monto),
        moneda_pago: formPago.moneda_pago,
        metodo: formPago.metodo,
        tasa_cambio: formPago.tasa_cambio ? parseFloat(formPago.tasa_cambio) : null,
        banco: formPago.banco || null,
        telefono: formPago.telefono || null,
        referencia: formPago.referencia || null,
      });
      setSuccessMsg('¡Pago procesado con éxito y registrado en Caja!');
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
        moneda_pago: formAbono.moneda_pago,
        metodo: formAbono.metodo,
        tasa_cambio: formAbono.tasa_cambio ? parseFloat(formAbono.tasa_cambio) : null,
        banco: formAbono.banco || null,
        telefono: formAbono.telefono || null,
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

  // Cálculos en vivo para modal de pago
  const activeRatePago = parseFloat(formPago.tasa_cambio) || tasa || 45.0;
  const montoInputPago = parseFloat(formPago.monto) || 0;
  const montoEquivUSDPago = formPago.moneda_pago === 'BS'
    ? montoInputPago / activeRatePago
    : montoInputPago;
  const montoEquivBsPago = formPago.moneda_pago === 'USD'
    ? montoInputPago * activeRatePago
    : montoInputPago;

  // Cálculos en vivo para modal de abono
  const activeRateAbono = parseFloat(formAbono.tasa_cambio) || tasa || 45.0;
  const montoInputAbono = parseFloat(formAbono.monto) || 0;
  const montoEquivUSDAbono = formAbono.moneda_pago === 'BS'
    ? montoInputAbono / activeRateAbono
    : montoInputAbono;
  const montoEquivBsAbono = formAbono.moneda_pago === 'USD'
    ? montoInputAbono * activeRateAbono
    : montoInputAbono;

  const getMetodoIcon = (metodo) => {
    switch (metodo) {
      case 'pago_movil':
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      case 'efectivo_usd':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'efectivo_bs':
        return <Banknote className="w-4 h-4 text-amber-600" />;
      case 'transferencia_bs':
        return <Landmark className="w-4 h-4 text-blue-600" />;
      case 'punto_venta':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'zelle':
        return <ArrowDownLeft className="w-4 h-4 text-purple-700" />;
      case 'binance':
        return <Coins className="w-4 h-4 text-yellow-600" />;
      default:
        return <Wallet className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMetodoNombre = (metodo) => {
    const nombres = {
      pago_movil: 'Pago Móvil (Bs.)',
      efectivo_usd: 'Efectivo ($ USD)',
      efectivo_bs: 'Efectivo (Bs.)',
      transferencia_bs: 'Transferencia Bancaria (Bs.)',
      punto_venta: 'Punto de Venta / Biopago',
      zelle: 'Zelle (USD)',
      binance: 'Binance Pay / USDT',
      otro: 'Otro Método',
    };
    return nombres[metodo] || metodo;
  };

  const filteredCuentas = cuentas.filter(
    (c) =>
      c.cliente_nombre.toLowerCase().includes(searchCartera.toLowerCase()) ||
      c.documento.includes(searchCartera)
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Tasa BCV Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-50 text-abby-700 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Módulo de Caja & Tesorería
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Operaciones en <span className="font-bold text-gray-800">Dólares ($ USD)</span> y{' '}
                <span className="font-bold text-gray-800">Bolívares (Bs.)</span> adaptado al mercado venezolano.
              </p>
            </div>
          </div>
        </div>

        {/* Tasa Ticker & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Tasa Pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200/80 rounded-xl shadow-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                Tasa Activa ({fuente.includes('manual') ? 'Manual' : 'BCV Oficial'})
              </span>
              <span className="text-sm font-black text-gray-900">
                Bs. {parseFloat(tasa || 45).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / $
              </span>
            </div>
            <div className="flex items-center gap-1 border-l border-purple-200 pl-2">
              <button
                onClick={handleSyncBCV}
                disabled={tasaCargando}
                title="Sincronizar en tiempo real con la tasa oficial del BCV"
                className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tasaCargando ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setNuevaTasaInput(tasa.toFixed(2));
                  setModalTasaOpen(true);
                }}
                title="Ajustar tasa manual del negocio"
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => handleOpenPagoModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-abby-700 hover:bg-abby-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-abby-700/20"
          >
            <Plus className="w-4 h-4" />
            Cobrar Pedido
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
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('caja')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'caja'
              ? 'border-abby-700 text-abby-700 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Arqueo de Caja Diario
        </button>
        <button
          onClick={() => setActiveTab('cuentas')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cuentas'
              ? 'border-abby-700 text-abby-700 font-bold'
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
              ? 'border-abby-700 text-abby-700 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Historial de Movimientos
        </button>
      </div>

      {/* TAB 1: ARQUEO DE CAJA DIARIO (VENEZUELA DUAL CURRENCY) */}
      {activeTab === 'caja' && (
        <div className="space-y-6">
          {/* Selector de fecha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Fecha del Arqueo / Cierre:</span>
              <input
                type="date"
                value={fechaCaja}
                onChange={(e) => setFechaCaja(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Tasa de referencia:{' '}
                <span className="font-bold text-gray-900">
                  Bs. {parseFloat(cierreData?.tasa_referencia || tasa || 45).toFixed(2)}
                </span>
              </span>
              <button
                onClick={fetchCierreCaja}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700 font-medium transition-colors"
              >
                Actualizar Caja
              </button>
            </div>
          </div>

          {/* Tarjetas KPI de Cierre en Moneda Dual */}
          {cierreData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Recaudado */}
              <div className="bg-gradient-to-br from-abby-800 to-purple-900 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Total Recaudado (Consolidado)
                </span>
                <p className="text-2xl font-black mt-2">
                  ${parseFloat(cierreData.total_recaudado_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </p>
                <p className="text-xs text-purple-200 font-semibold mt-1">
                  Bs. {parseFloat(cierreData.total_recaudado_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-purple-300 mt-2">
                  {cierreData.movimientos?.length || 0} movimiento(s) en la jornada
                </p>
              </div>

              {/* Efectivo Dólares */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Efectivo en Dólares ($)</span>
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${parseFloat(cierreData.total_efectivo_usd || 0).toFixed(2)} USD
                </p>
                <span className="text-xs text-gray-400">Billetes físicos USD en caja</span>
              </div>

              {/* Pago Móvil (Bs.) */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Pago Móvil (Bs.)</span>
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  Bs. {parseFloat(cierreData.total_pago_movil || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-xs text-purple-600 font-medium">
                  ≈ ${(parseFloat(cierreData.total_pago_movil || 0) / (tasa || 1)).toFixed(2)} USD
                </span>
              </div>

              {/* Zelle & Binance */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Zelle & Binance USD</span>
                  <Coins className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  ${(parseFloat(cierreData.total_zelle || 0) + parseFloat(cierreData.total_binance || 0)).toFixed(2)} USD
                </p>
                <div className="text-[11px] text-gray-500 mt-1 flex justify-between">
                  <span>Zelle: ${parseFloat(cierreData.total_zelle || 0).toFixed(2)}</span>
                  <span>Binance: ${parseFloat(cierreData.total_binance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Desglose por Método de Pago Venezolano */}
          {cierreData && cierreData.desglose_metodos && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Desglose Detallado por Métodos de Pago
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cierreData.desglose_metodos.map((dm) => (
                  <div key={dm.metodo} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      {getMetodoIcon(dm.metodo)}
                      <span className="truncate">{dm.nombre_legible}</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-black text-gray-900">
                        {dm.moneda_base === 'USD' ? `$${parseFloat(dm.total_usd).toFixed(2)} USD` : `Bs. ${parseFloat(dm.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {dm.cantidad} pago(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de movimientos de la jornada */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">
                Movimientos de Caja ({cierreData?.movimientos?.length || 0})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Cargando arqueo de caja...</div>
            ) : !cierreData || cierreData.movimientos.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Sin movimientos registrados para esta fecha</p>
                <p className="text-xs text-gray-400 mt-1">
                  Usa los botones superiores para registrar pagos de pedidos o abonos de clientes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Pedido / Comprobante</th>
                      <th className="px-4 py-3">Método & Banco</th>
                      <th className="px-4 py-3">Tasa Aplicada</th>
                      <th className="px-4 py-3 text-right">Monto ($ USD)</th>
                      <th className="px-4 py-3 text-right">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cierreData.movimientos.map((m) => (
                      <tr key={`${m.tipo}-${m.id}`} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              m.tipo === 'pago_pedido'
                                ? 'bg-purple-50 text-purple-700'
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
                            <span className="font-semibold text-purple-700">Pedido #{m.pedido_id}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">Abono General</span>
                          )}
                          {m.referencia && (
                            <p className="text-xs text-gray-500 font-mono">Ref: {m.referencia}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                            {getMetodoIcon(m.metodo)}
                            {getMetodoNombre(m.metodo)}
                          </span>
                          {m.banco && (
                            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{m.banco}</p>
                          )}
                          {m.telefono && (
                            <p className="text-[10px] text-gray-400">Tel: {m.telefono}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          Bs. {parseFloat(m.tasa_cambio).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          ${parseFloat(m.monto_usd).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-700">
                          Bs. {parseFloat(m.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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

      {/* TAB 2: CUENTAS POR COBRAR (EXPRESADAS EN USD & BS) */}
      {activeTab === 'cuentas' && (
        <div className="space-y-6">
          {/* Buscador de Cartera */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre o cédula/RIF..."
                value={searchCartera}
                onChange={(e) => setSearchCartera(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-500 font-medium">Total Cartera Pendiente:</span>
              <p className="text-lg font-black text-red-600 leading-tight">
                $
                {cuentas
                  .reduce((acc, c) => acc + parseFloat(c.saldo_pendiente_global || 0), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                USD
              </p>
              <span className="text-xs font-semibold text-gray-500">
                ≈ Bs.{' '}
                {cuentas
                  .reduce((acc, c) => acc + parseFloat(c.saldo_pendiente_bs || (c.saldo_pendiente_global * tasa) || 0), 0)
                  .toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
                  Todos los clientes tienen sus saldos cancelados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Deuda ($ USD)</th>
                      <th className="px-4 py-3">Equivalente (Bs.)</th>
                      <th className="px-4 py-3">Límite Crédito ($)</th>
                      <th className="px-4 py-3">Uso Cupo</th>
                      <th className="px-4 py-3">Riesgo</th>
                      <th className="px-4 py-3">Pedidos</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCuentas.map((c) => (
                      <tr key={c.cliente_id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{c.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">
                            RIF/CI: {c.documento} {c.telefono && `• Tel: ${c.telefono}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-bold text-red-600">
                          ${parseFloat(c.saldo_pendiente_global).toFixed(2)} USD
                        </td>
                        <td className="px-4 py-3 font-semibold text-purple-700">
                          Bs. {parseFloat(c.saldo_pendiente_bs || (c.saldo_pendiente_global * tasa)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-medium">
                          ${parseFloat(c.credito_maximo).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
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
                              <AlertTriangle className="w-3 h-3" /> Alerta
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
                            className="px-3 py-1.5 bg-purple-50 text-abby-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors"
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
                <h3 className="font-bold text-gray-900 text-sm">Pagos de Pedidos Realizados</h3>
                <span className="text-xs bg-purple-100 text-abby-800 font-semibold px-2 py-0.5 rounded-full">
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
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <span className="font-medium text-gray-800">{getMetodoNombre(p.metodo)}</span>
                          {p.banco && <span>• {p.banco}</span>}
                          {p.referencia && <span className="font-mono text-gray-400">Ref: {p.referencia}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 text-base">
                          +${parseFloat(p.monto_usd || p.monto).toFixed(2)} USD
                        </span>
                        <p className="text-xs text-purple-700 font-medium mt-0.5">
                          Bs. {parseFloat(p.monto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Tasa: {parseFloat(p.tasa_cambio || 1).toFixed(2)}
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
                        <p className="text-xs text-gray-600 mt-0.5">
                          {getMetodoNombre(a.metodo)} {a.referencia && `• Ref: ${a.referencia}`}
                        </p>
                        {a.notas && <p className="text-xs text-gray-400 italic mt-0.5">"{a.notas}"</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 text-base">
                          +${parseFloat(a.monto_usd || a.monto).toFixed(2)} USD
                        </span>
                        <p className="text-xs text-purple-700 font-medium mt-0.5">
                          Bs. {parseFloat(a.monto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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

      {/* MODAL 1: REGISTRAR PAGO A PEDIDO (DUAL MONEDA & VENEZUELA) */}
      {modalPagoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-abby-700" />
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
              {/* Selector de Pedido */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Seleccionar Pedido Pendiente *
                </label>
                <select
                  required
                  value={formPago.pedido_id}
                  onChange={(e) => setFormPago({ ...formPago, pedido_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">-- Seleccione un pedido --</option>
                  {pedidosPendientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      Pedido #{p.id} - {p.cliente?.nombre || 'Cliente'} (Saldo: ${parseFloat(p.saldo_pendiente).toFixed(2)} USD)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPedidoObj && (
                <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total del Pedido:</span>
                    <span className="font-bold text-gray-900">
                      ${parseFloat(selectedPedidoObj.total).toFixed(2)} USD (Bs. {(parseFloat(selectedPedidoObj.total) * activeRatePago).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Anticipo Pagado:</span>
                    <span className="font-semibold text-emerald-700">
                      ${parseFloat(selectedPedidoObj.anticipo).toFixed(2)} USD ({selectedPedidoObj.porcentaje_anticipo}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo Pendiente:</span>
                    <span className="font-bold text-red-600">
                      ${parseFloat(selectedPedidoObj.saldo_pendiente).toFixed(2)} USD (Bs. {(parseFloat(selectedPedidoObj.saldo_pendiente) * activeRatePago).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                  {selectedPedidoObj.estado === 'borrador' && (
                    <p className="text-[11px] text-amber-700 font-medium mt-1">
                      ⚠️ Requiere un anticipo mínimo del 30% (${(parseFloat(selectedPedidoObj.total) * 0.3).toFixed(2)} USD) para desbloquear a producción.
                    </p>
                  )}
                </div>
              )}

              {/* Selector de Moneda de Pago */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Moneda de Pago del Cliente *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormPago({ ...formPago, moneda_pago: 'USD', metodo: 'efectivo_usd' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formPago.moneda_pago === 'USD'
                        ? 'border-abby-700 bg-purple-50 text-abby-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Dólares ($ USD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPago({ ...formPago, moneda_pago: 'BS', metodo: 'pago_movil' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formPago.moneda_pago === 'BS'
                        ? 'border-abby-700 bg-purple-50 text-abby-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-600" />
                    Bolívares (Bs.)
                  </button>
                </div>
              </div>

              {/* Métodos de Pago Venezolanos */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Método de Pago *
                </label>
                <select
                  value={formPago.metodo}
                  onChange={(e) => setFormPago({ ...formPago, metodo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {formPago.moneda_pago === 'BS' ? (
                    <>
                      <option value="pago_movil">📱 Pago Móvil (Bs.)</option>
                      <option value="transferencia_bs">🏦 Transferencia Bancaria (Bs.)</option>
                      <option value="punto_venta">💳 Punto de Venta / Biopago</option>
                      <option value="efectivo_bs">💵 Efectivo Bolívares (Bs.)</option>
                      <option value="otro">Otro Método en Bs.</option>
                    </>
                  ) : (
                    <>
                      <option value="efectivo_usd">💵 Efectivo Dólares ($ USD)</option>
                      <option value="zelle">⚡ Zelle ($ USD)</option>
                      <option value="binance">🪙 Binance Pay / USDT</option>
                      <option value="otro">Otro Método en USD (Zinli, Wally, etc.)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Monto y Tasa de Cambio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Monto Entregado ({formPago.moneda_pago === 'BS' ? 'Bs.' : '$ USD'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder={formPago.moneda_pago === 'BS' ? 'Ej: 5000.00' : 'Ej: 50.00'}
                    value={formPago.monto}
                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tasa de Cambio (Bs/$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPago.tasa_cambio}
                    onChange={(e) => setFormPago({ ...formPago, tasa_cambio: e.target.value })}
                    placeholder="45.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Conversión en tiempo real */}
              {montoInputPago > 0 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
                  <div className="flex justify-between font-bold">
                    <span>Equivalente en Dólares ($):</span>
                    <span className="text-emerald-700">${montoEquivUSDPago.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Equivalente en Bolívares (Bs.):</span>
                    <span className="text-purple-700">Bs. {montoEquivBsPago.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    ℹ️ Se amortizarán <span className="font-bold text-gray-900">${montoEquivUSDPago.toFixed(2)} USD</span> de la deuda del pedido.
                  </p>
                </div>
              )}

              {/* Campos específicos según método */}
              {(formPago.metodo === 'pago_movil' || formPago.metodo === 'transferencia_bs') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Banco Emisor / Receptor
                  </label>
                  <select
                    value={formPago.banco}
                    onChange={(e) => setFormPago({ ...formPago, banco: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">-- Seleccionar Banco --</option>
                    {BANCOS_VENEZUELA.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {formPago.metodo === 'pago_movil' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Teléfono del Pago Móvil
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-1234567"
                    value={formPago.telefono}
                    onChange={(e) => setFormPago({ ...formPago, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}

              {formPago.metodo !== 'efectivo_usd' && formPago.metodo !== 'efectivo_bs' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Número de Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 458920 (últimos 4 o 6 dígitos)"
                    value={formPago.referencia}
                    onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                  />
                </div>
              )}

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
                  className="px-5 py-2 bg-abby-700 hover:bg-abby-800 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Procesar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO A CRÉDITO (DUAL MONEDA & VENEZUELA) */}
      {modalAbonoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
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
                      {c.nombre} (Deuda: ${parseFloat(c.saldo_pendiente_global).toFixed(2)} USD)
                    </option>
                  ))}
                </select>
              </div>

              {selectedClienteObj && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cupo de Crédito Máximo:</span>
                    <span className="font-bold text-gray-900">
                      ${parseFloat(selectedClienteObj.credito_maximo).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deuda Global Pendiente:</span>
                    <span className="font-bold text-red-600">
                      ${parseFloat(selectedClienteObj.saldo_pendiente_global).toFixed(2)} USD (Bs. {(parseFloat(selectedClienteObj.saldo_pendiente_global) * activeRateAbono).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>
              )}

              {/* Selector de Moneda de Pago */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Moneda de Pago *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormAbono({ ...formAbono, moneda_pago: 'USD', metodo: 'efectivo_usd' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formAbono.moneda_pago === 'USD'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Dólares ($ USD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAbono({ ...formAbono, moneda_pago: 'BS', metodo: 'pago_movil' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formAbono.moneda_pago === 'BS'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-600" />
                    Bolívares (Bs.)
                  </button>
                </div>
              </div>

              {/* Método */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Método de Pago *
                </label>
                <select
                  value={formAbono.metodo}
                  onChange={(e) => setFormAbono({ ...formAbono, metodo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {formAbono.moneda_pago === 'BS' ? (
                    <>
                      <option value="pago_movil">📱 Pago Móvil (Bs.)</option>
                      <option value="transferencia_bs">🏦 Transferencia Bancaria (Bs.)</option>
                      <option value="punto_venta">💳 Punto de Venta / Biopago</option>
                      <option value="efectivo_bs">💵 Efectivo Bolívares (Bs.)</option>
                      <option value="otro">Otro Método en Bs.</option>
                    </>
                  ) : (
                    <>
                      <option value="efectivo_usd">💵 Efectivo Dólares ($ USD)</option>
                      <option value="zelle">⚡ Zelle ($ USD)</option>
                      <option value="binance">🪙 Binance Pay / USDT</option>
                      <option value="otro">Otro Método en USD</option>
                    </>
                  )}
                </select>
              </div>

              {/* Monto y Tasa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Monto del Abono ({formAbono.moneda_pago === 'BS' ? 'Bs.' : '$ USD'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder={formAbono.moneda_pago === 'BS' ? 'Ej: 2000.00' : 'Ej: 50.00'}
                    value={formAbono.monto}
                    onChange={(e) => setFormAbono({ ...formAbono, monto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tasa de Cambio (Bs/$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAbono.tasa_cambio}
                    onChange={(e) => setFormAbono({ ...formAbono, tasa_cambio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {montoInputAbono > 0 && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                  <div className="flex justify-between font-bold">
                    <span>Equivalente en Dólares ($):</span>
                    <span>${montoEquivUSDAbono.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Equivalente en Bolívares (Bs.):</span>
                    <span>Bs. {montoEquivBsAbono.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {(formAbono.metodo === 'pago_movil' || formAbono.metodo === 'transferencia_bs') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Banco
                  </label>
                  <select
                    value={formAbono.banco}
                    onChange={(e) => setFormAbono({ ...formAbono, banco: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- Seleccionar Banco --</option>
                    {BANCOS_VENEZUELA.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Referencia / Comprobante
                </label>
                <input
                  type="text"
                  placeholder="Ej: 994821"
                  value={formAbono.referencia}
                  onChange={(e) => setFormAbono({ ...formAbono, referencia: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej: Abono correspondiente a la semana..."
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

      {/* MODAL 3: AJUSTE MANUAL DE TASA DE CAMBIO */}
      {modalTasaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-lg">Ajustar Tasa de Cambio</h3>
              </div>
              <button
                onClick={() => setModalTasaOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarTasaManual} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Nueva Tasa en Bolívares por Dólar (Bs/$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="Ej: 50.50"
                  value={nuevaTasaInput}
                  onChange={(e) => setNuevaTasaInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Motivo o Justificación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Tasa interna de facturación del día"
                  value={motivoTasaInput}
                  onChange={(e) => setMotivoTasaInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
                💡 Esta tasa se aplicará para convertir los cobros en Bolívares a Dólares y para mostrar los precios en Bs.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalTasaOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Guardar Tasa Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
