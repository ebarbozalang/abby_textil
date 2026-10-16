import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sparkles, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, Shield, User, HardHat } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password.trim()) {
      setFormError('Por favor ingrese su correo y contraseña.');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      if (result.user.rol === 'trabajador') {
        navigate('/portal-trabajador');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4">
            <span className="text-2xl font-bold">🧵</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">TEXTIL-APP</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Producción & Trazabilidad Textil</p>
        </div>

        {/* Global Error Banner */}
        {(error || formError) && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@textilapp.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
            Acceso Rápido para Pruebas (Roles)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@textilapp.com', 'admin123')}
              className="p-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-medium text-purple-700 flex flex-col items-center gap-1 transition-colors"
            >
              <Shield size={16} />
              <span>Superuser</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('vendedor@textilapp.com', 'password123')}
              className="p-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-medium text-blue-700 flex flex-col items-center gap-1 transition-colors"
            >
              <User size={16} />
              <span>Vendedor</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('trabajador@textilapp.com', 'password123')}
              className="p-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium text-amber-700 flex flex-col items-center gap-1 transition-colors"
            >
              <HardHat size={16} />
              <span>Operario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
