"use client";

import { motion } from "framer-motion";
import { Star, ExternalLink } from "lucide-react";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/search/Target+Massage+5615+Jackson+St+Alexandria+LA";
const YELP_URL = "https://www.yelp.com/biz/target-massage-alexandria";

const testimonials = [
  {
    text: "David Martin is a skilled practitioner. Highly intuitive guy who often figures out the problem before you even know where it's coming from. He massages with skill and care, plus he teaches you to keep from re-injuring yourself when possible.",
    author: "Verified Client",
    platform: "Google",
  },
  {
    text: "Best massage therapist in Central Louisiana. David really knows what he's doing — over 20 years of experience shows in every session. Highly recommend for anyone dealing with chronic pain.",
    author: "Verified Client",
    platform: "Google",
  },
  {
    text: "I've been going to Target Massage for years. David customizes every session to exactly what you need. If you have a specific problem area, he'll find it and work it out.",
    author: "Verified Client",
    platform: "Yelp",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">
            What Our Clients Say
          </h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} className="text-primary fill-primary" />
            ))}
          </div>
          <p className="text-charcoal/60">
            140+ reviews across Google &amp; Yelp
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="bg-secondary rounded-xl p-6 flex flex-col"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={16} className="text-primary fill-primary" />
                ))}
              </div>
              <p className="text-charcoal/70 italic mb-4 flex-grow leading-relaxed">
                &quot;{t.text}&quot;
              </p>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-charcoal text-sm">— {t.author}</p>
                <span className="text-xs text-charcoal/40 bg-charcoal/5 px-2 py-1 rounded">
                  {t.platform}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-10 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-charcoal/20 text-charcoal px-6 py-3 rounded-lg hover:border-primary hover:text-primary transition-colors font-medium text-sm"
            >
              Read Google Reviews <ExternalLink size={14} />
            </a>
            <a
              href={YELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-charcoal/20 text-charcoal px-6 py-3 rounded-lg hover:border-primary hover:text-primary transition-colors font-medium text-sm"
            >
              Read Yelp Reviews <ExternalLink size={14} />
            </a>
          </div>

          {/* CTA after social proof — highest conversion moment */}
          <div className="pt-4">
            <p className="text-charcoal/50 text-sm mb-3">Join 140+ satisfied clients</p>
            <a
              href="#contact"
              className="inline-block bg-primary text-white font-bold px-10 py-4 rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Book Your Session →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
