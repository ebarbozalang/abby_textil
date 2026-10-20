import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  HardHat,
  Search,
  Plus,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  Calculator,
  CreditCard,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';

export default function Trabajadores() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('trabajadores'); // 'trabajadores' o 'nomina'
  const [trabajadores, setTrabajadores] = useState([]);
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Trabajador
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    tipo_pago: 'produccion',
    salario_fijo: '0',
    activo: true,
  });

  // Filtros de Liquidación de Nómina
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const [periodoInicio, setPeriodoInicio] = useState(firstDayOfMonth);
  const [periodoFin, setPeriodoFin] = useState(today);
  const [liquidando, setLiquidando] = useState(false);

  const fetchTrabajadores = async () => {
    setLoading(true);
    try {
      const url = search ? `/trabajadores?q=${encodeURIComponent(search)}` : '/trabajadores';
      const res = await api.get(url);
      setTrabajadores(res.data);
    } catch (err) {
      setErrorMsg('Error al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchNominas = async () => {
    try {
      const res = await api.get('/trabajadores/nominas/historial');
      setNominas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'trabajadores') {
      const delay = setTimeout(() => {
        fetchTrabajadores();
      }, 300);
      return () => clearTimeout(delay);
    } else {
      fetchNominas();
    }
  }, [search, activeTab]);

  const handleOpenModal = (t = null) => {
    setErrorMsg('');
    if (t) {
      setEditingTrabajador(t);
      setFormData({
        nombre: t.nombre,
        documento: t.documento,
        telefono: t.telefono || '',
        tipo_pago: t.tipo_pago,
        salario_fijo: t.salario_fijo.toString(),
        activo: t.activo,
      });
    } else {
      setEditingTrabajador(null);
      setFormData({
        nombre: '',
        documento: '',
        telefono: '',
        tipo_pago: 'produccion',
        salario_fijo: '0',
        activo: true,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        salario_fijo: parseFloat(formData.salario_fijo) || 0,
      };

      if (editingTrabajador) {
        await api.put(`/trabajadores/${editingTrabajador.id}`, payload);
        setSuccessMsg('Trabajador actualizado');
      } else {
        await api.post('/trabajadores', payload);
        setSuccessMsg('Trabajador registrado exitosamente');
      }

      setModalOpen(false);
      fetchTrabajadores();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar trabajador');
    }
  };

  const handleDeactivate = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de desactivar al trabajador '${nombre}'?`)) return;
    try {
      await api.delete(`/trabajadores/${id}`);
      setSuccessMsg('Trabajador desactivado');
      fetchTrabajadores();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al desactivar');
    }
  };

  const handleLiquidarNomina = async () => {
    setLiquidando(true);
    setErrorMsg('');
    try {
      const res = await api.post('/trabajadores/liquidar-nomina', {
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
      });
      setSuccessMsg(`¡Nómina calculada con éxito para ${res.data.length} trabajadores!`);
      setNominas(res.data);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al calcular la nómina');
    } finally {
      setLiquidando(false);
    }
  };

  const handlePagarNomina = async (nominaId) => {
    try {
      await api.put(`/trabajadores/nominas/${nominaId}/pagar`);
      setSuccessMsg('Nómina marcada como PAGADA');
      fetchNominas();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al pagar nómina');
    }
  };

  const formatUSD = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getTipoPagoBadge = (tipo) => {
    switch (tipo) {
      case 'produccion':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">Por Producción</span>;
      case 'fijo':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">Sueldo Fijo</span>;
      case 'mixto':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">Mixto (Fijo + Pieza)</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">{tipo}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <HardHat className="text-blue-600" size={28} />
            <span>Gestión de Trabajadores & Nómina</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Administración de personal textil y liquidación automática por piezas (corte, confección, DTF) o sueldo fijo.
          </p>
        </div>

        {activeTab === 'trabajadores' && (user?.rol === 'administrador' || user?.rol === 'superusuario') && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>Nuevo Trabajador</span>
          </button>
        )}
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

      {/* Pestañas Principales */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('trabajadores')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'trabajadores'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} />
          <span>Personal de Confección & Taller</span>
        </button>

        <button
          onClick={() => setActiveTab('nomina')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'nomina'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calculator size={16} />
          <span>Liquidación de Nómina por Producción</span>
        </button>
      </div>

      {/* ==================== PESTAÑA 1: TRABAJADORES ==================== */}
      {activeTab === 'trabajadores' && (
        <div className="space-y-4">
          {/* Buscador */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
            <Search size={20} className="text-gray-400 ml-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar trabajador por nombre o cédula..."
              className="w-full bg-transparent border-none text-sm focus:outline-none text-gray-800"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Cargando trabajadores...
              </div>
            ) : trabajadores.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No hay trabajadores registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Trabajador</th>
                      <th className="py-3.5 px-4">Cédula / Doc</th>
                      <th className="py-3.5 px-4">Modalidad de Pago</th>
                      <th className="py-3.5 px-4">Salario Base</th>
                      <th className="py-3.5 px-4">Ingreso</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {trabajadores.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900">{t.nombre}</p>
                          <p className="text-xs text-gray-400">{t.telefono || 'Sin teléfono'}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700">
                          {t.documento}
                        </td>

                        <td className="py-3.5 px-4">
                          {getTipoPagoBadge(t.tipo_pago)}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {parseFloat(t.salario_fijo) > 0 ? formatUSD(t.salario_fijo) : '$ 0.00 (100% Piezas)'}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {t.fecha_ingreso}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(t)}
                              title="Editar trabajador"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            {(user?.rol === 'administrador' || user?.rol === 'superusuario') && (
                              <button
                                onClick={() => handleDeactivate(t.id, t.nombre)}
                                title="Desactivar"
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
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

      {/* ==================== PESTAÑA 2: LIQUIDACIÓN DE NÓMINA ==================== */}
      {activeTab === 'nomina' && (
        <div className="space-y-6">
          {/* Panel de Cálculo de Periodo */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Periodo Inicio *
                </label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Periodo Fin *
                </label>
                <input
                  type="date"
                  value={periodoFin}
                  onChange={(e) => setPeriodoFin(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleLiquidarNomina}
              disabled={liquidando}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Calculator size={16} />
              <span>{liquidando ? 'Calculando Producción...' : 'Calcular Nómina del Periodo'}</span>
            </button>
          </div>

          {/* Listado de Nóminas Liquidadas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">
                Resumen de Nóminas Liquidadas ({nominas.length})
              </h3>
              <span className="text-xs text-gray-400">
                Basado en piezas terminadas en corte, confección e impresión
              </span>
            </div>

            {nominas.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs italic">
                Presione "Calcular Nómina del Periodo" para liquidar las órdenes terminadas en el rango de fechas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Trabajador</th>
                      <th className="py-3.5 px-4">Periodo</th>
                      <th className="py-3.5 px-4">Piezas Producidas</th>
                      <th className="py-3.5 px-4">Monto Producción</th>
                      <th className="py-3.5 px-4">Sueldo Base</th>
                      <th className="py-3.5 px-4">Total Neto a Pagar</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {nominas.map((n) => (
                      <tr key={n.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900">
                            {n.trabajador?.nombre || `Trabajador #${n.trabajador_id}`}
                          </p>
                          <p className="text-xs text-gray-400">Modalidad: {n.tipo}</p>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          {n.periodo_inicio} al {n.periodo_fin}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-indigo-700">
                          {n.total_producido} prendas/piezas
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-gray-700">
                          {formatUSD(n.monto_produccion)}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {formatUSD(n.monto_fijo)}
                        </td>

                        <td className="py-3.5 px-4 font-black text-gray-900 text-base">
                          {formatUSD(n.total)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                              n.estado === 'pagado'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {n.estado}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {n.estado === 'pendiente' && (user?.rol === 'administrador' || user?.rol === 'superusuario') && (
                            <button
                              onClick={() => handlePagarNomina(n.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={13} />
                              <span>Pagar</span>
                            </button>
                          )}
                          {n.estado === 'pagado' && (
                            <span className="text-[11px] text-gray-400 italic">Pagado</span>
                          )}
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

      {/* Modal Crear / Editar Trabajador */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTrabajador ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Pedro Gómez"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-gray-700 mb-1">
                    Cédula / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="1098765432"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+58 414 123 4567"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">
                  Modalidad de Pago *
                </label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="produccion">Por Producción (Pago por pieza cortada/confeccionada)</option>
                  <option value="fijo">Sueldo Fijo Mensual</option>
                  <option value="mixto">Mixto (Base Fija + Pago por Piezas)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-gray-700 mb-1">
                  Salario Fijo Base (USD) {formData.tipo_pago === 'produccion' ? '(Opcional)' : '*'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.salario_fijo}
                  onChange={(e) => setFormData({ ...formData, salario_fijo: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {editingTrabajador ? 'Guardar Cambios' : 'Registrar Trabajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
