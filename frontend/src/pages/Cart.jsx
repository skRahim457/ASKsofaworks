import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const {
    cart,
    coupon,
    couponSuccess,
    couponError,
    cartSubtotal,
    deliveryCharge,
    discountAmount,
    cartTotal,
    updateQuantity,
    removeFromCart,
    applyPromoCode,
    removePromoCode
  } = useCart();

  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState('');

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (promoInput.trim()) {
      applyPromoCode(promoInput);
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <section className="section-padding">
        <div className="section-container" style={{ textAlign: 'center', padding: '6rem 0' }}>
          <div style={{ fontSize: '3rem', color: 'var(--color-sand)', marginBottom: '1.5rem' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: 'inline-block' }}>
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h2 className="heading-md" style={{ marginBottom: '0.8rem' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Looks like you haven't added any luxury items to your cart yet. Explore our bespoke sofas or designer beds to get started.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/category/sofas" className="btn btn-gold btn-sm">Shop Sofas</Link>
            <Link to="/category/beds" className="btn btn-secondary btn-sm">Shop Beds</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="section-container">
        
        {/* Title */}
        <div style={{ marginBottom: '3rem' }}>
          <span className="subtitle">ASK Sofa works Shopping</span>
          <h1 className="heading-md">Your Design Cart</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Review your customized luxury selections and proceed to delivery details.
          </p>
        </div>

        <div className="cart-layout">
          
          {/* Cart items list */}
          <div className="cart-table-card">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </h3>

            <div>
              {cart.map((item, idx) => (
                <div key={`${item.product_id}-${item.color}-${item.size}-${item.upholstery}-${item.set_type}`} className="cart-item-row">
                  {/* Image */}
                  <img src={item.image_url} alt={item.product_name} className="cart-item-img" />
                  
                  {/* Name & options */}
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">
                      <Link to={`/product/${item.product_id}`}>{item.product_name}</Link>
                    </h4>
                    <span className="cart-item-spec">
                      Color: <strong>{item.color}</strong> &nbsp;|&nbsp; Size: <strong>{item.size}</strong> &nbsp;|&nbsp; Set: <strong>{item.set_type || 'None'}</strong> &nbsp;|&nbsp; Upholstery: <strong>{item.upholstery || 'None'}</strong>
                    </span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="quantity-selector" style={{ height: '36px' }}>
                    <button className="quantity-btn" onClick={() => updateQuantity(item.product_id, item.color, item.size, item.upholstery, item.set_type, -1)}>−</button>
                    <span className="quantity-value" style={{ width: '30px', fontSize: '0.85rem' }}>{item.quantity}</span>
                    <button className="quantity-btn" onClick={() => updateQuantity(item.product_id, item.color, item.size, item.upholstery, item.set_type, 1)}>+</button>
                  </div>

                  {/* Price */}
                  <span className="cart-item-price">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>

                  {/* Trash remove */}
                  <button 
                    className="cart-item-remove-btn"
                    onClick={() => removeFromCart(item.product_id, item.color, item.size, item.upholstery, item.set_type)}
                    title="Remove Item"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
              <Link to="/category/sofas" style={{ fontSize: '0.85rem', color: 'var(--color-gold-dark)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Checkout Totals column */}
          <div>
            <div className="summary-card">
              <h3 className="summary-title">Order Summary</h3>
              
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>₹{cartSubtotal.toLocaleString('en-IN')}</strong>
              </div>

              <div className="summary-row">
                <span>Delivery Charge</span>
                {deliveryCharge === 0 ? (
                  <strong style={{ color: 'var(--color-success)' }}>FREE</strong>
                ) : (
                  <strong>₹{deliveryCharge.toLocaleString('en-IN')}</strong>
                )}
              </div>

              {deliveryCharge > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '-0.8rem', marginBottom: '1.2rem' }}>
                  Add ₹{(15000 - cartSubtotal).toLocaleString('en-IN')} more for <strong>FREE Delivery</strong>
                </div>
              )}

              {coupon && (
                <div className="summary-row" style={{ color: 'var(--color-success)' }}>
                  <span>Promo Discount ({coupon})</span>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <strong>-₹{discountAmount.toLocaleString('en-IN')}</strong>
                    <button onClick={removePromoCode} style={{ color: 'var(--color-error)', fontSize: '0.75rem' }} title="Remove code">✕</button>
                  </div>
                </div>
              )}

              <div className="summary-row summary-total">
                <span>Estimated Total</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Promo input field */}
              <form onSubmit={handleApplyCoupon} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <span className="config-label" style={{ marginBottom: '0.5rem' }}>Promo Code</span>
                <div className="coupon-wrapper">
                  <input 
                    type="text" 
                    placeholder="Enter code (e.g. SOFA10)" 
                    className="form-control"
                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 1rem' }}>Apply</button>
                </div>
                {couponError && <div className="form-error" style={{ fontSize: '0.75rem' }}>{couponError}</div>}
                {couponSuccess && <div style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>{couponSuccess}</div>}
                
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
                  Tip: Try code <strong>SOFA10</strong> for 10% off!
                </div>
              </form>

              <button 
                onClick={handleProceedToCheckout} 
                className="btn btn-primary btn-full"
                style={{ marginTop: '2rem' }}
              >
                Proceed To Checkout
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.2rem', padding: '0.8rem', border: '1px dashed var(--color-sand)', borderRadius: '4px', backgroundColor: 'var(--color-bg-cream)', fontSize: '0.78rem', color: 'var(--color-gold-dark)', fontWeight: 600 }}>
                🚚 Estimated Delivery: Arrives within 15 days of order placement
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                🔒 Secure SSL Checkout & Payment Encryption
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
