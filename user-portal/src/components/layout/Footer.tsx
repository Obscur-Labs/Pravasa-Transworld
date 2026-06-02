import Link from 'next/link';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">VisaFlow</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mb-6 font-semibold">
              Professional visa assistance that simplifies your journey from application to approval.
              Trusted by thousands of travelers worldwide.
            </p>
            <div className="space-y-2 font-semibold">
              {[
                { icon: Mail, text: 'support@visaflow.com' },
                { icon: Phone, text: '+1 (800) 123-4567' },
                { icon: MapPin, text: 'Mon–Fri, 9AM–6PM EST' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-slate-500 text-sm">
                  <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-slate-900 font-extrabold text-base mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              {[
                ['/', 'Home'],
                ['#how-it-works', 'How It Works'],
                ['#destinations', 'Destinations'],
                ['/login', 'Apply Now'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-slate-600 hover:text-blue-600 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-extrabold text-base mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              {[['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-slate-600 hover:text-blue-600 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-12 pt-8 text-sm text-center text-slate-400 font-bold">
          © {new Date().getFullYear()} VisaFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
