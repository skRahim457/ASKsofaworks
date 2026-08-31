require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectToDatabase, initDatabase } = require('./db');
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
    return callback(new Error('CORS Policy block: Origin not allowed'), false);
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
    console.log('MongoDB initialized successfully.');
  })
  .catch((err) => {
    console.error('Database connection / initialization failed:', err);
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
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    await LoginHistory.create({
      user_id: userId,
      name: name || 'Anonymous',
      identifier,
      method,
      status,
      error_reason: errorReason,
      ip_address: ipAddress
    });
  } catch (err) {
    console.error('Failed to log login attempt:', err.message);
  }
}

// Initialize Firebase Admin SDK if credentials provided
const admin = require('firebase-admin');
let firebaseEnabled = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
    firebaseEnabled = true;
    console.log('[Firebase Auth] Firebase Admin SDK successfully initialized');
  } else {
    console.warn('[Firebase Auth Warning] Firebase environment credentials are not set in .env. Real verification will fail.');
  }
} catch (e) {
  console.error('[Firebase Auth Error] Initialization failed:', e.message);
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

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
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
    await logLoginAttempt(null, 'Anonymous', email || 'unknown', 'email', 'failure', 'Missing credentials', req);
    return res.status(400).json({ message: 'Mobile Number or Email Address and password are required' });
  }

  try {
    const searchVal = email.trim();
    const user = await User.findOne({ 
      $or: [
        { email: searchVal.toLowerCase() },
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
    await logLoginAttempt(null, 'Anonymous', email, 'email', 'failure', error.message, req);
    res.status(500).json({ message: 'Error signing in' });
  }
});

// Firebase OTP login
app.post('/api/auth/firebase-login', async (req, res) => {
  const { idToken, name } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID Token is required' });
  }

  // Developer Sandbox Mock Bypass
  if (idToken === 'mock-demo-token') {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile.trim())) {
      await logLoginAttempt(null, name || 'Anonymous', mobile || 'unknown', 'otp', 'failure', 'Invalid mobile number format', req);
      return res.status(400).json({ message: 'A valid 10-digit mobile number is required' });
    }

    try {
      let user = await User.findOne({ mobile: mobile.trim() });
      if (!user) {
        const email = `otp_user_${mobile.trim()}@asksofaworks.com`;
        const dummyPassword = await bcrypt.hash(Math.random().toString(), 10);
        
        user = await User.create({
          name: name || 'OTP Customer',
          email,
          password: dummyPassword,
          role: 'customer',
          mobile: mobile.trim()
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
      await logLoginAttempt(user.id, user.name, mobile.trim(), 'otp', 'success', null, req);

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
      console.error('[Firebase Sandbox Auth] error:', err.message);
      await logLoginAttempt(null, name || 'Anonymous', mobile.trim(), 'otp', 'failure', err.message, req);
      return res.status(500).json({ message: 'Database error occurred during mock verification' });
    }
  }

  if (!firebaseEnabled) {
    await logLoginAttempt(null, name || 'Anonymous', 'real-otp-requested', 'otp', 'failure', 'Firebase Auth not configured on backend', req);
    return res.status(500).json({ 
      message: 'Firebase Authentication is not configured on the server. Please define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your backend .env file.' 
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumberWithCountryCode = decodedToken.phone_number;

    if (!phoneNumberWithCountryCode) {
      await logLoginAttempt(null, name || 'Anonymous', 'invalid-token-payload', 'otp', 'failure', 'Phone number missing in token payload', req);
      return res.status(400).json({ message: 'Decoded Firebase token does not contain a verified phone number' });
    }

    let mobile = phoneNumberWithCountryCode;
    if (mobile.startsWith('+91')) {
      mobile = mobile.substring(3);
    } else if (mobile.startsWith('+')) {
      mobile = mobile.replace('+', '');
    }

    let user = await User.findOne({ mobile: mobile.trim() });
    if (!user) {
      const email = `otp_user_${mobile.trim()}@asksofaworks.com`;
      const dummyPassword = await bcrypt.hash(Math.random().toString(), 10);
      
      user = await User.create({
        name: name || 'OTP Customer',
        email,
        password: dummyPassword,
        role: 'customer',
        mobile: mobile.trim()
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
    await logLoginAttempt(user.id, user.name, mobile.trim(), 'otp', 'success', null, req);

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
  } catch (err) {
    console.error('[Firebase Auth] Verification failed:', err.message);
    await logLoginAttempt(null, name || 'Anonymous', 'failed-verify-token', 'otp', 'failure', err.message, req);
    res.status(401).json({ message: `Authentication failed: ${err.message || 'Invalid or expired Firebase token'}` });
  }
});

// Google sign-in
app.post('/api/auth/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  if (!email || !name) {
    await logLoginAttempt(null, name || 'Anonymous', email || 'unknown', 'google', 'failure', 'Missing credentials', req);
    return res.status(400).json({ message: 'Email and name are required' });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const dummyPassword = await bcrypt.hash(googleId || Math.random().toString(), 10);
      user = await User.create({
        name,
        email: email.toLowerCase().trim(),
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
    console.error('Google Sign-In database error:', error);
    await logLoginAttempt(null, name || 'Anonymous', email, 'google', 'failure', error.message, req);
    res.status(500).json({ message: 'Server error during Google sign-in' });
  }
});

// Get profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
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
  try {
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
  try {
    await User.findByIdAndUpdate(req.user.id, {
      shop_name,
      shop_address,
      seller_status: 'pending'
    });
    res.json({ message: 'Seller application submitted successfully! Pending admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit seller application' });
  }
});

// ==========================================
// 2. ADMIN/SELLER ENDPOINTS
// ==========================================

// Get sellers list (Admin Only)
app.get('/api/admin/sellers', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const sellers = await User.find({
      $or: [{ seller_status: 'pending' }, { role: 'seller' }]
    }).select('id name email mobile role shop_name shop_address seller_status');
    res.json(sellers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller accounts' });
  }
});

// Approve/Reject seller (Admin Only)
app.post('/api/admin/approve-seller/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const userId = req.params.id;
  const { action } = req.body;
  if (!action || (action !== 'approve' && action !== 'reject')) {
    return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
  }
  try {
    if (action === 'approve') {
      await User.findByIdAndUpdate(userId, { role: 'seller', seller_status: 'approved' });
      res.json({ message: 'User approved as a seller successfully!' });
    } else {
      await User.findByIdAndUpdate(userId, { 
        role: 'customer', 
        seller_status: 'none', 
        shop_name: null, 
        shop_address: null 
      });
      res.json({ message: 'Seller application rejected/revoked successfully.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update seller role status' });
  }
});

// Get Seller owned products (Admin/Seller)
app.get('/api/seller/products', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const sellerId = req.user.role === 'admin' ? (req.query.sellerId || null) : req.user.id;
    const query = sellerId ? { seller_id: sellerId } : { seller_id: null };
    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller products' });
  }
});

// Get seller reviews (Admin/Seller)
app.get('/api/seller/reviews', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    let reviews;
    if (req.user.role === 'admin') {
      reviews = await Review.find().populate('product_id');
    } else {
      const sellerProducts = await Product.find({ seller_id: req.user.id });
      const productIds = sellerProducts.map(p => p._id);
      reviews = await Review.find({ product_id: { $in: productIds } }).populate('product_id');
    }
    
    const formatted = reviews.map(r => {
      const prod = r.product_id || {};
      return {
        id: r.id,
        user_id: r.user_id,
        product_id: prod.id || null,
        user_name: r.user_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        product_name: prod.name || 'Unknown Product',
        product_image: prod.image_url || '',
        real_images: safeParseArray(r.real_images)
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching seller reviews:', error);
    res.status(500).json({ message: 'Error fetching customer reviews' });
  }
});

// Get seller orders (Admin/Seller)
app.get('/api/seller/orders', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const isSeller = req.user.role === 'seller';
    let orders;
    
    if (req.user.role === 'admin') {
      orders = await Order.find().sort({ created_at: -1 });
    } else {
      const sellerProducts = await Product.find({ seller_id: req.user.id });
      const productIds = sellerProducts.map(p => p._id.toString());
      orders = await Order.find({ "items.product_id": { $in: productIds } }).sort({ created_at: -1 });
    }

    const flatItems = [];
    orders.forEach(o => {
      o.items.forEach(item => {
        // If logged in as seller, only return the items they own
        if (!isSeller || (item.product_id && allowedOrigins)) {
          flatItems.push({
            id: item.id,
            order_id: o.id,
            product_id: item.product_id ? item.product_id.toString() : null,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            color: item.color,
            size: item.size,
            image_url: item.image_url,
            upholstery: item.upholstery,
            set_type: item.set_type,
            feedback_permitted: item.feedback_permitted,
            customer_received: o.customer_received,
            delivery_response: o.delivery_response,
            paid_amount: o.paid_amount,
            payment_bill_img: o.payment_bill_img,
            customer_name: o.name,
            customer_mobile: o.mobile,
            customer_email: o.email,
            customer_address: o.address,
            customer_city: o.city,
            customer_state: o.state,
            customer_pincode: o.pincode,
            order_status: o.status,
            payment_method: o.payment_method,
            created_at: o.created_at
          });
        }
      });
    });
    
    res.json(flatItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller orders' });
  }
});

// ==========================================
// 3. PRODUCT ENDPOINTS
// ==========================================

// Get all products (Public)
app.get('/api/products', async (req, res) => {
  const { category, search, material, color, sort } = req.query;
  const filter = {};

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { material: { $regex: search, $options: 'i' } }
    ];
  }

  if (material) {
    filter.material = { $regex: material, $options: 'i' };
  }

  if (color) {
    filter.colors = { $regex: color, $options: 'i' };
  }

  let sortCriteria = { _id: 1 };
  if (sort === 'price_asc') {
    sortCriteria = { price: 1 };
  } else if (sort === 'price_desc') {
    sortCriteria = { price: -1 };
  } else if (sort === 'newest') {
    sortCriteria = { created_at: -1 };
  } else if (sort === 'popular') {
    sortCriteria = { stock: -1 };
  }

  try {
    const products = await Product.find(filter).sort(sortCriteria);
    
    // Programmatically join reviews average rating and count
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

  try {
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

    let isEligibleToReview = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const deliveredOrder = await Order.findOne({
          user_id: decoded.id,
          status: 'Delivered',
          "items.product_id": productId
        });
        
        if (deliveredOrder) {
          const item = deliveredOrder.items.find(i => i.product_id && i.product_id.toString() === productId);
          if (item && item.feedback_permitted === 1) {
            const existingReview = await Review.findOne({ user_id: decoded.id, product_id: productId });
            if (!existingReview) {
              isEligibleToReview = true;
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }

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
      isEligibleToReview
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Error retrieving product details' });
  }
});

// Submit review
app.post('/api/products/:id/reviews', authenticateToken, async (req, res) => {
  const productId = req.params.id;
  const { rating, comment, real_images } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ message: 'Rating and comment are required' });
  }

  try {
    const deliveredOrder = await Order.findOne({
      user_id: req.user.id,
      status: 'Delivered',
      "items.product_id": productId
    });

    if (!deliveredOrder) {
      return res.status(403).json({ 
        message: 'You can only write a review for products that you have purchased and that have been successfully delivered to you.' 
      });
    }

    const item = deliveredOrder.items.find(i => i.product_id && i.product_id.toString() === productId);
    if (!item || item.feedback_permitted !== 1) {
      return res.status(403).json({ 
        message: 'You do not have permission to leave feedback yet. Please wait for the showroom seller or admin to approve feedback permission.' 
      });
    }

    const existingReview = await Review.findOne({ user_id: req.user.id, product_id: productId });
    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already submitted a review for this product. Only one review is allowed.' 
      });
    }

    await Review.create({
      user_id: req.user.id,
      product_id: productId,
      user_name: req.user.name || 'Anonymous',
      rating,
      comment,
      real_images: real_images || []
    });

    const reviews = await Review.find({ product_id: productId }).sort({ created_at: -1 });
    res.status(201).json(reviews.map(r => ({
      id: r.id,
      user_id: r.user_id,
      product_id: r.product_id,
      user_name: r.user_name,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      real_images: safeParseArray(r.real_images)
    })));
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
});

