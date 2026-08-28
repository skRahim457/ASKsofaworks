require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { initDatabase, dbRun, dbAll, dbGet } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'asksofaworks_secret_key_2026_premium_furniture';

const path = require('path');
const fs = require('fs');

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Initialize Database
initDatabase()
  .then(() => {
    console.log('Database initialized successfully.');
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
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

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, mobile } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (name, email, password, role, mobile) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'customer', mobile || '']
    );

    const token = jwt.sign({ id: result.lastID, email, role: 'customer' }, JWT_SECRET, { expiresIn: '36500d' });

    res.status(201).json({
      token,
      user: {
        id: result.lastID,
        name,
        email,
        role: 'customer',
        mobile: mobile || '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// OTP Storage map: mobile -> { otp, name, expires }
// Initialize Firebase Admin SDK
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

// Helper to log an authentication attempt
async function logLoginAttempt(userId, name, identifier, method, status, errorReason, req) {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    await dbRun(
      `INSERT INTO login_history (user_id, name, identifier, method, status, error_reason, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name || 'Anonymous', identifier, method, status, errorReason, ipAddress]
    );
  } catch (err) {
    console.error('Failed to log login attempt:', err.message);
  }
}

// Secure Firebase ID Token Login and Register
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
      let user = await dbGet('SELECT * FROM users WHERE mobile = ?', [mobile.trim()]);
      if (!user) {
        const email = `otp_user_${mobile.trim()}@asksofaworks.com`;
        const dummyPassword = await bcrypt.hash(Math.random().toString(), 10);
        
        const result = await dbRun(
          'INSERT INTO users (name, email, password, role, mobile) VALUES (?, ?, ?, ?, ?)',
          [name || 'OTP Customer', email, dummyPassword, 'customer', mobile.trim()]
        );
        
        user = {
          id: result.lastID,
          name: name || 'OTP Customer',
          email,
          role: 'customer',
          mobile: mobile.trim(),
          address: '',
          city: '',
          state: '',
          pincode: ''
        };
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
      console.log(`[Secure Firebase Auth Sandbox] User +91 ${mobile.trim()} authenticated successfully (Mock Mode).`);
      
      // Log successful login
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
      console.error('[Secure Firebase Auth Sandbox] Database error:', err.message);
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
    // 1. Verify the Firebase ID Token securely
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumberWithCountryCode = decodedToken.phone_number;

    if (!phoneNumberWithCountryCode) {
      await logLoginAttempt(null, name || 'Anonymous', 'invalid-token-payload', 'otp', 'failure', 'Phone number missing in token payload', req);
      return res.status(400).json({ message: 'Decoded Firebase token does not contain a verified phone number' });
    }

    // 2. Extract standard 10-digit mobile number by stripping country code (+91)
    let mobile = phoneNumberWithCountryCode;
    if (mobile.startsWith('+91')) {
      mobile = mobile.substring(3);
    } else if (mobile.startsWith('+')) {
      mobile = mobile.replace('+', '');
    }

    // 3. Database operations: Check if user exists or register dynamically
    let user = await dbGet('SELECT * FROM users WHERE mobile = ?', [mobile]);
    if (!user) {
      const email = `otp_user_${mobile}@asksofaworks.com`;
      const dummyPassword = await bcrypt.hash(Math.random().toString(), 10);
      
      const result = await dbRun(
        'INSERT INTO users (name, email, password, role, mobile) VALUES (?, ?, ?, ?, ?)',
        [name || 'OTP Customer', email, dummyPassword, 'customer', mobile]
      );
      
      user = {
        id: result.lastID,
        name: name || 'OTP Customer',
        email,
        role: 'customer',
        mobile,
        address: '',
        city: '',
        state: '',
        pincode: ''
      };
    }

    // 4. Generate custom JWT token for our Express server
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });

    console.log(`[Secure Firebase Auth] User +91 ${mobile} authenticated successfully.`);
    
    // Log successful login
    await logLoginAttempt(user.id, user.name, mobile, 'otp', 'success', null, req);

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
    console.error('[Secure Firebase Auth] Verification failed:', err.message);
    await logLoginAttempt(null, name || 'Anonymous', 'failed-verify-token', 'otp', 'failure', err.message, req);
    res.status(401).json({ message: `Authentication failed: ${err.message || 'Invalid or expired Firebase token'}` });
  }
});

// Google Authentication Sign In / Register
app.post('/api/auth/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  if (!email || !name) {
    await logLoginAttempt(null, name || 'Anonymous', email || 'unknown', 'google', 'failure', 'Missing email or name', req);
    return res.status(400).json({ message: 'Email and name are required' });
  }

  try {
    let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      // Register new user dynamically
      const dummyPassword = await bcrypt.hash(googleId || Math.random().toString(), 10);
      const result = await dbRun(
        'INSERT INTO users (name, email, password, role, mobile) VALUES (?, ?, ?, ?, ?)',
        [name, email, dummyPassword, 'customer', '']
      );

      user = {
        id: result.lastID,
        name,
        email,
        role: 'customer',
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      };
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '36500d' });
    
    // Log successful Google sign-in
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

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body; // email field represents the login identifier (Email / Mobile)

  if (!email || !password) {
    await logLoginAttempt(null, 'Anonymous', email || 'unknown', 'email', 'failure', 'Missing login identifier or password', req);
    return res.status(400).json({ message: 'Mobile Number or Email Address and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ? OR mobile = ?', [email.trim(), email.trim()]);
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

    // Log successful email login
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

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, mobile, address, city, state, pincode, shop_name, shop_address, seller_status FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, mobile, address, city, state, pincode } = req.body;

  try {
    await dbRun(
      'UPDATE users SET name = ?, mobile = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?',
      [name, mobile, address, city, state, pincode, req.user.id]
    );

    const updatedUser = await dbGet('SELECT id, name, email, role, mobile, address, city, state, pincode, shop_name, shop_address, seller_status FROM users WHERE id = ?', [req.user.id]);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// ==========================================
// 2. PRODUCT ENDPOINTS
// ==========================================

// Get All Products (with filters, search, and sorting)
app.get('/api/products', async (req, res) => {
  const { category, search, material, color, sort } = req.query;

  let query = `
    SELECT p.*, COALESCE(avg_rev.avg_rating, 0) as rating, COALESCE(avg_rev.review_count, 0) as review_count
    FROM products p
    LEFT JOIN (
      SELECT product_id, AVG(rating) as avg_rating, COUNT(id) as review_count
      FROM reviews
      GROUP BY product_id
    ) avg_rev ON p.id = avg_rev.product_id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ' AND p.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.material LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (material) {
    query += ' AND p.material LIKE ?';
    params.push(`%${material}%`);
  }

  // Filter by color in JSON array or string (sqlite doesn't have native JSON operators, we use LIKE for simple string matching)
  if (color) {
    query += ' AND p.colors LIKE ?';
    params.push(`%${color}%`);
  }

  // Sorting
  if (sort === 'price_asc') {
    query += ' ORDER BY COALESCE(p.discount_price, p.price) ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY COALESCE(p.discount_price, p.price) DESC';
  } else if (sort === 'newest') {
    query += ' ORDER BY p.created_at DESC';
  } else if (sort === 'rating') {
    query += ' ORDER BY rating DESC, review_count DESC';
  } else if (sort === 'popular') {
    // For simplicity, sort by stock availability or ID
    query += ' ORDER BY p.stock DESC, p.id ASC';
  } else {
    // Default sorting
    query += ' ORDER BY p.id ASC';
  }

  try {
    const products = await dbAll(query, params);
    // Parse JSON strings back to arrays
    const formattedProducts = products.map(prod => ({
      ...prod,
      colors: JSON.parse(prod.colors),
      sizes: JSON.parse(prod.sizes),
      upholstery_types: prod.upholstery_types ? JSON.parse(prod.upholstery_types) : ['Cloth', 'Rexine'],
      set_types: prod.set_types ? JSON.parse(prod.set_types) : [],
      additional_images: prod.additional_images ? JSON.parse(prod.additional_images) : []
    }));
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
    const product = await dbGet(`
      SELECT p.*, COALESCE(avg_rev.avg_rating, 0) as rating, COALESCE(avg_rev.review_count, 0) as review_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, AVG(rating) as avg_rating, COUNT(id) as review_count
        FROM reviews
        GROUP BY product_id
      ) avg_rev ON p.id = avg_rev.product_id
      WHERE p.id = ?
    `, [productId]);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await dbAll('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [productId]);

    let isEligibleToReview = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const deliveredItem = await dbGet(`
          SELECT oi.id, oi.feedback_permitted FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'Delivered'
          LIMIT 1
        `, [decoded.id, productId]);
        
        if (deliveredItem && deliveredItem.feedback_permitted === 1) {
          const existingReview = await dbGet(`
            SELECT id FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1
          `, [decoded.id, productId]);
          if (!existingReview) {
            isEligibleToReview = true;
          }
        }
      } catch (err) {
        // Invalid token, ignore
      }
    }

    const formattedProduct = {
      ...product,
      colors: JSON.parse(product.colors),
      sizes: JSON.parse(product.sizes),
      upholstery_types: product.upholstery_types ? JSON.parse(product.upholstery_types) : ['Cloth', 'Rexine'],
      set_types: product.set_types ? JSON.parse(product.set_types) : [],
      additional_images: product.additional_images ? JSON.parse(product.additional_images) : [],
      reviewsList: reviews.map(r => ({
        ...r,
        real_images: r.real_images ? JSON.parse(r.real_images) : []
      })),
      isEligibleToReview
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Error retrieving product details' });
  }
});

// Submit Product Review
app.post('/api/products/:id/reviews', authenticateToken, async (req, res) => {
  const productId = req.params.id;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ message: 'Rating and comment are required' });
  }

  try {
    // Enforce "review after delivery" and permission strictly for all users
    const deliveredItem = await dbGet(`
      SELECT oi.id, oi.feedback_permitted FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'Delivered'
      LIMIT 1
    `, [req.user.id, productId]);

    if (!deliveredItem) {
      return res.status(403).json({ 
        message: 'You can only write a review for products that you have purchased and that have been successfully delivered to you.' 
      });
    }

    if (deliveredItem.feedback_permitted !== 1) {
      return res.status(403).json({ 
        message: 'You do not have permission to leave feedback yet. Please wait for the showroom seller or admin to approve feedback permission.' 
      });
    }

    const existingReview = await dbGet(`
      SELECT id FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1
    `, [req.user.id, productId]);

    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already submitted a review for this product. Only one review is allowed.' 
      });
    }

    const { real_images } = req.body;

    // Add review
    await dbRun(
      'INSERT INTO reviews (user_id, product_id, user_name, rating, comment, real_images) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, productId, req.user.name || 'Anonymous', rating, comment, JSON.stringify(real_images || [])]
    );

    // Fetch updated reviews
    const reviews = await dbAll('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [productId]);
    res.status(201).json(reviews.map(r => ({
      ...r,
      real_images: r.real_images ? JSON.parse(r.real_images) : []
    })));
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
});

