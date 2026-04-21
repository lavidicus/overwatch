"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Star, Clock } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you! We'll be in touch soon.");
  };

  return (
    <section id="contact" className="py-20 px-4 bg-secondary">
      <div className="max-w-6xl mx-auto">

        {/* ── Hero CTA Block ── */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">
            Ready for Relief?
          </h2>
          <p className="text-charcoal/60 text-lg mb-2">
            Book your session today — it only takes a moment
          </p>
          <div className="flex items-center justify-center gap-1 text-primary mb-8">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <span className="text-charcoal/60 text-sm ml-2">140+ five-star reviews</span>
          </div>

          {/* Primary CTAs — large, impossible to miss */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <a
              href="tel:+13184421100"
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 px-6 rounded-xl hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl text-lg font-bold"
            >
              <Phone size={22} />
              Call Now
            </a>
            <a
              href="sms:+13186138377"
              className="flex-1 flex items-center justify-center gap-2 bg-charcoal text-white py-4 px-6 rounded-xl hover:bg-charcoal/80 transition-all shadow-lg hover:shadow-xl text-lg font-bold"
            >
              <MessageCircle size={22} />
              Text to Book
            </a>
          </div>
          <p className="text-charcoal/40 text-sm mt-3">
            Call <span className="font-medium text-charcoal/60">(318) 442-1100</span> · Text <span className="font-medium text-charcoal/60">(318) 613-8377</span>
          </p>
        </motion.div>

        {/* ── Two-Column: Location + Inquiry Form ── */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* Left: Find Us */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-bold text-charcoal text-xl">Find Us</h3>

            {/* Map */}
            <div className="w-full h-64 rounded-xl overflow-hidden shadow-md">
              <iframe
                src="https://maps.google.com/maps?q=Target+Massage+5615+Jackson+St+Alexandria+LA+71303&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Target Massage Location"
              ></iframe>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-charcoal">
                <MapPin size={18} className="text-primary flex-shrink-0" />
                <span>5615 Jackson Street Ext Bldg N, Alexandria, LA 71303</span>
              </div>
              <a
                href="tel:+13184421100"
                className="flex items-center gap-3 text-charcoal hover:text-primary transition-colors"
              >
                <Phone size={18} className="text-primary" />
                (318) 442-1100
              </a>
              <a
                href="mailto:Dmartinlmt77@gmail.com"
                className="flex items-center gap-3 text-charcoal hover:text-primary transition-colors"
              >
                <Mail size={18} className="text-primary" />
                Dmartinlmt77@gmail.com
              </a>
            </div>

            <a
              href="https://www.google.com/maps/search/Target+Massage+5615+Jackson+St+Alexandria+LA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-medium text-sm"
            >
              📍 Get Directions →
            </a>
          </motion.div>

          {/* Right: Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-bold text-charcoal text-xl mb-4">Send an Inquiry</h3>
            <p className="text-charcoal/50 text-sm mb-6">
              Have a question? Prefer email? Drop us a message and we&apos;ll get back to you promptly.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">Interested In...</option>
                <option>Deep Tissue Massage</option>
                <option>Release Therapy</option>
                <option>Customized Therapy</option>
                <option>Focused Therapy</option>
                <option>Basic Massage</option>
                <option>Other / General Question</option>
              </select>
              <textarea
                placeholder="Your Message"
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
              />
              <button
                type="submit"
                className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