// Add product (Admin/Seller)
app.post('/api/products', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { name, category, description, material, price, discount_price, stock, colors, sizes, upholstery_types, set_types, image_url, additional_images } = req.body;

  if (!name || !category || !description || !material || !price || stock === undefined || !colors || !sizes || !image_url) {
    return res.status(400).json({ message: 'All product fields are required' });
  }

  try {
    const sellerId = req.user.role === 'seller' ? req.user.id : null;
    const newProduct = await Product.create({
      name,
      category,
      description,
      material,
      price,
      discount_price: discount_price || null,
      stock,
      colors,
      sizes,
      upholstery_types: upholstery_types || ['Cloth', 'Rexine'],
      set_types: set_types || [],
      image_url,
      additional_images: additional_images || [],
      seller_id: sellerId
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Bulk discount (Admin/Seller)
app.put('/api/products/bulk/discount', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { percentage } = req.body;
  if (percentage === undefined || isNaN(percentage) || percentage < 0 || percentage > 100) {
    return res.status(400).json({ message: 'Invalid discount percentage. Must be between 0 and 100.' });
  }

  try {
    const sellerId = req.user.role === 'admin' ? null : req.user.id;
    const filter = sellerId ? { seller_id: sellerId } : {};

    if (percentage === 0) {
      await Product.updateMany(filter, { discount_price: null });
    } else {
      const factor = (100 - percentage) / 100;
      const products = await Product.find(filter);
      await Promise.all(products.map(p => {
        p.discount_price = Math.round(p.price * factor);
        return p.save();
      }));
    }

    res.json({ message: `Successfully updated discount of ${percentage === 0 ? 'none' : percentage + '%'} to all products!` });
  } catch (err) {
    console.error('Bulk discount error:', err);
    res.status(500).json({ message: 'Failed to apply bulk discount.' });
  }
});

// Edit product (Admin/Seller)
app.put('/api/products/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const productId = req.params.id;
  const { name, category, description, material, price, discount_price, stock, colors, sizes, upholstery_types, set_types, image_url, additional_images } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user.role === 'seller' && product.seller_id && product.seller_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product.' });
    }

    const updated = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        category,
        description,
        material,
        price,
        discount_price: discount_price !== undefined ? discount_price : null,
        stock,
        colors,
        sizes,
        upholstery_types: upholstery_types || ['Cloth', 'Rexine'],
        set_types: set_types || [],
        image_url,
        additional_images: additional_images || []
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product (Admin/Seller)
app.delete('/api/products/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user.role === 'seller' && product.seller_id && product.seller_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product.' });
    }

    await Product.findByIdAndDelete(productId);
    res.json({ message: 'Product deleted successfully', id: productId });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// ==========================================
// 4. WISHLIST ENDPOINTS
// ==========================================

// Get Wishlist
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const items = await Wishlist.find({ user_id: req.user.id }).populate('product_id');
    const validProducts = items
      .filter(item => item.product_id !== null)
      .map(item => {
        const prod = item.product_id;
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
          additional_images: safeParseArray(prod.additional_images)
        };
      });
    res.json(validProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wishlist' });
  }
});

