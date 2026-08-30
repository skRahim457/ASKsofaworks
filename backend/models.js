const mongoose = require('mongoose');

// Helper to map MongoDB _id to virtual id for React frontend compatibility
const addVirtualId = (schema) => {
  schema.virtual('id').get(function() {
    return this._id ? this._id.toHexString() : null;
  });
  schema.set('toJSON', { 
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
      ret.id = ret._id ? ret._id.toString() : null;
      return ret;
    }
  });
  schema.set('toObject', { virtuals: true });
};

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer', enum: ['customer', 'seller', 'admin'] },
  mobile: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  shop_name: String,
  shop_address: String,
  seller_status: { type: String, default: 'none' },
  created_at: { type: Date, default: Date.now }
});
addVirtualId(userSchema);

// 2. Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  material: { type: String, required: true },
  price: { type: Number, required: true },
  discount_price: { type: Number, default: null },
  stock: { type: Number, default: 0 },
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  image_url: { type: String, required: true },
  additional_images: { type: [String], default: [] },
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  upholstery_types: { type: [String], default: ['Cloth', 'Rexine'] },
  set_types: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
});
addVirtualId(productSchema);

// 3. Order Item Sub-schema
const orderItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  color: String,
  size: String,
  image_url: String,
  upholstery: String,
  set_type: { type: String, default: 'None' },
  feedback_permitted: { type: Number, default: 0 }
});
addVirtualId(orderItemSchema);

// 4. Order Schema
const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  total_price: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'] },
  payment_method: { type: String, required: true },
  customer_received: { type: Number, default: 0 },
  delivery_response: String,
  paid_amount: { type: Number, default: 0 },
  payment_bill_img: String,
  items: [orderItemSchema],
  created_at: { type: Date, default: Date.now }
});
addVirtualId(orderSchema);

// 5. Review Schema
const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user_name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  real_images: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
});
addVirtualId(reviewSchema);

// 6. Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  created_at: { type: Date, default: Date.now }
});
wishlistSchema.index({ user_id: 1, product_id: 1 }, { unique: true });
addVirtualId(wishlistSchema);

// 7. Login History Schema
const loginHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: String,
  identifier: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: String, required: true },
  error_reason: String,
  ip_address: String,
  created_at: { type: Date, default: Date.now }
});
addVirtualId(loginHistorySchema);

// 8. Inquiry Schema
const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: String,
  subject: String,
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
addVirtualId(inquirySchema);

module.exports = {
  User: mongoose.model('User', userSchema),
  Product: mongoose.model('Product', productSchema),
  Order: mongoose.model('Order', orderSchema),
  Review: mongoose.model('Review', reviewSchema),
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
  LoginHistory: mongoose.model('LoginHistory', loginHistorySchema),
  Inquiry: mongoose.model('Inquiry', inquirySchema)
};
