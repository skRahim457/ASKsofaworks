import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { API_BASE } from '../config';
import { fallbackProducts } from '../data/fallbackData';

export default function Home() {
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Initialize immediately with fallback data so product cards appear without delay
  const [products, setProducts] = useState(fallbackProducts);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => {
        console.warn('Using fallback products data:', err.message);
      });
  }, []);

  // Category definitions for Section 2
  const categoriesList = [
    {
      id: 'sofas',
      title: 'Sofas',
      subtitle: 'Chesterfields & Plush Fabric Sofas',
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'beds',
      title: 'Beds',
      subtitle: 'Velvet Tufted & Teakwood Platform Beds',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'corner-sofas',
      title: 'Corner Sofas',
      subtitle: 'Curved Boucle & Modern Corner Sectionals',
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'l-shape-sofas',
      title: 'L-Shape Sofas',
      subtitle: 'Spacious Cloud Sectionals & Modular Seating',
      image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'sofa-sets',
      title: 'Sofa Sets',
      subtitle: 'Complete 3+1+1 Living Room Sets',
      image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'wooden-sets',
      title: 'Wooden Sets',
      subtitle: '100% Solid Kavali Teakwood Dining & Furniture',
      image: 'https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg-cream)' }}>
      {/* ==========================================================================
         HERO SECTION (UNTOUCHED)
         ========================================================================== */}
      <section className="homepage-banner">
        <div className="banner-grid">
          
          {/* Main big Ad banner */}
          <div className="banner-main">
            <img 
              src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=1400" 
              alt="ASK Sofa works showroom" 
              className="banner-img"
            />
            <div className="banner-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)' }}></div>
            <div className="banner-content">
              <span className="subtitle" style={{ color: 'var(--color-gold)' }}>Limited Time Deals</span>
              <h1 className="heading-lg" style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>Transform Your Space</h1>
              <p style={{ color: '#E2E8F0', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '450px' }}>
                Handcrafted premium Chesterfield sofas and luxury velvet wingback beds. Built to last a lifetime.
              </p>
              <div>
                <Link to="/category/sofas" className="btn btn-gold btn-sm">Shop Sofa Collection</Link>
              </div>
            </div>
          </div>

          {/* Side promotion box */}
          <div className="banner-side">
            <span className="subtitle">Bespoke Customization</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.6rem' }}>Indian Wood Artistry</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', lineHeight: '1.6', marginBottom: '1.2rem' }}>
              Every single piece can be customized by color, size, and material. Visit our showroom or message us on WhatsApp to book a private consult.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <Link to="/about" className="btn btn-primary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>Our Craft</Link>
              <Link to="/contact" className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>Contact Us</Link>
            </div>
          </div>

        </div>
      </section>

      {/* ==========================================================================
         SECTION 1: FEATURED COLLECTION
         ========================================================================== */}
      <section className="section-padding" style={{ paddingTop: '1rem', paddingBottom: '3.5rem' }}>
        <div className="section-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="subtitle" style={{ color: 'var(--color-gold-dark)' }}>Kavali Handcrafted Masterpieces</span>
              <h2 className="heading-md" style={{ margin: 0 }}>Featured Collection</h2>
            </div>
            <Link to="/category/all" className="btn btn-gold btn-sm">Explore All Products ({products.length})</Link>
          </div>

          <div className="products-grid">
            {products.slice(0, 6).map((prod) => {
              const hasDiscount = prod.discount_price !== null;
              const priceToDisplay = hasDiscount ? prod.discount_price : prod.price;
              const starred = isInWishlist(prod.id);

              return (
                <div key={prod.id} className="product-card">
                  <div className="product-img-wrapper">
                    <Link to={`/product/${prod.id}`}>
                      <img src={prod.image_url} alt={prod.name} className="product-img" />
                    </Link>
                    
                    <div className="rating-badge">
                      <span>{prod.rating ? prod.rating.toFixed(1) : '5.0'}</span>
                      <span>★</span>
                    </div>

                    <button 
                      className={`product-wishlist-btn ${starred ? 'active' : ''}`}
                      onClick={() => toggleWishlist(prod.id)}
                      aria-label="Wishlist"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="product-card-info">
                    <span className="product-card-category">{prod.material}</span>
                    <h3 className="product-card-title">
                      <Link to={`/product/${prod.id}`}>{prod.name}</Link>
                    </h3>
                    
                    <div className="product-card-footer">
                      <div className="price-block">
                        <span className="price-current">₹{priceToDisplay.toLocaleString('en-IN')}</span>
                        {hasDiscount && (
                          <>
                            <span className="price-original">₹{prod.price.toLocaleString('en-IN')}</span>
                            <span className="discount-pct">{Math.round(((prod.price - priceToDisplay) / prod.price) * 100)}% OFF</span>
                          </>
                        )}
                      </div>
                      <Link to={`/product/${prod.id}`} className="btn btn-primary btn-sm btn-full" style={{ marginTop: '0.75rem' }}>
                        View Product
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==========================================================================
         SECTION 2: CATEGORY SECTION
         ========================================================================== */}
      <section className="section-padding" style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '3.5rem 1.5rem' }}>
        <div className="section-container">
          <div className="home-section-header">
            <span className="subtitle">Explore Our Furniture Lines</span>
            <h2 className="heading-md">Browse Categories</h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
              From solid Teakwood dining sets to cloud sectionals and velvet platform beds—discover handcrafted perfection for every room.
            </p>
          </div>

          <div className="home-categories-grid">
            {categoriesList.map((cat) => (
              <Link key={cat.id} to={`/category/${cat.id}`} className="category-card">
                <img src={cat.image} alt={cat.title} className="category-card-img" />
                <div className="category-card-overlay">
                  <h3 className="category-card-title">{cat.title}</h3>
                  <p className="category-card-desc">{cat.subtitle}</p>
                  <span className="category-card-link">
                    Explore Collection &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================================
         SECTION 3: CUSTOM FURNITURE SECTION
         ========================================================================== */}
      <section className="section-padding" style={{ padding: '3.5rem 1.5rem' }}>
        <div className="section-container">
          <div className="custom-furniture-banner">
            <div className="custom-furniture-grid">
              <div>
                <span className="subtitle" style={{ color: 'var(--color-gold)' }}>Tailored For Your Home</span>
                <h2 className="heading-lg" style={{ color: '#FFFFFF', marginBottom: '1rem' }}>Bespoke Custom Furniture</h2>
                <p style={{ color: '#CBD5E1', fontSize: '0.98rem', lineHeight: '1.65', marginBottom: '2rem' }}>
                  At ASK Sofa works, we believe your living space deserves furniture built to your exact specifications. Choose your frame material (100% Solid Kavali Teakwood or Seasoned Timber), select from 50+ upholstery fabrics (Italian Velvet, Stonewashed Linen, Boucle, Luxury Rexine), pick custom dimensions, or create dual-tone color combinations—our master artisans will craft it to perfection.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link to="/contact" className="btn btn-gold">
                    Customize Your Furniture
                  </Link>
                  <a 
                    href="https://wa.me/917995585087?text=Hello%20ASK%20Sofa%20works,%20I%20would%20like%20to%20request%20a%20custom%20furniture%20quote."
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-secondary"
                    style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    WhatsApp Consultation
                  </a>
                </div>
              </div>

              <div className="custom-pills-list">
                <div className="custom-pill-item">
                  <span className="custom-pill-icon">🎨</span>
                  <span className="custom-pill-text">50+ Fabric & Leather Shades</span>
                </div>
                <div className="custom-pill-item">
                  <span className="custom-pill-icon">📏</span>
                  <span className="custom-pill-text">Made-To-Measure Sizing</span>
                </div>
                <div className="custom-pill-item">
                  <span className="custom-pill-icon">🪵</span>
                  <span className="custom-pill-text">100% Solid Kavali Teak Wood</span>
                </div>
                <div className="custom-pill-item">
                  <span className="custom-pill-icon">✨</span>
                  <span className="custom-pill-text">Dual-Tone Fabric Mixing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
         SECTION 4: WHY CHOOSE US SECTION
         ========================================================================== */}
      <section className="section-padding" style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-border)', padding: '3.5rem 1.5rem' }}>
        <div className="section-container">
          <div className="home-section-header">
            <span className="subtitle">The ASK Sofa Works Guarantee</span>
            <h2 className="heading-md">Why Choose Us</h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
              Built with historic Indian woodworking artistry and delivered directly to your home with lifetime structural warranty.
            </p>
          </div>

          <div className="why-choose-us-grid">
            <div className="why-card">
              <div className="why-icon-box">🏆</div>
              <h3 className="why-card-title">Premium Quality</h3>
              <p className="why-card-desc">
                Hand-selected 100% solid Kavali teak wood, kiln-dried hardwood frames, high-density foam, and stain-resistant luxury upholstery.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-box">✏️</div>
              <h3 className="why-card-title">Custom Designs</h3>
              <p className="why-card-desc">
                Tailored dimensions, fabric choices, and dual-tone color mixing built specifically for your living space and room layout.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-box">💎</div>
              <h3 className="why-card-title">Affordable Pricing</h3>
              <p className="why-card-desc">
                Direct workshop-to-home pricing with zero middleman or retail showroom markups—luxury furniture at honest prices.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-box">🤝</div>
              <h3 className="why-card-title">Trusted Craftsmanship</h3>
              <p className="why-card-desc">
                Master Indian artisans with decades of traditional woodworking experience, reinforced joinery, and lifetime durability.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