// Toggle Wishlist
app.post('/api/wishlist', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
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

// ==========================================
// 5. ORDER ENDPOINTS
// ==========================================

// Place Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { name, mobile, email, address, city, state, pincode, total_price, payment_method, items } = req.body;

  if (!name || !mobile || !email || !address || !city || !state || !pincode || !total_price || !payment_method || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing billing details, total price, payment method, or items' });
  }

  try {
    // Check inventory stock
    for (const item of items) {
      const prod = await Product.findById(item.product_id);
      if (!prod) {
        return res.status(400).json({ message: `Product "${item.product_name}" is no longer available` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}` });
      }
    }

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: -item.quantity } });
    }

    // Create Order
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
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      const items = await Promise.all(order.items.map(async (item) => {
        const existingReview = await Review.findOne({ 
          user_id: req.user.id, 
          product_id: item.product_id 
        });
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          color: item.color,
          size: item.size,
          image_url: item.image_url,
          upholstery: item.upholstery,
          set_type: item.set_type,
          feedback_permitted: item.feedback_permitted,
          already_reviewed: existingReview ? 1 : 0
        };
      }));

      return {
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
        items
      };
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('My orders error:', error);
    res.status(500).json({ message: 'Error fetching order history' });
  }
});

// Track specific order
app.get('/api/orders/track/:id', async (req, res) => {
  const orderId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid Order ID format' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Error retrieving order tracking' });
  }
});

// Get All Orders (Admin Only)
app.get('/api/orders', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Admin view orders error:', error);
    res.status(500).json({ message: 'Error fetching customer orders' });
  }
});

// Update Order Status (Admin and Sellers)
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status value' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid Order ID format' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (userRole !== 'admin' && userRole !== 'seller') {
      return res.status(403).json({ message: 'Only admins or sellers can update order status' });
    }

    if (userRole === 'seller') {
      const sellerProducts = await Product.find({ seller_id: userId });
      const productIds = sellerProducts.map(p => p._id.toString());
      const ownsItem = order.items.some(item => item.product_id && productIds.includes(item.product_id.toString()));
      if (!ownsItem) {
        return res.status(403).json({ message: 'You can only update status of orders containing your products' });
      }
    }

    order.status = status;
    await order.save();
    res.json({ message: 'Order status updated successfully', orderId, status });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// Mark order as Delivered by customer upon physical receipt
app.put('/api/orders/:id/delivered-by-customer', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const { delivery_response, paid_amount, payment_bill_img } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid Order ID format' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user_id && order.user_id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only confirm delivery for your own orders' });
    }

    order.status = 'Delivered';
    order.customer_received = 1;
    order.delivery_response = delivery_response || 'Received Safely';
    order.paid_amount = paid_amount || 0;
    order.payment_bill_img = payment_bill_img || null;
    
    await order.save();

    res.json({ message: 'Order marked as Delivered! Confirmation details sent to showroom.' });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    res.status(500).json({ message: 'Error marking order as delivered' });
  }
});

// Grant feedback permission
app.put('/api/orders/items/:itemId/feedback-permission', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const itemId = req.params.itemId;
  const { permitted } = req.body;

  try {
    const order = await Order.findOne({ "items._id": itemId });
    if (!order) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    const item = order.items.id(itemId);
    if (req.user.role === 'seller') {
      const product = await Product.findById(item.product_id);
      if (!product || (product.seller_id && product.seller_id.toString() !== req.user.id)) {
        return res.status(403).json({ message: 'You can only manage permissions for your own products' });
      }
    }

    item.feedback_permitted = permitted ? 1 : 0;
    await order.save();

    res.json({ message: `Feedback permission ${permitted ? 'granted' : 'revoked'} successfully!`, itemId, permitted });
  } catch (error) {
    console.error('Update feedback permission error:', error);
    res.status(500).json({ message: 'Error updating feedback permission' });
  }
});

// Cancel Order
app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid Order ID format' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (userRole === 'customer') {
      if (order.user_id && order.user_id.toString() !== userId) {
        return res.status(403).json({ message: 'You can only cancel your own orders' });
      }

      if (['Shipped', 'Delivered', 'Cancelled', 'Rejected'].includes(order.status)) {
        return res.status(400).json({ message: `Cannot cancel order that is already ${order.status.toLowerCase()}` });
      }

      const orderTime = new Date(order.created_at);
      const now = new Date();
      const diffHours = (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60);

      if (diffHours > 24) {
        return res.status(400).json({ message: 'Order cannot be cancelled after 24 hours from purchase time' });
      }

      order.status = 'Cancelled';
      await order.save();
      return res.json({ message: 'Order cancelled successfully', status: 'Cancelled' });
    }

    if (userRole === 'admin' || userRole === 'seller') {
      if (userRole === 'seller') {
        const sellerProducts = await Product.find({ seller_id: userId });
        const productIds = sellerProducts.map(p => p._id.toString());
        const ownsItem = order.items.some(item => item.product_id && productIds.includes(item.product_id.toString()));
        if (!ownsItem) {
          return res.status(403).json({ message: 'You can only reject/cancel orders containing your products' });
        }
      }

      const nextStatus = req.body.status || 'Cancelled';
      if (!['Cancelled', 'Rejected'].includes(nextStatus)) {
        return res.status(400).json({ message: 'Invalid status for cancellation/rejection' });
      }

      order.status = nextStatus;
      await order.save();
      return res.json({ message: `Order status shifted to ${nextStatus.toLowerCase()} successfully`, status: nextStatus });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling/rejecting order' });
  }
});

// ==========================================
// 6. ADMIN/SELLER OPERATIONS ENDPOINTS
// ==========================================

// Fetch login history (Admin Only)
app.get('/api/admin/login-history', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const logs = await LoginHistory.find().sort({ created_at: -1 }).limit(250);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching login history:', err.message);
    res.status(500).json({ message: 'Failed to retrieve login logs' });
  }
});

// Admin stats (Admin Only)
app.get('/api/admin/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Total Revenue
    const revenueRow = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total_price' } } }
    ]);
    const totalRevenue = revenueRow.length > 0 ? revenueRow[0].total : 0;

    // Order Counts
    const orderBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const ordersBreakdown = orderBreakdown.map(o => ({
      status: o._id,
      count: o.count
    }));

    // Total Products
    const productsCount = await Product.countDocuments();

    // Out of Stock / Low Stock count
    const lowStockCount = await Product.countDocuments({ stock: { $lte: 3 } });

    // Sales by Category
    // We fetch orders and aggregate order items
    const orders = await Order.find({ status: { $ne: 'Cancelled' } });
    const categorySalesMap = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product_id) {
          const product = await Product.findById(item.product_id);
          const category = product ? product.category : 'General';
          if (!categorySalesMap[category]) {
            categorySalesMap[category] = { revenue: 0, volume: 0 };
          }
          categorySalesMap[category].revenue += item.quantity * item.price;
          categorySalesMap[category].volume += item.quantity;
        }
      }
    }
    const categorySales = Object.keys(categorySalesMap).map(cat => ({
      category: cat,
      revenue: categorySalesMap[cat].revenue,
      volume: categorySalesMap[cat].volume
    }));

    // Low stock items
    const lowStockItems = await Product.find({ stock: { $lte: 5 } }).sort({ stock: 1 });

    // Recent orders
    const recentOrdersRaw = await Order.find().sort({ created_at: -1 }).limit(5);
    const recentOrders = recentOrdersRaw.map(o => ({
      id: o.id,
      name: o.name,
      total_price: o.total_price,
      status: o.status,
      created_at: o.created_at
    }));

    res.json({
      stats: {
        revenue: totalRevenue,
        productsCount: productsCount,
        lowStockCount: lowStockCount,
        ordersBreakdown
      },
      categorySales,
      lowStockItems,
      recentOrders
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error retrieving administration stats' });
  }
});

// Image upload API
app.post('/api/upload', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ message: 'No image data provided' });
  }

  try {
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image format. Must start with data:image/' });
    }
    const parts = image.split(';base64,');
    if (parts.length !== 2) {
      return res.status(400).json({ message: 'Invalid base64 encoding' });
    }
    const mime = parts[0];
    const base64Data = parts[1];

    let ext = mime.split('/')[1] || 'png';
    if (ext.includes('+')) {
      ext = ext.split('+')[0];
    }
    if (ext === 'jpeg') {
      ext = 'jpg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `file_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFile(filepath, buffer, (err) => {
      if (err) {
        console.error('File save error:', err);
        return res.status(500).json({ message: 'Failed to save uploaded image' });
      }
      const host = req.get('host') || `${req.hostname}:${PORT}`;
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const imageUrl = `${protocol}://${host}/uploads/${filename}`;
      res.json({ imageUrl });
    });
  } catch (err) {
    console.error('Upload parser error:', err);
    res.status(500).json({ message: 'Internal upload parser error' });
  }
});

// Submit Contact Inquiry
app.post('/api/inquiries', async (req, res) => {
  const { name, email, mobile, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required fields.' });
  }

  try {
    await Inquiry.create({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile ? mobile.trim() : null,
      subject: subject ? subject.trim() : null,
      message: message.trim()
    });
    res.status(201).json({ message: 'Inquiry submitted successfully!' });
  } catch (err) {
    console.error('Submit inquiry error:', err);
    res.status(500).json({ message: 'Failed to submit inquiry' });
  }
});

// Get Contact Inquiries (Admin/Seller)
app.get('/api/admin/inquiries', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ created_at: -1 });
    res.json(inquiries);
  } catch (err) {
    console.error('Retrieve inquiries error:', err);
    res.status(500).json({ message: 'Failed to retrieve inquiries' });
  }
});

// Delete Inquiry (Admin/Seller)
app.delete('/api/admin/inquiries/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { id } = req.params;
  try {
    await Inquiry.findByIdAndDelete(id);
    res.json({ message: 'Inquiry message deleted successfully' });
  } catch (err) {
    console.error('Delete inquiry error:', err);
    res.status(500).json({ message: 'Failed to delete inquiry message' });
  }
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'ASK Sofa Works Backend API is running' });
});

// Health Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'success', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

// Vercel Serverless routing fallthrough
app.use((req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.path}` });
});

// Export app for Vercel
module.exports = app;

// Start Server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server is running locally on port ${PORT}`);
  });
}
