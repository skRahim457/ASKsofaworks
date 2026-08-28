import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

export default function CategoryPage() {
  const { categoryId } = useParams(); // 'sofas' or 'beds'
  const location = useLocation();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load search query from URL
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';

  // Options lists
  const materialsList = ['Teak wood', 'Mango wood', 'Mahogany wood', 'Oak wood', 'Pine wood', 'Velvet', 'Linen', 'Leather', 'Boucle', 'Chenille'];

  const colorsList = ['Cream', 'Grey', 'Blue', 'Green', 'Brown', 'Taupe', 'Charcoal'];

  useEffect(() => {
    setLoading(true);
    // Reset filters when category changes
    setSelectedMaterials([]);
    setSelectedColors([]);
    setSelectedPriceRange('');

    let url = `http://${window.location.hostname}:5000/api/products?category=${categoryId}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, [categoryId, searchQuery]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...products];

    // Filter by Materials
    if (selectedMaterials.length > 0) {
      result = result.filter((prod) => 
        selectedMaterials.some((mat) => prod.material.toLowerCase().includes(mat.toLowerCase()))
      );
    }

    // Filter by Colors
    if (selectedColors.length > 0) {
      result = result.filter((prod) => 
        prod.colors.some((col) => 
          selectedColors.some((selCol) => col.toLowerCase().includes(selCol.toLowerCase()))
        )
      );
    }

    // Filter by Price Range
    if (selectedPriceRange) {
      const price = Number(selectedPriceRange);
      if (price === 1000) {
        result = result.filter((prod) => (prod.discount_price || prod.price) < 1000);
      } else if (price === 2000) {
        result = result.filter((prod) => {
          const actualPrice = prod.discount_price || prod.price;
          return actualPrice >= 1000 && actualPrice <= 2000;
        });
      } else if (price === 3000) {
        result = result.filter((prod) => (prod.discount_price || prod.price) > 2000);
      }
    }

    // Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'popular') {
      result.sort((a, b) => b.stock - a.stock); // Proxy for popularity
    }

    setFilteredProducts(result);
  }, [products, selectedMaterials, selectedColors, selectedPriceRange, sortBy]);

  const handleMaterialChange = (material) => {
    setSelectedMaterials((prev) => 
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    );
  };

  const handleColorChange = (color) => {
    setSelectedColors((prev) => 
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearAllFilters = () => {
    setSelectedMaterials([]);
    setSelectedColors([]);
    setSelectedPriceRange('');
    setSortBy('newest');
  };

  const getCategoryTitle = () => {
    if (categoryId === 'all') return 'All Furniture Items';
    if (categoryId === 'corner-sofas') return 'Corner Sofas';
    if (categoryId === 'l-shape-sofas') return 'L-Shape Sofas';
    if (categoryId === 'sofa-sets') return 'Premium Sofa Sets';
    if (categoryId === 'wooden-sets') return 'Wooden Sets';
    return categoryId; // fallback: sofas, beds
  };

  return (
    <section className="section-padding">
      <div className="section-container">
        {/* Page title header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="subtitle">ASK Sofa works Collection</span>
          <h1 className="heading-md" style={{ textTransform: 'capitalize' }}>
            {searchQuery ? `Search Results for "${searchQuery}"` : getCategoryTitle()}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Exquisite, high-density comfort constructed using luxury fabrics and handcrafted hardwoods.
          </p>
        </div>

        <div className="catalog-layout">
          {/* Filters Sidebar */}
          <aside className="catalog-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem' }}>Filters</h3>
              <button 
                onClick={clearAllFilters} 
                style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Clear All
              </button>
            </div>

            {/* Material Filters */}
            <div className="filter-group">
              <h4 className="filter-group-title">Materials</h4>
              <div className="filter-list">
                {materialsList.map((material) => (
                  <label key={material} className="filter-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedMaterials.includes(material)}
                      onChange={() => handleMaterialChange(material)}
                    />
                    <span>{material}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Filters */}
            <div className="filter-group">
              <h4 className="filter-group-title">Colors</h4>
              <div className="filter-list">
                {colorsList.map((color) => (
                  <label key={color} className="filter-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedColors.includes(color)}
                      onChange={() => handleColorChange(color)}
                    />
                    <span>{color}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="filter-group">
              <h4 className="filter-group-title">Price Range</h4>
              <div className="filter-list">
                <label className="filter-checkbox-label">
                  <input 
                    type="radio" 
                    name="priceRange"
                    checked={selectedPriceRange === ''}
                    onChange={() => setSelectedPriceRange('')}
                  />
                  <span>All Prices</span>
                </label>
                <label className="filter-checkbox-label">
                  <input 
                    type="radio" 
                    name="priceRange"
                    checked={selectedPriceRange === '1000'}
                    onChange={() => setSelectedPriceRange('1000')}
                  />
                  <span>Under ₹1,000</span>
                </label>
                <label className="filter-checkbox-label">
                  <input 
                    type="radio" 
                    name="priceRange"
                    checked={selectedPriceRange === '2000'}
                    onChange={() => setSelectedPriceRange('2000')}
                  />
                  <span>₹1,000 - ₹2,000</span>
                </label>
                <label className="filter-checkbox-label">
                  <input 
                    type="radio" 
                    name="priceRange"
                    checked={selectedPriceRange === '3000'}
                    onChange={() => setSelectedPriceRange('3000')}
                  />
                  <span>Over ₹2,000</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main Catalog View */}
          <div className="catalog-content">
            <div className="catalog-controls">
              <span className="catalog-count">
                Showing <strong>{filteredProducts.length}</strong> of {products.length} products
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Sort By:</span>
                <select 
                  className="sort-select" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest Arrival</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Customer Rating</option>
                  <option value="popular">Popularity / Stock</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
                Polishing our collection display...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', border: '1px dashed var(--color-sand)', borderRadius: '4px', backgroundColor: 'var(--color-white)' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>No products match your filters</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Try clearing some filter tags or search terms.</p>
                <button onClick={clearAllFilters} className="btn btn-gold btn-sm">Reset Filters</button>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((prod) => {
                  const hasDiscount = prod.discount_price !== null;
                  const priceToDisplay = hasDiscount ? prod.discount_price : prod.price;
                  const starred = isInWishlist(prod.id);

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

                        {/* Wishlist Toggle */}
                        <button 
                          className={`product-wishlist-btn ${starred ? 'active' : ''}`}
                          onClick={() => toggleWishlist(prod.id)}
                          aria-label="Wishlist"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                        
                        {prod.stock === 0 && (
                          <span className="badge badge-outofstock product-card-badge" style={{ left: 'auto', right: '1rem' }}>Sold Out</span>
                        )}
                      </div>
                      
                      <div className="product-card-info">
                        <span className="product-card-category">{prod.material}</span>
                        <h3 className="product-card-title">
                          <Link to={`/product/${prod.id}`}>{prod.name}</Link>
                        </h3>
                        <p className="product-card-material" style={{ marginBottom: '0.8rem' }}>
                          Sizes: {prod.sizes.join(', ')}
                        </p>
                        
                        <div className="product-card-footer">
                          <div className="price-block">
                            {hasDiscount ? (
                              <>
                                <span className="price-current">₹{prod.discount_price.toLocaleString('en-IN')}</span>
                                <span className="price-original">₹{prod.price.toLocaleString('en-IN')}</span>
                                <span className="discount-pct">{Math.round(((prod.price - prod.discount_price) / prod.price) * 100)}% OFF</span>
                              </>
                            ) : (
                              <span className="price-current">₹{prod.price.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                              {prod.review_count} ratings & reviews
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
