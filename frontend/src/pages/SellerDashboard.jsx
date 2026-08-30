import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export default function SellerDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Navigation tab: 'products' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState('products');

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

  // Showroom Profile Form State
  const [shopName, setShopName] = useState(user ? user.shop_name || '' : '');
  const [shopAddress, setShopAddress] = useState(user ? user.shop_address || '' : '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Redirect if not seller
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=seller-dashboard');
      return;
    }
    if (user && user.role !== 'seller' && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, token, navigate]);

  // Fetch Products Data
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seller/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seller/orders`, {
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

  // Sync tab loading
  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'admin')) {
      if (activeTab === 'products') fetchProducts();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'reviews') fetchReviews();
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
  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdDesc(p.description);
    setProdMaterial(p.material);
    setProdPrice(p.price.toString());
    setProdDiscountPrice(p.discount_price ? p.discount_price.toString() : '');
    setProdStock(p.stock.toString());
    setProdColors(Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors ? JSON.parse(p.colors).join(', ') : ''));
    setProdSizes(Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes ? JSON.parse(p.sizes).join(', ') : ''));
    setProdSetTypes(Array.isArray(p.set_types) ? p.set_types.join(', ') : (p.set_types ? JSON.parse(p.set_types).join(', ') : ''));
    setProdUpholsteryTypes(Array.isArray(p.upholstery_types) ? p.upholstery_types.join(', ') : (p.upholstery_types ? JSON.parse(p.upholstery_types).join(', ') : 'Cloth, Rexine'));
    setProdImageUrl(p.image_url);
    setProdAddImages(Array.isArray(p.additional_images) ? p.additional_images.join(', ') : (p.additional_images ? JSON.parse(p.additional_images).join(', ') : ''));
    setIsProductModalOpen(true);
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this furniture product design?')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Product deleted successfully');
        fetchProducts();
      } else {
        const error = await res.json();
        alert(error.message || 'Error deleting product');
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleBulkDiscountClick = async () => {
    const pctStr = prompt('Apply bulk discount percentage (0-100) to ALL your products?\n(Enter "0" to clear all product discounts):', '10');
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

  // Submit Add / Edit Product
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: prodName.trim(),
      category: prodCategory,
      description: prodDesc.trim(),
      material: prodMaterial.trim(),
      price: parseFloat(prodPrice),
      discount_price: prodDiscountPrice ? parseFloat(prodDiscountPrice) : null,
      stock: parseInt(prodStock),
      colors: prodColors.split(',').map(c => c.trim()).filter(Boolean),
      sizes: prodSizes.split(',').map(s => s.trim()).filter(Boolean),
      set_types: prodSetTypes.split(',').map(s => s.trim()).filter(Boolean),
      upholstery_types: prodUpholsteryTypes.split(',').map(u => u.trim()).filter(Boolean),
      image_url: prodImageUrl.trim(),
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
        alert(isEdit ? 'Product updated successfully' : 'Product created successfully');
        setIsProductModalOpen(false);
        fetchProducts();
      } else {
        alert(data.message || 'Error processing product');
      }
    } catch (err) {
      console.error(err);
      alert('Network request failed.');
    }
  };

  // Update Showroom Profile details
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setProfileLoading(true);

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
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setProfileMsg('Showroom profile details updated successfully.');
    } catch (err) {
      console.error(err);
      setProfileErr(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

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
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, order_status: nextStatus } : o));
        if (selectedOrder && selectedOrder.order_id === orderId) {
          setSelectedOrder(prev => ({ ...prev, order_status: nextStatus }));
        }
        alert(`Order status updated to ${nextStatus}`);
      } else {
        alert(data.message || 'Error updating order status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating status');
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
        setOrders(prev => prev.map(o => o.id === orderItemId ? { ...o, feedback_permitted: permittedValue } : o));
        if (selectedOrder && selectedOrder.id === orderItemId) {
          setSelectedOrder(prev => ({ ...prev, feedback_permitted: permittedValue }));
        }
        alert(data.message);
      } else {
        alert(data.message || 'Error updating feedback permission');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating permission');
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

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <img src="/logo.png" alt="ASK" style={{ height: '32px', backgroundColor: '#FFF', borderRadius: '4px', padding: '2px' }} />
          <span style={{ fontSize: '0.85rem', color: '#FFF', letterSpacing: '0.05em' }}>SELLER DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <span>Showroom: <strong>{user ? user.shop_name || 'My Shop' : 'Seller'}</strong></span>
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
            className={`admin-sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🛋️ My Products
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Customer Orders
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            🏢 Showroom Profile
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            💬 Client Reviews
          </button>
        </aside>

        {/* Workspace content */}
        <main className="admin-content">
          
          {/* TAB 1: SELLER PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h1 className="heading-md" style={{ margin: 0 }}>Showroom Inventory</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Manage your products listed on ASK Sofa works.</p>
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
                        {products.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No products listed. Click "Add New Product" to begin selling!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SELLER CUSTOMER ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Customer Shipment Orders</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '-1.5rem', marginBottom: '2rem' }}>
                Fulfill orders containing your products. Take buyer addresses below to dispatch products.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>
                <div>
                  <div className="admin-table-card">
                    {ordersLoading ? (
                      <div>Fetching orders...</div>
                    ) : (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Product</th>
                              <th>Specs</th>
                              <th>Quantity</th>
                              <th>Revenue</th>
                              <th>Pipeline</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => (
                              <tr key={o.id}>
                                <td>#{o.order_id}</td>
                                <td>
                                  <strong>{o.product_name}</strong>
                                </td>
                                <td>{o.color} / {o.size} / {o.set_type || 'None'} / {o.upholstery || 'None'}</td>
                                <td style={{ textAlign: 'center' }}><strong>{o.quantity}</strong></td>
                                <td><strong>₹{(o.price * o.quantity).toLocaleString('en-IN')}</strong></td>
                                <td>
                                   <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: o.order_status === 'Delivered' ? 'var(--color-success)' : 'var(--color-warning)',
                                    backgroundColor: o.order_status === 'Delivered' ? 'rgba(95,122,104,0.1)' : 'rgba(195,146,90,0.1)',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}>
                                    {o.order_status} {o.customer_received === 1 && '👍 Received'}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                                    onClick={() => setSelectedOrder(o)}
                                  >
                                    View Buyer Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {orders.length === 0 && (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No customer orders placed on your products yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buyer details panel */}
                {selectedOrder && (
                  <div className="checkout-form-card" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>Shipping Address</h3>
                      <button onClick={() => setSelectedOrder(null)} style={{ fontSize: '1.1rem', color: '#999', backgroundColor: 'transparent', border: 'none' }}>✕</button>
                    </div>

                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <p><strong>Customer Name:</strong> {selectedOrder.customer_name}</p>
                      <p><strong>Phone Number:</strong> {selectedOrder.customer_mobile}</p>
                      <p><strong>Email Address:</strong> {selectedOrder.customer_email}</p>
                      <p><strong>Delivery Location Address:</strong><br />
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-gold-dark)', fontWeight: 600 }}>
                          {selectedOrder.customer_address}, {selectedOrder.customer_city}, {selectedOrder.customer_state} - {selectedOrder.customer_pincode}
                        </span>
                      </p>
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
                            ⏰ Status: {selectedOrder.order_status === 'Delivered' ? 'Delivered' : (daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Arriving today!')}
                          </div>
                        );
                      })()}
                      
                      <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid var(--color-sand)', borderRadius: '2px', backgroundColor: 'var(--color-bg-cream)' }}>
                        <strong>Fulfillment Notice:</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                           Pack the requested product details: <strong>{selectedOrder.quantity}x {selectedOrder.product_name} ({selectedOrder.color}, Size: {selectedOrder.size}, Set: {selectedOrder.set_type || 'None'}, Upholstery: {selectedOrder.upholstery || 'None'})</strong>, and ship them to the customer address listed above.
                        </p>
                      </div>

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
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Update Order Status</label>
                        <select 
                          className="form-control" 
                          value={selectedOrder.order_status}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.order_id, e.target.value)}
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

                      {selectedOrder.order_status === 'Delivered' && (
                        <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid var(--color-sand)', borderRadius: '2px', backgroundColor: 'var(--color-bg-cream)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Review Feedback Permission</span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            Customer must receive permission before writing feedback for this product.
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <button
                              onClick={() => handleToggleFeedbackPermission(selectedOrder.id, selectedOrder.feedback_permitted === 1 ? 0 : 1)}
                              className="btn btn-secondary btn-sm"
                              style={{ width: '100%', fontSize: '0.75rem', height: '32px', padding: 0 }}
                            >
                              {selectedOrder.feedback_permitted === 1 ? '🔒 Revoke Review Permission' : '🔓 Grant Review Permission'}
                            </button>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedOrder.feedback_permitted === 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                            Current Status: {selectedOrder.feedback_permitted === 1 ? 'Permitted (Customer can write feedback)' : 'Restricted (Cannot write feedback yet)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SELLER SHOWROOM PROFILE */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '600px' }}>
              <h1 className="heading-md" style={{ marginBottom: '2rem' }}>Showroom Profile Settings</h1>
              
              <form onSubmit={handleUpdateProfile} className="checkout-form-card">
                {profileMsg && <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '1.2rem', fontWeight: 500 }}>{profileMsg}</div>}
                {profileErr && <div style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{profileErr}</div>}

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Shop/Showroom Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.8rem' }}>
                  <label className="form-label">Showroom Physical Location Address *</label>
                  <textarea 
                    className="form-control" 
                    rows="4"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    required
                    style={{ padding: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn btn-gold" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Showroom Details'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="dashboard-card">
              <h3 className="section-title">Customer Feedback & Reviews</h3>
              <p className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Real feedback and delivery room images uploaded by your customers.
              </p>
              {reviewsLoading ? (
                <div style={{ padding: '3rem 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Loading client reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ padding: '3rem 0', fontStyle: 'italic', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No feedback reviews found for your showroom products yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {reviews.map((rev) => (
                    <div key={rev.id} style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1.2rem', backgroundColor: 'var(--color-bg-cream)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.user_name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                        Product: <strong style={{ color: 'var(--color-gold-dark)' }}>{rev.product_name}</strong>
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

        </main>
      </div>

      {/* Product CRUD Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Showroom Product'}</h3>
              <button className="modal-close" onClick={() => setIsProductModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
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
                      style={{ height: '46px' }}
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
                      list="seller-material-suggestions"
                      required
                    />
                    <datalist id="seller-material-suggestions">
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
