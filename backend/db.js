const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Product, Review, LoginHistory, Inquiry } = require('./models');

let cachedConnection = null;

const sampleProducts = [
  {
    name: 'Kavali Premium Teakwood Dining Table & Chair Wooden Set',
    category: 'wooden-sets',
    description: 'A complete luxury wooden furniture set including a handcrafted solid teakwood dining table and 6 premium upholstered dining chairs. Perfect for luxury family dining.',
    material: 'Teakwood & Velvet Fabric',
    price: 125000.00,
    discount_price: 110000.00,
    stock: 4,
    colors: ['Natural Teak', 'Dark Walnut'],
    sizes: ['6-Chair Set', '8-Chair Set'],
    image_url: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Premium Kavali Teak Wood L-Shape Sofa Set',
    category: 'l-shape-sofas',
    description: 'Crafted from premium Kavali teakwood, this luxury L-shape sectional sofa set features hand-woven boucle upholstery and premium feather-down cushions. Designed and manufactured directly at our Kavali showroom workshop.',
    material: 'Teakwood & Boucle',
    price: 155000.00,
    discount_price: 135000.00,
    stock: 5,
    colors: ['Golden Oak', 'Cream Boucle', 'Taupe Grey'],
    sizes: ['L-Shape 5-Seater', 'L-Shape 7-Seater'],
    image_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
    additional_images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'],
    seller_id: null
  },
  {
    name: 'Kavali Royal Maharaja Teakwood Double Bed',
    category: 'beds',
    description: 'A grand luxury Maharaja double bed crafted with premium Kavali teak wood frame, hand-carved details, and velvet headboard cushioning. Combines royal comfort with traditional craftsmanship.',
    material: 'Teakwood & Royal Velvet',
    price: 95000.00,
    discount_price: 85000.00,
    stock: 3,
    colors: ['Royal Blue', 'Deep Maroon', 'Classic Gold'],
    sizes: ['Queen Size', 'King Size'],
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
    additional_images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800'],
    seller_id: null
  },
  {
    name: 'Royal Velvet Chesterfield Sofa',
    category: 'sofa-sets',
    description: 'Impart classic luxury to your living space with our Royal Velvet Chesterfield Sofa. Featuring hand-tufted rich velvet upholstery, elegant rolled arms, and solid mahogany turned legs, it blends historic design with unmatched comfort. Removable cushions and pocket-coil seating provide a premium lounging experience.',
    material: 'Velvet & Mahogany Wood',
    price: 149900.00,
    discount_price: 129900.00,
    stock: 8,
    colors: ['Emerald Green', 'Royal Blue', 'Classic Cream', 'Charcoal Grey'],
    sizes: ['Loveseat', '3-Seater', 'Grand 4-Seater'],
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800'
    ],
    seller_id: null
  },
  {
    name: 'Elysian Linen Sectional Sofa',
    category: 'l-shape-sofas',
    description: 'A masterpiece of modern minimalism. The Elysian Sectional features heavy-weight Belgian linen, high-density down-feather blend cushions, and a low-slung, modular profile. Tailor it to your space with movable sections and enjoy a relaxed, cloud-like sitting experience.',
    material: 'Belgian Linen & Pine Wood',
    price: 249900.00,
    discount_price: 219900.00,
    stock: 5,
    colors: ['Classic Cream', 'Warm Taupe', 'Oatmeal', 'Soft Sage'],
    sizes: ['Standard L-Shape', 'Grand Sectional'],
    image_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800'
    ],
    seller_id: null
  },
  {
    name: 'Sienna Leather Loveseat',
    category: 'sofa-sets',
    description: 'Crafted with premium top-grain Italian leather, the Sienna Loveseat develops a gorgeous patina over time. Structured with a solid ash wood exposed frame, it pairs mid-century aesthetics with exceptional structural support. Perfect for study rooms, executive offices, or cozy spaces.',
    material: 'Italian Top-Grain Leather & Ash Wood',
    price: 119900.00,
    discount_price: null,
    stock: 12,
    colors: ['Cognac Brown', 'Dark Espresso', 'Tan Leather'],
    sizes: ['Standard Loveseat'],
    image_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Hampton Classic Linen Sofa',
    category: 'sofa-sets',
    description: 'Embrace Coastal Elegance with the Hampton Classic. Loose pillowback seating, durable stonewashed linen blend fabric, and deep seats create a welcoming, sophisticated look. The seat frames are double-reinforced for durability and longevity.',
    material: 'Linen Blend & Hardwood',
    price: 135000.00,
    discount_price: 115000.00,
    stock: 7,
    colors: ['Off-White', 'Mist Blue', 'Light Grey'],
    sizes: ['3-Seater', 'Grand 4-Seater'],
    image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Luxor Boucle Curved Sofa',
    category: 'corner-sofas',
    description: 'The Luxor Curved Sofa brings sculpture and comfort together. Upholstered in high-texture, premium boucle fabric, its organic silhouette wraps your space in a warm embrace. Ideal for modern architectural living rooms.',
    material: 'Premium Boucle & Birch Wood',
    price: 189900.00,
    discount_price: 169900.00,
    stock: 4,
    colors: ['Ivory Cream', 'Camel Beige', 'Charcoal black'],
    sizes: ['Standard 3-Seater'],
    image_url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Siena Classic Tufted Sofa',
    category: 'sofa-sets',
    description: 'The Siena Sofa combines traditional European elegance with modern sizing. Featuring a low-profile tufted backrest, plush foam and spring-coiled seating, and hand-applied gold nailhead trims. Add a vintage touch to your formal seating area.',
    material: 'Chenille Fabric & Hardwood',
    price: 159900.00,
    discount_price: 139900.00,
    stock: 6,
    colors: ['Warm Taupe', 'Oatmeal', 'Silver Sage'],
    sizes: ['Loveseat', '3-Seater'],
    image_url: 'https://images.unsplash.com/photo-1505693395321-883724634266?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Monarch Velvet Tufted Bed',
    category: 'beds',
    description: 'Sleep like royalty in the Monarch Bed. Boasting a grand 6-foot tall chesterfield-tufted headboard upholstered in premium velvet, this bedframe acts as a stunning centerpiece. Made with robust solid pine wood slats and central support bars, it requires no box spring.',
    material: 'Velvet Upholstery & Pine Wood',
    price: 129900.00,
    discount_price: 109900.00,
    stock: 6,
    colors: ['Royal Blue', 'Emerald Green', 'Classic Cream', 'Rose Pink'],
    sizes: ['Queen', 'King', 'Super King'],
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800'
    ],
    seller_id: null
  },
  {
    name: 'Heritage Solid Oak Platform Bed',
    category: 'beds',
    description: 'Highlighting natural beauty, the Heritage Bed is constructed from hand-selected American white oak wood. Clean-cut joinery, a minimalist headboard, and a low platform frame give it a warm, mid-century look. Protected with a natural wax finish that resists wear and displays native grains.',
    material: 'American White Oak',
    price: 109900.00,
    discount_price: 99900.00,
    stock: 9,
    colors: ['Natural Oak', 'Warm Walnut', 'Ebony Oak'],
    sizes: ['Double', 'Queen', 'King'],
    image_url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Aura Wingback Upholstered Bed',
    category: 'beds',
    description: 'Featuring sophisticated protective wingbacks, the Aura Bed is upholstered in luxury linen fabric. The headboard is stuffed with premium high-density foam for support while reading in bed. Handcrafted piping trims decorate the margins for a luxury hotel appearance.',
    material: 'Premium Linen & Ash Wood',
    price: 119900.00,
    discount_price: 105000.00,
    stock: 8,
    colors: ['Classic Cream', 'Soft Grey', 'Warm Charcoal'],
    sizes: ['Queen', 'King'],
    image_url: 'https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Sienna Solid Wood Canopy Bed',
    category: 'beds',
    description: 'A striking statement of scale and design. The Sienna Canopy Bed offers solid, kiln-dried timber frames and a modern 4-poster structure. Drape luxury curtains or leave it bare to appreciate its clean, geometric lines.',
    material: 'Solid Kiln-Dried Timber',
    price: 179900.00,
    discount_price: null,
    stock: 3,
    colors: ['Dark Walnut', 'Natural Oak'],
    sizes: ['Queen', 'King'],
    image_url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Serene Boucle Platform Bed',
    category: 'beds',
    description: 'Introduce plush textures to your sleep space. The Serene Bed features curved edges, a low platform stance, and is fully padded and wrapped in premium white boucle fabric. It sits on hidden block legs, creating a floating cloud appearance.',
    material: 'White Boucle & Birch Wood',
    price: 139900.00,
    discount_price: 119900.00,
    stock: 5,
    colors: ['Ivory Cream', 'Camel Beige'],
    sizes: ['Queen', 'King'],
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  },
  {
    name: 'Minimalist Floating Pine Bed',
    category: 'beds',
    description: 'Pure, functional minimalism. Constructed from light, Nordic pine wood, the floating design reveals floor space underneath, helping smaller bedrooms feel more open. Features rounded edge corners for safety and style.',
    material: 'Nordic Pine Wood',
    price: 79900.00,
    discount_price: 69900.00,
    stock: 14,
    colors: ['Light Pine', 'Honey Oak', 'Soft White'],
    sizes: ['Single', 'Double', 'Queen'],
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    additional_images: [],
    seller_id: null
  }
];

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('[Database Warning] MONGODB_URI is not set. Running in graceful fallback mode.');
    return null;
  }

  mongoose.set('strictQuery', false);

  try {
    cachedConnection = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Successfully connected to MongoDB Atlas database.');
    return cachedConnection;
  } catch (err) {
    console.warn('[Database Connection Error] Could not connect to MongoDB Atlas:', err.message);
    return null;
  }
}

