import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white py-12 px-4">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-3">Target Massage</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            Deep Tissue Massage & Release Therapy by David Martin, Licensed
            Massage Therapist with 24+ years of experience.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-3">Hours</h3>
          <p className="text-white/60 text-sm">By Appointment Only</p>
          <p className="text-white/60 text-sm mt-1">
            Call or book online to schedule your session.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-3">Contact</h3>
          <div className="space-y-2 text-sm text-white/60">
            <a href="tel:+13184421100" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={14} /> (318) 442-1100
            </a>
            <a href="mailto:Dmartinlmt77@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail size={14} /> Dmartinlmt77@gmail.com
            </a>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="flex-shrink-0" /> 5615 Jackson Street Ext Bldg N
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-3">Follow Us</h3>
          <p className="text-white/60 text-sm">Social links coming soon.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-white/10 text-center text-white/40 text-sm">
        © 2026 Target Massage. All rights reserved.
      </div>
    </footer>
  );
}
