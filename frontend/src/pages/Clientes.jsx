import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Search,
  Plus,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert
} from 'lucide-react';

export default function Clientes() {
  const { user } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    direccion: '',
    email: '',
    credito_maximo: '0',
    activo: true,
  });

  const fetchClientes = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/clientes?q=${encodeURIComponent(query)}` : '/clientes';
      const res = await api.get(url);
      setClientes(res.data);
    } catch (err) {
      setErrorMsg('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClientes(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleOpenModal = (cliente = null) => {
    setErrorMsg('');
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre,
        documento: cliente.documento,
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        email: cliente.email || '',
        credito_maximo: cliente.credito_maximo.toString(),
        activo: cliente.activo,
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nombre: '',
        documento: '',
        telefono: '',
        direccion: '',
        email: '',
        credito_maximo: '1000000',
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
        credito_maximo: parseFloat(formData.credito_maximo) || 0,
        email: formData.email ? formData.email : null,
      };

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, payload);
        setSuccessMsg('Cliente actualizado correctamente');
      } else {
        await api.post('/clientes', payload);
        setSuccessMsg('Cliente registrado exitosamente');
      }

      setModalOpen(false);
      fetchClientes(search);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar cliente');
    }
  };

  const handleDeactivate = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de desactivar al cliente '${nombre}'?`)) return;
    try {
      await api.delete(`/clientes/${id}`);
      setSuccessMsg('Cliente desactivado');
      fetchClientes(search);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al desactivar');
    }
  };

  const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-blue-600" size={28} />
            <span>Gestión de Clientes</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Control de cartera, cupo de crédito máximo y saldos pendientes globales.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Nuevo Cliente</span>
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

      {/* Barra de Búsqueda */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento (NIT/CC), teléfono o email..."
          className="w-full bg-transparent border-none text-sm focus:outline-none text-gray-800"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Lista / Tabla de Clientes */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando clientes...
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No se encontraron clientes registrados con los criterios de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cliente / Contacto</th>
                  <th className="py-3.5 px-4">Documento</th>
                  <th className="py-3.5 px-4">Cupo de Crédito</th>
                  <th className="py-3.5 px-4">Saldo Pendiente</th>
                  <th className="py-3.5 px-4">Disponibilidad</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {clientes.map((c) => {
                  const maxCred = parseFloat(c.credito_maximo) || 0;
                  const saldo = parseFloat(c.saldo_pendiente_global) || 0;
                  const porcentajeUso = maxCred > 0 ? (saldo / maxCred) * 100 : 0;
                  const excede = c.excede_credito;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{c.nombre}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {c.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {c.telefono}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {c.email}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-700 text-xs font-semibold">
                        {c.documento}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {formatCOP(maxCred)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${saldo > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {formatCOP(saldo)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className={excede ? 'text-red-600 font-bold' : 'text-gray-600'}>
                              {excede ? 'Cupo Superado' : `${porcentajeUso.toFixed(0)}% usado`}
                            </span>
                            <span className="text-gray-500 text-[11px]">
                              Disp: {formatCOP(c.credito_disponible)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                excede
                                  ? 'bg-red-500'
                                  : porcentajeUso > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(c)}
                            title="Editar cliente"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          {(user?.rol === 'administrador' || user?.rol === 'superusuario') && (
                            <button
                              onClick={() => handleDeactivate(c.id, c.nombre)}
                              title="Desactivar cliente"
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Cliente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                  Nombre o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Distribuidora Textil Andina"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Documento (NIT / CC) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="900123456-1"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+57 300 123 4567"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@ejemplo.com"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Cupo de Crédito Máximo (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={formData.credito_maximo}
                    onChange={(e) => setFormData({ ...formData, credito_maximo: e.target.value })}
                    placeholder="Ej: 2000000"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                  Dirección de Entrega
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Calle 10 # 20-30, Ciudad"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  {editingCliente ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