// Fetch Login History (Admin Only)
app.get('/api/admin/login-history', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const logs = await dbAll('SELECT * FROM login_history ORDER BY created_at DESC LIMIT 250');
    res.json(logs);
  } catch (err) {
    console.error('Error fetching login history:', err.message);
    res.status(500).json({ message: 'Failed to retrieve login logs' });
  }
});

// Middleware: Authorize Admin or Seller
const authorizeAdminOrSeller = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'seller')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Privileged role required.' });
  }
};

// 1. Apply to become a Seller (Customer option)
app.post('/api/auth/apply-seller', authenticateToken, async (req, res) => {
  const { shop_name, shop_address } = req.body;
  if (!shop_name || !shop_address) {
    return res.status(400).json({ message: 'Shop name and Shop address are required' });
  }
  try {
    await dbRun(
      "UPDATE users SET shop_name = ?, shop_address = ?, seller_status = 'pending' WHERE id = ?",
      [shop_name, shop_address, req.user.id]
    );
    res.json({ message: 'Seller application submitted successfully! Pending admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit seller application' });
  }
});

// 2. Get Seller Applications and Current Sellers (Admin Only)
app.get('/api/admin/sellers', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const sellers = await dbAll(
      "SELECT id, name, email, mobile, role, shop_name, shop_address, seller_status FROM users WHERE seller_status = 'pending' OR role = 'seller'"
    );
    res.json(sellers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller accounts' });
  }
});

