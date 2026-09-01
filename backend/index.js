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

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-Memory Fallback Database (Ensures 100% functionality even before Atlas URI is provided)
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

// CORS Config
const allowedOrigins = [
  'https://asksofaworks.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.endsWith('.lhr.life') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for production web clients
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Connect to MongoDB
connectToDatabase()
  .then(() => initDatabase())
  .then(() => {
    console.log('MongoDB initialization routine finished.');
  })
  .catch((err) => {
    console.warn('Database fallback mode active:', err.message);
  });

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

// Admin Authorization Middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

// Admin or Seller Authorization Middleware
const authorizeAdminOrSeller = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'seller')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Privileged role required.' });
  }
};

// Helper to log login history
async function logLoginAttempt(userId, name, identifier, method, status, errorReason, req) {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (isConnected) {
      await LoginHistory.create({
        user_id: userId,
        name: name || 'Anonymous',
        identifier,
        method,
        status,
        error_reason: errorReason,
        ip_address: ipAddress
      });
    }
  } catch (err) {
    console.warn('Login attempt logging skipped:', err.message);
  }
}

// Helper to safely parse arrays from DB output
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
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, mobile } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const isConnected = mongoose.connection.readyState === 1;

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
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Mobile Number or Email Address and password are required' });
  }

  const searchVal = email.trim().toLowerCase();
  const isConnected = mongoose.connection.readyState === 1;

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
      await logLoginAttempt(null, 'Anonymous', email, 'email', 'failure', 'Account not found', req);
      return res.status(400).json({ message: 'This Mobile Number or Email Address is not registered. Please sign up or try again.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logLoginAttempt(user.id, user.name, email, 'email', 'failure', 'Incorrect password', req);
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });

    await logLoginAttempt(user.id, user.name, email, 'email', 'success', null, req);

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

// Google sign-in
app.post('/api/auth/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: 'Email and name are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      let user = fallbackUsers.find(u => u.email === cleanEmail);
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          name,
          email: cleanEmail,
          password: await bcrypt.hash(googleId || Math.random().toString(), 10),
          role: 'customer',
          mobile: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          seller_status: 'none'
        };
        fallbackUsers.push(user);
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobile: user.mobile,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode
        }
      });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const dummyPassword = await bcrypt.hash(googleId || Math.random().toString(), 10);
      user = await User.create({
        name,
        email: cleanEmail,
        password: dummyPassword,
        role: 'customer',
        mobile: ''
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
    await logLoginAttempt(user.id, user.name, email, 'google', 'success', null, req);

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
        pincode: user.pincode || ''
      }
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ message: 'Server error during Google sign-in' });
  }
});

// Firebase OTP login
app.post('/api/auth/firebase-login', async (req, res) => {
  const { idToken, name, mobile } = req.body;
  const isConnected = mongoose.connection.readyState === 1;

  if (idToken === 'mock-demo-token' || !idToken) {
    if (!mobile || !/^\d{10}$/.test(mobile.trim())) {
      return res.status(400).json({ message: 'A valid 10-digit mobile number is required' });
    }

    const mob = mobile.trim();
    if (!isConnected) {
      let user = fallbackUsers.find(u => u.mobile === mob);
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          name: name || 'OTP Customer',
          email: `otp_user_${mob}@asksofaworks.com`,
          password: await bcrypt.hash(Math.random().toString(), 10),
          role: 'customer',
          mobile: mob,
          address: '',
          city: '',
          state: '',
          pincode: '',
          seller_status: 'none'
        };
        fallbackUsers.push(user);
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobile: user.mobile,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode
        }
      });
    }

    try {
      let user = await User.findOne({ mobile: mob });
      if (!user) {
        const dummyPassword = await bcrypt.hash(Math.random().toString(), 10);
        user = await User.create({
          name: name || 'OTP Customer',
          email: `otp_user_${mob}@asksofaworks.com`,
          password: dummyPassword,
          role: 'customer',
          mobile: mob
        });
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
          pincode: user.pincode || ''
        }
      });
    } catch (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
  }

  res.json({ message: 'OTP Login verified' });
});

// Get profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
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

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, mobile, address, city, state, pincode } = req.body;
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      const user = fallbackUsers.find(u => u.id === req.user.id || u.email === req.user.email);
      if (user) {
        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (address) user.address = address;
        if (city) user.city = city;
        if (state) user.state = state;
        if (pincode) user.pincode = pincode;
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, mobile, address, city, state, pincode },
      { new: true }
    ).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Apply Seller role
app.post('/api/auth/apply-seller', authenticateToken, async (req, res) => {
  const { shop_name, shop_address } = req.body;
  if (!shop_name || !shop_address) {
    return res.status(400).json({ message: 'Shop name and Shop address are required' });
  }
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      const user = fallbackUsers.find(u => u.id === req.user.id);
      if (user) {
        user.shop_name = shop_name;
        user.shop_address = shop_address;
        user.seller_status = 'pending';
      }
      return res.json({ message: 'Seller application submitted successfully! Pending admin approval.' });
    }

    await User.findByIdAndUpdate(req.user.id, {
      shop_name,
      shop_address,
      seller_status: 'pending'
    });
    res.json({ message: 'Seller application submitted successfully! Pending admin approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit seller application' });
  }
});

// ==========================================
// 2. PRODUCT ENDPOINTS
// ==========================================

// Get all products (Public)
app.get('/api/products', async (req, res) => {
  const { category, search, material, color, sort } = req.query;
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
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

    const products = await Product.find(filter).sort(sortCriteria);
    const formattedProducts = await Promise.all(products.map(async (prod) => {
      const reviews = await Review.find({ product_id: prod._id });
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
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error retrieving products' });
  }
});

// Get Single Product & Reviews
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  const isConnected = mongoose.connection.readyState === 1;

  try {
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

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid Product ID format' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await Review.find({ product_id: productId }).sort({ created_at: -1 });
    const count = reviews.length;
    const avg = count > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count) : 0;

    const formattedProduct = {
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
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Error retrieving product details' });
  }
});

