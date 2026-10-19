import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTasaStore, formatUSD, formatBS } from '../store/tasaStore';
import {
  Shirt,
  Search,
  Plus,
  Tag,
  DollarSign,
  Package,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  QrCode
} from 'lucide-react';

export default function Catalogo() {
  const { user } = useAuthStore();
  const { tasa } = useTasaStore();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Producto
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [prodForm, setProdForm] = useState({
    codigo: '',
    nombre: '',
    tipo: 'casual',
    descripcion: '',
    precio_base: '15.00',
    activo: true,
  });

  // Modal Variantes
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProdForVariants, setSelectedProdForVariants] = useState(null);
  const [newVariant, setNewVariant] = useState({
    color: '',
    talla: 'M',
    stock: 0,
  });

  const tiposPrenda = [
    { value: '', label: 'Todos' },
    { value: 'conjunto_dama', label: 'Conjunto Dama' },
    { value: 'conjunto_nino', label: 'Conjunto Niño' },
    { value: 'conjunto_caballero', label: 'Conjunto Caballero' },
    { value: 'deportiva', label: 'Ropa Deportiva' },
    { value: 'casual', label: 'Casual' },
    { value: 'camisa', label: 'Camisas' },
    { value: 'pantalon', label: 'Pantalones' },
    { value: 'bolso', label: 'Bolsos' },
    { value: 'otro', label: 'Otros' },
  ];

  const fetchProductos = async () => {
    setLoading(true);
    try {
      let url = '/productos?solo_activos=true';
      if (selectedTipo) url += `&tipo=${selectedTipo}`;
      if (search) url += `&q=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      setProductos(res.data);
    } catch (err) {
      setErrorMsg('Error al cargar catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProductos();
    }, 300);
    return () => clearTimeout(delay);
  }, [search, selectedTipo]);

  const handleOpenProdModal = (prod = null) => {
    setErrorMsg('');
    if (prod) {
      setEditingProd(prod);
      setProdForm({
        codigo: prod.codigo,
        nombre: prod.nombre,
        tipo: prod.tipo,
        descripcion: prod.descripcion || '',
        precio_base: prod.precio_base.toString(),
        activo: prod.activo,
      });
    } else {
      setEditingProd(null);
      setProdForm({
        codigo: '',
        nombre: '',
        tipo: 'casual',
        descripcion: '',
        precio_base: '15.00',
        activo: true,
      });
    }
    setProdModalOpen(true);
  };

  const handleSaveProducto = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        ...prodForm,
        codigo: prodForm.codigo.toUpperCase().trim(),
        precio_base: parseFloat(prodForm.precio_base) || 0,
      };

      if (editingProd) {
        await api.put(`/productos/${editingProd.id}`, payload);
        setSuccessMsg('Producto actualizado');
      } else {
        await api.post('/productos', payload);
        setSuccessMsg('Producto creado en catálogo');
      }

      setProdModalOpen(false);
      fetchProductos();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar producto');
    }
  };

  const handleOpenVariantManager = (prod) => {
    setSelectedProdForVariants(prod);
    setNewVariant({ color: '', talla: 'M', stock: 10 });
    setErrorMsg('');
    setVariantModalOpen(true);
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!newVariant.color.trim()) return;
    setErrorMsg('');
    try {
      await api.post(`/productos/${selectedProdForVariants.id}/variantes`, {
        color: newVariant.color.trim(),
        talla: newVariant.talla.trim(),
        stock: parseInt(newVariant.stock) || 0,
      });

      setSuccessMsg('Variante agregada');
      setNewVariant({ color: '', talla: 'M', stock: 10 });

      // Refrescar el producto seleccionado
      const res = await api.get(`/productos/${selectedProdForVariants.id}`);
      setSelectedProdForVariants(res.data);
      fetchProductos();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al agregar variante');
    }
  };

  const handleDeleteVariant = async (varianteId) => {
    try {
      await api.delete(`/productos/${selectedProdForVariants.id}/variantes/${varianteId}`);
      setSuccessMsg('Variante eliminada');
      const res = await api.get(`/productos/${selectedProdForVariants.id}`);
      setSelectedProdForVariants(res.data);
      fetchProductos();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  // Preview de SKU en vivo al escribir
  const previewSKU = () => {
    if (!selectedProdForVariants) return '';
    const cod = selectedProdForVariants.codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const col = (newVariant.color || 'COL').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
    const tal = (newVariant.talla || 'M').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `${cod}-${col}-${tal}`;
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
            <Shirt className="text-blue-600" size={28} />
            <span>Catálogo de Productos & Variantes</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Garantía de trazabilidad: cada combinación de color y talla posee un SKU único indeleble.
          </p>
        </div>

        {(user?.rol === 'administrador' || user?.rol === 'superusuario') && (
          <button
            onClick={() => handleOpenProdModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>Nuevo Producto</span>
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

      {/* Filtros por Categoría */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tiposPrenda.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedTipo(t.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTipo === t.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código (ej: CAM-01), nombre o descripción..."
          className="w-full bg-transparent border-none text-sm focus:outline-none text-gray-800"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Cuadrícula de Productos */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Cargando catálogo...
        </div>
      ) : productos.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-sm">
          No hay productos registrados en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {productos.map((prod) => {
            const stockTotal = prod.variantes.reduce((acc, v) => acc + v.stock, 0);

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {prod.codigo}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                      {prod.tipo.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-gray-900 text-lg mt-2 leading-snug">
                    {prod.nombre}
                  </h3>
                  {prod.descripcion && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prod.descripcion}</p>
                  )}

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                        Precio Base ($ USD y Bs.)
                      </p>
                      <p className="text-xl font-black text-gray-900 leading-tight">
                        {formatUSD(prod.precio_base)}
                      </p>
                      <p className="text-xs font-bold text-purple-700">
                        {formatBS(prod.precio_base, tasa)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                        Stock Total
                      </p>
                      <p className="text-sm font-bold text-gray-700">{stockTotal} unids</p>
                    </div>
                  </div>

                  {/* Variantes preview */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-between">
                      <span>Variantes ({prod.variantes.length})</span>
                      <span className="text-[11px] text-gray-400 font-normal">SKU Único</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {prod.variantes.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-gray-50 border border-gray-200 text-gray-700"
                          title={`Color: ${v.color}, Talla: ${v.talla}, Stock: ${v.stock}`}
                        >
                          <span className="font-semibold text-gray-900">{v.talla}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-600">{v.color}</span>
                          <span className="font-mono text-[10px] bg-white px-1 rounded border border-gray-200 text-blue-600">
                            {v.sku_unico}
                          </span>
                        </span>
                      ))}
                      {prod.variantes.length === 0 && (
                        <span className="text-xs text-amber-600 italic">
                          Sin variantes aún (Requiere al menos 1 para pedidos)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenVariantManager(prod)}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Layers size={14} />
                    <span>Gestionar Variantes / SKUs</span>
                  </button>

                  {(user?.rol === 'administrador' || user?.rol === 'superusuario') && (
                    <button
                      onClick={() => handleOpenProdModal(prod)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-colors"
                      title="Editar producto"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Producto */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingProd ? 'Editar Producto' : 'Crear Nuevo Producto en Catálogo'}
              </h3>
              <button
                onClick={() => setProdModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProducto} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Código Base *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.codigo}
                    onChange={(e) => setProdForm({ ...prodForm, codigo: e.target.value })}
                    placeholder="Ej: CAM-OXF"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                    Tipo de Prenda *
                  </label>
                  <select
                    value={prodForm.tipo}
                    onChange={(e) => setProdForm({ ...prodForm, tipo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                  >
                    {tiposPrenda.filter((t) => t.value !== '').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={prodForm.nombre}
                  onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                  placeholder="Ej: Camisa Manga Larga Oxford Clásica"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                  Precio Base de Fabricación / Venta ($ USD) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={prodForm.precio_base}
                  onChange={(e) => setProdForm({ ...prodForm, precio_base: e.target.value })}
                  placeholder="Ej: 15.00"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                />
                {parseFloat(prodForm.precio_base) > 0 && (
                  <p className="text-xs text-purple-700 font-medium mt-1">
                    ≈ {formatBS(prodForm.precio_base, tasa)} (Tasa activa: Bs. {parseFloat(tasa || 45).toFixed(2)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                  Descripción o Detalles de Tela
                </label>
                <textarea
                  rows="2"
                  value={prodForm.descripcion}
                  onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
                  placeholder="Composición de tela, botones, corte regular fit..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  {editingProd ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestor de Variantes & SKUs */}
      {variantModalOpen && selectedProdForVariants && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="text-blue-600" size={20} />
                  <span>Variantes & SKUs Únicos</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  {selectedProdForVariants.codigo} — {selectedProdForVariants.nombre}
                </p>
              </div>
              <button
                onClick={() => setVariantModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario Agregar Variante */}
            <form
              onSubmit={handleAddVariant}
              className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 shrink-0 space-y-3"
            >
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-blue-600" />
                <span>Agregar Nueva Variante</span>
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Color *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Rojo, Azul Marino"
                    value={newVariant.color}
                    onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Talla *</label>
                  <select
                    value={newVariant.talla}
                    onChange={(e) => setNewVariant({ ...newVariant, talla: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '2', '4', '6', '8', '10', '12', '14', '16', 'UNICA'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant({ ...newVariant, stock: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SKU Preview en vivo */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">SKU que se asignará:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                    {previewSKU()}
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Guardar Variante
                </button>
              </div>
            </form>

            {/* Listado de Variantes Existentes */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Variantes Registradas ({selectedProdForVariants.variantes.length})
              </p>

              {selectedProdForVariants.variantes.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-800">
                      {v.talla}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{v.color}</p>
                      <p className="font-mono text-xs text-blue-600 font-semibold">{v.sku_unico}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Stock</p>
                      <p className="text-sm font-bold text-gray-800">{v.stock} unids</p>
                    </div>

                    {(user?.rol === 'administrador' || user?.rol === 'superusuario') && (
                      <button
                        onClick={() => handleDeleteVariant(v.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Eliminar variante"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {selectedProdForVariants.variantes.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                  Este producto no cuenta con variantes aún. Agrega colores y tallas para habilitarlo en ventas.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 text-right shrink-0">
              <button
                type="button"
                onClick={() => setVariantModalOpen(false)}
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
