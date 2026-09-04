require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectToDatabase, initDatabase, sampleProducts } = require('./db');
const { User, Product, Order, Review, Wishlist, LoginHistory, Inquiry } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'asksofaworks_secret_key_2026_premium_furniture';

const path = require('path');
const fs = require('fs');

// In-Memory Fallback Database
const fallbackUsers = [
  {
    id: 'user_admin_1',
    name: 'Shop Admin',
    email: 'admin@asksofaworks.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    mobile: '9876543210',
    address: 'WX4J+W5P, vengalarao Nagar',
    city: 'Kavali',
    state: 'Andhra Pradesh',
    pincode: '524201',
    seller_status: 'none'
  },
  {
    id: 'user_admin_2',
    name: 'Shaik Rahim',
    email: 'shaikrahim47146@gmail.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    mobile: '7995585087',
    address: 'WX4J+W5P, vengalarao Nagar',
    city: 'Kavali',
    state: 'Andhra Pradesh',
    pincode: '524201',
    seller_status: 'none'
  },
  {
    id: 'user_customer_1',
    name: 'John Doe',
    email: 'customer@example.com',
    password: bcrypt.hashSync('customer123', 10),
    role: 'customer',
    mobile: '9876543211',
    address: 'Apartment 4B, Serenity Towers',
    city: 'Vellore',
    state: 'Tamil Nadu',
    pincode: '632014',
    seller_status: 'none'
  }
];

const fallbackOrders = [];
const fallbackWishlists = [];
const fallbackInquiries = [];
const fallbackReviews = [];
const fallbackProducts = sampleProducts.map((prod, idx) => ({
  ...prod,
  id: (idx + 1).toString(),
  colors: prod.colors,
  sizes: prod.sizes,
  additional_images: prod.additional_images || [],
  upholstery_types: ['Cloth', 'Rexine'],
  set_types: [],
  seller_id: null,
  rating: 4.8,
  review_count: 12
}));

function getFallbackProductList(category, search, material, color, sort, res) {
  let list = [...fallbackProducts];

  if (category && category !== 'all') {
    list = list.filter(p => p.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
  }
  if (material) {
    list = list.filter(p => p.material.toLowerCase().includes(material.toLowerCase()));
  }
  if (color) {
    list = list.filter(p => Array.isArray(p.colors) && p.colors.some(c => c.toLowerCase().includes(color.toLowerCase())));
  }
  if (sort === 'price_asc') {
    list.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
  } else if (sort === 'price_desc') {
    list.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
  }
  return res.json(list);
}

// CORS Config
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB asynchronously without blocking
if (process.env.MONGODB_URI) {
  connectToDatabase()
    .then(() => initDatabase())
    .then(() => {
      console.log('MongoDB initialization routine finished.');
    })
    .catch((err) => {
      console.warn('Database fallback mode active:', err.message);
    });
}

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

const authorizeAdminOrSeller = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'seller')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Privileged role required.' });
  }
};

const safeParseArray = (val, defaultVal = []) => {
  if (!val) return defaultVal;
  if (Array.isArray(val)) return val;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch (e) {
    return defaultVal;
  }
};

// ==========================================
// API ROUTER
// ==========================================
const apiRouter = express.Router();

// Root API Endpoint
apiRouter.get('/api', (req, res) => {
  res.json({ status: 'success', message: 'ASK Sofa Works Backend API is running' });
});

// Health Endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'success', 
    database: mongoose.connection.readyState === 1 && process.env.MONGODB_URI ? 'MongoDB Atlas (Connected)' : 'In-Memory (Active Fallback)' 
  });
});
apiRouter.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    database: mongoose.connection.readyState === 1 && process.env.MONGODB_URI ? 'MongoDB Atlas (Connected)' : 'In-Memory (Active Fallback)' 
  });
});

