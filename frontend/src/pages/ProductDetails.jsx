import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { API_BASE } from '../config';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { token, user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  
  // Selection configurations
  const [selectedColor, setSelectedColor] = useState('');
  const [colorType, setColorType] = useState('single'); // 'single' | 'duo'
  const [secondaryColor, setSecondaryColor] = useState('');
  const [upholstery, setUpholstery] = useState('Premium Cloth'); // 'Premium Cloth' | 'Luxury Rexine'
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSetType, setSelectedSetType] = useState('None');
  const [quantity, setQuantity] = useState(1);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchProductDetails = async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/products/${id}`, { headers });
      if (!res.ok) throw new Error('Product not found');
      const data = await res.json();
      
      setProduct(data);
      setActiveImage(data.image_url);
      setSelectedColor(data.colors[0]);
      setSecondaryColor(data.colors[1] || data.colors[0]);
      setSelectedSize(data.sizes[0] || 'Standard');
      setSelectedSetType(data.set_types && data.set_types.length > 0 ? data.set_types[0] : 'None');
      if (data.upholstery_types && data.upholstery_types.length > 0) {
        const defaultUph = data.upholstery_types[0] === 'Cloth' ? 'Premium Cloth' : data.upholstery_types[0] === 'Rexine' ? 'Luxury Rexine' : data.upholstery_types[0];
        setUpholstery(defaultUph);
      } else {
        setUpholstery('None');
      }
      
      // Fetch related products
      const relRes = await fetch(`${API_BASE}/products?category=${data.category}`);
      const relData = await relRes.json();
      // Filter out current product
      setRelatedProducts(relData.filter(p => p.id !== data.id).slice(0, 3));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProductDetails();
  }, [id, token]);

  const handleQtyChange = (val) => {
    const nextQty = quantity + val;
    if (nextQty >= 1 && nextQty <= product.stock) {
      setQuantity(nextQty);
    }
  };

  const handleAddToCartClick = () => {
    if (product.stock === 0) return;
    const finalColor = colorType === 'duo' ? `${selectedColor} + ${secondaryColor}` : selectedColor;
    addToCart(product, quantity, finalColor, selectedSize, upholstery, selectedSetType);
    alert(`Successfully added ${quantity}x "${product.name}" in ${finalColor} | Size: ${selectedSize} | Set: ${selectedSetType} | Upholstery: ${upholstery} to your cart!`);
  };

  const handleBuyNowClick = () => {
    if (product.stock === 0) return;
    const finalColor = colorType === 'duo' ? `${selectedColor} + ${secondaryColor}` : selectedColor;
    addToCart(product, quantity, finalColor, selectedSize, upholstery, selectedSetType);
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!token) {
      setSubmitError('You must be logged in to leave a review.');
      return;
    }

    if (!reviewComment.trim()) {
      setSubmitError('Review comment cannot be empty.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          real_images: reviewPhotos
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProduct((prev) => ({
          ...prev,
          reviewsList: data,
          review_count: data.length,
          rating: data.reduce((sum, r) => sum + r.rating, 0) / data.length
        }));
        setReviewComment('');
        setReviewRating(5);
        setReviewPhotos([]);
        setSubmitSuccess('Thank you! Your review has been submitted successfully.');
      } else {
        setSubmitError(data.message || 'Error submitting review');
      }
    } catch (error) {
      console.error(error);
      setSubmitError('Network error submitting review');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem', color: 'var(--color-text-muted)' }}>
        Preparing product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem' }}>
        <h2>Product Not Found</h2>
        <p style={{ margin: '1rem 0' }}>The product you are looking for does not exist or has been removed.</p>
        <Link to="/" className="btn btn-gold">Return to Home</Link>
      </div>
    );
  }

  const hasDiscount = product.discount_price !== null;
  const isStarred = isInWishlist(product.id);

  return (
    <section className="section-padding">
      <div className="section-container">
        
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '3rem', display: 'flex', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Link to="/">Home</Link> / 
          <Link to={`/category/${product.category}`}>{product.category}</Link> / 
          <span style={{ color: 'var(--color-black)', fontWeight: 500 }}>{product.name}</span>
        </div>

        <div className="product-details-grid">
          
          {/* Left Gallery column */}
          <div className="gallery-container">
            <div className="gallery-main">
              <img src={activeImage} alt={product.name} />
            </div>
            
            <div className="gallery-thumbnails">
              {/* Main Image Thumbnail */}
              <div 
                className={`gallery-thumb ${activeImage === product.image_url ? 'active' : ''}`}
                onClick={() => setActiveImage(product.image_url)}
              >
                <img src={product.image_url} alt="Main view" />
              </div>
              
              {/* Additional Images Thumbnails */}
              {product.additional_images && product.additional_images.map((img, idx) => (
                <div 
                  key={idx}
                  className={`gallery-thumb ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`Angle ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right details column */}
          <div className="details-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="details-category">{product.material}</span>
                <h1 className="details-title">{product.name}</h1>
              </div>
              <button 
                className={`product-wishlist-btn ${isStarred ? 'active' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                style={{ position: 'static', border: '1px solid var(--color-sand)' }}
                aria-label="Wishlist"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>

            <div className="details-rating">
              <div className="rating-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < Math.round(product.rating || 5) ? 'var(--color-gold)' : 'var(--color-sand)' }}>★</span>
                ))}
              </div>
              <span className="rating-count" style={{ fontSize: '0.85rem' }}>
                {product.rating ? product.rating.toFixed(1) : '5.0'} ({product.review_count} Reviews)
              </span>
            </div>

            <div className="details-price-row">
              {hasDiscount ? (
                <>
                  <span className="details-price-current">₹{product.discount_price.toLocaleString('en-IN')}</span>
                  <span className="details-price-original">₹{product.price.toLocaleString('en-IN')}</span>
                  <span className="badge badge-sale" style={{ marginLeft: '1rem' }}>
                    Save ₹{(product.price - product.discount_price).toLocaleString('en-IN')}
                  </span>
                </>
              ) : (
                <span className="details-price-current">₹{product.price.toLocaleString('en-IN')}</span>
              )}
            </div>

            <p className="details-desc">{product.description}</p>

            {/* Spec breakdown */}
            <div className="details-meta-list">
              <div className="details-meta-item">
                <strong>Material Craftsmanship</strong>
                {product.material}
              </div>
              <div className="details-meta-item">
                <strong>Availability Status</strong>
                {product.stock > 0 ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>In Stock ({product.stock} left)</span>
                ) : (
                  <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Out of Stock</span>
                )}
              </div>
            </div>

            {/* Configurator 1: Colors */}
            <div className="config-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="config-label" style={{ margin: 0 }}>
                  Selected Color:{' '}
                  <strong style={{ color: 'var(--color-gold-dark)' }}>
                    {colorType === 'duo' ? `${selectedColor} + ${secondaryColor}` : selectedColor}
                  </strong>
                </span>
                
                {/* Single/Duo Switcher */}
                <div style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.2rem', backgroundColor: 'var(--color-light-gray)' }}>
                  <button 
                    type="button"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '3px', border: 'none', backgroundColor: colorType === 'single' ? '#FFF' : 'transparent', fontWeight: 600, color: colorType === 'single' ? 'var(--color-black)' : 'var(--color-text-muted)', cursor: 'pointer' }}
                    onClick={() => { setColorType('single'); }}
                  >
                    Single Color
                  </button>
                  <button 
                    type="button"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '3px', border: 'none', backgroundColor: colorType === 'duo' ? '#FFF' : 'transparent', fontWeight: 600, color: colorType === 'duo' ? 'var(--color-black)' : 'var(--color-text-muted)', cursor: 'pointer' }}
                    onClick={() => { setColorType('duo'); }}
                  >
                    Duo Color (Mix)
                  </button>
                </div>
              </div>

              {/* Primary Color Selection */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {colorType === 'duo' ? 'Primary Upholstery Color:' : 'Choose Color:'}
                </span>
                <div className="config-options">
                  {product.colors.map((color) => {
                    let colorValue = '#FFF';
                    if (color.toLowerCase().includes('green')) colorValue = '#1B3B2B';
                    else if (color.toLowerCase().includes('blue')) colorValue = '#1A334F';
                    else if (color.toLowerCase().includes('cream') || color.toLowerCase().includes('ivory')) colorValue = '#FAF2E6';
                    else if (color.toLowerCase().includes('grey')) colorValue = '#6E6E6E';
                    else if (color.toLowerCase().includes('charcoal')) colorValue = '#3A3A3A';
                    else if (color.toLowerCase().includes('brown')) colorValue = '#5C4033';
                    else if (color.toLowerCase().includes('tan')) colorValue = '#D2B48C';
                    else if (color.toLowerCase().includes('beige')) colorValue = '#F5F5DC';
                    else if (color.toLowerCase().includes('walnut')) colorValue = '#4E3629';
                    else if (color.toLowerCase().includes('oak') || color.toLowerCase().includes('pine')) colorValue = '#C29F6C';
                    else if (color.toLowerCase().includes('white')) colorValue = '#FFF';
                    
                    return (
                      <button 
                        key={color}
                        className={`config-color-btn ${selectedColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: colorValue }}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Secondary Color Selection (Duo mode only) */}
              {colorType === 'duo' && (
                <div style={{ marginTop: '0.8rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.8rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Secondary Accent/Base Color:
                  </span>
                  <div className="config-options">
                    {product.colors.map((color) => {
                      let colorValue = '#FFF';
                      if (color.toLowerCase().includes('green')) colorValue = '#1B3B2B';
                      else if (color.toLowerCase().includes('blue')) colorValue = '#1A334F';
                      else if (color.toLowerCase().includes('cream') || color.toLowerCase().includes('ivory')) colorValue = '#FAF2E6';
                      else if (color.toLowerCase().includes('grey')) colorValue = '#6E6E6E';
                      else if (color.toLowerCase().includes('charcoal')) colorValue = '#3A3A3A';
                      else if (color.toLowerCase().includes('brown')) colorValue = '#5C4033';
                      else if (color.toLowerCase().includes('tan')) colorValue = '#D2B48C';
                      else if (color.toLowerCase().includes('beige')) colorValue = '#F5F5DC';
                      else if (color.toLowerCase().includes('walnut')) colorValue = '#4E3629';
                      else if (color.toLowerCase().includes('oak') || color.toLowerCase().includes('pine')) colorValue = '#C29F6C';
                      else if (color.toLowerCase().includes('white')) colorValue = '#FFF';

                      return (
                        <button 
                          key={`sec-${color}`}
                          className={`config-color-btn ${secondaryColor === color ? 'active' : ''}`}
                          style={{ backgroundColor: colorValue }}
                          onClick={() => setSecondaryColor(color)}
                          title={color}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Configurator 2a: Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="config-group">
                <span className="config-label">Selected Size: <strong style={{ color: 'var(--color-gold-dark)' }}>{selectedSize}</strong></span>
                <div className="config-options">
                  {product.sizes.map((size) => (
                    <button 
                      key={size}
                      className={`config-size-btn ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Configurator 2b: Set Types */}
            {product.set_types && product.set_types.length > 0 && (
              <div className="config-group" style={{ marginTop: '1.2rem' }}>
                <span className="config-label">Selected Set Type: <strong style={{ color: 'var(--color-gold-dark)' }}>{selectedSetType}</strong></span>
                <div className="config-options">
                  {product.set_types.map((type) => (
                    <button 
                      key={type}
                      className={`config-size-btn ${selectedSetType === type ? 'active' : ''}`}
                      onClick={() => setSelectedSetType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Configurator 3: Upholstery Type (If available for this product) */}
            {product.upholstery_types && product.upholstery_types.length > 0 && (
              <div className="config-group" style={{ marginTop: '1.2rem' }}>
                <span className="config-label">Upholstery Material Type: <strong style={{ color: 'var(--color-gold-dark)' }}>{upholstery}</strong></span>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                  {product.upholstery_types.map((type) => {
                    const uphName = type === 'Cloth' ? 'Premium Cloth' : type === 'Rexine' ? 'Luxury Rexine' : type;
                    const uphDesc = type === 'Cloth' ? 'Breathable luxury fabric' : type === 'Rexine' ? 'Premium artificial leather' : 'Custom upholstery';
                    const isSelected = upholstery === uphName;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setUpholstery(uphName)}
                        style={{
                          flex: 1,
                          border: isSelected ? '2px solid var(--color-gold-dark)' : '1px solid var(--color-border)',
                          borderRadius: '6px',
                          padding: '0.6rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-bg-cream)' : '#FFF',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-black)' }}>{uphName}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{uphDesc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Checkout CTA */}
            {product.stock > 0 ? (
              <div className="purchase-block">
                <div className="quantity-selector">
                  <button className="quantity-btn" onClick={() => handleQtyChange(-1)} disabled={quantity <= 1}>−</button>
                  <span className="quantity-value">{quantity}</span>
                  <button className="quantity-btn" onClick={() => handleQtyChange(1)} disabled={quantity >= product.stock}>+</button>
                </div>
                
                <div className="purchase-actions">
                  <button className="btn btn-secondary btn-full" onClick={handleAddToCartClick}>Add To Cart</button>
                  <button className="btn btn-primary btn-full" onClick={handleBuyNowClick}>Buy Now</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary btn-full" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Out of Stock
              </button>
            )}
          </div>
        </div>

        {/* Related Products Showcase */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '5rem', borderTop: '1px solid var(--color-border)', paddingTop: '4rem' }}>
            <h2 className="heading-md" style={{ marginBottom: '2.5rem' }}>Related Furnitures</h2>
            <div className="products-grid">
              {relatedProducts.map((prod) => {
                const hasDisc = prod.discount_price !== null;
                const star = isInWishlist(prod.id);
                return (
                  <div key={prod.id} className="product-card">
                    <div className="product-img-wrapper">
                      <Link to={`/product/${prod.id}`}>
                        <img src={prod.image_url} alt={prod.name} className="product-img" />
                      </Link>
                      
                      {/* Rating Badge Overlay */}
                      <div className="rating-badge">
                        <span>{prod.rating ? prod.rating.toFixed(1) : '5.0'}</span>
                        <span>★</span>
                      </div>

                      <button 
                        className={`product-wishlist-btn ${star ? 'active' : ''}`}
                        onClick={() => toggleWishlist(prod.id)}
                        aria-label="Wishlist"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={star ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
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
                          {hasDisc ? (
                            <>
                              <span className="price-current">₹{prod.discount_price.toLocaleString('en-IN')}</span>
                              <span className="price-original">₹{prod.price.toLocaleString('en-IN')}</span>
                              <span className="discount-pct">{Math.round(((prod.price - prod.discount_price) / prod.price) * 100)}% OFF</span>
                            </>
                          ) : (
                            <span className="price-current">₹{prod.price.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer reviews section */}
        <div className="reviews-section">
          <div className="reviews-grid">
            
            {/* Reviews Metrics & Add Review Form */}
            <div>
              <div className="reviews-stats-card">
                <span className="subtitle">Client Feedback</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '1.5rem' }}>Average Ratings</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', marginBottom: '1rem' }}>
                  <span className="reviews-large-number">{product.rating ? product.rating.toFixed(1) : '5.0'}</span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>out of 5.0</span>
                </div>
                <div className="rating-stars" style={{ marginBottom: '1.5rem', display: 'flex' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: i < Math.round(product.rating || 5) ? 'var(--color-gold)' : 'var(--color-sand)', fontSize: '1.2rem' }}>★</span>
                  ))}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  Based on {product.review_count} customer reviews
                </span>

                <div style={{ padding: '1.2rem', border: '1px dashed var(--color-sand)', borderRadius: '4px', backgroundColor: 'var(--color-bg-cream)', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4, textAlign: 'center' }}>
                  📝 <strong>How to write a review:</strong><br />
                  Reviews and real room photo feedback can be submitted directly from the <strong>My Orders</strong> tab in your customer account page after your delivery has arrived and review permission is unlocked by the showroom.
                </div>
              </div>
            </div>

            {/* List of customer comments */}
            <div className="reviews-list">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: '1rem' }}>Customer Reviews ({product.reviewsList ? product.reviewsList.length : 0})</h3>
              
              {/* Customer Photo Gallery Banner */}
              {product.reviewsList && product.reviewsList.some(r => r.real_images && r.real_images.length > 0) && (
                <div style={{ marginBottom: '2.5rem', backgroundColor: 'var(--color-bg-cream)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--color-sand)' }}>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', marginBottom: '0.8rem', color: 'var(--color-gold-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📸 Customer Room Placements
                  </h4>
                  <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
                    {product.reviewsList
                      .filter(r => r.real_images && r.real_images.length > 0)
                      .flatMap(r => r.real_images)
                      .map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt="Customer Room Placement" 
                          onClick={() => window.open(img, '_blank')}
                          style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', flexShrink: 0, border: '1px solid #FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                      ))}
                  </div>
                </div>
              )}

              {product.reviewsList && product.reviewsList.length === 0 ? (
                <div style={{ padding: '3rem 0', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No client reviews yet. Be the first to review this furniture item!
                </div>
              ) : (
                product.reviewsList && product.reviewsList.map((rev) => (
                  <div key={rev.id} className="review-item">
                    <div className="review-header">
                      <span className="review-author">{rev.user_name}</span>
                      <span className="review-date">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="rating-stars" style={{ marginBottom: '0.6rem', display: 'flex' }}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span key={idx} style={{ color: idx < rev.rating ? 'var(--color-gold)' : 'var(--color-sand)' }}>★</span>
                      ))}
                    </div>
                    <p className="review-comment">{rev.comment}</p>

                    {/* Render Real Review Photos */}
                    {rev.real_images && rev.real_images.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                        {rev.real_images.map((img, index) => (
                          <img 
                            key={index} 
                            src={img} 
                            alt={`Real review upload ${index}`}
                            onClick={() => window.open(img, '_blank')}
                            style={{ 
                              width: '80px', 
                              height: '80px', 
                              objectFit: 'cover', 
                              borderRadius: '4px', 
                              border: '1px solid var(--color-sand)', 
                              cursor: 'zoom-in',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
