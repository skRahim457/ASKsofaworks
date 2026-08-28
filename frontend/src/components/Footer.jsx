import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Brand Column */}
        <div className="footer-brand-column">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', textDecoration: 'none' }}>
            <img src="/logo.png" alt="ASK" style={{ height: '40px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'var(--font-serif)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              ASK sofa works
            </span>
          </Link>
          <p className="footer-brand-desc">
            Designing and crafting timeless, luxury furniture for modern living. We combine premium materials, historic craftsmanship, and minimal design to create beautiful living spaces.
          </p>
          <div className="footer-social-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram">
              <i>IG</i>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook">
              <i>FB</i>
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Pinterest">
              <i>PT</i>
            </a>
          </div>
        </div>

        {/* Collections Links */}
        <div>
          <h4 className="footer-column-title">Collections</h4>
          <ul className="footer-links-list">
            <li><Link to="/category/sofas">Chesterfield Sofas</Link></li>
            <li><Link to="/category/sofas">L-Shape Sectionals</Link></li>
            <li><Link to="/category/sofas">Leather Loveseats</Link></li>
            <li><Link to="/category/beds">Velvet Tufted Beds</Link></li>
            <li><Link to="/category/beds">American Oak Beds</Link></li>
            <li><Link to="/category/beds">Solid Wood Canopy Beds</Link></li>
          </ul>
        </div>

        {/* Customer Support Links */}
        <div>
          <h4 className="footer-column-title">Support</h4>
          <ul className="footer-links-list">
            <li><Link to="/about">About Craftsmanship</Link></li>
            <li><Link to="/contact">Book Consultation</Link></li>
            <li><Link to="/account">Track Your Order</Link></li>
            <li><a href="#shipping">Shipping & White Glove Delivery</a></li>
            <li><a href="#returns">Returns & Warranties</a></li>
            <li><a href="#care">Furniture Care Guide</a></li>
          </ul>
        </div>

        {/* Contact info column */}
        <div>
          <h4 className="footer-column-title">Bespoke Showroom</h4>
          <ul className="footer-links-list" style={{ color: '#B5B5B5', gap: '1rem' }}>
            <li>
              <strong>Showroom Address:</strong><br />
              WX4J+W5P, vengalarao Nagar,<br />
              Kavali, Andhra Pradesh - 524201
            </li>
            <li>
              <strong>Business Hours:</strong><br />
              Mon - Sat: 10:00 AM - 08:00 PM<br />
              Sunday: 11:00 AM - 06:00 PM
            </li>
            <li style={{ marginTop: '0.5rem' }}>
              <a 
                href="https://wa.me/917995585087?text=Hello%20ASK%20Sofa%20works,%20I'm%20interested%20in%20your%20furniture%20collections."
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-gold btn-sm"
                style={{ display: 'inline-flex', width: 'auto' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} ASK Sofa works. All rights reserved.</p>
        <p>Premium Luxury Furniture & Craftsmanship</p>
      </div>
    </footer>
  );
}
