import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import {
  TrendingUp,
  ShoppingBag,
  Factory,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server,
  Zap,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [backendHealth, setBackendHealth] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health', { baseURL: '' });
        setBackendHealth(res.data);
      } catch (e) {
        setBackendHealth({ status: 'offline' });
      }
    };
    checkHealth();
  }, []);

  const handleSeedDemoUsers = async () => {
    setIsSeeding(true);
    try {
      const res = await api.post('/auth/seed-demo-users');
      setSeedStatus('¡Usuarios de prueba (Vendedor, Operario, Admin) inicializados con éxito!');
    } catch (e) {
      setSeedStatus('Error al inicializar usuarios.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Panel de Control
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Semana 1 Activa
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Bienvenido, <span className="font-semibold text-gray-800">{user?.nombre}</span> ({user?.email})
          </p>
        </div>

        {/* Backend Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm text-xs">
            <Server size={14} className={backendHealth?.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-gray-600">Backend API:</span>
            <span className="font-bold text-gray-800 uppercase">
              {backendHealth?.status || 'Conectando...'}
            </span>
          </div>

          {(user?.rol === 'superusuario' || user?.rol === 'administrador') && (
            <button
              onClick={handleSeedDemoUsers}
              disabled={isSeeding}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors"
            >
              <Zap size={14} />
              <span>{isSeeding ? 'Creando...' : 'Crear Usuarios Demo'}</span>
            </button>
          )}
        </div>
      </div>

      {seedStatus && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
          <span>{seedStatus}</span>
        </div>
      )}

      {/* KPI Cards Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pedidos en Curso</p>
            <p className="text-2xl font-black text-gray-900 mt-1">12</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Trazabilidad activa por QR</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">En Producción</p>
            <p className="text-2xl font-black text-amber-600 mt-1">8</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Corte: 3 | Confección: 5</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Factory size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cartera Pendiente</p>
            <p className="text-2xl font-black text-gray-900 mt-1">$ 4.250.000</p>
            <p className="text-xs text-blue-600 font-medium mt-1">Con anticipos validados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Trazabilidad Total</p>
            <p className="text-2xl font-black text-purple-700 mt-1">100%</p>
            <p className="text-xs text-purple-600 font-medium mt-1">Sin cruces de color/talla</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <QrCode size={24} />
          </div>
        </div>
      </div>

      {/* Reglas de Negocio en Ejecución */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck size={16} />
          <span>Garantía de Cero Confusión en Confección</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Arquitectura de Trazabilidad por Etapas y SKU Único
        </h2>
        <p className="text-blue-100 text-sm mt-2 max-w-3xl leading-relaxed">
          Cada línea de pedido genera un <strong>código de rastreo único</strong> impreso en etiqueta QR física. 
          El flujo de producción no permite avanzar a una etapa posterior sin escanear y validar la conclusión 
          de la etapa previa (Corte ➔ Impresión ➔ Confección).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-800/80">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center shrink-0 text-amber-300 font-bold">1</div>
            <div>
              <p className="font-semibold text-sm">Anticipo Mínimo Obligatorio</p>
              <p className="text-xs text-blue-200 mt-0.5">30% requerido para pasar pedido a corte.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center shrink-0 text-amber-300 font-bold">2</div>
            <div>
              <p className="font-semibold text-sm">Control de Crédito Máximo</p>
              <p className="text-xs text-blue-200 mt-0.5">Bloqueo automático si supera saldo límite.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center shrink-0 text-amber-300 font-bold">3</div>
            <div>
              <p className="font-semibold text-sm">Nómina por Producción</p>
              <p className="text-xs text-blue-200 mt-0.5">Liquidación automática por prenda/corte.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