// Register
apiRouter.post('/auth/register', async (req, res) => {
  const { name, email, password, mobile } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const isConnected = mongoose.connection.readyState === 1 && process.env.MONGODB_URI;

  try {
    if (!isConnected) {
      const existing = fallbackUsers.find(u => u.email === cleanEmail);
      if (existing) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user_${Date.now()}`,
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: 'customer',
        mobile: mobile || '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        seller_status: 'none'
      };
      fallbackUsers.push(newUser);

      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '36500d' });
      return res.status(201).json({
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          mobile: newUser.mobile,
          address: newUser.address,
          city: newUser.city,
          state: newUser.state,
          pincode: newUser.pincode
        }
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: 'customer',
      mobile: mobile || ''
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Mobile Number or Email Address and password are required' });
  }

  const searchVal = email.trim().toLowerCase();
  const isConnected = mongoose.connection.readyState === 1 && process.env.MONGODB_URI;

  try {
    if (!isConnected) {
      const user = fallbackUsers.find(u => u.email.toLowerCase() === searchVal || (u.mobile && u.mobile === searchVal));
      if (!user) {
        return res.status(400).json({ message: 'This Mobile Number or Email Address is not registered. Please sign up or try again.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Incorrect password. Please try again.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobile: user.mobile || '',
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          pincode: user.pincode || '',
          shop_name: user.shop_name || '',
          shop_address: user.shop_address || '',
          seller_status: user.seller_status || 'none'
        }
      });
    }

    const user = await User.findOne({ 
      $or: [
        { email: searchVal },
        { mobile: searchVal }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'This Mobile Number or Email Address is not registered. Please sign up or try again.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        shop_name: user.shop_name || '',
        shop_address: user.shop_address || '',
        seller_status: user.seller_status || 'none'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error signing in' });
  }
});

// Profile
apiRouter.get('/auth/me', authenticateToken, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1 && process.env.MONGODB_URI;
  try {
    if (!isConnected) {
      const user = fallbackUsers.find(u => u.id === req.user.id || u.email === req.user.email);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Products
apiRouter.get('/products', async (req, res) => {
  const { category, search, material, color, sort } = req.query;
  const isConnected = mongoose.connection.readyState === 1 && process.env.MONGODB_URI;

  if (!isConnected) {
    return getFallbackProductList(category, search, material, color, sort, res);
  }

  try {
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { material: { $regex: search, $options: 'i' } }
      ];
    }
    if (material) filter.material = { $regex: material, $options: 'i' };
    if (color) filter.colors = { $regex: color, $options: 'i' };

    let sortCriteria = { _id: 1 };
    if (sort === 'price_asc') sortCriteria = { price: 1 };
    else if (sort === 'price_desc') sortCriteria = { price: -1 };
    else if (sort === 'newest') sortCriteria = { created_at: -1 };
    else if (sort === 'popular') sortCriteria = { stock: -1 };

    const products = await Product.find(filter).sort(sortCriteria).maxTimeMS(3000);
    const formattedProducts = await Promise.all(products.map(async (prod) => {
      const reviews = await Review.find({ product_id: prod._id }).maxTimeMS(2000);
      const count = reviews.length;
      const avg = count > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count) : 0;
      
      return {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        description: prod.description,
        material: prod.material,
        price: prod.price,
        discount_price: prod.discount_price,
        stock: prod.stock,
        image_url: prod.image_url,
        colors: safeParseArray(prod.colors),
        sizes: safeParseArray(prod.sizes),
        additional_images: safeParseArray(prod.additional_images),
        upholstery_types: safeParseArray(prod.upholstery_types, ['Cloth', 'Rexine']),
        set_types: safeParseArray(prod.set_types),
        seller_id: prod.seller_id,
        rating: avg,
        review_count: count
      };
    }));

    if (sort === 'rating') {
      formattedProducts.sort((a, b) => b.rating - a.rating || b.review_count - a.review_count);
    }
    
    res.json(formattedProducts);
  } catch (error) {
    console.warn('Database query error in /products, falling back safely:', error.message);
    return getFallbackProductList(category, search, material, color, sort, res);
  }
});

// Single Product
apiRouter.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const isConnected = mongoose.connection.readyState === 1 && process.env.MONGODB_URI;

  if (!isConnected) {
    const prod = fallbackProducts.find(p => p.id === productId || p._id === productId);
    if (prod) {
      return res.json({
        ...prod,
        reviewsList: fallbackReviews.filter(r => r.product_id === productId),
        isEligibleToReview: true
      });
    }
    return res.status(404).json({ message: 'Product not found' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const prod = fallbackProducts.find(p => p.id === productId);
      if (prod) return res.json({ ...prod, reviewsList: [], isEligibleToReview: true });
      return res.status(400).json({ message: 'Invalid Product ID format' });
    }
    const product = await Product.findById(productId).maxTimeMS(3000);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await Review.find({ product_id: productId }).sort({ created_at: -1 }).maxTimeMS(2000);
    const count = reviews.length;
    const avg = count > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count) : 0;

    res.json({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      material: product.material,
      price: product.price,
      discount_price: product.discount_price,
      stock: product.stock,
      image_url: product.image_url,
      colors: safeParseArray(product.colors),
      sizes: safeParseArray(product.sizes),
      additional_images: safeParseArray(product.additional_images),
      upholstery_types: safeParseArray(product.upholstery_types, ['Cloth', 'Rexine']),
      set_types: safeParseArray(product.set_types),
      seller_id: product.seller_id,
      rating: avg,
      review_count: count,
      reviewsList: reviews.map(r => ({
        id: r.id,
        user_id: r.user_id,
        product_id: r.product_id,
        user_name: r.user_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        real_images: safeParseArray(r.real_images)
      })),
      isEligibleToReview: true
    });
  } catch (error) {
    const prod = fallbackProducts.find(p => p.id === productId);
    if (prod) return res.json({ ...prod, reviewsList: [], isEligibleToReview: true });
    res.status(500).json({ message: 'Error retrieving product details' });
  }
});

// Orders
apiRouter.post('/orders', authenticateToken, async (req, res) => {
  const { name, mobile, email, address, city, state, pincode, total_price, payment_method, items } = req.body;
  if (!name || !mobile || !email || !address || !city || !state || !pincode || !total_price || !payment_method || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing required order details' });
  }

  const newOrder = {
    id: `order_${Date.now()}`,
    user_id: req.user.id,
    name,
    mobile,
    email,
    address,
    city,
    state,
    pincode,
    total_price,
    payment_method,
    items,
    status: 'Pending',
    created_at: new Date().toISOString()
  };
  fallbackOrders.unshift(newOrder);

  res.status(201).json({
    message: 'Order Placed Successfully!',
    orderId: newOrder.id,
    orderSummary: newOrder
  });
});

apiRouter.get('/orders/my-orders', authenticateToken, async (req, res) => {
  const myOrders = fallbackOrders.filter(o => o.user_id === req.user.id);
  res.json(myOrders);
});

// Wishlist
apiRouter.get('/wishlist', authenticateToken, async (req, res) => {
  const userWishlist = fallbackWishlists.filter(w => w.user_id === req.user.id);
  const prods = userWishlist.map(w => fallbackProducts.find(p => p.id === w.product_id)).filter(Boolean);
  res.json(prods);
});

apiRouter.post('/wishlist', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'Product ID required' });
  const idx = fallbackWishlists.findIndex(w => w.user_id === req.user.id && w.product_id === productId);
  if (idx !== -1) {
    fallbackWishlists.splice(idx, 1);
    return res.json({ added: false, message: 'Removed from wishlist' });
  }
  fallbackWishlists.push({ user_id: req.user.id, product_id: productId });
  res.json({ added: true, message: 'Added to wishlist' });
});

// Inquiries
apiRouter.post('/inquiries', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required' });
  }
  fallbackInquiries.unshift({ id: `inq_${Date.now()}`, ...req.body, created_at: new Date().toISOString() });
  res.status(201).json({ message: 'Inquiry submitted successfully!' });
});

apiRouter.get('/admin/inquiries', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  res.json(fallbackInquiries);
});

const embeddedHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ASKsofaworks</title>
    <script type="module" crossorigin src="/assets/index-8TwLSXDe.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-BQmRmFaR.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

// Mount API router on BOTH /api and root /
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Single Page Application Fallback for all storefront pages
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(embeddedHtml);
});

module.exports = app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });
}
