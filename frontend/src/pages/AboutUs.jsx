import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  return (
    <div>
      {/* Intro section */}
      <section className="section-padding" style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="section-container" style={{ maxWidth: '900px', textAlign: 'center' }}>
          <span className="subtitle">ASK Sofa works Story</span>
          <h1 className="heading-lg" style={{ marginBottom: '2rem' }}>Crafting Luxury Comfort for Timeless Homes</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', lineHeight: '1.8', marginBottom: '1.5rem', fontWeight: 300 }}>
            Founded on the values of master joinery and premium textiles, ASK Sofa works builds high-end bespoke furniture that combines traditional engineering with contemporary design aesthetics.
          </p>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
            We believe that home is a sanctuary and every piece of furniture should be an investment in quality, comfort, and longevity. We reject modern disposable furniture cultures, opting instead to build structural masterpieces designed to last generations.
          </p>
        </div>
      </section>

      {/* Philosophy section */}
      <section className="section-padding">
        <div className="section-container">
          <div className="brand-story-block">
            <div>
              <span className="subtitle">The Art of Joinery</span>
              <h2 className="heading-md" style={{ marginBottom: '1.5rem' }}>100% Solid Kiln-Dried Hardwood Frames</h2>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.8', marginBottom: '1.2rem' }}>
                Most furniture brands use plywood, staples, and cheap plastic webbing that fails within years. At ASK Sofa works, all frames are handcrafted from 100% solid American Oak, Ash, or Mahogany wood.
              </p>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
                Each frame undergoes a rigorous kiln-drying process to reduce moisture levels, preventing warping, bowing, or cracking over decades. Joint corners are double-doweled, glued, and reinforced with corner blocks to handle maximum weights.
              </p>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800" 
                alt="Woodworking craftsmanship" 
                style={{ borderRadius: '4px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
          </div>

          <div className="brand-story-block" style={{ gridTemplateColumns: '1.2fr 1fr', marginTop: '4rem' }}>
            <div style={{ order: 2 }}>
              <span className="subtitle">Luxury Materials</span>
              <h2 className="heading-md" style={{ marginBottom: '1.5rem' }}>Premium Velvets, Italian Leather & Belgian Linens</h2>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.8', marginBottom: '1.2rem' }}>
                The touch of a sofa defines its luxurious character. We procure heavy-weight fabrics from historically renowned European mills.
              </p>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
                Our top-grain aniline Italian leathers develop a gorgeous, unique patina with use, while our textured Belgian linen and cotton-blend velvets undergo rigorous wear-testing to ensure high abrasion resistance. Inside, our pocketed coil seatings provide perfect ergonomic buoyancy.
              </p>
            </div>
            <div style={{ order: 1 }}>
              <img 
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800" 
                alt="Luxury fabrics" 
                style={{ borderRadius: '4px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Statistics / Badges section */}
      <section style={{ backgroundColor: 'var(--color-black)', color: 'var(--color-white)', padding: '5rem 2rem' }}>
        <div className="section-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'var(--color-gold)', display: 'block', lineHeight: 1 }}>20+</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-sand)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Years of Experience</span>
          </div>
          <div>
            <span style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'var(--color-gold)', display: 'block', lineHeight: 1 }}>100%</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-sand)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kiln-Dried Hardwood</span>
          </div>
          <div>
            <span style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'var(--color-gold)', display: 'block', lineHeight: 1 }}>50+</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-sand)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Artisanal Designs</span>
          </div>
          <div>
            <span style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'var(--color-gold)', display: 'block', lineHeight: 1 }}>10k+</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-sand)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Homes Transformed</span>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="section-padding" style={{ textAlign: 'center' }}>
        <div className="section-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="heading-md" style={{ marginBottom: '1.2rem' }}>Experience the Luxury</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
            Book a private gallery consultation in Kavali or explore our designer sofa and bed range online now.
          </p>
          <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center' }}>
            <Link to="/category/sofas" className="btn btn-gold">Shop Sofas</Link>
            <Link to="/contact" className="btn btn-secondary">Contact Showroom</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
