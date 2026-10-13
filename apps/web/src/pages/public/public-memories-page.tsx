import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import heroImage from '../../assets/hero.png';

type MemoryCard = {
  number: string;
  label: string;
  title: string;
  description: string;
  variant: string;
  image?: boolean;
  featured?: boolean;
};

const memories: MemoryCard[] = [
  {
    number: '01',
    label: 'Investigación · EPG',
    title: 'Ideas que dejan huella',
    description: 'Cada sustentación convierte una pregunta en una nueva forma de mirar el futuro.',
    variant: 'recuerdo-card--brick',
    image: true,
    featured: true,
  },
  {
    number: '02',
    label: 'Comunidad académica',
    title: 'Voces de la investigación',
    description: 'Historias de esfuerzo, acompañamiento y conocimiento compartido.',
    variant: 'recuerdo-card--paper',
  },
  {
    number: '03',
    label: 'Aprendizaje · 2026',
    title: 'El aula también recuerda',
    description: 'Encuentros que permanecen más allá de una fecha en el calendario.',
    variant: 'recuerdo-card--navy',
    image: true,
  },
  {
    number: '04',
    label: 'Escuela de Postgrado',
    title: 'Una comunidad que crece',
    description: 'Personas, proyectos y conversaciones que construyen nuestra identidad.',
    variant: 'recuerdo-card--gold',
  },
  {
    number: '05',
    label: 'Archivo abierto',
    title: 'Lo que queda por contar',
    description: 'Una colección viva de momentos que conectan a la EPG con su comunidad.',
    variant: 'recuerdo-card--image',
    image: true,
    featured: true,
  },
  {
    number: '06',
    label: 'UNAP · Iquitos',
    title: 'Seguimos haciendo historia',
    description: 'El próximo recuerdo puede comenzar con tu investigación.',
    variant: 'recuerdo-card--ink',
  },
];

export const PublicMemoriesPage: React.FC = () => {
  return (
    <div className="recuerdos-page">
      <section className="recuerdos-shell">
        <aside className="recuerdos-rail" aria-label="Archivo visual">
          <span className="recuerdos-rail__word">recuerdos</span>
          <span className="recuerdos-rail__meta">EPG / UNAP</span>
        </aside>

        <div className="recuerdos-content">
          <header className="recuerdos-intro recuerdo-reveal">
            <div>
              <p className="recuerdos-kicker">ARCHIVO VISUAL · ESCUELA DE POSTGRADO</p>
              <h1>Momentos que<br /><em>permanecen.</em></h1>
            </div>
            <div className="recuerdos-intro__aside">
              <p>Una mirada a las personas, ideas y encuentros que dan vida a nuestra comunidad académica.</p>
              <Link to="/agenda" className="recuerdos-link">
                Ver agenda <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="recuerdos-rule" aria-hidden="true" />

          <div className="recuerdos-index recuerdo-reveal" style={{ animationDelay: '120ms' }}>
            <span>SELECCIÓN 2026</span>
            <span>06 ENTRADAS / ARCHIVO ABIERTO</span>
          </div>

          <div className="recuerdos-grid">
            {memories.map((memory, index) => (
              <article
                key={memory.number}
                className={`recuerdo-card ${memory.variant} ${memory.featured ? 'recuerdo-card--featured' : ''} recuerdo-reveal`}
                style={{ animationDelay: `${180 + index * 90}ms` }}
              >
                {memory.image && (
                  <img className="recuerdo-card__image" src={heroImage} alt="Escuela de Postgrado UNAP" />
                )}
                <div className="recuerdo-card__veil" aria-hidden="true" />
                <div className="recuerdo-card__top">
                  <span className="recuerdo-card__number">{memory.number}</span>
                  <span className="recuerdo-card__label">{memory.label}</span>
                </div>
                <div className="recuerdo-card__body">
                  <h2>{memory.title}</h2>
                  <p>{memory.description}</p>
                </div>
                <span className="recuerdo-card__line" aria-hidden="true" />
              </article>
            ))}
          </div>

          <footer className="recuerdos-footer recuerdo-reveal" style={{ animationDelay: '760ms' }}>
            <span>ESCUELA DE POSTGRADO UNAP</span>
            <span>FORMACIÓN · INVESTIGACIÓN · COMUNIDAD</span>
            <span>© {new Date().getFullYear()}</span>
          </footer>
        </div>
      </section>
    </div>
  );
};
