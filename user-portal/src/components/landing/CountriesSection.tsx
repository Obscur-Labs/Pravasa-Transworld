import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Popular Destinations</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            We process visas for top destinations worldwide.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {countries.map((c) => (
            <div
              key={c.name}
              className="bg-white rounded-xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} className="w-10 h-7 object-cover rounded mb-3" />
              <h3 className="font-semibold text-slate-900 text-sm mb-2 group-hover:text-blue-700 transition-colors">{c.name}</h3>
              <div className="flex flex-wrap gap-1">
                {c.types.map((t) => (
                  <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button asChild>
            <Link href="/login">Apply Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
