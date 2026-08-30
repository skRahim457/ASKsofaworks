import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setFormError('Name, email, and message are required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          subject: subject.trim(),
          message: message.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Inquiry sent successfully!');
        setFormSuccess('Thank you! Your message has been received. Our showroom consultant will contact you shortly.');
        setName('');
        setEmail('');
        setMobile('');
        setSubject('');
        setMessage('');
      } else {
        setFormError(data.message || 'Failed to send inquiry.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-padding">
      <div className="section-container">
        
        {/* Title */}
        <div style={{ marginBottom: '4rem' }}>
          <span className="subtitle font-sans">Contact showroom</span>
          <h1 className="heading-md">Get in Touch</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Have a custom design request? Visit our bespoke showroom in Kavali or message us directly.
          </p>
        </div>

        <div className="contact-grid">
          
          {/* Column 1: Info */}
          <div className="contact-info-list">
            
            <div className="contact-info-item">
              <div className="contact-info-icon">📍</div>
              <div className="contact-info-content">
                <h4>Showroom Address</h4>
                <p>
                  WX4J+W5P, vengalarao Nagar,<br />
                  Kavali, Andhra Pradesh - 524201
                </p>
              </div>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-icon">📞</div>
              <div className="contact-info-content">
                <h4>Contact Numbers</h4>
                <p>
                  Phone: +91 79955 85087<br />
                  Email: showroom@asksofaworks.com
                </p>
              </div>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-icon">⏰</div>
              <div className="contact-info-content">
                <h4>Business Hours</h4>
                <p>
                  Monday - Saturday: 10:00 AM - 08:00 PM<br />
                  Sunday: 11:00 AM - 06:00 PM
                </p>
              </div>
            </div>

            {/* WhatsApp Integration Button */}
            <div style={{ marginTop: '1rem' }}>
              <a 
                href="https://wa.me/917995585087?text=Hello%20ASK%20Sofa%20works%20showroom,%20I%20have%20an%20inquiry%20regarding%20sofas/beds."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold btn-full"
                style={{ height: '48px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Chat on WhatsApp
              </a>
            </div>

            {/* Google Map Iframe Container */}
            <div className="map-container">
              <iframe 
                src="https://maps.google.com/maps?q=Kavali,%20Andhra%20Pradesh,%20India&t=&z=14&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy"
                title="Google Maps"
              ></iframe>
            </div>

          </div>

          {/* Column 2: Form */}
          <div className="checkout-form-card">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              Send Inquiry Message
            </h3>

            <form onSubmit={handleContactSubmit}>
              {formSuccess && (
                <div style={{ color: 'var(--color-success)', padding: '0.8rem', backgroundColor: 'rgba(95, 122, 104, 0.08)', borderRadius: '2px', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                  {formSuccess}
                </div>
              )}
              {formError && (
                <div className="form-error" style={{ padding: '0.8rem', backgroundColor: 'rgba(176, 91, 91, 0.08)', borderRadius: '2px', textAlign: 'center', marginBottom: '1.5rem' }}>
                  {formError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-control"
                    placeholder="e.g. john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input 
                    type="tel" 
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Custom Chesterfield Sofa details"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Message *</label>
                <textarea 
                  rows="6" 
                  className="form-control"
                  placeholder="Write your specifications, queries, or customization requests here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                style={{ height: '48px' }}
                disabled={loading}
              >
                {loading ? 'Sending Message...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </section>
  );
}