// 3. Approve/Reject Seller application (Admin Only)
app.post('/api/admin/approve-seller/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const userId = req.params.id;
  const { action } = req.body; // 'approve' or 'reject'
  if (!action || (action !== 'approve' && action !== 'reject')) {
    return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
  }
  try {
    if (action === 'approve') {
      await dbRun(
        "UPDATE users SET role = 'seller', seller_status = 'approved' WHERE id = ?",
        [userId]
      );
      res.json({ message: 'User approved as a seller successfully!' });
    } else {
      await dbRun(
        "UPDATE users SET role = 'customer', seller_status = 'none', shop_name = NULL, shop_address = NULL WHERE id = ?",
        [userId]
      );
      res.json({ message: 'Seller application rejected/revoked successfully.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update seller role status' });
  }
});

// 4. Retrieve Seller-owned Products (Seller or Admin)
app.get('/api/seller/products', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const sellerId = req.user.role === 'admin' ? (req.query.sellerId || null) : req.user.id;
    let query = 'SELECT * FROM products';
    const params = [];
    if (sellerId !== null) {
      query += ' WHERE seller_id = ?';
      params.push(sellerId);
    } else if (req.user.role === 'admin' && !req.query.sellerId) {
      query += ' WHERE seller_id IS NULL'; // products direct from admin store
    }
    const products = await dbAll(query, params);
    const formatted = products.map(prod => ({
      ...prod,
      colors: JSON.parse(prod.colors),
      sizes: JSON.parse(prod.sizes),
      upholstery_types: prod.upholstery_types ? JSON.parse(prod.upholstery_types) : ['Cloth', 'Rexine'],
      set_types: prod.set_types ? JSON.parse(prod.set_types) : [],
      additional_images: prod.additional_images ? JSON.parse(prod.additional_images) : []
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller products' });
  }
});

// Retrieve customer reviews for products belonging to this seller/admin
app.get('/api/seller/reviews', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    let reviews;
    if (req.user.role === 'admin') {
      reviews = await dbAll(`
        SELECT r.*, p.name as product_name, p.image_url as product_image
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        ORDER BY r.created_at DESC
      `);
    } else {
      reviews = await dbAll(`
        SELECT r.*, p.name as product_name, p.image_url as product_image
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.seller_id = ?
        ORDER BY r.created_at DESC
      `, [req.user.id]);
    }
    res.json(reviews.map(r => ({
      ...r,
      real_images: r.real_images ? JSON.parse(r.real_images) : []
    })));
  } catch (error) {
    console.error('Error fetching seller reviews:', error);
    res.status(500).json({ message: 'Error fetching customer reviews' });
  }
});

