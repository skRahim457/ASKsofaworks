import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Tab state: 'stats', 'products', 'orders'
  const [activeTab, setActiveTab] = useState('stats');

  // Stats State
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Products State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('sofas');
  const [prodDesc, setProdDesc] = useState('');
  const [prodMaterial, setProdMaterial] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscountPrice, setProdDiscountPrice] = useState('');
  const [prodStock, setProdStock] = useState('5');
  const [prodColors, setProdColors] = useState('Cream, Taupe, Charcoal');
  const [prodSizes, setProdSizes] = useState('5ft × 3ft, 6ft × 3ft');
  const [prodSetTypes, setProdSetTypes] = useState('Bar Set, Three Seater');
  const [prodUpholsteryTypes, setProdUpholsteryTypes] = useState('Cloth, Rexine');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodAddImages, setProdAddImages] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Login History State
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Sellers State
  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(true);

  // Inquiries State
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=admin');
      return;
    }
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, token, navigate]);

  // Fetch Stats Data
  const fetchStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Products Data
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch Orders Data
  const fetchOrders = async () => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch Login History Data
  const fetchLoginHistory = async () => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data);
      }
    } catch (err) {
      console.error('Failed to load login history:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch Sellers Data
  const fetchSellers = async () => {
    if (!token) return;
    setSellersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sellers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSellers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSellersLoading(false);
    }
  };

  // Handle Approve/Reject Seller
  const handleApproveSeller = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this seller application?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/approve-seller/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchSellers();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating seller status.');
    }
  };

  const handleToggleFeedbackPermission = async (orderItemId, permittedValue) => {
    try {
      const res = await fetch(`${API_BASE}/orders/items/${orderItemId}/feedback-permission`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permitted: permittedValue })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedOrder(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item => item.id === orderItemId ? { ...item, feedback_permitted: permittedValue } : item)
          };
        });
        setOrders(prev => prev.map(order => {
          return {
            ...order,
            items: order.items.map(item => item.id === orderItemId ? { ...item, feedback_permitted: permittedValue } : item)
          };
        }));
        alert(data.message);
      } else {
        alert(data.message || 'Error updating feedback permission');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating permission');
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seller/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchInquiries = async () => {
    if (!token) return;
    setInquiriesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/inquiries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry message?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Inquiry message deleted.');
        fetchInquiries();
      } else {
        alert('Failed to delete inquiry.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting inquiry.');
    }
  };

  // Sync tab loading
  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'stats') fetchStats();
      if (activeTab === 'products') fetchProducts();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'logs') fetchLoginHistory();
      if (activeTab === 'sellers') fetchSellers();
      if (activeTab === 'inquiries') fetchInquiries();
    }
  }, [activeTab, user]);

  const handleColorToggle = (color) => {
    let currentColors = prodColors.split(',').map(c => c.trim()).filter(Boolean);
    if (currentColors.includes(color)) {
      currentColors = currentColors.filter(c => c !== color);
    } else {
      currentColors.push(color);
    }
    setProdColors(currentColors.join(', '));
  };

  // Open Modal to Add Product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('sofas');
    setProdDesc('');
    setProdMaterial('');
    setProdPrice('');
    setProdDiscountPrice('');
    setProdStock('5');
    setProdColors('Cream, Taupe, Charcoal');
    setProdSizes('5ft × 3ft, 6ft × 3ft, 7ft × 3ft');
    setProdSetTypes('Bar Set, Three Seater');
    setProdUpholsteryTypes('Cloth, Rexine');
    setProdImageUrl('');
    setProdAddImages('');
    setIsProductModalOpen(true);
  };

  // Open Modal to Edit Product
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdDesc(product.description);
    setProdMaterial(product.material);
    setProdPrice(product.price.toString());
    setProdDiscountPrice(product.discount_price ? product.discount_price.toString() : '');
    setProdStock(product.stock.toString());
    setProdColors(Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors ? JSON.parse(product.colors).join(', ') : ''));
    setProdSizes(Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes ? JSON.parse(product.sizes).join(', ') : ''));
    setProdSetTypes(Array.isArray(product.set_types) ? product.set_types.join(', ') : (product.set_types ? JSON.parse(product.set_types).join(', ') : ''));
    setProdUpholsteryTypes(Array.isArray(product.upholstery_types) ? product.upholstery_types.join(', ') : (product.upholstery_types ? JSON.parse(product.upholstery_types).join(', ') : 'Cloth, Rexine'));
    setProdImageUrl(product.image_url);
    setProdAddImages(Array.isArray(product.additional_images) ? product.additional_images.join(', ') : (product.additional_images ? JSON.parse(product.additional_images).join(', ') : ''));
    setIsProductModalOpen(true);
  };

  // Delete Product handler
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This action is permanent.')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        alert('Product deleted successfully');
      } else {
        const error = await res.json();
        alert(error.message || 'Error deleting product');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDiscountClick = async () => {
    const pctStr = prompt('Apply bulk discount percentage (0-100) to ALL products?\n(Enter "0" to clear all product discounts):', '10');
    if (pctStr === null) return;
    const pct = parseInt(pctStr.trim());
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert('Invalid percentage. Please enter a number between 0 and 100.');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/products/bulk/discount`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ percentage: pct })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Bulk discount applied successfully!');
        fetchProducts();
      } else {
        alert(data.message || 'Failed to apply bulk discount');
      }
    } catch (err) {
      console.error(err);
      alert('Network error applying bulk discount');
    }
  };

  // Add / Edit Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();

    if (!prodImageUrl) {
      alert('Please provide a product image URL');
      return;
    }

    const payload = {
      name: prodName,
      category: prodCategory,
      description: prodDesc,
      material: prodMaterial,
      price: parseFloat(prodPrice),
      discount_price: prodDiscountPrice ? parseFloat(prodDiscountPrice) : null,
      stock: parseInt(prodStock),
      colors: prodColors.split(',').map(s => s.trim()).filter(Boolean),
      sizes: prodSizes.split(',').map(s => s.trim()).filter(Boolean),
      set_types: prodSetTypes.split(',').map(s => s.trim()).filter(Boolean),
      upholstery_types: prodUpholsteryTypes.split(',').map(u => u.trim()).filter(Boolean),
      image_url: prodImageUrl,
      additional_images: prodAddImages.split(',').map(s => s.trim()).filter(Boolean)
    };

    const isEdit = !!editingProduct;
    const url = isEdit 
      ? `${API_BASE}/products/${editingProduct.id}` 
      : `${API_BASE}/products`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (isEdit) {
          setProducts(prev => prev.map(p => p.id === data.id ? data : p));
          alert('Product updated successfully');
        } else {
          setProducts(prev => [...prev, data]);
          alert('Product created successfully');
        }
        setIsProductModalOpen(false);
      } else {
        alert(data.message || 'Error processing request');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting product data');
    }
  };

  // Handle direct file uploading
  const handleImageUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        try {
          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: base64Data })
          });
          const data = await res.json();
          if (res.ok && data.imageUrl) {
            if (type === 'main') {
              setProdImageUrl(data.imageUrl);
            } else {
              setProdAddImages(prev => prev ? `${prev}, ${data.imageUrl}` : data.imageUrl);
            }
          } else {
            alert(data.message || 'Image upload failed');
          }
        } catch (err) {
          console.error(err);
          alert('Failed to upload image to server.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Update Order Status Handler
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: nextStatus }));
        }
        alert(`Order #${orderId} status shifted to ${nextStatus}`);
      } else {
        const error = await res.json();
        alert(error.message || 'Error shifting status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <img src="/logo.png" alt="ASK" style={{ height: '32px', backgroundColor: '#FFF', borderRadius: '4px', padding: '2px' }} />
          <span style={{ fontSize: '0.85rem', color: '#FFF', letterSpacing: '0.05em' }}>OWNER PANEL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <span>Administrator: <strong>{user ? user.name : 'Owner'}</strong></span>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ color: '#FAF6F0', borderColor: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.8rem' }}
            onClick={() => navigate('/')}
          >
            Showroom View
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="admin-container">
        
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <button 
            className={`admin-sidebar-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Sales & Overview
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🛋️ Product Inventory
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Customer Orders
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            🔒 Login History Logs
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'sellers' ? 'active' : ''}`}
            onClick={() => setActiveTab('sellers')}
          >
            🤝 Seller Applications
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            💬 Customer Reviews
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            ✉️ Customer Inquiries
          </button>
        </aside>

        {/* Workspace content */}
        <main className="admin-content">
          
          {/* TAB 1: OVERVIEW STATS */}
          {activeTab === 'stats' && (
            <div>
              <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Performance Overview</h1>
              
              {statsLoading ? (
                <div>Loading stats...</div>
              ) : statsData ? (
                <div>
                  {/* Grid */}
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                      <span className="admin-stat-label">Total Revenue</span>
                      <div className="admin-stat-value">₹{statsData.stats.revenue.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="admin-stat-label">Inventory Items</span>
                      <div className="admin-stat-value">{statsData.stats.productsCount}</div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="admin-stat-label">Low Stock Alerts</span>
                      <div className="admin-stat-value" style={{ color: statsData.stats.lowStockCount > 0 ? 'var(--color-error)' : 'inherit' }}>
                        {statsData.stats.lowStockCount} items
                      </div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="admin-stat-label">Showroom Address</span>
                      <div className="admin-stat-value" style={{ fontSize: '1rem', fontWeight: 600 }}>Kavali, AP</div>
                    </div>
                  </div>

                  {/* Splits: Left low stock, Right recent orders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="admin-table-card">
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '1.2rem' }}>Low Stock Inventory (Restock Needed)</h3>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Category</th>
                              <th>Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.lowStockItems.map(p => (
                              <tr key={p.id}>
                                <td><strong>{p.name}</strong></td>
                                <td>{p.category}</td>
                                <td style={{ color: 'var(--color-error)', fontWeight: 700 }}>{p.stock} units</td>
                              </tr>
                            ))}
                            {statsData.lowStockItems.length === 0 && (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', color: '#888' }}>All items healthy and well-stocked.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="admin-table-card">
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '1.2rem' }}>Recent Order Submissions</h3>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Customer</th>
                              <th>Revenue</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.recentOrders.map(o => (
                              <tr key={o.id}>
                                <td>#{o.id}</td>
                                <td>{o.name}</td>
                                <td>${o.total_price.toFixed(2)}</td>
                                <td>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: o.status === 'Delivered' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {statsData.recentOrders.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: '#888' }}>No customer orders placed yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>No stats data available.</div>
              )}
            </div>
          )}

          {/* TAB 2: PRODUCT MANAGER */}
          {activeTab === 'products' && (
            <div>
              <div className="admin-table-header">
                <div>
                  <h1 className="heading-md" style={{ margin: 0 }}>Product Inventory Management</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Add new items or edit pricing and configurations.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                  <button className="btn btn-gold btn-sm" onClick={handleOpenAddModal}>Add New Product</button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleBulkDiscountClick}
                    style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold-dark)', fontWeight: 600 }}
                  >
                    🏷️ Bulk Discount All
                  </button>
                </div>
              </div>

              <div className="admin-table-card">
                {productsLoading ? (
                  <div>Retrieving warehouse products...</div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Material</th>
                          <th>Price</th>
                          <th>Discount</th>
                          <th>Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td>
                              <img src={p.image_url} alt={p.name} style={{ width: '45px', height: '40px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--color-sand)' }} />
                            </td>
                            <td>
                              <strong>{p.name}</strong>
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>{p.category}</td>
                            <td>{p.material}</td>
                            <td><strong>₹{p.price.toLocaleString('en-IN')}</strong></td>
                            <td>{p.discount_price ? <span style={{ color: 'var(--color-success)' }}>₹{p.discount_price.toLocaleString('en-IN')}</span> : <span style={{ color: '#bbb' }}>None</span>}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: p.stock <= 3 ? 'var(--color-error)' : 'inherit' }}>
                                {p.stock} units
                              </span>
                            </td>
                            <td>
                              <div className="admin-action-btn-row">
                                <button className="admin-icon-btn" onClick={() => handleOpenEditModal(p)} title="Edit Details">✏️</button>
                                <button className="admin-icon-btn delete" onClick={() => handleDeleteProduct(p.id)} title="Delete Product">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ORDER MANAGER */}
          {activeTab === 'orders' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>
              <div>
                <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Customer Shipment Orders</h1>
                
                <div className="admin-table-card">
                  {ordersLoading ? (
                    <div>Fetching customer orders...</div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer Name</th>
                            <th>Date</th>
                            <th>Total Price</th>
                            <th>Payment</th>
                            <th>Status Pipeline</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td>#{o.id}</td>
                              <td><strong>{o.name}</strong></td>
                              <td>{new Date(o.created_at).toLocaleDateString()}</td>
                              <td><strong>₹{o.total_price.toLocaleString('en-IN')}</strong></td>
                              <td>{o.payment_method}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  color: o.status === 'Delivered' ? 'var(--color-success)' : 'var(--color-warning)',
                                  backgroundColor: o.status === 'Delivered' ? 'rgba(95,122,104,0.1)' : 'rgba(195,146,90,0.1)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}>
                                  {o.status} {o.customer_received === 1 && '👍 Received'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                                  onClick={() => setSelectedOrder(o)}
                                >
                                  Manage Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Detail Sidebar panel */}
              {selectedOrder && (
                <div className="checkout-form-card" style={{ height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>Order #{selectedOrder.id} Details</h3>
                    <button onClick={() => setSelectedOrder(null)} style={{ fontSize: '1.1rem', color: '#999' }}>✕</button>
                  </div>

                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <p><strong>Customer Name:</strong> {selectedOrder.name}</p>
                    <p><strong>Phone Number:</strong> {selectedOrder.mobile}</p>
                    <p><strong>Email Address:</strong> {selectedOrder.email}</p>
                    <p><strong>Shipping Location:</strong><br />{selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                    <p><strong>Payment Mode:</strong> {selectedOrder.payment_method}</p>
                    {(() => {
                      const orderDate = new Date(selectedOrder.created_at);
                      const deliveryDate = new Date(orderDate.getTime() + 15 * 24 * 60 * 60 * 1000);
                      const now = new Date();
                      const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const d2 = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
                      const diffTime = d2.getTime() - d1.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const daysRemaining = diffDays > 0 ? diffDays : 0;
                      return (
                        <div style={{ backgroundColor: 'var(--color-bg-cream)', padding: '0.6rem', border: '1px solid var(--color-sand)', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--color-gold-dark)', fontWeight: 600, marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                          🚚 Est. Delivery Date: {deliveryDate.toLocaleDateString()}<br />
                          ⏰ Status: {selectedOrder.status === 'Delivered' ? 'Delivered' : (daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Arriving today!')}
                        </div>
                      );
                    })()}
                    
                    {selectedOrder.customer_received === 1 && selectedOrder.delivery_response && (
                      <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'var(--color-bg-cream)', border: '1px solid var(--color-sand)', borderRadius: '4px' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-gold-dark)', borderBottom: '1px solid var(--color-sand)', paddingBottom: '0.4rem', marginBottom: '0.6rem', letterSpacing: '0.02em' }}>
                          📦 Delivery & Payment Confirmed
                        </h4>
                        <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--color-text-main)' }}>
                          <div><strong>Response:</strong> {selectedOrder.delivery_response}</div>
                          <div><strong>Amount Paid:</strong> ₹{selectedOrder.paid_amount?.toLocaleString('en-IN') || 0}</div>
                          {selectedOrder.payment_bill_img && (
                            <div style={{ marginTop: '0.4rem' }}>
                              <strong>Payment Bill Receipt:</strong>
                              <div style={{ marginTop: '0.4rem' }}>
                                <a href={selectedOrder.payment_bill_img} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                  <img src={selectedOrder.payment_bill_img} alt="Payment Receipt Bill" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </a>
                                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.2rem' }}>Click image to open in full size</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid var(--color-sand)', borderRadius: '2px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Shift Order Status Pipeline</label>
                      <select 
                        className="form-control" 
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                        style={{ height: '36px', fontSize: '0.85rem' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-light-gray)', paddingBottom: '0.3rem', marginTop: '0.8rem' }}>Ordered Items</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px dashed #eee', paddingBottom: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span>{item.quantity}x {item.product_name} ({item.color}, Size: {item.size}, Set: {item.set_type || 'None'}, Upholstery: {item.upholstery || 'None'})</span>
                            <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                          </div>
                          {selectedOrder.status === 'Delivered' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: item.feedback_permitted === 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                Review: {item.feedback_permitted === 1 ? '🔓 Permitted' : '🔒 Restricted'}
                              </span>
                              <button
                                onClick={() => handleToggleFeedbackPermission(item.id, item.feedback_permitted === 1 ? 0 : 1)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--color-sand)',
                                  borderRadius: '4px',
                                  padding: '0.15rem 0.5rem',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  color: 'var(--color-gold-dark)',
                                  fontWeight: 600
                                }}
                              >
                                {item.feedback_permitted === 1 ? 'Revoke Permit' : 'Grant Permit'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: 'var(--color-black)', marginTop: '0.8rem' }}>
                      <span>Total Revenue:</span>
                      <span>₹{selectedOrder.total_price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LOGIN HISTORY LOGS */}
          {activeTab === 'logs' && (
            <div>
              <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Login History Audit Logs</h1>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                Monitor success and failure events of customer sign-ins across traditional email, Firebase Phone SMS OTP, and Google OAuth.
              </p>

              {logsLoading ? (
                <div>Loading authentication logs...</div>
              ) : loginLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--color-sand)', borderRadius: '12px', backgroundColor: 'var(--color-background-soft)' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No login logs recorded in the system.</p>
                </div>
              ) : (
                <div className="admin-table-card">
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>User ID / Name</th>
                          <th>Login Identifier</th>
                          <th>Auth Method</th>
                          <th>Status</th>
                          <th>IP Address</th>
                          <th>Details / Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td>
                              <strong>{log.name || 'Anonymous'}</strong>
                              {log.user_id && (
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-gold)' }}>
                                  UID: #{log.user_id}
                                </span>
                              )}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {log.identifier}
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                backgroundColor: log.method === 'google' ? '#EBF5FF' : log.method === 'otp' ? '#E6FFFA' : '#F3F4F6',
                                color: log.method === 'google' ? '#1D4ED8' : log.method === 'otp' ? '#0D9488' : '#374151'
                              }}>
                                {log.method === 'google' ? 'Google' : log.method === 'otp' ? 'Firebase OTP' : 'Email/Pass'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: log.status === 'success' ? '#DEF7EC' : '#FDE8E8',
                                color: log.status === 'success' ? '#03543F' : '#9B1C1C'
                              }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {log.ip_address}
                            </td>
                            <td style={{
                              fontSize: '0.75rem',
                              color: log.status === 'failure' ? 'var(--color-error)' : 'var(--color-text-muted)',
                              fontStyle: log.error_reason ? 'normal' : 'italic'
                            }}>
                              {log.error_reason || 'Clean connection'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SELLER APPLICATIONS */}
          {activeTab === 'sellers' && (
            <div>
              <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Seller Applications & Accounts</h1>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                Approve pending merchant registrations or manage current seller roles.
              </p>

              <div className="admin-table-card">
                {sellersLoading ? (
                  <div>Retrieving seller accounts...</div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User Details</th>
                          <th>Showroom Shop Name</th>
                          <th>Showroom Physical Address</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellers.map(s => (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {s.email} | {s.mobile || 'No Mobile'}
                              </div>
                            </td>
                            <td>{s.shop_name || <span style={{ color: '#bbb' }}>None</span>}</td>
                            <td>{s.shop_address || <span style={{ color: '#bbb' }}>None</span>}</td>
                            <td>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: s.role === 'seller' ? 'rgba(95,122,104,0.1)' : 'rgba(195,146,90,0.1)',
                                color: s.role === 'seller' ? 'var(--color-success)' : 'var(--color-warning)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '2px'
                              }}>
                                {s.role === 'seller' ? 'Approved Seller' : `Pending Approval (${s.seller_status})`}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {s.seller_status === 'pending' && (
                                  <>
                                    <button 
                                      className="btn btn-gold btn-sm" 
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#FFF' }}
                                      onClick={() => handleApproveSeller(s.id, 'approve')}
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      className="btn btn-secondary btn-sm" 
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                                      onClick={() => handleApproveSeller(s.id, 'reject')}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {s.role === 'seller' && (
                                  <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                                    onClick={() => handleApproveSeller(s.id, 'reject')}
                                  >
                                    Revoke Seller Status
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {sellers.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>No seller applications or merchant accounts found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="admin-table-card">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem' }}>All Customer Feedback & Reviews</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                View ratings, text comments, and real room photo placements uploaded by clients across all showroom designs.
              </p>
              {reviewsLoading ? (
                <div style={{ padding: '3rem 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Loading customer reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ padding: '3rem 0', fontStyle: 'italic', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No feedback reviews found inside the showroom yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {reviews.map((rev) => (
                    <div key={rev.id} style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1.2rem', backgroundColor: 'var(--color-bg-cream)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.user_name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                        <img src={rev.product_image} alt="" style={{ width: '32px', height: '30px', objectFit: 'cover', borderRadius: '2px' }} />
                        <span>Product: <strong style={{ color: 'var(--color-black)' }}>{rev.product_name}</strong></span>
                      </div>
                      <div className="rating-stars" style={{ color: 'var(--color-gold)', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx} style={{ color: idx < rev.rating ? 'var(--color-gold)' : 'var(--color-sand)' }}>★</span>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-main)', fontStyle: 'italic', margin: 0 }}>
                        "{rev.comment}"
                      </p>
                      {rev.real_images && rev.real_images.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                          {rev.real_images.map((img, index) => (
                            <img 
                              key={index} 
                              src={img} 
                              alt="Real review room placement"
                              onClick={() => window.open(img, '_blank')}
                              style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-sand)', cursor: 'zoom-in', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'inquiries' && (
            <div className="admin-table-card">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem' }}>Customer Inquiries & Messages</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                View and manage contact messages, specifications, and custom request inquiries sent by customers.
              </p>
              {inquiriesLoading ? (
                <div style={{ padding: '3rem 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Loading customer inquiries...
                </div>
              ) : inquiries.length === 0 ? (
                <div style={{ padding: '3rem 0', fontStyle: 'italic', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No customer inquiries or contact messages found.
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Contact Details</th>
                        <th>Subject & Message</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries.map((inq) => (
                        <tr key={inq.id}>
                          <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {new Date(inq.created_at).toLocaleString()}
                          </td>
                          <td>
                            <strong>{inq.name}</strong>
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>
                            <div>📧 {inq.email}</div>
                            {inq.mobile && <div style={{ marginTop: '0.2rem' }}>📞 {inq.mobile}</div>}
                          </td>
                          <td style={{ maxWidth: '350px' }}>
                            {inq.subject && (
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--color-gold-dark)' }}>
                                {inq.subject}
                              </div>
                            )}
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                              {inq.message}
                            </div>
                          </td>
                          <td>
                            <button 
                              className="admin-icon-btn delete" 
                              onClick={() => handleDeleteInquiry(inq.id)}
                              title="Delete Message"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* CRUD Product Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Furniture Design'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsProductModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group form-group-full">
                    <label className="form-label">Product Title *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-control"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                    >
                      <option value="sofas">Sofas</option>
                      <option value="beds">Beds</option>
                      <option value="corner-sofas">Corner Sofas</option>
                      <option value="l-shape-sofas">L-Shape Sofas</option>
                      <option value="sofa-sets">Sofa Sets</option>
                      <option value="wooden-sets">Wooden Sets</option>
                    </select>
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label" style={{ marginBottom: '0.6rem' }}>Select Wood Type / Material *</label>
                    
                    {/* Visual Wood Type Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '0.8rem' }}>
                      {[
                        { name: 'Teak wood', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Premium golden-brown grain' },
                        { name: 'Mango wood', image: 'https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Warm grey-brown texture' },
                        { name: 'Mahogany wood', image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Dark reddish-brown' },
                        { name: 'Rosewood (Sheesham)', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Highly grained dark' },
                        { name: 'Walnut wood', image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Chocolate brown' },
                        { name: 'Oak wood', image: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Light sand color' },
                        { name: 'Pine wood', image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=60&h=60&q=80', desc: 'Soft cream wood' }
                      ].map((wood) => {
                        const isSelected = prodMaterial === wood.name;
                        return (
                          <div 
                            key={wood.name}
                            onClick={() => setProdMaterial(wood.name)}
                            style={{
                              border: isSelected ? '2px solid var(--color-gold-dark)' : '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              backgroundColor: isSelected ? 'var(--color-bg-cream)' : '#FFF',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Tiny wood tree preview */}
                            <img 
                              src={wood.image} 
                              alt={wood.name}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid #CCC',
                                flexShrink: 0
                              }} 
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-black)' }}>{wood.name}</span>
                              <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>{wood.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Or type custom material (e.g. Velvet, Leather, Linen...)"
                      value={prodMaterial}
                      onChange={(e) => setProdMaterial(e.target.value)}
                      list="admin-material-suggestions"
                      required
                    />
                    <datalist id="admin-material-suggestions">
                      <option value="Teak wood" />
                      <option value="Mango wood" />
                      <option value="Mahogany wood" />
                      <option value="Rosewood (Sheesham)" />
                      <option value="Walnut wood" />
                      <option value="Oak wood" />
                      <option value="Pine wood" />
                      <option value="Velvet Upholstery" />
                      <option value="Linen Upholstery" />
                      <option value="Leather Upholstery" />
                      <option value="Boucle Fabric" />
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Discount Price (₹) (Optional)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={prodDiscountPrice}
                      onChange={(e) => setProdDiscountPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Units *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label" style={{ marginBottom: '0.6rem' }}>Select Available Colors *</label>
                    
                    {/* Visual Color Grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem', backgroundColor: 'var(--color-light-gray)', padding: '0.8rem', borderRadius: '6px' }}>
                      {[
                        { name: 'Cream', hex: '#FAF2E6' },
                        { name: 'Beige', hex: '#F5F5DC' },
                        { name: 'Ivory', hex: '#FFFFF0' },
                        { name: 'Taupe', hex: '#B38B6D' },
                        { name: 'Grey', hex: '#808080' },
                        { name: 'Charcoal', hex: '#36454F' },
                        { name: 'Brown', hex: '#964B00' },
                        { name: 'Tan', hex: '#D2B48C' },
                        { name: 'Blue', hex: '#0000FF' },
                        { name: 'Green', hex: '#008000' },
                        { name: 'White', hex: '#FFFFFF' },
                        { name: 'Black', hex: '#000000' },
                        { name: 'Gold', hex: '#FFD700' },
                        { name: 'Silver', hex: '#C0C0C0' },
                        { name: 'Mustard', hex: '#FFDB58' },
                        { name: 'Olive', hex: '#808000' },
                        { name: 'Terracotta', hex: '#E2725B' },
                        { name: 'Burgundy', hex: '#800020' },
                        { name: 'Sage', hex: '#BCB88A' },
                        { name: 'Navy', hex: '#000080' }
                      ].map((col) => {
                        const currentColors = prodColors.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
                        const isChecked = currentColors.includes(col.name.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={col.name}
                            onClick={() => handleColorToggle(col.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              border: isChecked ? '2px solid var(--color-gold-dark)' : '1px solid var(--color-border)',
                              borderRadius: '20px',
                              padding: '0.3rem 0.7rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor: isChecked ? '#FFF' : 'transparent',
                              boxShadow: isChecked ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Color bubble */}
                            <span style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: col.hex,
                              border: '1px solid #CCC',
                              display: 'inline-block'
                            }} />
                            {col.name}
                          </button>
                        );
                      })}
                    </div>

                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Or customize color list (comma separated)..."
                      value={prodColors}
                      onChange={(e) => setProdColors(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Available Sizes (Comma separated)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 5ft × 3ft, 6ft × 3.5ft, 7ft × 4ft"
                      value={prodSizes}
                      onChange={(e) => setProdSizes(e.target.value)}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Available Set Types (Comma separated)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Bar Set, Sofa Set, Corner Set"
                      value={prodSetTypes}
                      onChange={(e) => setProdSetTypes(e.target.value)}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label" style={{ marginBottom: '0.4rem' }}>Available Upholstery Types (Comma separated)</label>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {['Cloth', 'Rexine'].map((type) => {
                        const currentTypes = prodUpholsteryTypes.split(',').map(u => u.trim()).filter(Boolean);
                        const isSelected = currentTypes.includes(type);
                        return (
                          <button
                            type="button"
                            key={type}
                            onClick={() => {
                              let updated = [...currentTypes];
                              if (updated.includes(type)) {
                                updated = updated.filter(t => t !== type);
                              } else {
                                updated.push(type);
                              }
                              setProdUpholsteryTypes(updated.join(', '));
                            }}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              border: isSelected ? '1px solid var(--color-gold-dark)' : '1px solid var(--color-border)',
                              backgroundColor: isSelected ? 'var(--color-bg-cream)' : '#FFF',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSelected ? '✓' : '+'} {type} Type
                          </button>
                        );
                      })}
                    </div>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Cloth, Rexine, Velvet"
                      value={prodUpholsteryTypes}
                      onChange={(e) => setProdUpholsteryTypes(e.target.value)}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Main Image URL *</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Unsplash URL or local image location"
                        value={prodImageUrl}
                        onChange={(e) => setProdImageUrl(e.target.value)}
                        required
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>OR</span>
                      <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', height: '46px', padding: '0 1rem' }}>
                        📤 Upload Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload(e, 'main')} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Additional Images (Comma separated URLs) (Optional)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="URL1, URL2 or local upload images"
                        value={prodAddImages}
                        onChange={(e) => setProdAddImages(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>OR</span>
                      <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', height: '46px', padding: '0 1rem' }}>
                        📤 Upload Photos
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={(e) => handleImageUpload(e, 'additional')} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Product Description *</label>
                    <textarea 
                      rows="4" 
                      className="form-control"
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold btn-sm">{editingProduct ? 'Save Changes' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
