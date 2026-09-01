import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { API_BASE } from '../config';

export default function Home() {
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [sofaDeals, setSofaDeals] = useState([]);
  const [luxuryBeds, setLuxuryBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scroll Container Refs
  const suggestedTrackRef = useRef(null);
  const sofaTrackRef = useRef(null);
  const bedTrackRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((res) => res.json())
      .then((data) => {
        const productList = Array.isArray(data) ? data : [];
        // Suggested: Mix of items
        setSuggestedProducts(productList);
        
        // Sofa deals: Include all custom sofa categories (sofas, l-shape, corner, sets)
        const sofas = productList.filter(p => p && p.category && ['sofas', 'l-shape-sofas', 'corner-sofas', 'sofa-sets'].includes(p.category));
        setSofaDeals(sofas);

        // Luxury beds: Beds
        const beds = productList.filter(p => p && p.category === 'beds');
        setLuxuryBeds(beds);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading products:', err);
        setLoading(false);
      });
  }, []);

  const handleScroll = (ref, direction) => {
    if (ref.current) {
      const scrollOffset = 540; // Approx 2 card widths
      ref.current.scrollLeft += direction === 'left' ? -scrollOffset : scrollOffset;
    }
  };

  // Helper component to render slider rows
  const ProductSliderRow = ({ title, products, trackRef, viewAllPath }) => {
    if (products.length === 0) return null;

    return (
      <div className="slider-wrapper">
        <div className="slider-header">
          <h2 className="slider-title">{title}</h2>
          <Link to={viewAllPath} className="slider-view-all">View All</Link>
        </div>

        {/* Scroll Track */}
        <div className="slider-container-track" ref={trackRef}>
          {products.map((prod) => {
            const hasDiscount = prod.discount_price !== null;
            const priceToDisplay = hasDiscount ? prod.discount_price : prod.price;
            const originalPrice = prod.price;
            const discountPct = hasDiscount 
              ? Math.round(((originalPrice - priceToDisplay) / originalPrice) * 100)
              : 0;

            const isStarred = isInWishlist(prod.id);

            return (
              <div key={prod.id} className="product-card">
                <div className="product-img-wrapper">
                  <Link to={`/product/${prod.id}`}>
                    <img src={prod.image_url} alt={prod.name} className="product-img" />
                  </Link>
                  
                  {/* Overlay Green Rating Badge */}
                  <div className="rating-badge">
                    <span>{prod.rating ? prod.rating.toFixed(1) : '5.0'}</span>
                    <span>★</span>
                  </div>

                  {/* Wishlist toggle */}
                  <button 
                    className={`product-wishlist-btn ${isStarred ? 'active' : ''}`}
                    onClick={() => toggleWishlist(prod.id)}
                    aria-label="Wishlist"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                </div>
                
                <div className="product-card-info">
                  <span className="product-card-category">{prod.material}</span>
                  <h3 className="product-card-title">
                    <Link to={`/product/${prod.id}`} title={prod.name}>{prod.name}</Link>
                  </h3>
                  
                  <div className="product-card-footer">
                    <div className="price-block">
                      <span className="price-current">₹{priceToDisplay.toLocaleString('en-IN')}</span>
                      {hasDiscount && (
                        <>
                          <span className="price-original">₹{originalPrice.toLocaleString('en-IN')}</span>
                          <span className="discount-pct">{discountPct}% OFF</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll Arrows */}
        <button 
          className="slider-arrow slider-arrow-left" 
          onClick={() => handleScroll(trackRef, 'left')}
          aria-label="Scroll left"
        >
          &lt;
        </button>
        <button 
          className="slider-arrow slider-arrow-right" 
          onClick={() => handleScroll(trackRef, 'right')}
          aria-label="Scroll right"
        >
          &gt;
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Flipkart-Style Banner Grid Area */}
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

      {/* Main Sliders Content */}
      <section className="section-padding" style={{ paddingTop: '0.5rem' }}>
        <div className="section-container">
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
              Polishing our furniture catalog...
            </div>
          ) : (
            <>
              {/* Row 1: Suggested For You */}
              <ProductSliderRow 
                title="Suggested For You" 
                products={suggestedProducts} 
                trackRef={suggestedTrackRef} 
                viewAllPath="/category/sofas"
              />

              {/* Row 2: Trending Sofa Deals */}
              <ProductSliderRow 
                title="Trending Sofa Deals" 
                products={sofaDeals} 
                trackRef={sofaTrackRef} 
                viewAllPath="/category/sofas"
              />

              {/* Row 3: Premium Beds */}
              <ProductSliderRow 
                title="Premium Beds & Frames" 
                products={luxuryBeds} 
                trackRef={bedTrackRef} 
                viewAllPath="/category/beds"
              />
            </>
          )}

        </div>
      </section>
    </div>
  );
}
