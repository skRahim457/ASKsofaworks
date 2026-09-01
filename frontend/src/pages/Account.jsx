import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config';

export default function Account() {
  const { user, token, logout, updateProfile } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation tab state
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile Form state
  const [name, setName] = useState(user ? user.name : '');
  const [mobile, setMobile] = useState(user ? user.mobile || '' : '');
  const [address, setAddress] = useState(user ? user.address || '' : '');
  const [city, setCity] = useState(user ? user.city || '' : '');
  const [state, setState] = useState(user ? user.state || '' : '');
  const [pincode, setPincode] = useState(user ? user.pincode || '' : '');

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  // Geolocation and address search states
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Seller Onboarding states
  const [shopName, setShopName] = useState(user ? user.shop_name || '' : '');
  const [shopAddress, setShopAddress] = useState(user ? user.shop_address || '' : '');
  const [sellerMsg, setSellerMsg] = useState('');
  const [sellerErr, setSellerErr] = useState('');
  const [sellerLoading, setSellerLoading] = useState(false);
  // Inline review states
  const [activeReviewItemId, setActiveReviewItemId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  // Check login
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=account');
    }
  }, [token, navigate]);

  // Sync tab with URL
  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const loadOrders = () => {
    setOrdersLoading(true);
    const localOrders = JSON.parse(localStorage.getItem('ask_sofa_orders') || '[]');
    
    if (!token) {
      setOrders(localOrders);
      setOrdersLoading(false);
      return;
    }

    fetch(`${API_BASE}/orders/my-orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
        } else {
          setOrders(localOrders);
        }
        setOrdersLoading(false);
      })
      .catch((err) => {
        console.warn('Using local orders state:', err.message);
        setOrders(localOrders);
        setOrdersLoading(false);
      });
  };

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, token]);

  const handleCancelCustomerOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Order successfully cancelled');
        loadOrders();
      } else {
        alert(data.message || 'Error cancelling order');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to cancel order due to network issue.');
    }
  };

  const handleQuickReceivedConfirm = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/delivered-by-customer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          delivery_response: 'Received Successfully'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Thank you! Confirmed as Received Successfully.');
        loadOrders();
      } else {
        alert(data.message || 'Error updating confirmation status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error confirming receipt.');
    }
  };

  const handleQuickBillUpload = async (e, orderId, totalPrice) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/delivered-by-customer`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payment_bill_img: base64,
            paid_amount: totalPrice
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Payment confirmation bill uploaded successfully!');
          loadOrders();
        } else {
          alert(data.message || 'Error uploading receipt');
        }
      } catch (err) {
        console.error(err);
        alert('Network error uploading receipt.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInlineReviewSubmit = async (e, productId, orderItemId) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!reviewComment.trim()) {
      setReviewError('Review comment cannot be empty.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/products/${productId}/reviews`, {
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
        setReviewSuccess('Thank you! Your feedback has been submitted successfully.');
        setReviewComment('');
        setReviewRating(5);
        setReviewPhotos([]);
        
        setTimeout(() => {
          loadOrders();
          setActiveReviewItemId(null);
          setReviewSuccess('');
        }, 1500);
      } else {
        setReviewError(data.message || 'Error submitting review');
      }
    } catch (err) {
      console.error(err);
      setReviewError('Network error submitting review');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    try {
      await updateProfile({
        name,
        mobile,
        address,
        city,
        state,
        pincode
      });
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Error updating profile details.');
    }
  };

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

  const handleApplySellerSubmit = async (e) => {
    e.preventDefault();
    setSellerMsg('');
    setSellerErr('');
    if (!shopName.trim() || !shopAddress.trim()) {
      setSellerErr('Shop name and address are required.');
      return;
    }
    setSellerLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/apply-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shop_name: shopName, shop_address: shopAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Application failed');
      setSellerMsg(data.message);
      alert('Seller application submitted! Please wait for admin approval.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      setSellerErr(err.message || 'Failed to submit application.');
    } finally {
      setSellerLoading(false);
    }
  };

  const handleMoveToCart = (product) => {
    addToCart(product, 1, product.colors[0] || 'Standard', product.sizes[0] || 'Standard');
    toggleWishlist(product.id);
    alert(`"${product.name}" moved to your cart!`);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  // Helper: check step completion for tracking UI
  const getStepClass = (status, currentStep) => {
    const orderPipeline = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    const statusIndex = orderPipeline.indexOf(status);
    const stepIndex = orderPipeline.indexOf(currentStep);

    if (statusIndex >= stepIndex) {
      if (statusIndex === stepIndex) return 'tracker-step active';
      return 'tracker-step completed';
    }
    return 'tracker-step';
  };

  return (
    <section className="section-padding">
      <div className="section-container">
        
        {/* Title */}
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span className="subtitle">Client space</span>
            <h1 className="heading-md">My Account</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Manage your personal profile, addresses, wishlist, and track orders.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogoutClick} style={{ color: '#B05B5B', borderColor: '#B05B5B' }}>
            Sign Out
          </button>
        </div>

        {/* Dashboard Structure */}
        <div className="account-layout">
          {/* Sidebar */}
          <aside className="account-sidebar-nav">
            <button 
              className={`account-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); navigate('/account?tab=profile'); }}
            >
              My Profile & Address
            </button>
            <button 
              className={`account-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); navigate('/account?tab=orders'); }}
            >
              My Orders & Tracking
            </button>
            <button 
              className={`account-nav-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
              onClick={() => { setActiveTab('wishlist'); navigate('/account?tab=wishlist'); }}
            >
              Wishlist ({wishlist.length})
            </button>

            {user && user.role !== 'seller' && user.role !== 'admin' && (
              <button 
                className={`account-nav-btn ${activeTab === 'apply-seller' ? 'active' : ''}`}
                onClick={() => { setActiveTab('apply-seller'); navigate('/account?tab=apply-seller'); }}
                style={{ borderTop: '1px dashed var(--color-border)', marginTop: '0.5rem', paddingTop: '0.8rem' }}
              >
                🤝 Sell on ASK Sofa works
              </button>
            )}

            {user && user.role === 'seller' && (
              <Link 
                to="/seller-dashboard" 
                className="account-nav-btn"
                style={{ 
                  display: 'block', 
                  textDecoration: 'none', 
                  backgroundColor: 'var(--color-bg-cream)', 
                  color: 'var(--color-gold-dark)', 
                  fontWeight: 'bold', 
                  textAlign: 'center',
                  marginTop: '1rem',
                  border: '1px solid var(--color-sand)',
                  borderRadius: '4px',
                  padding: '0.8rem 1rem'
                }}
              >
                🏢 Seller Dashboard →
              </Link>
            )}
          </aside>

          {/* Main content container */}
          <div className="account-card">
            
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  Personal Information
                </h2>

                <form onSubmit={handleProfileSubmit}>
                  {profileSuccess && <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{profileSuccess}</div>}
                  {profileError && <div className="form-error" style={{ marginBottom: '1.2rem' }}>{profileError}</div>}

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                    <div className="form-group form-group-full">
                      <label className="form-label">Email Address (Read-only)</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={user ? user.email : ''}
                        disabled
                        style={{ backgroundColor: 'var(--color-light-gray)', color: 'var(--color-text-light)', cursor: 'not-allowed' }}
                      />
                    </div>

                    <div className="form-group form-group-full" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-light-gray)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: 0 }}>Default Delivery Address</h3>
                      <button 
                        type="button" 
                        onClick={handleDetectLocation}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        disabled={detectingLoc}
                      >
                        📍 {detectingLoc ? 'Detecting...' : 'Use Current Location'}
                      </button>
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
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pincode</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '2rem' }}>
                    Save Updates
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: ORDERS */}
            {activeTab === 'orders' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  My Orders & Shipment Tracking
                </h2>

                {ordersLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Loading order list...
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--color-sand)', borderRadius: '4px' }}>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>You have not placed any orders yet.</p>
                    <Link to="/category/sofas" className="btn btn-gold btn-sm">Start Shopping</Link>
                  </div>
                ) : (
                  <div className="customer-orders-list">
                    {orders.map((ord) => {
                      const isExpanded = expandedOrderId === ord.id;
                      
                      return (
                        <div key={ord.id} className="customer-order-card">
                          <div className="customer-order-header">
                            <div>
                              <strong>ORDER ID: #{ord.id}</strong>
                              <span style={{ color: 'var(--color-text-light)', marginLeft: '1rem' }}>
                                Placed: {new Date(ord.created_at).toLocaleDateString()}
                              </span>
                              {(() => {
                                const orderDate = new Date(ord.created_at);
                                const deliveryDate = new Date(orderDate.getTime() + 15 * 24 * 60 * 60 * 1000);
                                return (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-dark)', marginLeft: '1.2rem', fontWeight: 600 }}>
                                    🚚 Est. Delivery: {deliveryDate.toLocaleDateString()}
                                  </span>
                                );
                              })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                color: ord.status === 'Delivered' ? 'var(--color-success)' : 'var(--color-warning)'
                              }}>
                                Status: {ord.status}
                              </span>
                              <button 
                                onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                                style={{ fontWeight: 600, color: 'var(--color-gold-dark)' }}
                              >
                                {isExpanded ? 'Hide Details ▲' : 'Track & View ▼'}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="customer-order-body">
                              {/* Tracker timeline graphic */}
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Status Timeline</h4>
                              
                              {(() => {
                                const isCancelled = ord.status === 'Cancelled' || ord.status === 'Rejected';
                                const isDelivered = ord.status === 'Delivered';
                                
                                let themeColor = 'var(--color-gold)';
                                if (isCancelled) themeColor = 'var(--color-error)';
                                if (isDelivered) themeColor = 'var(--color-success)';
                                
                                if (isCancelled || isDelivered) {
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      padding: '1.2rem',
                                      backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
                                      border: `1px solid ${themeColor}`,
                                      borderRadius: '6px',
                                      margin: '1.5rem 0',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                        <div style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          backgroundColor: themeColor,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.9rem',
                                          color: '#FFF',
                                          fontWeight: 'bold'
                                        }}>
                                          {isCancelled ? '✕' : '✓'}
                                        </div>
                                        <span style={{
                                          fontSize: '0.85rem',
                                          fontWeight: 800,
                                          color: themeColor,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.05em',
                                          marginTop: '0.1rem'
                                        }}>
                                          Order {ord.status}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                          This shipment pipeline transaction is completed.
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }

                                // Otherwise render standard in-progress pipeline steps
                                const steps = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
                                const activeIndex = steps.indexOf(ord.status) !== -1 ? steps.indexOf(ord.status) : 0;
                                const progressWidth = (activeIndex / (steps.length - 1)) * 100;

                                const orderDate = new Date(ord.created_at);
                                const deliveryDate = new Date(orderDate.getTime() + 15 * 24 * 60 * 60 * 1000);
                                const now = new Date();
                                const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const d2 = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
                                const diffTime = d2.getTime() - d1.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                const daysRemaining = diffDays > 0 ? diffDays : 0;

                                return (
                                  <div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-dark)', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.2rem', justifyContent: 'center' }}>
                                      <span>⏰ Delivery Countdown:</span>
                                      <strong style={{ backgroundColor: 'var(--color-bg-cream)', padding: '0.2rem 0.6rem', border: '1px solid var(--color-sand)', borderRadius: '4px' }}>
                                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Arriving today!'}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0 2rem 0', position: 'relative' }}>
                                      <div style={{ position: 'absolute', top: '12px', left: '0', right: '0', height: '3px', backgroundColor: '#E5E7EB', zIndex: 1 }} />
                                      <div style={{ position: 'absolute', top: '12px', left: '0', width: `${progressWidth}%`, height: '3px', backgroundColor: themeColor, zIndex: 2, transition: 'width 0.4s ease' }} />

                                    {steps.map((step, idx) => {
                                      const isPassed = idx <= activeIndex;
                                      return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 3, width: '20%' }}>
                                          <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '50%',
                                            backgroundColor: isPassed ? themeColor : '#FFF',
                                            border: `2px solid ${isPassed ? themeColor : '#E5E7EB'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: isPassed ? '#FFF' : '#9CA3AF',
                                            transition: 'all 0.3s ease'
                                          }}>
                                            {idx + 1}
                                          </div>
                                          <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: isPassed ? 700 : 600,
                                            marginTop: '0.5rem',
                                            color: isPassed ? 'var(--color-gold-dark)' : '#9CA3AF',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em',
                                            textAlign: 'center'
                                          }}>
                                            {step}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                              {ord.status === 'Delivered' && (
                                <div style={{ marginTop: '1.2rem', padding: '1.2rem', backgroundColor: 'rgba(95,122,104,0.03)', border: '1px dashed #5F7A68', borderRadius: '4px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#5F7A68', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      <span>📦 Customer Receipt & Payment Bill Confirmation</span>
                                    </div>

                                    {/* Action Buttons Row */}
                                    {(!ord.delivery_response || !ord.payment_bill_img) && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', borderBottom: (ord.delivery_response || ord.payment_bill_img) ? '1px solid var(--color-sand)' : 'none', paddingBottom: (ord.delivery_response || ord.payment_bill_img) ? '0.8rem' : '0' }}>
                                        {!ord.delivery_response && (
                                          <button
                                            onClick={() => handleQuickReceivedConfirm(ord.id)}
                                            style={{
                                              backgroundColor: '#5F7A68',
                                              color: '#FFF',
                                              border: 'none',
                                              borderRadius: '4px',
                                              padding: '0.5rem 1.2rem',
                                              fontSize: '0.78rem',
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                                            }}
                                          >
                                            👍 Received Successfully
                                          </button>
                                        )}

                                        {!ord.payment_bill_img && (
                                          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            <label
                                              htmlFor={`bill-upload-${ord.id}`}
                                              style={{
                                                backgroundColor: 'var(--color-gold-dark)',
                                                color: '#FFF',
                                                borderRadius: '4px',
                                                padding: '0.5rem 1.2rem',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                                              }}
                                            >
                                              📁 Upload Bill Photo
                                            </label>
                                            <input
                                              id={`bill-upload-${ord.id}`}
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleQuickBillUpload(e, ord.id, ord.total_price)}
                                              style={{ display: 'none' }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Submitted Status Info */}
                                    {(ord.delivery_response || ord.payment_bill_img) && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                                        {ord.delivery_response && (
                                          <>
                                            <strong>Buyer Response:</strong>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                              ✓ {ord.delivery_response}
                                            </span>
                                          </>
                                        )}
                                        {ord.payment_bill_img && (
                                          <>
                                            <strong>Amount Paid:</strong>
                                            <span>₹{ord.paid_amount?.toLocaleString('en-IN') || 0}</span>
                                            
                                            <strong>Bill Receipt:</strong>
                                            <div>
                                              <a href={ord.payment_bill_img} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold-dark)', fontWeight: 'bold', textDecoration: 'underline' }}>
                                                📄 View Payment Bill / Receipt
                                              </a>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Items list */}
                              <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--color-sand)', paddingTop: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Items Ordered</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                  {ord.items.map((item, index) => {
                                    const isReviewFormOpen = activeReviewItemId === item.id;
                                    return (
                                      <div key={index} style={{ borderBottom: '1px solid var(--color-light-gray)', paddingBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={item.image_url} alt={item.product_name} style={{ width: '45px', height: '40px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--color-sand)' }} />
                                            <div>
                                              <strong>{item.product_name}</strong>
                                              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Color: {item.color} | Size: {item.size} | Set: {item.set_type || 'None'} | Upholstery: {item.upholstery || 'None'}</p>
                                            </div>
                                          </div>
                                          
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span>{item.quantity}x ₹{item.price.toLocaleString('en-IN')}</span>
                                            
                                            {ord.status === 'Delivered' && (
                                              <div style={{ minWidth: '120px', textAlign: 'right' }}>
                                                {item.already_reviewed === 1 ? (
                                                  <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.75rem' }}>
                                                    ✓ Feedback Submitted
                                                  </span>
                                                ) : item.feedback_permitted === 1 ? (
                                                  <button
                                                    onClick={() => {
                                                      setActiveReviewItemId(isReviewFormOpen ? null : item.id);
                                                      setReviewError('');
                                                      setReviewSuccess('');
                                                    }}
                                                    className="btn btn-gold btn-sm"
                                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', height: '28px', margin: 0 }}
                                                  >
                                                    {isReviewFormOpen ? 'Cancel' : '✍ Write Review'}
                                                  </button>
                                                ) : (
                                                  <span style={{ color: 'var(--color-text-light)', fontSize: '0.72rem', fontStyle: 'italic' }}>
                                                    ⏳ Pending Permission
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Inline Review Form */}
                                        {isReviewFormOpen && (
                                          <form 
                                            onSubmit={(e) => handleInlineReviewSubmit(e, item.product_id, item.id)}
                                            style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-sand)', borderRadius: '4px', backgroundColor: 'var(--color-bg-cream)', textAlign: 'left' }}
                                          >
                                            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.8rem' }}>Write Feedback for {item.product_name}</h5>
                                            
                                            {reviewError && <div className="form-error" style={{ marginBottom: '0.8rem', fontSize: '0.75rem' }}>{reviewError}</div>}
                                            {reviewSuccess && <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>{reviewSuccess}</div>}

                                            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Rating</label>
                                              <select 
                                                className="form-control"
                                                value={reviewRating}
                                                onChange={(e) => setReviewRating(Number(e.target.value))}
                                                style={{ height: '32px', fontSize: '0.8rem' }}
                                              >
                                                <option value="5">5 Stars - Excellent</option>
                                                <option value="4">4 Stars - Very Good</option>
                                                <option value="3">3 Stars - Good</option>
                                                <option value="2">2 Stars - Fair</option>
                                                <option value="1">1 Star - Poor</option>
                                              </select>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Comment</label>
                                              <textarea 
                                                rows="3" 
                                                className="form-control"
                                                placeholder="Share your experience and product photos here..."
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                                              ></textarea>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Upload Real Room Photos (Optional)</label>
                                              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.3rem' }}>
                                                <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '32px', fontSize: '0.7rem', padding: '0 0.8rem' }}>
                                                  📤 Add Photos
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    multiple 
                                                    onChange={(e) => {
                                                      const files = Array.from(e.target.files);
                                                      files.forEach(file => {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                          setReviewPhotos(prev => [...prev, reader.result]);
                                                        };
                                                        reader.readAsDataURL(file);
                                                      });
                                                    }}
                                                    style={{ display: 'none' }}
                                                  />
                                                </label>
                                                {reviewPhotos.map((photo, i) => (
                                                  <div key={i} style={{ position: 'relative', width: '40px', height: '40px' }}>
                                                    <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CCC' }} />
                                                    <button 
                                                      type="button" 
                                                      onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                      style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>

                                            <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', height: '32px', padding: 0, fontSize: '0.78rem' }}>Submit Feedback</button>
                                          </form>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Shipping summary */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', borderTop: '1px solid var(--color-sand)', paddingTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                                <div>
                                  <strong>Delivery Address:</strong>
                                  <p style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                                    {ord.name}<br />
                                    {ord.address}, {ord.city}<br />
                                    {ord.state} - {ord.pincode}<br />
                                    Phone: {ord.mobile}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <p><strong>Payment Mode:</strong> {ord.payment_method === 'COD' ? 'Cash on Delivery' : ord.payment_method}</p>
                                  <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--color-black)' }}>
                                    Total Paid: ₹{ord.total_price.toLocaleString('en-IN')}
                                  </p>

                                  {(() => {
                                    const orderTime = new Date(ord.created_at + ' UTC');
                                    const now = new Date();
                                    const diffMs = now.getTime() - orderTime.getTime();
                                    const diffHours = diffMs / (1000 * 60 * 60);
                                    
                                    const canCancel = diffHours <= 24 && !['Shipped', 'Delivered', 'Cancelled', 'Rejected'].includes(ord.status);
                                    
                                    if (ord.status === 'Cancelled' || ord.status === 'Rejected') {
                                      return null;
                                    }

                                    return (
                                      <div style={{ marginTop: '1.2rem' }}>
                                        {canCancel ? (
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                                            onClick={() => handleCancelCustomerOrder(ord.id)}
                                          >
                                            ❌ Cancel Order
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', display: 'block', marginTop: '0.5rem' }}>
                                            {['Shipped', 'Delivered'].includes(ord.status) 
                                              ? 'Cannot cancel (Order already processed)' 
                                              : 'Cancellation window closed (24h elapsed)'
                                            }
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WISHLIST */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  My Wishlist ({wishlist.length})
                </h2>

                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--color-sand)', borderRadius: '4px' }}>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Your wishlist is currently empty.</p>
                    <Link to="/category/sofas" className="btn btn-gold btn-sm">Explore Sofas & Beds</Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {wishlist.map((prod) => (
                      <div key={prod.id} className="product-card" style={{ fontSize: '0.9rem' }}>
                        <div className="product-img-wrapper" style={{ aspectRatio: '4/3' }}>
                          <Link to={`/product/${prod.id}`}>
                            <img src={prod.image_url} alt={prod.name} className="product-img" />
                          </Link>
                          <button 
                            className="product-wishlist-btn active"
                            onClick={() => toggleWishlist(prod.id)}
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="product-card-info" style={{ padding: '1rem' }}>
                          <span className="product-card-category" style={{ fontSize: '0.7rem' }}>{prod.material}</span>
                          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                            <Link to={`/product/${prod.id}`}>{prod.name}</Link>
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid var(--color-light-gray)' }}>
                            <strong style={{ color: 'var(--color-black)' }}>₹{prod.price.toLocaleString('en-IN')}</strong>
                            <button 
                              onClick={() => handleMoveToCart(prod)} 
                              className="btn btn-gold btn-sm"
                              style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}
                            >
                              Move To Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: APPLY SELLER */}
            {activeTab === 'apply-seller' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  Register Showroom Details to Start Selling
                </h2>

                {user && user.seller_status === 'pending' ? (
                  <div style={{ padding: '2rem', border: '1px dashed var(--color-sand)', borderRadius: '4px', textAlign: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-gold-dark)', marginBottom: '0.5rem' }}>
                      Application Status: Pending Approval
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      Admin is currently reviewing your showroom application for <strong>"{user.shop_name}"</strong>. We will notify you once approved!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleApplySellerSubmit}>
                    {sellerMsg && <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '1.2rem', fontWeight: 500 }}>{sellerMsg}</div>}
                    {sellerErr && <div className="form-error" style={{ marginBottom: '1.2rem', color: 'var(--color-error)' }}>{sellerErr}</div>}

                    <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                      <label className="form-label">Shop/Showroom Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. ASK Sofas, Kavali Showroom"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.8rem' }}>
                      <label className="form-label">Showroom Physical Address *</label>
                      <textarea 
                        className="form-control" 
                        rows="3"
                        placeholder="Provide the complete physical location of your showroom..."
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        required
                        style={{ padding: '0.8rem', resize: 'vertical' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={sellerLoading}>
                      {sellerLoading ? 'Submitting...' : 'Submit Seller Application'}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}
