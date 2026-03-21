"use client";

import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import Image from "next/image";

const links = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm">
      {/* Top bar with phone number — visible on all screens */}
      <div className="bg-charcoal text-white/90 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:inline">Licensed Massage Therapist · Alexandria, LA</span>
          <a href="tel:+13184421100" className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto sm:ml-0">
            <Phone size={12} />
            <span className="font-medium">(318) 442-1100</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-2">
          <Image src="/logo-nobg.png" alt="Target Massage" width={180} height={84} className="h-12 w-auto" />
          <span className="font-bold text-charcoal text-xl hidden sm:inline tracking-wide">
            Expect<span className="text-primary">...</span>Relief
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-charcoal hover:text-primary font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors font-semibold"
          >
            Book Now
          </a>
        </nav>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden bg-white border-t px-4 pb-4 space-y-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2 text-charcoal hover:text-primary font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="tel:+13184421100"
            className="block text-center border-2 border-primary text-primary px-4 py-2 rounded-lg font-semibold"
            onClick={() => setOpen(false)}
          >
            📞 Call (318) 442-1100
          </a>
          <a
            href="#contact"
            className="block text-center bg-primary text-white px-4 py-2 rounded-lg font-semibold"
            onClick={() => setOpen(false)}
          >
            Book Now
          </a>
        </nav>
      )}
    </header>
  );
}
