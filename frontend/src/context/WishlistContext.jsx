import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();

  const fetchWishlist = async () => {
    if (!token) {
      setWishlist([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/wishlist`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [token, user]);

  const toggleWishlist = async (productId) => {
    if (!token) {
      alert('Please login to save items to your wishlist.');
      return;
    }

    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      if (response.ok) {
        // Refresh local wishlist state
        await fetchWishlist();
      }
    } catch (err) {
      console.error('Error toggling wishlist item:', err);
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, loading, toggleWishlist, isInWishlist, refreshWishlist: fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
