"use client";

import { motion } from "framer-motion";

import Image from "next/image";

export default function About() {
  return (
    <section id="about" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/david.webp"
            alt="David Martin greeting a client at the Target Massage front desk"
            width={600}
            height={750}
            className="w-full rounded-2xl object-cover shadow-lg"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-6">
            About David Martin
          </h2>
          <p className="text-charcoal/70 mb-4 leading-relaxed">
            With over 24 years of experience as a Licensed Massage Therapist,
            David Martin is passionate about helping clients achieve pain-free
            living through targeted, therapeutic massage techniques.
          </p>
          <p className="text-charcoal/70 mb-4 leading-relaxed">
            Specializing in deep tissue massage and release therapy, David takes
            a personalized approach to each session — identifying problem areas
            and applying focused techniques to relieve chronic pain, tension, and
            restricted movement.
          </p>
          <p className="text-charcoal/70 leading-relaxed">
            Whether you&apos;re dealing with injury recovery, chronic muscle
            pain, or everyday stress, David&apos;s expertise and dedication will
            help you get back to feeling your best.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
