"use client";

import { motion } from "framer-motion";
import { Layers, Zap, Settings, Target, Hand } from "lucide-react";

const services = [
  {
    icon: Layers,
    title: "Deep Tissue Massage",
    desc: "Release chronic tension and knots with intensive techniques that reach deep muscle layers — so you can move freely again.",
  },
  {
    icon: Zap,
    title: "Release Therapy",
    desc: "Eliminate trigger points and restore natural muscle function. Ideal for recurring pain that won't go away on its own.",
  },
  {
    icon: Settings,
    title: "Customized Therapy",
    desc: "No two bodies are alike. David combines multiple techniques tailored to your specific pain patterns and goals.",
  },
  {
    icon: Target,
    title: "Focused Therapy",
    desc: "Targeted work on your problem area — neck, shoulders, back, or wherever you're hurting. Get relief where you need it most.",
  },
  {
    icon: Hand,
    title: "Basic Massage",
    desc: "A full-body session to ease everyday stress, improve circulation, and leave you feeling restored and balanced.",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 px-4 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">
            Our Services
          </h2>
          <p className="text-charcoal/60 max-w-2xl mx-auto">
            Every session is personalized. David listens to your body and adapts his approach to deliver the relief you need.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <s.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">
                {s.title}
              </h3>
              <p className="text-charcoal/60 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA after services — research says repeat CTA at end of every section */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-charcoal/50 text-sm mb-4">Not sure which service is right for you? David will help you decide.</p>
          <a
            href="#contact"
            className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Book a Session →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
