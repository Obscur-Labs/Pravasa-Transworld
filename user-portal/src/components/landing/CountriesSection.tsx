import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const countries = [
  { code: 'ca', name: 'Canada', types: ['Tourist', 'Student', 'Work'] },
  { code: 'us', name: 'United States', types: ['Tourist', 'Student', 'Business'] },
  { code: 'gb', name: 'United Kingdom', types: ['Tourist', 'Student', 'Work'] },
  { code: 'au', name: 'Australia', types: ['Tourist', 'Student', 'Work'] },
  { code: 'de', name: 'Germany', types: ['Tourist', 'Student', 'Work'] },
  { code: 'fr', name: 'France', types: ['Tourist', 'Business'] },
  { code: 'jp', name: 'Japan', types: ['Tourist', 'Business'] },
  { code: 'ae', name: 'UAE', types: ['Tourist', 'Business', 'Work'] },
];

export default function CountriesSection() {
  return (
    <section id="destinations" className="py-24 bg-gradient-to-b from-slate-50 via-blue-50/30 to-white relative overflow-hidden">
      {/* Decorative light gradient blobs */}
      <div className="absolute top-0 left-10 w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-0 right-10 w-[350px] h-[350px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block glass-light glass-light-interactive text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 border border-blue-200/40 uppercase tracking-widest">
            Popular Destinations
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Destinations We Support</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            We process visas for top destinations worldwide with unmatched speed and efficiency.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
          {countries.map((c) => (
            <div
              key={c.name}
              className="glass-light glass-light-interactive rounded-3xl p-6 border border-white/70 shadow-sm hover:border-blue-300/40 hover:bg-white/95 hover:shadow-[0_20px_45px_rgba(59,130,246,0.08)] transition-all duration-300 group"
            >
              <div className="relative overflow-hidden rounded-lg w-12 h-8 mb-4 border border-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <img 
                  src={`https://flagcdn.com/w40/${c.code}.png`} 
                  alt={c.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base mb-3 group-hover:text-blue-600 transition-colors">
                {c.name}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {c.types.map((t) => (
                  <span 
                    key={t} 
                    className="text-[10px] bg-blue-50/60 text-blue-600 font-bold px-2.5 py-0.5 rounded-full border border-blue-100/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            asChild
            className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300 border-0"
          >
            <Link href="/login">
              Apply Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
