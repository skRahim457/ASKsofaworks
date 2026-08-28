import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('ask_sofa_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [coupon, setCoupon] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  useEffect(() => {
    localStorage.setItem('ask_sofa_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1, color, size, upholstery = 'None', set_type = 'None') => {
    setCart((prevCart) => {
      // Find matching item by product ID, color, size, upholstery, and set_type
      const existingIndex = prevCart.findIndex(
        (item) => item.product_id === product.id && item.color === color && item.size === size && item.upholstery === upholstery && item.set_type === set_type
      );

      const price = product.discount_price || product.price;

      if (existingIndex > -1) {
        // Increase quantity of existing configured item
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        // Add new configured item
        return [
          ...prevCart,
          {
            product_id: product.id,
            product_name: product.name,
            price: price,
            quantity: quantity,
            color: color || (product.colors && product.colors[0]) || 'Standard',
            size: size || (product.sizes && product.sizes[0]) || 'Standard',
            upholstery: upholstery || 'None',
            set_type: set_type || 'None',
            image_url: product.image_url
          }
        ];
      }
    });
  };

  const removeFromCart = (productId, color, size, upholstery = 'None', set_type = 'None') => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(item.product_id === productId && item.color === color && item.size === size && item.upholstery === upholstery && item.set_type === set_type)
      )
    );
  };

  const updateQuantity = (productId, color, size, upholstery = 'None', set_type = 'None', change) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product_id === productId && item.color === color && item.size === size && item.upholstery === upholstery && item.set_type === set_type) {
            const newQty = item.quantity + change;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0); // Remove item if quantity drops to 0 or less
    });
  };

  const clearCart = () => {
    setCart([]);
    setCoupon('');
    setDiscountPercent(0);
    setCouponSuccess('');
    setCouponError('');
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Luxury brand policy: ₹999 delivery charge, free shipping over ₹15,000
  const deliveryCharge = cartSubtotal > 15000 || cartSubtotal === 0 ? 0 : 999;
  
  const discountAmount = Number(((cartSubtotal * discountPercent) / 100).toFixed(0));
  
  const cartTotal = Number((cartSubtotal + deliveryCharge - discountAmount).toFixed(0));

  // Promo code engine
  const applyPromoCode = (code) => {
    setCouponError('');
    setCouponSuccess('');
    const upperCode = code.toUpperCase().trim();

    if (upperCode === 'SOFA10' || upperCode === 'WELCOME10') {
      setDiscountPercent(10);
      setCoupon(upperCode);
      setCouponSuccess('Promo code applied! 10% discount has been deducted.');
      return true;
    } else if (upperCode === 'LUXE20' || upperCode === 'ASK20') {
      if (cartSubtotal >= 20000) {
        setDiscountPercent(20);
        setCoupon(upperCode);
        setCouponSuccess('Luxe Promo code applied! 20% discount has been deducted.');
        return true;
      } else {
        setCouponError('This code is only applicable for orders above ₹20,000');
        return false;
      }
    } else {
      setCouponError('Invalid promo code');
      return false;
    }
  };

  const removePromoCode = () => {
    setCoupon('');
    setDiscountPercent(0);
    setCouponSuccess('');
    setCouponError('');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        coupon,
        couponSuccess,
        couponError,
        cartSubtotal,
        deliveryCharge,
        discountAmount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyPromoCode,
        removePromoCode
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
