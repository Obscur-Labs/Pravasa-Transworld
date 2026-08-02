'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Globe2, MapPin, BadgeCheck } from 'lucide-react';
import type { Country } from '@/types';

export default function DestinationsExplorer({ initialCountries }: { initialCountries: Country[] }) {
  const [search, setSearch] = useState('');
  const filtered = initialCountries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="absolute -right-20 top-1/2 -translate-y-1/2 w-[500px] opacity-[0.035] text-blue-600"
            viewBox="0 0 1000 500" fill="none" xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="500" cy="250" rx="490" ry="240" stroke="currentColor" strokeWidth="10" />
            <line x1="10" y1="250" x2="990" y2="250" stroke="currentColor" strokeWidth="5" />
            <line x1="500" y1="10" x2="500" y2="490" stroke="currentColor" strokeWidth="5" />
            <ellipse cx="500" cy="250" rx="250" ry="240" stroke="currentColor" strokeWidth="5" />
            <ellipse cx="500" cy="250" rx="490" ry="120" stroke="currentColor" strokeWidth="4" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest">
            <Globe2 className="w-3.5 h-3.5" />
            50+ Destinations
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
            Where Are You<br />
            <span className="text-blue-600">Travelling Next?</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-xl mb-8 text-[15px] leading-relaxed">
            Apply for your visa online with expert immigration assistance. Explore every country we support —
            requirements, processing times, pricing, and how to apply.
          </p>

          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search a country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-300 transition-all text-sm font-medium shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold text-lg">
              {search ? `No destinations match "${search}"` : 'No destinations available yet.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-blue-600 hover:underline text-sm font-semibold">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <p className="text-sm text-slate-500 font-medium mb-5">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
                <span className="text-slate-700 font-bold">"{search}"</span>
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((c) => <CountryCard key={c._id} country={c} />)}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CountryCard({ country }: { country: Country }) {
  const href = country.slug ? `/countries/${country.slug}` : `/countries/${country._id}`;
  const coverImage = country.images?.[0];

  return (
    <Link href={href} className="group block">
      <div className="h-full rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-300 overflow-hidden">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100">
          {coverImage ? (
            <img
              src={coverImage}
              alt={country.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={`https://flagcdn.com/w160/${country.flag}.png`}
                alt={country.name}
                className="w-24 h-auto object-contain opacity-50 group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          {coverImage && (
            <div className="absolute bottom-2.5 left-2.5 rounded-lg overflow-hidden w-9 h-6 shadow-md border border-white/60">
              <img src={`https://flagcdn.com/w40/${country.flag}.png`} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-extrabold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors leading-tight">
            {country.name}
          </h3>
          {country.description && (
            <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-2.5 leading-relaxed">
              {country.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-blue-600 text-xs font-bold group-hover:gap-1.5 transition-all duration-200">
            View Visa Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
