'use client';
import Link from 'next/link';
import { Globe, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#destinations', label: 'Destinations' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-md shadow-slate-100/5'
        : 'bg-white/80 backdrop-blur-lg border-b border-slate-100/5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-all">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">VisaFlow</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-600 hover:text-blue-600 hover:bg-slate-50 font-semibold border-0"
            >
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10 border-0 font-semibold"
            >
              <Link href="/login">Apply For Visa</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/98 backdrop-blur-xl border-t border-slate-100 px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-sm font-semibold text-slate-600 hover:text-blue-600 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" asChild>
              <Link href="/login">Apply For Visa</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
