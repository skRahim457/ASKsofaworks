import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [pincode, setPincode] = useState(localStorage.getItem('ask_sofa_pincode') || '');

  const userDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Directs to the sofas category page with search query parameter (which can search across all items)
      navigate(`/category/sofas?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectLocation = () => {
    const entered = prompt('Enter delivery pincode (6 digits):', pincode || '632014');
    if (entered !== null) {
      if (/^\d{6}$/.test(entered.trim())) {
        localStorage.setItem('ask_sofa_pincode', entered.trim());
        setPincode(entered.trim());
        alert(`Delivery location updated to pincode: ${entered.trim()}`);
      } else {
        alert('Invalid pincode. Please enter a 6-digit number.');
      }
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      setUserDropdownOpen(false);
      navigate('/');
    }
  };

  const isCatActive = (cat) => location.pathname === `/category/${cat}`;

  return (
    <header className="header">
      {/* Top Main Header */}
      <div className="nav-container">
        
        {/* Logo */}
        <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <img src="/logo.png" alt="ASK" style={{ height: '40px', objectFit: 'contain' }} />
          <span className="logo-text-label" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-black)', fontFamily: 'var(--font-serif)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            ASK sofa works
          </span>
        </Link>

        {/* Large Centered Permanent Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon-inside">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search for premium sofas, beds, dining sets, materials..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Actions Area */}
        <div className="nav-actions">
          
          {/* More Dropdown */}
          <div style={{ position: 'relative' }} ref={moreDropdownRef}>
            <button 
              className="nav-action-btn"
              onClick={() => {
                setMoreDropdownOpen(!moreDropdownOpen);
                setUserDropdownOpen(false);
              }}
              title="More Options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="19" cy="12" r="1.5"></circle>
                <circle cx="5" cy="12" r="1.5"></circle>
              </svg>
            </button>
            
            {moreDropdownOpen && (
              <div className="action-dropdown" style={{ right: 0 }}>
                <Link to="/about" className="dropdown-link" onClick={() => setMoreDropdownOpen(false)}>About Us</Link>
                <Link to="/contact" className="dropdown-link" onClick={() => setMoreDropdownOpen(false)}>Contact Showroom</Link>
                <a href="https://wa.me/917995585087" target="_blank" rel="noopener noreferrer" className="dropdown-link" onClick={() => setMoreDropdownOpen(false)}>WhatsApp Inquiry</a>
              </div>
            )}
          </div>

          {/* Cart Icon with Red count badge */}
          <Link to="/cart" className="nav-action-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span className="nav-label-desktop">Cart</span>
            {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
          </Link>

          {/* User Sign In / Profile Dropdown */}
          <div style={{ position: 'relative' }} ref={userDropdownRef}>
            <button 
              className="nav-action-btn"
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setMoreDropdownOpen(false);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="nav-label-desktop">{user ? user.name.split(' ')[0] : 'Sign In'}</span>
              <svg className="nav-arrow-desktop" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {userDropdownOpen && (
              <div className="action-dropdown" style={{ right: 0 }}>
                {user ? (
                  <>
                    <div style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      Welcome, <strong>{user.name.split(' ')[0]}</strong>
                    </div>
                    <Link to="/account?tab=profile" className="dropdown-link" onClick={() => setUserDropdownOpen(false)}>My Profile</Link>
                    <Link to="/account?tab=orders" className="dropdown-link" onClick={() => setUserDropdownOpen(false)}>My Orders</Link>
                    <Link to="/account?tab=wishlist" className="dropdown-link" onClick={() => setUserDropdownOpen(false)}>Wishlist</Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="dropdown-link" style={{ color: 'var(--color-gold-dark)', fontWeight: 'bold' }} onClick={() => setUserDropdownOpen(false)}>Admin Panel</Link>
                    )}
                    {user.role === 'seller' && (
                      <Link to="/seller-dashboard" className="dropdown-link" style={{ color: 'var(--color-gold-dark)', fontWeight: 'bold' }} onClick={() => setUserDropdownOpen(false)}>Seller Dashboard</Link>
                    )}
                    <button 
                      onClick={handleLogoutClick}
                      className="dropdown-link"
                      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-error)', width: '100%' }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="dropdown-link" onClick={() => setUserDropdownOpen(false)}>Login</Link>
                    <Link to="/login?mode=register" className="dropdown-link" onClick={() => setUserDropdownOpen(false)}>Register Account</Link>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Sub-header Location Indicator bar */}
      <div className="sub-header-bar">
        <div className="sub-header-container">
          <div className="location-selector" onClick={handleSelectLocation}>
            <span>📍</span>
            <span>
              {pincode ? `Delivery to: ${pincode} - Update location` : 'Location not set - Select delivery location'}
            </span>
            <span>&gt;</span>
          </div>
          <div>
            <span>Free delivery on luxury orders above ₹15,000</span>
          </div>
        </div>
      </div>
      {/* Horizontal Category Icon Ribbon */}
      <div className="category-ribbon">
        <div className="ribbon-container">
          
          {/* Item 1: Home */}
          <Link to="/" className={`ribbon-item ${location.pathname === '/' ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="ribbon-text">Home</span>
          </Link>

          {/* Item 2: Sofas */}
          <Link to="/category/sofas" className={`ribbon-item ${isCatActive('sofas') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6"></path>
                <path d="M2 9v3h20V9a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3z"></path>
                <path d="M6 12v3m12-3v3M12 12v3"></path>
              </svg>
            </div>
            <span className="ribbon-text">Sofas</span>
          </Link>

          {/* Item 3: Beds */}
          <Link to="/category/beds" className={`ribbon-item ${isCatActive('beds') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 4v16M22 8v12"></path>
                <path d="M2 8h20v8H2zM2 14h20"></path>
                <path d="M6 8v3m12-3v3"></path>
              </svg>
            </div>
            <span className="ribbon-text">Beds</span>
          </Link>

          {/* Item 4: Corner Sofas */}
          <Link to="/category/corner-sofas" className={`ribbon-item ${isCatActive('corner-sofas') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v16h16M4 12h8a2 2 0 0 0 2-2V4"></path>
              </svg>
            </div>
            <span className="ribbon-text">Corner Sofas</span>
          </Link>

          {/* Item 5: L-Shape Sofas */}
          <Link to="/category/l-shape-sofas" className={`ribbon-item ${isCatActive('l-shape-sofas') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3v15h12M6 12h12v6H6"></path>
              </svg>
            </div>
            <span className="ribbon-text">L-Shape Sofas</span>
          </Link>

          {/* Item 6: Sofa Sets */}
          <Link to="/category/sofa-sets" className={`ribbon-item ${isCatActive('sofa-sets') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 14V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M13 14V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M2 18h20"></path>
              </svg>
            </div>
            <span className="ribbon-text">Sofa Sets</span>
          </Link>

          {/* Item 7: Wooden Sets */}
          <Link to="/category/wooden-sets" className={`ribbon-item ${isCatActive('wooden-sets') ? 'active' : ''}`}>
            <div className="ribbon-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M2 10h20M4 10v10M20 10v10M12 4v6"></path>
              </svg>
            </div>
            <span className="ribbon-text">Wooden Sets</span>
          </Link>

        </div>
      </div>
    </header>
  );
}
