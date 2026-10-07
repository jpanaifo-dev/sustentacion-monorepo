import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../app/providers/auth-provider';
import { toast } from 'sonner';

export const AdminLoginPage: React.FC = () => {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(import.meta.env.DEV ? (import.meta.env.VITE_ADMIN_EMAIL || '') : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? (import.meta.env.VITE_ADMIN_PASSWORD || '') : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  if (!isLoading && user) return <Navigate to="/admin" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try { await login(email, password); toast.success('Sesión iniciada', { description: 'Bienvenido al panel administrativo de la EPG.' }); navigate('/admin', { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Credenciales inválidas'); }
  };
  return <main className="min-h-screen bg-[#f7f6ed] grid lg:grid-cols-2">
    <section className="hidden lg:flex bg-[#091E3A] text-white px-12 xl:px-24 py-14 flex-col justify-between min-h-screen relative overflow-hidden">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-amber-400/10" />
      <img src="/brands/postgrado_brandwhite.webp" alt="Escuela de Postgrado UNAP" className="w-auto h-20 max-w-[340px] object-contain object-left" />
      <div className="max-w-md pb-8">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-[0.22em]">Escuela de Postgrado</p>
        <h1 className="mt-4 text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">Agenda de sustentaciones</h1>
        <p className="mt-5 text-base leading-relaxed text-slate-300">Administra horarios, espacios, participantes y sustentaciones de la Universidad Nacional de la Amazonía Peruana desde un solo lugar.</p>
        <div className="mt-12 border-t border-white/15 pt-5 text-sm text-slate-300"><span className="block text-xs text-slate-400">Sistema institucional</span><span className="font-medium text-white">Gestión académica de postgrado</span></div>
      </div>
      <p className="text-xs text-slate-400">© {new Date().getFullYear()} EPG UNAP</p>
    </section>

    <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
      <form onSubmit={submit} className="w-full max-w-[460px] space-y-6">
        <div className="lg:hidden mb-8"><img src="/brands/postgrado_brandwhite.webp" alt="Escuela de Postgrado UNAP" className="h-14 w-auto bg-[#091E3A] rounded-sm px-3 py-2" /></div>
        <div className="border-b border-slate-300 pb-6">
          <p className="text-xs font-semibold text-[#091E3A] uppercase tracking-[0.16em]">Personal administrativo</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#091E3A] tracking-tight">Acceso a la agenda EPG</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Ingresa para administrar las fechas, horarios y sustentaciones programadas.</p>
        </div>
        <div className="space-y-5">
          <label className="block text-sm font-medium text-slate-800">Correo institucional<input className="mt-2 w-full h-12 border border-slate-300 bg-white rounded-sm px-3 text-slate-900 outline-none focus:border-[#091E3A] focus:ring-2 focus:ring-[#091E3A]/10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-800">Contraseña<div className="relative mt-2"><input className="w-full h-12 border border-slate-300 bg-white rounded-sm px-3 pr-11 text-slate-900 outline-none focus:border-[#091E3A] focus:ring-2 focus:ring-[#091E3A]/10" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400 hover:text-[#091E3A]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
        </div>
        {error && <p className="text-sm text-red-600 flex items-center gap-2"><LockKeyhole className="h-4 w-4" />{error}</p>}
        <button className="w-full h-12 rounded-sm bg-[#091E3A] text-white font-semibold hover:bg-[#132c50] transition-colors" type="submit">Iniciar sesión</button>
        <p className="text-center text-xs leading-relaxed text-slate-500">Usa las credenciales institucionales asignadas por el administrador del sistema.</p>
      </form>
    </section>
  </main>;
};
