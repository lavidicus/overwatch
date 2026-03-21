"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 text-charcoal pt-24"
    >
      {/* White background */}
      <div className="absolute inset-0 bg-white" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-3xl z-10"
      >
        <Image
          src="/logo-nobg.png"
          alt="Target Massage Logo"
          width={280}
          height={130}
          className="mx-auto mb-6 drop-shadow-2xl w-[260px] md:w-[320px] h-auto"
          priority
        />
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Expect<span className="text-primary">...</span> Relief
        </h1>
        <p className="text-lg md:text-xl text-charcoal/70 mb-4 max-w-2xl mx-auto">
          Deep Tissue Massage &amp; Release Therapy in Alexandria, LA
        </p>
        <p className="text-base text-charcoal/50 mb-8 max-w-xl mx-auto">
          David Martin, Licensed Massage Therapist — 24+ years helping clients live pain-free
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            className="bg-primary text-white font-bold px-10 py-4 rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl text-lg"
          >
            Book Your Session
          </a>
          <a
            href="tel:+13184421100"
            className="border-2 border-charcoal/30 text-charcoal font-semibold px-8 py-4 rounded-lg hover:bg-charcoal/5 transition-colors"
          >
            📞 Call (318) 442-1100
          </a>
        </div>
        <p className="mt-6 text-charcoal/40 text-sm">
          ★★★★★ 140+ five-star reviews on Google &amp; Yelp
        </p>
      </motion.div>
    </section>
  );
}
