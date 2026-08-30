import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
import { API_BASE } from '../config';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ask_sofa_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and verify user token on app start
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else if (response.status === 401 || response.status === 403) {
          // Token explicitly expired or invalid
          logout();
        } else {
          // Try to recover state from localStorage fallback for transient backend offline/reloading issues
          const storedUser = localStorage.getItem('ask_sofa_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (err) {
        console.error('Error fetching current user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      localStorage.setItem('ask_sofa_token', data.token);
      localStorage.setItem('ask_sofa_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, mobile) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, mobile })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
      }

      localStorage.setItem('ask_sofa_token', data.token);
      localStorage.setItem('ask_sofa_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ask_sofa_token');
    localStorage.removeItem('ask_sofa_user');
    setToken(null);
    setUser(null);
  };

  const loginWithFirebase = async (idToken, name, mobile) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/firebase-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken, name, mobile })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to authenticate with backend');
      }
      localStorage.setItem('ask_sofa_token', data.token);
      localStorage.setItem('ask_sofa_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (email, name, googleId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, name, googleId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed Google Sign-In');
      }
      localStorage.setItem('ask_sofa_token', data.token);
      localStorage.setItem('ask_sofa_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setUser(data);
      localStorage.setItem('ask_sofa_user', JSON.stringify(data));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, updateProfile, loginWithFirebase, loginWithGoogle, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