// Seeding function
async function initDatabase() {
  try {
    const conn = await connectToDatabase();
    if (!conn) return;

    await seedUsers();
    await seedProducts();
    await seedReviews();
    await seedLoginHistory();
    console.log('Database tables verified/created and seeded successfully.');
  } catch (error) {
    console.warn('[Database Init Warning]', error.message);
  }
}

async function seedUsers() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Seeding default users...');
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      const customerPasswordHash = bcrypt.hashSync('customer123', 10);

      await User.create([
        {
          name: 'Shop Admin',
          email: 'admin@asksofaworks.com',
          password: adminPasswordHash,
          role: 'admin',
          mobile: '9876543210',
          address: 'WX4J+W5P, vengalarao Nagar',
          city: 'Kavali',
          state: 'Andhra Pradesh',
          pincode: '524201'
        },
        {
          name: 'Shaik Rahim',
          email: 'shaikrahim47146@gmail.com',
          password: adminPasswordHash,
          role: 'admin',
          mobile: '7995585087',
          address: 'WX4J+W5P, vengalarao Nagar',
          city: 'Kavali',
          state: 'Andhra Pradesh',
          pincode: '524201'
        },
        {
          name: 'John Doe',
          email: 'customer@example.com',
          password: customerPasswordHash,
          role: 'customer',
          mobile: '9876543211',
          address: 'Apartment 4B, Serenity Towers',
          city: 'Vellore',
          state: 'Tamil Nadu',
          pincode: '632014'
        }
      ]);
      console.log('Users seeded successfully.');
    }
  } catch (e) {
    console.warn('Seed users error:', e.message);
  }
}