// 5. Retrieve Order items and Customer details for products belonging to this seller (Seller Only)
app.get('/api/seller/orders', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const sellerId = req.user.id;
    let items;
    if (req.user.role === 'admin') {
      items = await dbAll(`
        SELECT oi.*, o.customer_received, o.delivery_response, o.paid_amount, o.payment_bill_img, o.name as customer_name, o.mobile as customer_mobile, o.email as customer_email, 
               o.address as customer_address, o.city as customer_city, o.state as customer_state, 
               o.pincode as customer_pincode, o.status as order_status, o.payment_method, o.created_at
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        ORDER BY o.created_at DESC
      `);
    } else {
      items = await dbAll(`
        SELECT oi.*, o.customer_received, o.delivery_response, o.paid_amount, o.payment_bill_img, o.name as customer_name, o.mobile as customer_mobile, o.email as customer_email, 
               o.address as customer_address, o.city as customer_city, o.state as customer_state, 
               o.pincode as customer_pincode, o.status as order_status, o.payment_method, o.created_at
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
        ORDER BY o.created_at DESC
      `, [sellerId]);
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve seller orders' });
  }
});

// Add Product (Admin & Seller)
app.post('/api/products', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { name, category, description, material, price, discount_price, stock, colors, sizes, upholstery_types, set_types, image_url, additional_images } = req.body;

  if (!name || !category || !description || !material || !price || stock === undefined || !colors || !sizes || !image_url) {
    return res.status(400).json({ message: 'All product fields are required' });
  }

  try {
    const sellerId = req.user.role === 'seller' ? req.user.id : null;
    const result = await dbRun(
      `INSERT INTO products (name, category, description, material, price, discount_price, stock, colors, sizes, upholstery_types, set_types, image_url, additional_images, seller_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        description,
        material,
        price,
        discount_price || null,
        stock,
        JSON.stringify(colors),
        JSON.stringify(sizes),
        JSON.stringify(upholstery_types || ['Cloth', 'Rexine']),
        JSON.stringify(set_types || []),
        image_url,
        additional_images ? JSON.stringify(additional_images) : '[]',
        sellerId
      ]
    );

    const newProduct = await dbGet('SELECT * FROM products WHERE id = ?', [result.lastID]);
    res.status(201).json({
      ...newProduct,
      colors: JSON.parse(newProduct.colors),
      sizes: JSON.parse(newProduct.sizes),
      upholstery_types: JSON.parse(newProduct.upholstery_types || '["Cloth", "Rexine"]'),
      set_types: JSON.parse(newProduct.set_types || '[]'),
      additional_images: JSON.parse(newProduct.additional_images)
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Bulk discount update (Admin & Seller)
app.put('/api/products/bulk/discount', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { percentage } = req.body;
  if (percentage === undefined || isNaN(percentage) || percentage < 0 || percentage > 100) {
    return res.status(400).json({ message: 'Invalid discount percentage. Must be between 0 and 100.' });
  }

  try {
    const sellerId = req.user.role === 'admin' ? null : req.user.id;
    let query, params;

    if (percentage === 0) {
      // Clear all discounts
      if (sellerId) {
        query = 'UPDATE products SET discount_price = NULL WHERE seller_id = ?';
        params = [sellerId];
      } else {
        query = 'UPDATE products SET discount_price = NULL';
        params = [];
      }
    } else {
      // Apply percentage discount
      const factor = (100 - percentage) / 100;
      if (sellerId) {
        query = 'UPDATE products SET discount_price = ROUND(price * ?) WHERE seller_id = ?';
        params = [factor, sellerId];
      } else {
        query = 'UPDATE products SET discount_price = ROUND(price * ?)';
        params = [factor];
      }
    }

    await dbRun(query, params);
    res.json({ message: `Successfully updated discount of ${percentage === 0 ? 'none' : percentage + '%'} to all products!` });
  } catch (err) {
    console.error('Bulk discount error:', err);
    res.status(500).json({ message: 'Failed to apply bulk discount.' });
  }
});

// Edit Product (Admin & Seller)
app.put('/api/products/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const productId = req.params.id;
  const { name, category, description, material, price, discount_price, stock, colors, sizes, upholstery_types, set_types, image_url, additional_images } = req.body;

  try {
    const existing = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user.role === 'seller' && existing.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product.' });
    }

    await dbRun(
      `UPDATE products 
       SET name = ?, category = ?, description = ?, material = ?, price = ?, discount_price = ?, stock = ?, colors = ?, sizes = ?, upholstery_types = ?, set_types = ?, image_url = ?, additional_images = ?
       WHERE id = ?`,
      [
        name,
        category,
        description,
        material,
        price,
        discount_price !== undefined ? discount_price : null,
        stock,
        JSON.stringify(colors),
        JSON.stringify(sizes),
        JSON.stringify(upholstery_types || ['Cloth', 'Rexine']),
        JSON.stringify(set_types || []),
        image_url,
        additional_images ? JSON.stringify(additional_images) : '[]',
        productId
      ]
    );

    const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({
      ...updatedProduct,
      colors: JSON.parse(updatedProduct.colors),
      sizes: JSON.parse(updatedProduct.sizes),
      upholstery_types: JSON.parse(updatedProduct.upholstery_types || '["Cloth", "Rexine"]'),
      set_types: JSON.parse(updatedProduct.set_types || '[]'),
      additional_images: JSON.parse(updatedProduct.additional_images)
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete Product (Admin & Seller)
app.delete('/api/products/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user.role === 'seller' && product.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product.' });
    }

    await dbRun('DELETE FROM products WHERE id = ?', [productId]);
    res.json({ message: 'Product deleted successfully', id: productId });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// ==========================================
// 3. WISHLIST ENDPOINTS
// ==========================================

// Get Wishlist
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const items = await dbAll(
      `SELECT p.* FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?`,
      [req.user.id]
    );

    const formattedItems = items.map(prod => ({
      ...prod,
      colors: JSON.parse(prod.colors),
      sizes: JSON.parse(prod.sizes),
      additional_images: prod.additional_images ? JSON.parse(prod.additional_images) : []
    }));

    res.json(formattedItems);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wishlist' });
  }
});

// Toggle Wishlist (Add/Remove)
app.post('/api/wishlist', authenticateToken, async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const existing = await dbGet('SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);

    if (existing) {
      await dbRun('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
      res.json({ added: false, message: 'Removed from wishlist' });
    } else {
      await dbRun('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
      res.json({ added: true, message: 'Added to wishlist' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating wishlist' });
  }
});

// ==========================================
// 4. ORDER ENDPOINTS
// ==========================================

// Place Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { name, mobile, email, address, city, state, pincode, total_price, payment_method, items } = req.body;

  if (!name || !mobile || !email || !address || !city || !state || !pincode || !total_price || !payment_method || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing billing details, total price, payment method, or items' });
  }

  try {
    // 1. Verify and update inventory stock
    for (const item of items) {
      const prod = await dbGet('SELECT stock, name FROM products WHERE id = ?', [item.product_id]);
      if (!prod) {
        return res.status(400).json({ message: `Product "${item.product_name}" is no longer available` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}` });
      }
    }

    // 2. Insert into orders table
    const orderResult = await dbRun(
      `INSERT INTO orders (user_id, name, mobile, email, address, city, state, pincode, total_price, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [req.user.id, name, mobile, email, address, city, state, pincode, total_price, payment_method]
    );

    const orderId = orderResult.lastID;

    // 3. Insert order items and deduct stock
    for (const item of items) {
      await dbRun(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size, image_url, upholstery)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.quantity, item.price, item.color, item.size, item.image_url, item.upholstery || 'None']
      );

      // Deduct stock
      await dbRun('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    res.status(201).json({
      message: 'Order Placed Successfully!',
      orderId: orderId,
      orderSummary: {
        id: orderId,
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

// Get User's Orders
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await dbAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);

    const result = [];
    for (const order of orders) {
      const rawItems = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      const items = [];
      for (const item of rawItems) {
        const existingReview = await dbGet(
          'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
          [req.user.id, item.product_id]
        );
        items.push({
          ...item,
          already_reviewed: existingReview ? 1 : 0
        });
      }
      result.push({
        ...order,
        items
      });
    }

    res.json(result);
  } catch (error) {
    console.error('My orders error:', error);
    res.status(500).json({ message: 'Error fetching order history' });
  }
});

// Track Specific Order
app.get('/api/orders/track/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    res.json({
      ...order,
      items
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Error retrieving order tracking' });
  }
});

// Get All Orders (Admin Only)
app.get('/api/orders', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const orders = await dbAll('SELECT * FROM orders ORDER BY created_at DESC');

    const result = [];
    for (const order of orders) {
      const items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      result.push({
        ...order,
        items
      });
    }

    res.json(result);
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
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (userRole !== 'admin' && userRole !== 'seller') {
      return res.status(403).json({ message: 'Only admins or sellers can update order status' });
    }

    // For seller, check if the order contains their products
    if (userRole === 'seller') {
      const items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      let ownsItem = false;
      for (const item of items) {
        const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (product && product.seller_id === userId) {
          ownsItem = true;
          break;
        }
      }
      if (!ownsItem) {
        return res.status(403).json({ message: 'You can only update status of orders containing your products' });
      }
    }

    await dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
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
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only confirm delivery for your own orders' });
    }

    await dbRun(`
      UPDATE orders 
      SET status = 'Delivered', 
          customer_received = 1,
          delivery_response = ?,
          paid_amount = ?,
          payment_bill_img = ?
      WHERE id = ?
    `, [delivery_response || 'Received Safely', paid_amount || 0, payment_bill_img || null, orderId]);

    res.json({ message: 'Order marked as Delivered! Confirmation details sent to showroom.' });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    res.status(500).json({ message: 'Error marking order as delivered' });
  }
});

// Grant/revoke feedback permission for a specific order item (Admin/Seller only)
app.put('/api/orders/items/:itemId/feedback-permission', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const itemId = req.params.itemId;
  const { permitted } = req.body;

  try {
    const item = await dbGet('SELECT * FROM order_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    // For seller, verify ownership of product
    if (req.user.role === 'seller') {
      const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!product || product.seller_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only manage permissions for your own products' });
      }
    }

    await dbRun("UPDATE order_items SET feedback_permitted = ? WHERE id = ?", [permitted ? 1 : 0, itemId]);
    res.json({ message: `Feedback permission ${permitted ? 'granted' : 'revoked'} successfully!`, itemId, permitted });
  } catch (error) {
    console.error('Update feedback permission error:', error);
    res.status(500).json({ message: 'Error updating feedback permission' });
  }
});

// Cancel/Reject Order Endpoint (Admins, Sellers, and Customers with 24h limit)
app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If customer, check ownership and 24-hour limit
    if (userRole === 'customer') {
      if (order.user_id !== userId) {
        return res.status(403).json({ message: 'You can only cancel your own orders' });
      }

      // Check if already shipped or delivered
      if (['Shipped', 'Delivered', 'Cancelled', 'Rejected'].includes(order.status)) {
        return res.status(400).json({ message: `Cannot cancel order that is already ${order.status.toLowerCase()}` });
      }

      // Check 24 hour limit (SQLite CURRENT_TIMESTAMP is in UTC)
      const orderTime = new Date(order.created_at + ' UTC');
      const now = new Date();
      const diffMs = now.getTime() - orderTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 24) {
        return res.status(400).json({ message: 'Order cannot be cancelled after 24 hours from purchase time' });
      }

      await dbRun('UPDATE orders SET status = ? WHERE id = ?', ['Cancelled', orderId]);
      return res.json({ message: 'Order cancelled successfully', status: 'Cancelled' });
    }

    // If admin or seller
    if (userRole === 'admin' || userRole === 'seller') {
      if (userRole === 'seller') {
        const items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        let ownsItem = false;
        for (const item of items) {
          const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
          if (product && product.seller_id === userId) {
            ownsItem = true;
            break;
          }
        }
        if (!ownsItem) {
          return res.status(403).json({ message: 'You can only reject/cancel orders containing your products' });
        }
      }

      const nextStatus = req.body.status || 'Cancelled'; // 'Cancelled' or 'Rejected'
      if (!['Cancelled', 'Rejected'].includes(nextStatus)) {
        return res.status(400).json({ message: 'Invalid status for cancellation/rejection' });
      }

      await dbRun('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, orderId]);
      return res.json({ message: `Order status shifted to ${nextStatus.toLowerCase()} successfully`, status: nextStatus });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling/rejecting order' });
  }
});

// ==========================================
// 5. ADMIN STATISTICS ENDPOINT (Admin Only)
// ==========================================
app.get('/api/admin/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Total Revenue
    const revenueRow = await dbGet("SELECT SUM(total_price) as total FROM orders WHERE status != 'Cancelled'");
    const totalRevenue = revenueRow.total || 0;

    // Order Counts
    const orderCounts = await dbAll('SELECT status, COUNT(*) as count FROM orders GROUP BY status');

    // Total Products
    const productsRow = await dbGet('SELECT COUNT(*) as count FROM products');
    const totalProducts = productsRow.count || 0;

    // Out of Stock / Low Stock products
    const lowStockRow = await dbGet('SELECT COUNT(*) as count FROM products WHERE stock <= 3');
    const lowStockCount = lowStockRow.count || 0;

    // Sales by Category
    const categorySales = await dbAll(`
      SELECT p.category, SUM(oi.quantity * oi.price) as revenue, SUM(oi.quantity) as volume
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.category
    `);

    // Dynamic list of low stock items
    const lowStockItems = await dbAll('SELECT id, name, category, stock, price FROM products WHERE stock <= 5 ORDER BY stock ASC');

    // Recent orders
    const recentOrders = await dbAll(`
      SELECT o.id, o.name, o.total_price, o.status, o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      stats: {
        revenue: totalRevenue,
        productsCount: totalProducts,
        lowStockCount: lowStockCount,
        ordersBreakdown: orderCounts
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

// Upload direct image endpoint
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
      const imageUrl = `http://${host}/uploads/${filename}`;
      res.json({ imageUrl });
    });
  } catch (err) {
    console.error('Upload parser error:', err);
    res.status(500).json({ message: 'Internal upload parser error' });
  }
});

