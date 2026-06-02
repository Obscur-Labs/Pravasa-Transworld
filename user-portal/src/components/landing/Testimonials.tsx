import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Student Visa · Canada',
    avatar: 'PS',
    text: 'VisaFlow made my Canadian student visa process so smooth. The document upload was easy and I got real-time updates throughout. Approved in 12 days!',
    rating: 5,
  },
  {
    name: 'Ahmed Al-Rashid',
    role: 'Business Visa · UK',
    avatar: 'AA',
    text: 'Professional service from start to finish. The team reviewed my business visa documents quickly and I was never left guessing about my application status.',
    rating: 5,
  },
  {
    name: 'Sarah Johnson',
    role: 'Tourist Visa · Australia',
    avatar: 'SJ',
    text: 'I was nervous about applying for my Australian visa, but VisaFlow guided me through every step. The status tracker gave me complete peace of mind.',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden border-t border-slate-100">
      {/* Light background blobs */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-indigo-100/20 rounded-full blur-3xl pointer-events-none animate-float" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block bg-blue-50 text-blue-800 border border-blue-100/60 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest shadow-sm">
            Testimonials
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">What Our Customers Say</h2>
          <p className="text-lg text-slate-600 font-semibold">Join thousands of satisfied travelers worldwide.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-3xl p-7 border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-[0_15px_30px_rgba(59,130,246,0.04)] transition-all duration-300 hover:-translate-y-1 flex flex-col group">
              <Quote className="w-8 h-8 text-blue-600/10 mb-4 flex-shrink-0" />

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400 border-0" />
                ))}
              </div>

              <p className="text-slate-600 text-sm leading-relaxed flex-1 mb-6 font-semibold">&ldquo;{t.text}&rdquo;</p>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-extrabold text-sm">{t.avatar}</span>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs font-bold">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
