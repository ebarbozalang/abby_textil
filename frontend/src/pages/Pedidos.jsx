import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTasaStore, formatUSD, formatBS } from '../store/tasaStore';
import {
  ShoppingBag,
  Search,
  Plus,
  QrCode,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Trash2,
  Layers,
  History,
  Tag
} from 'lucide-react';

export default function Pedidos() {
  const { user } = useAuthStore();
  const { tasa } = useTasaStore();
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Nuevo Pedido
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [anticipo, setAnticipo] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [notas, setNotas] = useState('');

  // Modal Detalle / Trazabilidad
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activePedido, setActivePedido] = useState(null);

  const estadosPedido = [
    { value: '', label: 'Todos los Estados' },
    { value: 'borrador', label: 'Borrador (<30% ant)' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'pendiente_corte', label: 'Pendiente Corte' },
    { value: 'en_corte', label: 'En Corte' },
    { value: 'pendiente_impresion', label: 'Pendiente Impresión' },
    { value: 'en_impresion', label: 'En Impresión' },
    { value: 'pendiente_confeccion', label: 'Pendiente Confección' },
    { value: 'en_confeccion', label: 'En Confección' },
    { value: 'control_calidad', label: 'Control Calidad' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      let url = '/pedidos?';
      if (selectedEstado) url += `estado=${selectedEstado}&`;
      if (search) url += `q=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      setPedidos(res.data);
    } catch (err) {
      setErrorMsg('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [cliRes, prodRes] = await Promise.all([
        api.get('/clientes?solo_activos=true'),
        api.get('/productos?solo_activos=true'),
      ]);
      setClientes(cliRes.data);
      setProductos(prodRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPedidos();
    }, 300);
    return () => clearTimeout(delay);
  }, [search, selectedEstado]);

  const handleOpenNewModal = () => {
    setSelectedCliente(null);
    setLineas([
      {
        productoId: '',
        varianteId: '',
        cantidad: 10,
        precioUnitario: 0,
        skuUnico: '',
      },
    ]);
    setDescuento(0);
    setAnticipo(0);
    setFechaEntrega('');
    setNotas('');
    setErrorMsg('');
    setNewModalOpen(true);
  };

  const handleAddLinea = () => {
    setLineas([
      ...lineas,
      {
        productoId: '',
        varianteId: '',
        cantidad: 10,
        precioUnitario: 0,
        skuUnico: '',
      },
    ]);
  };

  const handleRemoveLinea = (index) => {
    if (lineas.length === 1) return;
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const handleProductoChange = (index, prodId) => {
    const prod = productos.find((p) => p.id === parseInt(prodId));
    const firstVar = prod?.variantes?.[0];
    const updated = [...lineas];
    updated[index] = {
      productoId: prodId,
      varianteId: firstVar ? firstVar.id : '',
      cantidad: updated[index].cantidad || 10,
      precioUnitario: prod ? parseFloat(prod.precio_base) : 0,
      skuUnico: firstVar ? firstVar.sku_unico : '',
    };
    setLineas(updated);
  };

  const handleVarianteChange = (index, varId) => {
    const updated = [...lineas];
    const prod = productos.find((p) => p.id === parseInt(updated[index].productoId));
    const variante = prod?.variantes?.find((v) => v.id === parseInt(varId));
    updated[index].varianteId = varId;
    updated[index].skuUnico = variante ? variante.sku_unico : '';
    setLineas(updated);
  };

  const handleCantidadChange = (index, val) => {
    const updated = [...lineas];
    updated[index].cantidad = Math.max(1, parseInt(val) || 1);
    setLineas(updated);
  };

  const handlePrecioChange = (index, val) => {
    const updated = [...lineas];
    updated[index].precioUnitario = Math.max(0, parseFloat(val) || 0);
    setLineas(updated);
  };

  // Cálculos en vivo
  const subtotalCalculado = lineas.reduce(
    (acc, l) => acc + (l.cantidad * l.precioUnitario),
    0
  );
  const totalCalculado = Math.max(0, subtotalCalculado - (parseFloat(descuento) || 0));
  const anticipoFloat = parseFloat(anticipo) || 0;
  const saldoPendienteCalculado = Math.max(0, totalCalculado - anticipoFloat);
  const porcentajeAnticipo = totalCalculado > 0 ? (anticipoFloat / totalCalculado) * 100 : 100;
  const anticipoMinimo30 = totalCalculado * 0.3;

  // Validación de cupo de crédito del cliente
  const nuevoSaldoGlobalCliente = selectedCliente
    ? parseFloat(selectedCliente.saldo_pendiente_global) + saldoPendienteCalculado
    : 0;
  const excedeCredito = selectedCliente
    ? nuevoSaldoGlobalCliente > parseFloat(selectedCliente.credito_maximo)
    : false;

  const handleCreatePedido = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCliente) {
      setErrorMsg('Debe seleccionar un cliente para el pedido');
      return;
    }

    const lineasPayload = lineas
      .filter((l) => l.varianteId && l.cantidad > 0)
      .map((l) => ({
        variante_id: parseInt(l.varianteId),
        cantidad: parseInt(l.cantidad),
        precio_unitario: parseFloat(l.precioUnitario),
      }));

    if (lineasPayload.length === 0) {
      setErrorMsg('Debe agregar al menos una prenda/variante válida con cantidad mayor a 0');
      return;
    }

    try {
      const payload = {
        cliente_id: selectedCliente.id,
        descuento: parseFloat(descuento) || 0,
        anticipo: anticipoFloat,
        fecha_entrega_estimada: fechaEntrega || null,
        notas: notas || null,
        lineas: lineasPayload,
      };

      const res = await api.post('/pedidos', payload);
      setSuccessMsg(`Pedido #${res.data.id} creado exitosamente (${res.data.estado})`);
      setNewModalOpen(false);
      fetchPedidos();
      fetchAuxData(); // Para actualizar saldo cliente
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear el pedido');
    }
  };

  const handleViewDetail = async (pedidoId) => {
    try {
      const res = await api.get(`/pedidos/${pedidoId}`);
      setActivePedido(res.data);
      setDetailModalOpen(true);
    } catch (err) {
      setErrorMsg('Error al obtener detalle del pedido');
    }
  };

  const handleChangeEstado = async (pedidoId, nuevoEstado) => {
    try {
      await api.put(`/pedidos/${pedidoId}/estado`, {
        nuevo_estado: nuevoEstado,
        observacion: `Avance a ${nuevoEstado} desde el listado`,
      });
      setSuccessMsg(`Pedido #${pedidoId} actualizado a ${nuevoEstado}`);
      fetchPedidos();
      if (activePedido && activePedido.id === pedidoId) {
        const updated = await api.get(`/pedidos/${pedidoId}`);
        setActivePedido(updated.data);
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al cambiar de estado');
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'borrador':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">Borrador (Falta Ant)</span>;
      case 'confirmado':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">Confirmado</span>;
      case 'pendiente_corte':
      case 'en_corte':
        return <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">Corte</span>;
      case 'pendiente_confeccion':
      case 'en_confeccion':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">Confección</span>;
      case 'terminado':
      case 'entregado':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">{estado}</span>;
      case 'cancelado':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-red-200">Cancelado</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize">{estado.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-blue-600" size={28} />
            <span>Ventas & Pedidos de Fabricación</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pedidos bajo pedido con validación de anticipo mínimo (30%), cupo de crédito y códigos de rastreo único.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Nuevo Pedido</span>
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

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          <Search size={20} className="text-gray-400 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por # Pedido o notas..."
            className="w-full bg-transparent border-none text-sm focus:outline-none text-gray-800"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center">
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-semibold text-gray-700 focus:outline-none"
          >
            {estadosPedido.map((est) => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No se encontraron pedidos registrados con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Pedido / Fecha</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Anticipo</th>
                  <th className="py-3.5 px-4">Saldo Pendiente</th>
                  <th className="py-3.5 px-4 text-right">Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-blue-600 font-mono text-sm">
                        #{p.id}
                      </span>
                      <p className="text-xs text-gray-400">{p.fecha}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{p.cliente?.nombre || `Cliente #${p.cliente_id}`}</p>
                      <p className="text-xs text-gray-400">{p.cliente?.documento}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      {getEstadoBadge(p.estado)}
                    </td>

                    <td className="py-3.5 px-4 font-black text-gray-900 leading-tight">
                      <div>{formatUSD(p.total)}</div>
                      <div className="text-xs font-semibold text-purple-700">{formatBS(p.total, tasa)}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-700">{formatUSD(p.anticipo)}</span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            p.cumple_anticipo_minimo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.porcentaje_anticipo.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        {formatBS(p.anticipo, tasa)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className={`font-bold ${parseFloat(p.saldo_pendiente) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {formatUSD(p.saldo_pendiente)}
                      </div>
                      <div className="text-xs font-semibold text-purple-700">
                        {formatBS(p.saldo_pendiente, tasa)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewDetail(p.id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <QrCode size={14} />
                        <span>Prendas & QR</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Pedido */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 animate-scale-in max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="text-blue-600" size={22} />
                  <span>Crear Nuevo Pedido de Confección</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Regla de negocio: Anticipo mínimo obligatorio del 30% y control de cupo de crédito.
                </p>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePedido} className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Selección de Cliente y Estado de Cupo */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                  1. Seleccionar Cliente *
                </label>
                <select
                  required
                  value={selectedCliente?.id || ''}
                  onChange={(e) => {
                    const c = clientes.find((cli) => cli.id === parseInt(e.target.value));
                    setSelectedCliente(c || null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="">-- Seleccione un cliente registrado --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} (Doc: {c.documento}) — Cupo: {formatUSD(c.credito_maximo)}
                    </option>
                  ))}
                </select>

                {selectedCliente && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-3 border-t border-gray-200">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-400">Cupo Máximo:</span>
                      <p className="font-bold text-gray-800 text-sm">{formatUSD(selectedCliente.credito_maximo)}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-400">Saldo Pendiente Actual:</span>
                      <p className="font-bold text-amber-600 text-sm">{formatUSD(selectedCliente.saldo_pendiente_global)}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-400">Cupo Disponible:</span>
                      <p className="font-bold text-emerald-600 text-sm">{formatUSD(selectedCliente.credito_disponible)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selección de Prendas & Variantes (Trazabilidad) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-gray-700">
                    2. Prendas, Tallas y Colores (SKU Único) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLinea}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Agregar Otra Prenda</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lineas.map((l, idx) => {
                    const prodSelected = productos.find((p) => p.id === parseInt(l.productoId));
                    const variantesDisponibles = prodSelected?.variantes || [];

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        {/* Selector Producto */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Producto</label>
                          <select
                            required
                            value={l.productoId}
                            onChange={(e) => handleProductoChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Seleccione prenda...</option>
                            {productos.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.codigo}] {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Variante (Color + Talla) */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Color / Talla / SKU</label>
                          <select
                            required
                            disabled={!l.productoId}
                            value={l.varianteId}
                            onChange={(e) => handleVarianteChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-semibold focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="">Seleccione variante...</option>
                            {variantesDisponibles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.talla} - {v.color} ({v.sku_unico})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Cantidad */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={l.cantidad}
                            onChange={(e) => handleCantidadChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center"
                          />
                        </div>

                        {/* Precio Unitario */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Precio Unit</label>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={l.precioUnitario}
                            onChange={(e) => handlePrecioChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-right"
                          />
                        </div>

                        {/* Botón eliminar */}
                        <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveLinea(idx)}
                            disabled={lineas.length === 1}
                            className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cálculos Financieros y Anticipo Obligatorio */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                <label className="block text-xs font-bold uppercase text-gray-700">
                  3. Liquidación Financiera del Pedido
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Subtotal ($ USD):</span>
                    <p className="font-bold text-gray-800 text-base">{formatUSD(subtotalCalculado)}</p>
                    <span className="text-[11px] text-purple-700 font-semibold">{formatBS(subtotalCalculado, tasa)}</span>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-0.5">Descuento ($ USD):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={descuento}
                      onChange={(e) => setDescuento(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <span className="text-gray-500">Total a Pagar ($ USD):</span>
                    <p className="font-black text-gray-900 text-base">{formatUSD(totalCalculado)}</p>
                    <span className="text-[11px] text-purple-700 font-bold">{formatBS(totalCalculado, tasa)}</span>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-0.5">
                      Anticipo Pactado ($ USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={anticipo}
                      onChange={(e) => setAnticipo(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-800"
                    />
                    <span className="text-[10px] text-gray-500">{formatBS(anticipo, tasa)}</span>
                  </div>
                </div>

                {/* Barra de Anticipo Mínimo (30%) */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={porcentajeAnticipo >= 30 ? 'text-emerald-700 flex items-center gap-1' : 'text-amber-700 flex items-center gap-1'}>
                      {porcentajeAnticipo >= 30 ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Anticipo Válido para Producción ({porcentajeAnticipo.toFixed(1)}%)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          <span>Anticipo Bajo: Quedará en BORRADOR (Requiere mín 30% = {formatUSD(anticipoMinimo30)})</span>
                        </>
                      )}
                    </span>
                    <span className="text-gray-500">
                      Saldo a Crédito: {formatUSD(saldoPendienteCalculado)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        porcentajeAnticipo >= 30 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(porcentajeAnticipo, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Alerta de Crédito Excedido */}
                {excedeCredito && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                    <ShieldAlert size={18} className="shrink-0 text-red-600" />
                    <span>
                      <strong>BLOQUEO POR CUPO DE CRÉDITO:</strong> El saldo resultante ({formatUSD(nuevoSaldoGlobalCliente)}) supera el cupo asignado al cliente ({formatUSD(selectedCliente.credito_maximo)}). Aumente el anticipo para permitir la creación.
                    </span>
                  </div>
                )}
              </div>

              {/* Fecha y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha Estimada de Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Notas o Instrucciones de Corte/Bordado
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Instrucciones especiales para confección..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={excedeCredito}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Crear Pedido de Fabricación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Pedido & Trazabilidad (QR / SKUs) */}
      {detailModalOpen && activePedido && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 animate-scale-in max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  #{activePedido.id}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Pedido #{activePedido.id} — {activePedido.cliente?.nombre}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">Fecha: {activePedido.fecha}</span>
                    <span>·</span>
                    {getEstadoBadge(activePedido.estado)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Acciones de Estado */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Avanzar Estado:</span>
                <div className="flex items-center gap-1.5">
                  {activePedido.estado === 'borrador' && (
                    <button
                      onClick={() => handleChangeEstado(activePedido.id, 'confirmado')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      Confirmar (Abonar)
                    </button>
                  )}
                  {activePedido.estado === 'confirmado' && (
                    <button
                      onClick={() => handleChangeEstado(activePedido.id, 'pendiente_corte')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                    >
                      Pasar a Corte ➔
                    </button>
                  )}
                  {activePedido.estado === 'pendiente_corte' && (
                    <button
                      onClick={() => handleChangeEstado(activePedido.id, 'en_corte')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                    >
                      Iniciar Corte
                    </button>
                  )}
                  {activePedido.estado !== 'entregado' && activePedido.estado !== 'cancelado' && (
                    <button
                      onClick={() => handleChangeEstado(activePedido.id, 'cancelado')}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Trazabilidad por Códigos de Rastreo Único */}
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1.5">
                  <QrCode size={14} className="text-blue-600" />
                  <span>Prendas & Códigos de Rastreo Único ({activePedido.lineas.length})</span>
                </p>

                <div className="space-y-2">
                  {activePedido.lineas.map((linea) => (
                    <div
                      key={linea.id}
                      className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {linea.codigo_rastreo_unico}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {linea.cantidad} prendas
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Variante SKU: <span className="font-mono">{linea.variante?.sku_unico}</span> · Color: {linea.variante?.color} · Talla: {linea.variante?.talla}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Estado Etapa</span>
                        <p className="text-xs font-bold text-indigo-700 capitalize">
                          {linea.estado_produccion.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historial de Auditoría */}
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1.5">
                  <History size={14} className="text-amber-600" />
                  <span>Historial de Auditoría</span>
                </p>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activePedido.historial.map((h) => (
                    <div key={h.id} className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-0.5 border border-gray-100">
                      <div className="flex justify-between font-semibold text-gray-700">
                        <span>{h.estado_anterior || 'Inicio'} ➔ {h.estado_nuevo}</span>
                        <span className="text-[10px] text-gray-400">{new Date(h.fecha).toLocaleString('es-VE')}</span>
                      </div>
                      {h.observacion && <p className="text-gray-500 text-[11px]">{h.observacion}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 text-right shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
