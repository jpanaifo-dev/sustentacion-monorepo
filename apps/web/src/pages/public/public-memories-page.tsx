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
    label: 'Sustentación · EPG',
    title: 'El inicio de una defensa',
    description: 'Cada sustentación convierte una investigación en una historia para compartir.',
    variant: 'recuerdo-card--brick',
    image: true,
    featured: true,
  },
  {
    number: '02',
    label: 'Sustentantes · EPG',
    title: 'La voz del sustentante',
    description: 'Trabajo, esfuerzo y conocimiento reunidos en un momento que permanece.',
    variant: 'recuerdo-card--paper',
  },
  {
    number: '03',
    label: 'Agenda · 2026',
    title: 'El momento de compartir',
    description: 'La agenda reúne fechas, espacios y nuevas oportunidades para la investigación.',
    variant: 'recuerdo-card--navy',
    image: true,
  },
  {
    number: '04',
    label: 'Jurado académico',
    title: 'Acompañamiento que impulsa',
    description: 'La mirada de un jurado también forma parte del camino de cada tesis.',
    variant: 'recuerdo-card--gold',
  },
  {
    number: '05',
    label: 'Defensas · EPG',
    title: 'Una agenda de logros',
    description: 'Cada defensa suma una nueva página a la historia de la Escuela de Postgrado.',
    variant: 'recuerdo-card--image',
    image: true,
    featured: true,
  },
  {
    number: '06',
    label: 'Comunidad UNAP',
    title: 'Seguimos sustentando ideas',
    description: 'El próximo recuerdo puede comenzar con tu investigación y tu fecha de defensa.',
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
              <p className="recuerdos-kicker">ARCHIVO VISUAL · SUSTENTACIONES EPG</p>
              <h1>Historias que<br /><em>se sustentan.</em></h1>
            </div>
            <div className="recuerdos-intro__aside">
              <p>Una mirada a las investigaciones, personas y momentos que dan vida a la agenda de sustentaciones.</p>
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
            <span>SUSTENTACIONES · INVESTIGACIÓN · COMUNIDAD</span>
            <span>© {new Date().getFullYear()}</span>
          </footer>
        </div>
      </section>
    </div>
  );
};
