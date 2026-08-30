import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config';

export default function Checkout() {
  const { user, token } = useAuth();
  const { cart, cartSubtotal, deliveryCharge, discountAmount, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=checkout');
    }
  }, [token, navigate]);

  // Form states
  const [name, setName] = useState(user ? user.name : '');
  const [mobile, setMobile] = useState(user ? user.mobile || '' : '');
  const [email, setEmail] = useState(user ? user.email : '');
  const [address, setAddress] = useState(user ? user.address || '' : '');
  const [city, setCity] = useState(user ? user.city || '' : '');
  const [state, setState] = useState(user ? user.state || '' : '');
  const [pincode, setPincode] = useState(user ? user.pincode || '' : '');
  
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD', 'UPI', 'Online'
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Address suggestions and Present Location States
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            
            const road = addr.road || '';
            const neighbourhood = addr.neighbourhood || addr.suburb || '';
            const village = addr.village || addr.town || '';
            const streetAddress = [neighbourhood, road, village].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 2).join(',');
            
            setAddress(streetAddress);
            setCity(addr.city || addr.town || addr.village || addr.county || '');
            setState(addr.state || '');
            setPincode(addr.postcode || '');
            alert('Location successfully detected and pre-filled!');
          } else {
            alert('Could not resolve your location to an address.');
          }
        } catch (err) {
          console.error(err);
          alert('Error contacting reverse geocoding service.');
        } finally {
          setDetectingLoc(false);
        }
      },
      (err) => {
        console.error(err);
        alert(`Failed to detect location: ${err.message}`);
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddressChange = async (val) => {
    setAddress(val);
    if (val.trim().length < 4) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&countrycodes=in`);
      if (res.ok) {
        const data = await res.json();
        setAddressSuggestions(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch address suggestions:', err);
    }
  };

  const handleSelectSuggestion = (sug) => {
    const addr = sug.address;
    const road = addr.road || '';
    const neighbourhood = addr.neighbourhood || addr.suburb || '';
    const village = addr.village || addr.town || '';
    const streetAddress = [neighbourhood, road, village].filter(Boolean).join(', ') || sug.display_name.split(',').slice(0, 2).join(',');

    setAddress(streetAddress);
    setCity(addr.city || addr.town || addr.village || addr.county || '');
    setState(addr.state || '');
    setPincode(addr.postcode || '');
    setAddressSuggestions([]);
  };

  // Auto fill form when user object updates
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.mobile) setMobile(user.mobile);
      if (user.address) setAddress(user.address);
      if (user.city) setCity(user.city);
      if (user.state) setState(user.state);
      if (user.pincode) setPincode(user.pincode);
    }
  }, [user]);

  const validateForm = () => {
    const tempErrors = {};
    if (!name.trim()) tempErrors.name = 'Shipping name is required';
    if (!mobile.trim()) {
      tempErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(mobile.trim())) {
      tempErrors.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      tempErrors.email = 'Enter a valid email address';
    }
    if (!address.trim()) tempErrors.address = 'Delivery address is required';
    if (!city.trim()) tempErrors.city = 'City name is required';
    if (!state.trim()) tempErrors.state = 'State name is required';
    if (!pincode.trim()) {
      tempErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode.trim())) {
      tempErrors.pincode = 'Enter a valid 6-digit pincode';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          mobile,
          email,
          address,
          city,
          state,
          pincode,
          total_price: cartTotal,
          payment_method: paymentMethod,
          items: cart
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPlacedOrder(data.orderSummary);
        clearCart();
      } else {
        alert(data.message || 'Error processing your order. Please check item stocks.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error placing order');
    } finally {
      setLoading(false);
    }
  };

  // If order is placed successfully, render Confirmation view
  if (placedOrder) {
    return (
      <div className="order-success-container">
        <div className="order-success-icon">✓</div>
        <h1 className="heading-md" style={{ color: 'var(--color-success)' }}>Order Placed Successfully!</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0' }}>
          Thank you for choosing ASK Sofa works. Your luxury design is being prepared.
        </p>
        
        <div className="order-id-badge">
          ORDER ID: #{placedOrder.id}
        </div>

        <div style={{ textAlign: 'left', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1.5rem', backgroundColor: 'var(--color-light-gray)', marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-sand)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            Delivery Details
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}><strong>Recipient:</strong> {placedOrder.name}</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}><strong>Contact No:</strong> {placedOrder.mobile}</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}><strong>Address:</strong> {placedOrder.address}</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}><strong>Payment Mode:</strong> {placedOrder.payment_method === 'COD' ? 'Cash on Delivery' : placedOrder.payment_method}</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}><strong>Total Charged:</strong> ₹{placedOrder.total_price.toLocaleString('en-IN')}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gold-dark)', fontWeight: 600 }}>
             <strong>Expected Delivery:</strong> {(() => {
               const deliveryDate = new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000);
               return deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
             })()} (Delivering in 15 days)
           </p>

          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-sand)', paddingBottom: '0.5rem', margin: '1.5rem 0 1rem' }}>
            Ordered Items
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {placedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                 <span>{item.quantity}x {item.product_name} ({item.color}, Size: {item.size}, Set: {item.set_type || 'None'}, {item.upholstery || 'None'})</span>
                <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/account?tab=orders" className="btn btn-gold btn-sm">Track Order</Link>
          <Link to="/" className="btn btn-secondary btn-sm">Return to Store</Link>
        </div>
      </div>
    );
  }

  return (
    <section className="section-padding">
      <div className="section-container">
        
        {/* Title */}
        <div style={{ marginBottom: '3rem' }}>
          <span className="subtitle">Secure checkout</span>
          <h1 className="heading-md">Delivery & Payments</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Enter your shipping location and select a premium payment option.
          </p>
        </div>

        <div className="checkout-layout">
          {/* Shipping Form Card */}
          <div className="checkout-form-card">
            <form onSubmit={handlePlaceOrder}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: 0 }}>
                  Shipping Address
                </h3>
                <button 
                  type="button" 
                  onClick={handleDetectLocation}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                  disabled={detectingLoc}
                >
                  📍 {detectingLoc ? 'Detecting...' : 'Use Current Location'}
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number (10 digits)</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                  {errors.mobile && <span className="form-error">{errors.mobile}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                 <div className="form-group form-group-full" style={{ position: 'relative' }}>
                  <label className="form-label">Street Address & Apartment</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="Search address or type your street & house number..."
                  />
                  {errors.address && <span className="form-error">{errors.address}</span>}
                  
                  {addressSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      backgroundColor: '#FFF',
                      border: '1px solid var(--color-sand)',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginTop: '0.4rem',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {addressSuggestions.map((sug, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleSelectSuggestion(sug)}
                          style={{
                            padding: '0.8rem 1rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            borderBottom: idx < addressSuggestions.length - 1 ? '1px solid var(--color-light-gray)' : 'none',
                            color: 'var(--color-text-main)',
                            textAlign: 'left',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-bg-cream)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#FFF'}
                        >
                          📍 {sug.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  {errors.city && <span className="form-error">{errors.city}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                  {errors.state && <span className="form-error">{errors.state}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Pincode (6 digits)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                  {errors.pincode && <span className="form-error">{errors.pincode}</span>}
                </div>
              </div>

              {/* Payment selection */}
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginTop: '2.5rem', marginBottom: '1.5rem' }}>
                Payment Method
              </h3>
              
              <div className="payment-methods-grid">
                <div 
                  className={`payment-card ${paymentMethod === 'COD' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <input type="radio" checked={paymentMethod === 'COD'} readOnly />
                  <div>
                    <span className="payment-card-title">Cash on Delivery (COD)</span>
                    <p className="payment-card-desc">Pay in cash or card upon delivery. White-glove setup included.</p>
                  </div>
                </div>

                <div 
                  className={`payment-card ${paymentMethod === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <input type="radio" checked={paymentMethod === 'UPI'} readOnly />
                  <div>
                    <span className="payment-card-title">Instant UPI Transfer</span>
                    <p className="payment-card-desc">Pay instantly using GooglePay, PhonePe, or BHIM UPI.</p>
                  </div>
                </div>

                <div 
                  className={`payment-card ${paymentMethod === 'Online' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Online')}
                >
                  <input type="radio" checked={paymentMethod === 'Online'} readOnly />
                  <div>
                    <span className="payment-card-title">Secure Online Payment</span>
                    <p className="payment-card-desc">Pay securely using Credit Cards, Debit Cards, or Net Banking.</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-gold btn-full"
                style={{ marginTop: '2.5rem', height: '50px' }}
                disabled={loading}
              >
                {loading ? 'Processing Order...' : `Place Order • ₹${cartTotal.toLocaleString('en-IN')}`}
              </button>
            </form>
          </div>

          {/* Cart review card */}
          <div>
            <div className="summary-card" style={{ position: 'sticky', top: '100px' }}>
              <h3 className="summary-title">Review Items</h3>
              
              <div className="checkout-items-list">
                {cart.map((item, idx) => (
                  <div key={idx} className="checkout-item-preview">
                    <div>
                      <strong>{item.quantity}x</strong> {item.product_name}
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.color} | Size: {item.size} | Set: {item.set_type || 'None'} | {item.upholstery || 'None'}</p>
                    </div>
                    <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>

              <div className="summary-row" style={{ borderTop: '1px solid var(--color-light-gray)', paddingTop: '1rem' }}>
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="summary-row">
                <span>Delivery Charge</span>
                <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toLocaleString('en-IN')}`}</span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-row" style={{ color: 'var(--color-success)' }}>
                  <span>Promo Discount</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="summary-row summary-total">
                <span>Total Amount</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ marginTop: '1.2rem', padding: '0.8rem', border: '1px dashed var(--color-sand)', borderRadius: '4px', backgroundColor: 'var(--color-bg-cream)', fontSize: '0.78rem', color: 'var(--color-gold-dark)', fontWeight: 600, textAlign: 'center' }}>
                🚚 Delivery Promise: Arrives within 15 days of placing order
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
