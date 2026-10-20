import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Factory,
  Scissors,
  Printer,
  Shirt,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  User,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Play,
  RotateCcw
} from 'lucide-react';

export default function Produccion() {
  const { user } = useAuthStore();
  const [tablero, setTablero] = useState({ corte: [], impresion: [], confeccion: [] });
  const [pedidos, setPedidos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Escáner QR Rápido
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState('');
  const [escaneando, setEscaneando] = useState(false);

  // Modal Nueva Orden
  const [modalOpen, setModalOpen] = useState(false);
  const [etapaActiva, setEtapaActiva] = useState('corte'); // 'corte', 'impresion', 'confeccion'
  const [selectedLineaId, setSelectedLineaId] = useState('');
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');
  const [cantidad, setCantidad] = useState(10);
  const [costoUnitario, setCostoUnitario] = useState('1500');
  const [tecnicaImpresion, setTecnicaImpresion] = useState('dtf');
  const [etapaImpresion, setEtapaImpresion] = useState('antes_costura');
  const [observaciones, setObservaciones] = useState('');

  const fetchTablero = async () => {
    setLoading(true);
    try {
      const [tabRes, pedRes] = await Promise.all([
        api.get('/produccion/tablero'),
        api.get('/pedidos'),
      ]);
      setTablero(tabRes.data);
      setPedidos(pedRes.data);
    } catch (err) {
      setErrorMsg('Error al cargar datos del tablero de producción');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrabajadoresMock = async () => {
    // Para la semana 4, proveer lista base de trabajadores
    setTrabajadores([
      { id: 1, nombre: 'Carlos Andrés (Cortador)', tipo: 'cortador' },
      { id: 2, nombre: 'Ana María (Técnica DTF/Bordado)', tipo: 'tecnico' },
      { id: 3, nombre: 'Pedro Gómez (Operario Confección)', tipo: 'operario' },
      { id: 4, nombre: 'Martha Lucía (Operaria Confección)', tipo: 'operario' },
    ]);
  };

  useEffect(() => {
    fetchTablero();
    fetchTrabajadoresMock();
  }, []);

  const handleEscanearQR = async (e) => {
    e.preventDefault();
    if (!codigoEscaneado.trim()) return;
    if (!trabajadorSeleccionado) {
      setErrorMsg('Debe seleccionar el trabajador asignado para registrar el escaneo QR');
      return;
    }

    setEscaneando(true);
    setErrorMsg('');
    try {
      const res = await api.post('/produccion/escanear-qr', {
        codigo_rastreo_unico: codigoEscaneado.trim().toUpperCase(),
        trabajador_id: parseInt(trabajadorSeleccionado),
      });

      setSuccessMsg(
        `¡${res.data.etapa_completada} Registrada! ${res.data.mensaje} (+$${Number(res.data.monto_generado).toFixed(2)})`
      );
      setCodigoEscaneado('');
      fetchTablero();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al procesar escaneo QR');
    } finally {
      setEscaneando(false);
    }
  };

  const handleTerminarCorte = async (id) => {
    try {
      await api.put(`/produccion/corte/${id}/terminar`);
      setSuccessMsg('Corte marcado como terminado. Prenda habilitada para confección/impresión.');
      fetchTablero();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al terminar corte');
    }
  };

  const handleTerminarImpresion = async (id) => {
    try {
      await api.put(`/produccion/impresion/${id}/terminar`);
      setSuccessMsg('Impresión/Bordado terminado');
      fetchTablero();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al terminar impresión');
    }
  };

  const handleTerminarConfeccion = async (id) => {
    try {
      await api.put(`/produccion/confeccion/${id}/terminar`);
      setSuccessMsg('Confección completada. Prenda avanza a control de calidad.');
      fetchTablero();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al terminar confección');
    }
  };

  // Extraer todas las líneas de pedidos activos para el modal
  const lineasDisponibles = pedidos
    .filter((p) => p.estado !== 'borrador' && p.estado !== 'cancelado')
    .flatMap((p) =>
      p.lineas.map((l) => ({
        ...l,
        pedidoNumero: p.id,
        clienteNombre: p.cliente?.nombre || 'Cliente',
      }))
    );

  const handleCreateOrden = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedLineaId) {
      setErrorMsg('Seleccione una prenda de pedido');
      return;
    }
    if (!selectedTrabajadorId) {
      setErrorMsg('Seleccione un trabajador responsable');
      return;
    }

    try {
      if (etapaActiva === 'corte') {
        await api.post('/produccion/corte', {
          linea_pedido_id: parseInt(selectedLineaId),
          cortador_id: parseInt(selectedTrabajadorId),
          cantidad_piezas: parseInt(cantidad),
          costo_unitario: parseFloat(costoUnitario) || 1500,
          observaciones,
        });
        setSuccessMsg('Orden de corte iniciada');
      } else if (etapaActiva === 'impresion') {
        await api.post('/produccion/impresion', {
          linea_pedido_id: parseInt(selectedLineaId),
          tecnico_id: parseInt(selectedTrabajadorId),
          tecnica: tecnicaImpresion,
          cantidad: parseInt(cantidad),
          costo_unitario: parseFloat(costoUnitario) || 3000,
          etapa: etapaImpresion,
          observaciones,
        });
        setSuccessMsg('Orden de impresión/estampado iniciada');
      } else if (etapaActiva === 'confeccion') {
        await api.post('/produccion/confeccion', {
          linea_pedido_id: parseInt(selectedLineaId),
          operador_id: parseInt(selectedTrabajadorId),
          cantidad_prendas: parseInt(cantidad),
          costo_unitario: parseFloat(costoUnitario) || 5000,
          observaciones,
        });
        setSuccessMsg('Orden de confección iniciada');
      }

      setModalOpen(false);
      fetchTablero();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al iniciar la orden de producción');
    }
  };

  const formatUSD = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Factory className="text-blue-600" size={28} />
            <span>Producción Textil por Etapas (Kanban)</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Flujo secuencial estricto: Corte ➔ Impresión (DTF/Bordado) ➔ Confección con validación de códigos QR.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedLineaId('');
            setSelectedTrabajadorId('');
            setObservaciones('');
            setErrorMsg('');
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Nueva Orden de Etapa</span>
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Escáner Rápido de Código de Rastreo QR */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <QrCode className="text-amber-400" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Puesto de Escaneo de Prenda en Taller (QR / Código de Rastreo)
            </h2>
          </div>
          <span className="text-[11px] text-blue-200">
            Escanea con lector láser o escribe el código y presiona Enter
          </span>
        </div>

        <form onSubmit={handleEscanearQR} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <select
              required
              value={trabajadorSeleccionado}
              onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">-- Seleccionar Trabajador en Turno --</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6">
            <input
              type="text"
              placeholder="Ej: RAS-PED1-CAMOXF-BLA-M-01"
              value={codigoEscaneado}
              onChange={(e) => setCodigoEscaneado(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/90 border border-slate-700 text-white rounded-xl text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={escaneando}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Play size={14} />
              <span>{escaneando ? 'Validando...' : 'Registrar QR'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tablero Kanban (3 Columnas de Producción) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Mesa de Corte */}
        <div className="bg-gray-100/70 p-4 rounded-2xl border border-gray-200 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Scissors size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">1. Mesa de Corte</h3>
                <p className="text-[11px] text-gray-500">Primera etapa obligatoria</p>
              </div>
            </div>
            <span className="font-bold text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
              {tablero.corte.length}
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
            {tablero.corte.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {c.linea_pedido?.codigo_rastreo_unico || `Corte #${c.id}`}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      c.estado === 'terminado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.estado.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-sm text-gray-800">
                    Pedido #{c.pedido_id} · {c.cantidad_piezas} piezas cortadas
                  </p>
                  <p className="text-xs text-gray-500">
                    SKU: {c.linea_pedido?.variante?.sku_unico} ({c.linea_pedido?.variante?.talla} - {c.linea_pedido?.variante?.color})
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <User size={12} /> {c.cortador?.nombre || 'Cortador'}
                  </span>
                  <span className="font-bold text-gray-800">{formatUSD(c.total)}</span>
                </div>

                {c.estado !== 'terminado' && (
                  <button
                    onClick={() => handleTerminarCorte(c.id)}
                    className="w-full mt-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={14} />
                    <span>Marcar Corte Terminado</span>
                  </button>
                )}
              </div>
            ))}

            {tablero.corte.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                No hay órdenes de corte activas.
              </div>
            )}
          </div>
        </div>

        {/* Columna 2: Taller de Impresión & Bordado */}
        <div className="bg-gray-100/70 p-4 rounded-2xl border border-gray-200 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">2. Impresión / Bordado</h3>
                <p className="text-[11px] text-gray-500">DTF, Sublimación, Bordado</p>
              </div>
            </div>
            <span className="font-bold text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
              {tablero.impresion.length}
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
            {tablero.impresion.map((imp) => (
              <div
                key={imp.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {imp.tecnica}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      imp.estado === 'terminado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {imp.estado.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-sm text-gray-800">
                    Pedido #{imp.pedido_id} · {imp.cantidad} unidades ({imp.etapa.replace('_', ' ')})
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {imp.linea_pedido?.codigo_rastreo_unico}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <User size={12} /> {imp.tecnico?.nombre || 'Técnico'}
                  </span>
                  <span className="font-bold text-gray-800">{formatUSD(imp.total)}</span>
                </div>

                {imp.estado !== 'terminado' && (
                  <button
                    onClick={() => handleTerminarImpresion(imp.id)}
                    className="w-full mt-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={14} />
                    <span>Marcar Impresión Terminada</span>
                  </button>
                )}
              </div>
            ))}

            {tablero.impresion.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                No hay órdenes de impresión activas.
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Taller de Confección */}
        <div className="bg-gray-100/70 p-4 rounded-2xl border border-gray-200 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Shirt size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">3. Confección & Ensamble</h3>
                <p className="text-[11px] text-gray-500">Costura de piezas cortadas</p>
              </div>
            </div>
            <span className="font-bold text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
              {tablero.confeccion.length}
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
            {tablero.confeccion.map((conf) => (
              <div
                key={conf.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {conf.linea_pedido?.codigo_rastreo_unico || `Conf #${conf.id}`}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      conf.estado === 'terminado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {conf.estado.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-sm text-gray-800">
                    Pedido #{conf.pedido_id} · {conf.cantidad_prendas} prendas confeccionadas
                  </p>
                  <p className="text-xs text-gray-500">
                    Variante: {conf.linea_pedido?.variante?.sku_unico}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <User size={12} /> {conf.operador?.nombre || 'Operador'}
                  </span>
                  <span className="font-bold text-gray-800">{formatUSD(conf.total)}</span>
                </div>

                {conf.estado !== 'terminado' && (
                  <button
                    onClick={() => handleTerminarConfeccion(conf.id)}
                    className="w-full mt-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={14} />
                    <span>Marcar Confección Terminada</span>
                  </button>
                )}
              </div>
            ))}

            {tablero.confeccion.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                No hay órdenes de confección activas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Orden de Etapa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                Iniciar Orden de Producción
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Pestañas de Etapa */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setEtapaActiva('corte');
                  setCostoUnitario('1500');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                  etapaActiva === 'corte'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Scissors size={14} />
                <span>1. Corte</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEtapaActiva('impresion');
                  setCostoUnitario('3000');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                  etapaActiva === 'impresion'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Printer size={14} />
                <span>2. Impresión</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEtapaActiva('confeccion');
                  setCostoUnitario('5000');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                  etapaActiva === 'confeccion'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Shirt size={14} />
                <span>3. Confección</span>
              </button>
            </div>

            <form onSubmit={handleCreateOrden} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">
                  Prenda / Línea de Pedido *
                </label>
                <select
                  required
                  value={selectedLineaId}
                  onChange={(e) => {
                    setSelectedLineaId(e.target.value);
                    const sel = lineasDisponibles.find((l) => l.id === parseInt(e.target.value));
                    if (sel) setCantidad(sel.cantidad);
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                >
                  <option value="">-- Seleccionar prenda a procesar --</option>
                  {lineasDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>
                      [Pedido #{l.pedidoNumero}] {l.codigo_rastreo_unico} ({l.cantidad} unids - Estado: {l.estado_produccion})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">
                  Trabajador Responsable *
                </label>
                <select
                  required
                  value={selectedTrabajadorId}
                  onChange={(e) => setSelectedTrabajadorId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Asignar operario/técnico/cortador --</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {etapaActiva === 'impresion' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-gray-700 mb-1">Técnica *</label>
                    <select
                      value={tecnicaImpresion}
                      onChange={(e) => setTecnicaImpresion(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      <option value="dtf">DTF</option>
                      <option value="sublimacion">Sublimación</option>
                      <option value="serigrafia">Serigrafía</option>
                      <option value="bordado">Bordado</option>
                      <option value="vinilo">Vinilo Térmico</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-gray-700 mb-1">Momento *</label>
                    <select
                      value={etapaImpresion}
                      onChange={(e) => setEtapaImpresion(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      <option value="antes_costura">Antes de Costura (Exige Corte)</option>
                      <option value="despues_costura">Después de Costura</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-gray-700 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-gray-700 mb-1">Costo Unitario (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Instrucciones específicas..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  Iniciar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
