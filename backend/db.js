const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper function to run query
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper function to get all rows
const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper function to get single row
const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize Database Schema
async function initDatabase() {
  try {
    // 1. Create Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        mobile TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Products Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        material TEXT NOT NULL,
        price REAL NOT NULL,
        discount_price REAL,
        stock INTEGER NOT NULL DEFAULT 0,
        colors TEXT NOT NULL,
        sizes TEXT NOT NULL,
        image_url TEXT NOT NULL,
        additional_images TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create Orders Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        payment_method TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // 4. Create Order Items Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        color TEXT,
        size TEXT,
        image_url TEXT,
        upholstery TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Automatic migration to add upholstery to order_items if it doesn't exist
    try {
      await dbRun(`ALTER TABLE order_items ADD COLUMN upholstery TEXT`);
    } catch (err) {
      // Column already exists, ignore
    }

    // 5. Create Reviews Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        real_images TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // 6. Create Wishlist Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);

    // 7. Create Login History Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        identifier TEXT NOT NULL,
        method TEXT NOT NULL,
        status TEXT NOT NULL,
        error_reason TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Create Inquiries Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        mobile TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run ALTER TABLE statements to add seller columns if they do not exist
    try {
      await dbRun("ALTER TABLE users ADD COLUMN shop_name TEXT");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN shop_address TEXT");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN seller_status TEXT DEFAULT 'none'");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE products ADD COLUMN seller_id INTEGER");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE products ADD COLUMN upholstery_types TEXT DEFAULT '[\"Cloth\", \"Rexine\"]'");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE products ADD COLUMN set_types TEXT DEFAULT '[]'");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE order_items ADD COLUMN set_type TEXT DEFAULT 'None'");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE reviews ADD COLUMN real_images TEXT DEFAULT '[]'");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE orders ADD COLUMN customer_received INTEGER DEFAULT 0");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE orders ADD COLUMN delivery_response TEXT");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE orders ADD COLUMN paid_amount REAL");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE orders ADD COLUMN payment_bill_img TEXT");
    } catch(e) {}
    try {
      await dbRun("ALTER TABLE order_items ADD COLUMN feedback_permitted INTEGER DEFAULT 0");
    } catch(e) {}

    // Update showroom/admin user address and reset passwords to 'admin123'
    try {
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      await dbRun(`
        UPDATE users 
        SET address = 'WX4J+W5P, vengalarao Nagar', city = 'Kavali', state = 'Andhra Pradesh', pincode = '524201', password = ?
        WHERE role = 'admin' OR email IN ('shaikrahim47146@gmail.com', 'admin@asksofaworks.com')
      `, [adminPasswordHash]);
      console.log('Admin profiles address updated to Kavali, AP and passwords reset to admin123.');
    } catch(e) {}

    // Convert existing product pricing from dollars to Indian Rupees
    try {
      await dbRun("UPDATE products SET price = price * 100, discount_price = discount_price * 100 WHERE price < 5000");
      console.log('Database product prices scaled from USD to INR.');
    } catch(e) {}

    // Migrate categories to match user's custom requirements
    try {
      // 1. Update L-Shape sofa categories
      await dbRun("UPDATE products SET category = 'l-shape-sofas' WHERE name LIKE '%L-Shape%' OR name LIKE '%Sectional%'");
      
      // 2. Update Corner sofa categories
      await dbRun("UPDATE products SET category = 'corner-sofas' WHERE name LIKE '%Curved%'");
      
      // 3. Update Sofa Sets categories
      await dbRun("UPDATE products SET category = 'sofa-sets' WHERE name LIKE '%Chesterfield%' OR name LIKE '%Loveseat%' OR name LIKE '%Linen Sofa%' OR name LIKE '%Tufted Sofa%'");
      
      // 4. Seeding custom wooden set if not exists
      const existingWoodenSet = await dbAll("SELECT id FROM products WHERE category = 'wooden-sets'");
      if (existingWoodenSet.length === 0) {
        await dbRun(`
          INSERT INTO products (name, category, description, material, price, discount_price, stock, colors, sizes, image_url, additional_images)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Kavali Premium Teakwood Dining Table & Chair Wooden Set',
          'wooden-sets',
          'A complete luxury wooden furniture set including a handcrafted solid teakwood dining table and 6 premium upholstered dining chairs. Perfect for luxury family dining.',
          'Teakwood & Velvet Fabric',
          125000.00,
          110000.00,
          4,
          JSON.stringify(['Natural Teak', 'Dark Walnut']),
          JSON.stringify(['6-Chair Set', '8-Chair Set']),
          'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=800',
          JSON.stringify([])
        ]);
        console.log('Sample Wooden Set product seeded.');
      }
      
      console.log('Product categories migrated to matching categories.');
    } catch(e) {
      console.error('Failed to migrate categories:', e);
    }

    // Add example showroom products if they do not exist yet
    try {
      const existingExamples = await dbAll("SELECT id FROM products WHERE name LIKE '%Kavali%'");
      if (existingExamples.length === 0) {
        await dbRun(`
          INSERT INTO products (name, category, description, material, price, discount_price, stock, colors, sizes, image_url, additional_images, seller_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Premium Kavali Teak Wood L-Shape Sofa Set',
          'sofas',
          'Crafted from premium Kavali teakwood, this luxury L-shape sectional sofa set features hand-woven boucle upholstery and premium feather-down cushions. Designed and manufactured directly at our Kavali showroom workshop.',
          'Teakwood & Boucle',
          155000.00,
          135000.00,
          5,
          JSON.stringify(['Golden Oak', 'Cream Boucle', 'Taupe Grey']),
          JSON.stringify(['L-Shape 5-Seater', 'L-Shape 7-Seater']),
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
          JSON.stringify(['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800']),
          null // Admin listing
        ]);

        await dbRun(`
          INSERT INTO products (name, category, description, material, price, discount_price, stock, colors, sizes, image_url, additional_images, seller_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Kavali Royal Maharaja Teakwood Double Bed',
          'beds',
          'A grand luxury Maharaja double bed crafted with premium Kavali teak wood frame, hand-carved details, and velvet headboard cushioning. Combines royal comfort with traditional craftsmanship.',
          'Teakwood & Royal Velvet',
          95000.00,
          85000.00,
          3,
          JSON.stringify(['Royal Blue', 'Deep Maroon', 'Classic Gold']),
          JSON.stringify(['Queen Size', 'King Size']),
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
          JSON.stringify(['https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800']),
          null // Admin listing
        ]);
        console.log('Kavali showroom example products seeded successfully.');
      }
    } catch(e) {
      console.error('Failed to seed Kavali example products:', e);
    }

    console.log('Database tables verified/created successfully.');

    // Seed Data
    await seedUsers();
    await seedProducts();
    await seedReviews();
    await seedLoginHistory();

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

async function seedUsers() {
  const users = await dbAll('SELECT * FROM users LIMIT 1');
  if (users.length === 0) {
    console.log('Seeding default users...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const customerPasswordHash = bcrypt.hashSync('customer123', 10);

    await dbRun(
      'INSERT INTO users (name, email, password, role, mobile, address, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        'Shop Admin',
        'admin@asksofaworks.com',
        adminPasswordHash,
        'admin',
        '9876543210',
        'WX4J+W5P, vengalarao Nagar',
        'Kavali',
        'Andhra Pradesh',
        '524201'
      ]
    );

    await dbRun(
      'INSERT INTO users (name, email, password, role, mobile, address, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        'Shaik Rahim',
        'shaikrahim47146@gmail.com',
        adminPasswordHash,
        'admin',
        '7995585087',
        'WX4J+W5P, vengalarao Nagar',
        'Kavali',
        'Andhra Pradesh',
        '524201'
      ]
    );

    await dbRun(
      'INSERT INTO users (name, email, password, role, mobile, address, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        'John Doe',
        'customer@example.com',
        customerPasswordHash,
        'customer',
        '9876543211',
        'Apartment 4B, Serenity Towers',
        'Vellore',
        'Tamil Nadu',
        '632014'
      ]
    );
    console.log('Users seeded successfully.');
  }
}

async function seedProducts() {
  const products = await dbAll('SELECT * FROM products LIMIT 1');
  if (products.length === 0) {
    console.log('Seeding premium furniture products...');

    const sampleProducts = [
      // CATEGORY: SOFAS
      {
        name: 'Royal Velvet Chesterfield Sofa',
        category: 'sofas',
        description: 'Impart classic luxury to your living space with our Royal Velvet Chesterfield Sofa. Featuring hand-tufted rich velvet upholstery, elegant rolled arms, and solid mahogany turned legs, it blends historic design with unmatched comfort. Removable cushions and pocket-coil seating provide a premium lounging experience.',
        material: 'Velvet & Mahogany Wood',
        price: 1499.00,
        discount_price: 1299.00,
        stock: 8,
        colors: JSON.stringify(['Emerald Green', 'Royal Blue', 'Classic Cream', 'Charcoal Grey']),
        sizes: JSON.stringify(['Loveseat', '3-Seater', 'Grand 4-Seater']),
        image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800'
        ])
      },
      {
        name: 'Elysian Linen Sectional Sofa',
        category: 'sofas',
        description: 'A masterpiece of modern minimalism. The Elysian Sectional features heavy-weight Belgian linen, high-density down-feather blend cushions, and a low-slung, modular profile. Tailor it to your space with movable sections and enjoy a relaxed, cloud-like sitting experience.',
        material: 'Belgian Linen & Pine Wood',
        price: 2499.00,
        discount_price: 2199.00,
        stock: 5,
        colors: JSON.stringify(['Classic Cream', 'Warm Taupe', 'Oatmeal', 'Soft Sage']),
        sizes: JSON.stringify(['Standard L-Shape', 'Grand Sectional']),
        image_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800'
        ])
      },
      {
        name: 'Sienna Leather Loveseat',
        category: 'sofas',
        description: 'Crafted with premium top-grain Italian leather, the Sienna Loveseat develops a gorgeous patina over time. Structured with a solid ash wood exposed frame, it pairs mid-century aesthetics with exceptional structural support. Perfect for study rooms, executive offices, or cozy spaces.',
        material: 'Italian Top-Grain Leather & Ash Wood',
        price: 1199.00,
        discount_price: null,
        stock: 12,
        colors: JSON.stringify(['Cognac Brown', 'Dark Espresso', 'Tan Leather']),
        sizes: JSON.stringify(['Standard Loveseat']),
        image_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Hampton Classic Linen Sofa',
        category: 'sofas',
        description: 'Embrace Coastal Elegance with the Hampton Classic. Loose pillowback seating, durable stonewashed linen blend fabric, and deep seats create a welcoming, sophisticated look. The seat frames are double-reinforced for durability and longevity.',
        material: 'Linen Blend & Hardwood',
        price: 1350.00,
        discount_price: 1150.00,
        stock: 7,
        colors: JSON.stringify(['Off-White', 'Mist Blue', 'Light Grey']),
        sizes: JSON.stringify(['3-Seater', 'Grand 4-Seater']),
        image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Luxor Boucle Curved Sofa',
        category: 'sofas',
        description: 'The Luxor Curved Sofa brings sculpture and comfort together. Upholstered in high-texture, premium boucle fabric, its organic silhouette wraps your space in a warm embrace. Ideal for modern architectural living rooms.',
        material: 'Premium Boucle & Birch Wood',
        price: 1899.00,
        discount_price: 1699.00,
        stock: 4,
        colors: JSON.stringify(['Ivory Cream', 'Camel Beige', 'Charcoal black']),
        sizes: JSON.stringify(['Standard 3-Seater']),
        image_url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Siena Classic Tufted Sofa',
        category: 'sofas',
        description: 'The Siena Sofa combines traditional European elegance with modern sizing. Featuring a low-profile tufted backrest, plush foam and spring-coiled seating, and hand-applied gold nailhead trims. Add a vintage touch to your formal seating area.',
        material: 'Chenille Fabric & Hardwood',
        price: 1599.00,
        discount_price: 1399.00,
        stock: 6,
        colors: JSON.stringify(['Warm Taupe', 'Oatmeal', 'Silver Sage']),
        sizes: JSON.stringify(['Loveseat', '3-Seater']),
        image_url: 'https://images.unsplash.com/photo-1505693395321-883724634266?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      // CATEGORY: BEDS
      {
        name: 'Monarch Velvet Tufted Bed',
        category: 'beds',
        description: 'Sleep like royalty in the Monarch Bed. Boasting a grand 6-foot tall chesterfield-tufted headboard upholstered in premium velvet, this bedframe acts as a stunning centerpiece. Made with robust solid pine wood slats and central support bars, it requires no box spring.',
        material: 'Velvet Upholstery & Pine Wood',
        price: 1299.00,
        discount_price: 1099.00,
        stock: 6,
        colors: JSON.stringify(['Royal Blue', 'Emerald Green', 'Classic Cream', 'Rose Pink']),
        sizes: JSON.stringify(['Queen', 'King', 'Super King']),
        image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800'
        ])
      },
      {
        name: 'Heritage Solid Oak Platform Bed',
        category: 'beds',
        description: 'Highlighting natural beauty, the Heritage Bed is constructed from hand-selected American white oak wood. Clean-cut joinery, a minimalist headboard, and a low platform frame give it a warm, mid-century look. Protected with a natural wax finish that resists wear and displays native grains.',
        material: 'American White Oak',
        price: 1099.00,
        discount_price: 999.00,
        stock: 9,
        colors: JSON.stringify(['Natural Oak', 'Warm Walnut', 'Ebony Oak']),
        sizes: JSON.stringify(['Double', 'Queen', 'King']),
        image_url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Aura Wingback Upholstered Bed',
        category: 'beds',
        description: 'Featuring sophisticated protective wingbacks, the Aura Bed is upholstered in luxury linen fabric. The headboard is stuffed with premium high-density foam for support while reading in bed. Handcrafted piping trims decorate the margins for a luxury hotel appearance.',
        material: 'Premium Linen & Ash Wood',
        price: 1199.00,
        discount_price: 1050.00,
        stock: 8,
        colors: JSON.stringify(['Classic Cream', 'Soft Grey', 'Warm Charcoal']),
        sizes: JSON.stringify(['Queen', 'King']),
        image_url: 'https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Sienna Solid Wood Canopy Bed',
        category: 'beds',
        description: 'A striking statement of scale and design. The Sienna Canopy Bed offers solid, kiln-dried timber frames and a modern 4-poster structure. Drape luxury curtains or leave it bare to appreciate its clean, geometric lines.',
        material: 'Solid Kiln-Dried Timber',
        price: 1799.00,
        discount_price: null,
        stock: 3,
        colors: JSON.stringify(['Dark Walnut', 'Natural Oak']),
        sizes: JSON.stringify(['Queen', 'King']),
        image_url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Serene Boucle Platform Bed',
        category: 'beds',
        description: 'Introduce plush textures to your sleep space. The Serene Bed features curved edges, a low platform stance, and is fully padded and wrapped in premium white boucle fabric. It sits on hidden block legs, creating a floating cloud appearance.',
        material: 'White Boucle & Birch Wood',
        price: 1399.00,
        discount_price: 1199.00,
        stock: 5,
        colors: JSON.stringify(['Ivory Cream', 'Camel Beige']),
        sizes: JSON.stringify(['Queen', 'King']),
        image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      },
      {
        name: 'Minimalist Floating Pine Bed',
        category: 'beds',
        description: 'Pure, functional minimalism. Constructed from light, Nordic pine wood, the floating design reveals floor space underneath, helping smaller bedrooms feel more open. Features rounded edge corners for safety and style.',
        material: 'Nordic Pine Wood',
        price: 799.00,
        discount_price: 699.00,
        stock: 14,
        colors: JSON.stringify(['Light Pine', 'Honey Oak', 'Soft White']),
        sizes: JSON.stringify(['Single', 'Double', 'Queen']),
        image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
        additional_images: JSON.stringify([])
      }
    ];

    for (const prod of sampleProducts) {
      await dbRun(
        `INSERT INTO products (name, category, description, material, price, discount_price, stock, colors, sizes, image_url, additional_images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.name,
          prod.category,
          prod.description,
          prod.material,
          prod.price,
          prod.discount_price,
          prod.stock,
          prod.colors,
          prod.sizes,
          prod.image_url,
          prod.additional_images
        ]
      );
    }
    console.log('Sample products seeded successfully.');
  }
}