// ==========================================
// 3. ORDER ENDPOINTS
// ==========================================

// Place Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { name, mobile, email, address, city, state, pincode, total_price, payment_method, items } = req.body;

  if (!name || !mobile || !email || !address || !city || !state || !pincode || !total_price || !payment_method || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing billing details, total price, payment method, or items' });
  }

  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
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

      return res.status(201).json({
        message: 'Order Placed Successfully!',
        orderId: newOrder.id,
        orderSummary: {
          id: newOrder.id,
          name,
          email,
          mobile,
          address: `${address}, ${city}, ${state} - ${pincode}`,
          total_price,
          payment_method,
          status: 'Pending',
          items
        }
      });
    }

    const dbItems = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      color: item.color,
      size: item.size,
      image_url: item.image_url,
      upholstery: item.upholstery || 'None',
      set_type: item.set_type || 'None',
      feedback_permitted: 0
    }));

    const order = await Order.create({
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
      items: dbItems,
      status: 'Pending'
    });

    res.status(201).json({
      message: 'Order Placed Successfully!',
      orderId: order.id,
      orderSummary: {
        id: order.id,
        name,
        email,
        mobile,
        address: `${address}, ${city}, ${state} - ${pincode}`,
        total_price,
        payment_method,
        status: 'Pending',
        items
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Error processing your order' });
  }
});

// Get My Orders
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      const myOrders = fallbackOrders.filter(o => o.user_id === req.user.id);
      return res.json(myOrders);
    }

    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    const formattedOrders = orders.map(order => ({
      id: order.id,
      user_id: order.user_id,
      name: order.name,
      mobile: order.mobile,
      email: order.email,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      total_price: order.total_price,
      status: order.status,
      payment_method: order.payment_method,
      customer_received: order.customer_received,
      delivery_response: order.delivery_response,
      paid_amount: order.paid_amount,
      payment_bill_img: order.payment_bill_img,
      created_at: order.created_at,
      items: order.items
    }));

    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order history' });
  }
});

// Track specific order
app.get('/api/orders/track/:id', async (req, res) => {
  const orderId = req.params.id;
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      const order = fallbackOrders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      return res.json(order);
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid Order ID format' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order tracking' });
  }
});

// Get All Orders (Admin)
app.get('/api/orders', authenticateToken, authorizeAdmin, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  try {
    if (!isConnected) {
      return res.json(fallbackOrders);
    }
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer orders' });
  }
});

// ==========================================
// 4. WISHLIST & INQUIRY ENDPOINTS
// ==========================================

// Get Wishlist
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  try {
    if (!isConnected) {
      const userWishlist = fallbackWishlists.filter(w => w.user_id === req.user.id);
      const prods = userWishlist.map(w => fallbackProducts.find(p => p.id === w.product_id)).filter(Boolean);
      return res.json(prods);
    }

    const items = await Wishlist.find({ user_id: req.user.id }).populate('product_id');
    const validProducts = items
      .filter(item => item.product_id !== null)
      .map(item => item.product_id);
    res.json(validProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wishlist' });
  }
});

// Toggle Wishlist
app.post('/api/wishlist', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'Product ID is required' });
  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      const idx = fallbackWishlists.findIndex(w => w.user_id === req.user.id && w.product_id === productId);
      if (idx !== -1) {
        fallbackWishlists.splice(idx, 1);
        return res.json({ added: false, message: 'Removed from wishlist' });
      } else {
        fallbackWishlists.push({ user_id: req.user.id, product_id: productId });
        return res.json({ added: true, message: 'Added to wishlist' });
      }
    }

    const existing = await Wishlist.findOne({ user_id: req.user.id, product_id: productId });
    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      res.json({ added: false, message: 'Removed from wishlist' });
    } else {
      await Wishlist.create({ user_id: req.user.id, product_id: productId });
      res.json({ added: true, message: 'Added to wishlist' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating wishlist' });
  }
});

// Submit Inquiry
app.post('/api/inquiries', async (req, res) => {
  const { name, email, mobile, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required fields.' });
  }

  const isConnected = mongoose.connection.readyState === 1;

  try {
    if (!isConnected) {
      fallbackInquiries.unshift({
        id: `inquiry_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        mobile: mobile ? mobile.trim() : null,
        subject: subject ? subject.trim() : null,
        message: message.trim(),
        created_at: new Date().toISOString()
      });
      return res.status(201).json({ message: 'Inquiry submitted successfully!' });
    }

    await Inquiry.create({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile ? mobile.trim() : null,
      subject: subject ? subject.trim() : null,
      message: message.trim()
    });
    res.status(201).json({ message: 'Inquiry submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit inquiry' });
  }
});

// Get Inquiries (Admin)
app.get('/api/admin/inquiries', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  try {
    if (!isConnected) {
      return res.json(fallbackInquiries);
    }
    const inquiries = await Inquiry.find().sort({ created_at: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve inquiries' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Root Endpoint
app.get('/api', (req, res) => {
  res.json({ status: 'success', message: 'ASK Sofa Works Backend API is running' });
});

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    database: mongoose.connection.readyState === 1 ? 'MongoDB Atlas (Connected)' : 'In-Memory (Active Fallback)' 
  });
});

// Single Page Application Fallback for all page routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Store page not found');
});

// Export app for Vercel
module.exports = app;

// Start Server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server is running locally on port ${PORT}`);
  });
}
