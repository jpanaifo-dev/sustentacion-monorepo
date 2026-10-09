import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Calendar, Clock3, Mail, MapPin, Phone } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Main Institutional Header */}
      <header className="bg-[#091E3A] border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <NavLink to="/agenda" className="h-10 sm:h-12 md:h-14 w-auto flex items-center shrink-0">
              <img
                src="/brands/postgrado_brandwhite.webp"
                alt="Escuela de Postgrado UNAP"
                className="h-full w-auto max-w-[180px] sm:max-w-[260px] md:max-w-[320px] object-contain object-left"
              />
            </NavLink>
            <div className="hidden sm:block border-l border-white/20 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white uppercase tracking-tight leading-none">
                  Agenda de Sustentaciones
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium bg-amber-400 text-slate-950 uppercase rounded">
                  OFICIAL
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="rounded-lg border-white/30 bg-transparent text-white hover:bg-white hover:text-[#091E3A] text-xs h-8 sm:h-9 font-medium">
              <NavLink to="/agenda">
                <Calendar className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                <span>Ver Agenda</span>
              </NavLink>
            </Button>
          </div>
        </div>
      </header>

      {/* Public Content Body - Container without max-w constraint */}
      <main className="flex-1 w-full py-0">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#050b1c] text-slate-400 text-xs py-14 border-t-2 border-amber-400 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
          <div className="space-y-4">
            <img src="/brands/postgrado_brandwhite.webp" alt="Escuela de Postgrado UNAP" className="w-full max-w-[260px] h-16 object-contain object-left" />
            <p className="max-w-xs leading-relaxed text-slate-300">Formación académica de excelencia para el desarrollo profesional y la investigación.</p>
            <div className="flex gap-2 text-slate-300"><MapPin className="h-4 w-4 text-amber-400 shrink-0" /><span>Escuela de Postgrado UNAP · Iquitos, Loreto</span></div>
          </div>

          <div>
            <h2 className="font-semibold text-white text-sm mb-4">Enlaces de la aplicación</h2>
            <nav className="space-y-3 flex flex-col">
              <NavLink to="/agenda" className="hover:text-amber-400 transition-colors">Agenda pública</NavLink>
              <NavLink to="/admin/login" className="hover:text-amber-400 transition-colors">Acceso administrativo</NavLink>
              <a href="#top" className="hover:text-amber-400 transition-colors">Volver arriba</a>
            </nav>
          </div>

          <div>
            <h2 className="font-semibold text-white text-sm mb-4">Contacto institucional</h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex gap-2"><Phone className="h-4 w-4 text-amber-400 shrink-0" /><span>+51 (065) 24-1512</span></div>
              <div className="flex gap-2"><Mail className="h-4 w-4 text-amber-400 shrink-0" /><span>posgrado@unapiquitos.edu.pe</span></div>
              <div className="flex gap-2"><Clock3 className="h-4 w-4 text-amber-400 shrink-0" /><span>Lunes a viernes · 8:00 am – 5:00 pm</span></div>
            </div>
          </div>

          <div className="flex items-start justify-start lg:justify-center">
            <img src="/brands/licenciada_resolucion_WHITE.webp" alt="Universidad licenciada" className="w-48 h-auto object-contain" />
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-5 border-t border-slate-800 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};
