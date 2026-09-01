import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import LoginRegister from './pages/LoginRegister';
import Account from './pages/Account';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';

// Error Boundary Component to prevent white screen of death
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#8c7355' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            We encountered a temporary issue while loading the application.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#8c7355',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Reload Store
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Layout wrapper to conditionally hide Navbar & Footer on Admin/Seller paths
const AppLayout = () => {
  const location = useLocation();
  const isAdminOrSellerPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller-dashboard');

  if (isAdminOrSellerPage) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
      </Routes>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/account" element={<Account />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <AppLayout />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