async function seedReviews() {
  const reviews = await dbAll('SELECT * FROM reviews LIMIT 1');
  if (reviews.length === 0) {
    console.log('Seeding initial product reviews...');
    // Add reviews for the first product (Royal Velvet Chesterfield Sofa) and bed
    await dbRun(
      'INSERT INTO reviews (user_id, product_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [2, 1, 'John Doe', 5, 'Absolutely gorgeous! The emerald green color matches our lounge perfectly. Extremely comfortable, solid construction. Highly recommend!']
    );
    await dbRun(
      'INSERT INTO reviews (user_id, product_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [2, 7, 'John Doe', 5, 'Superb build quality! The tufted velvet headboard is soft and premium, and assembly was very straightforward. 10/10 product.']
    );
    await dbRun(
      'INSERT INTO reviews (user_id, product_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [1, 1, 'Shop Admin', 4, 'Excellent display item. Stitching detail on the rolled arms is top tier luxury grade wood craftsmanship.']
    );
    console.log('Reviews seeded successfully.');
  }
}

async function seedLoginHistory() {
  const logs = await dbAll('SELECT * FROM login_history LIMIT 1');
  if (logs.length === 0) {
    console.log('Seeding initial login history records...');
    const now = new Date();
    
    const records = [
      { user_id: 1, name: 'Shop Admin', identifier: 'admin@asksofaworks.com', method: 'email', status: 'success', error_reason: null, ip_address: '127.0.0.1', offset: -10 },
      { user_id: 2, name: 'Shaik Rahim', identifier: '7995585087', method: 'otp', status: 'success', error_reason: null, ip_address: '192.168.1.5', offset: -45 },
      { user_id: null, name: 'Anonymous', identifier: 'unknown@hacker.com', method: 'email', status: 'failure', error_reason: 'Invalid email or password', ip_address: '203.0.113.10', offset: -120 },
      { user_id: 3, name: 'John Doe', identifier: 'customer@example.com', method: 'google', status: 'success', error_reason: null, ip_address: '127.0.0.1', offset: -180 },
      { user_id: null, name: 'Anonymous', identifier: '9876543210', method: 'otp', status: 'failure', error_reason: 'Incorrect OTP code', ip_address: '192.168.1.12', offset: -300 }
    ];

    for (const rec of records) {
      const logTime = new Date(now.getTime() + rec.offset * 60000).toISOString();
      await dbRun(
        `INSERT INTO login_history (user_id, name, identifier, method, status, error_reason, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [rec.user_id, rec.name, rec.identifier, rec.method, rec.status, rec.error_reason, rec.ip_address, logTime]
      );
    }
    console.log('Login history seeded successfully.');
  }
}

module.exports = {
  db,
  initDatabase,
  dbRun,
  dbAll,
  dbGet
};