// Submit Contact/Inquiry Message (Public)
app.post('/api/inquiries', async (req, res) => {
  const { name, email, mobile, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required fields.' });
  }

  try {
    await dbRun(
      'INSERT INTO inquiries (name, email, mobile, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), mobile ? mobile.trim() : null, subject ? subject.trim() : null, message.trim()]
    );
    res.status(201).json({ message: 'Inquiry submitted successfully!' });
  } catch (err) {
    console.error('Submit inquiry error:', err);
    res.status(500).json({ message: 'Failed to submit inquiry' });
  }
});

// Retrieve Inquiries List (Admin & Seller)
app.get('/api/admin/inquiries', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  try {
    const inquiries = await dbAll('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(inquiries);
  } catch (err) {
    console.error('Retrieve inquiries error:', err);
    res.status(500).json({ message: 'Failed to retrieve inquiries' });
  }
});

// Delete Inquiry (Admin & Seller)
app.delete('/api/admin/inquiries/:id', authenticateToken, authorizeAdminOrSeller, async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun('DELETE FROM inquiries WHERE id = ?', [id]);
    res.json({ message: 'Inquiry message deleted successfully' });
  } catch (err) {
    console.error('Delete inquiry error:', err);
    res.status(500).json({ message: 'Failed to delete inquiry message' });
  }
});

// Serve frontend build static files in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA route fallback handler (loads React client side routes)
app.get(/.*/, (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
