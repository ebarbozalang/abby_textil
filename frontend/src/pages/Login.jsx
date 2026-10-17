import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, AlertCircle, ArrowRight, Shield, User, HardHat } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-[#2D002C] via-[#4D004A] to-[#1A0019] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Rings con tonos AbbySoft */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#B823B2]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#7B0078]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-abby-200/50 p-8 z-10 backdrop-blur-sm">
        {/* Header con Logo de AbbySoft */}
        <div className="text-center mb-6">
          <div className="inline-block relative mb-3">
            <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-[#7B0078] to-[#DF7CDB] shadow-lg shadow-[#7B0078]/30">
              <img
                src="/logo.png"
                alt="AbbySoft Logo"
                className="w-full h-full object-contain rounded-full bg-[#7B0078]"
              />
            </div>
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Abby<span className="text-abby-700">Soft</span>
          </h1>
          <p className="text-xs uppercase font-extrabold tracking-widest text-abby-600 mt-1">
            Tu Visión, Nuestro Código.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Sistema de Producción & Trazabilidad Textil
          </p>
        </div>

        {/* Global Error Banner */}
        {(error || formError) && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
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
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-abby-600 focus:border-transparent transition-all"
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
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-abby-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-abby-700 to-abby-600 hover:from-abby-800 hover:to-abby-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-abby-700/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
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
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5">
            Acceso Rápido para Pruebas (Roles)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@textilapp.com', 'admin123')}
              className="p-2 border border-abby-200 bg-abby-50 hover:bg-abby-100 rounded-xl text-xs font-semibold text-abby-800 flex flex-col items-center gap-1 transition-colors"
            >
              <Shield size={16} className="text-abby-600" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('vendedor@test.com', 'vendedorpass')}
              className="p-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-xl text-xs font-semibold text-purple-700 flex flex-col items-center gap-1 transition-colors"
            >
              <User size={16} className="text-purple-600" />
              <span>Vendedor</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('trabajador@test.com', 'trabajadorpass')}
              className="p-2 border border-pink-200 bg-pink-50 hover:bg-pink-100 rounded-xl text-xs font-semibold text-pink-700 flex flex-col items-center gap-1 transition-colors"
            >
              <HardHat size={16} className="text-pink-600" />
              <span>Operario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