async function seedProducts() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('Seeding premium showroom products...');
      await Product.create(sampleProducts);
      console.log('Sample premium products seeded successfully.');
    }
  } catch (e) {
    console.warn('Seed products error:', e.message);
  }
}

async function seedReviews() {
  try {
    const count = await Review.countDocuments();
    if (count === 0) {
      console.log('Seeding initial product reviews...');
      const firstProduct = await Product.findOne({ name: 'Royal Velvet Chesterfield Sofa' });
      const firstBed = await Product.findOne({ name: 'Monarch Velvet Tufted Bed' });
      const customer = await User.findOne({ email: 'customer@example.com' });
      const admin = await User.findOne({ role: 'admin' });

      if (firstProduct && customer && firstBed && admin) {
        await Review.create([
          {
            user_id: customer._id,
            product_id: firstProduct._id,
            user_name: customer.name,
            rating: 5,
            comment: 'Absolutely gorgeous! The emerald green color matches our lounge perfectly. Extremely comfortable, solid construction. Highly recommend!',
            real_images: []
          },
          {
            user_id: customer._id,
            product_id: firstBed._id,
            user_name: customer.name,
            rating: 5,
            comment: 'Superb build quality! The tufted velvet headboard is soft and premium, and assembly was very straightforward. 10/10 product.',
            real_images: []
          },
          {
            user_id: admin._id,
            product_id: firstProduct._id,
            user_name: admin.name,
            rating: 4,
            comment: 'Excellent display item. Stitching detail on the rolled arms is top tier luxury grade wood craftsmanship.',
            real_images: []
          }
        ]);
        console.log('Reviews seeded successfully.');
      }
    }
  } catch (e) {
    console.warn('Seed reviews error:', e.message);
  }
}

async function seedLoginHistory() {
  try {
    const count = await LoginHistory.countDocuments();
    if (count === 0) {
      console.log('Seeding initial login history records...');
      const customer = await User.findOne({ email: 'customer@example.com' });
      const admin = await User.findOne({ email: 'admin@asksofaworks.com' });

      const records = [
        {
          user_id: admin ? admin._id : null,
          name: admin ? admin.name : 'Shop Admin',
          identifier: 'admin@asksofaworks.com',
          method: 'email',
          status: 'success',
          error_reason: null,
          ip_address: '127.0.0.1'
        },
        {
          user_id: customer ? customer._id : null,
          name: customer ? customer.name : 'John Doe',
          identifier: 'customer@example.com',
          method: 'google',
          status: 'success',
          error_reason: null,
          ip_address: '127.0.0.1'
        }
      ];

      await LoginHistory.create(records);
      console.log('Login history seeded successfully.');
    }
  } catch (e) {
    console.warn('Seed login history error:', e.message);
  }
}

module.exports = {
  connectToDatabase,
  initDatabase,
  sampleProducts
};
