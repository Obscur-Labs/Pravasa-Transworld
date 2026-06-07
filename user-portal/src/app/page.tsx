import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import CountriesSlider from '@/components/landing/CountriesSlider';
import Benefits from '@/components/landing/Benefits';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import ContactSection from '@/components/landing/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pravasatransworld.com';

export const metadata: Metadata = {
  title: 'Visa Services Online — Apply for Tourist, Student & Work Visas',
  description:
    'Apply for your visa online with Pravasa Transworld. Expert immigration assistance for 50+ countries — tourist, student, work, and business visas. Real-time tracking, fast processing, transparent pricing.',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'Pravasa Transworld — Apply for Your Visa Online',
    description:
      'Immigration made simple. Apply for tourist, student, work, or business visas for 50+ countries. Track your application in real time.',
    url: BASE_URL,
  },
  twitter: {
    title: 'Pravasa Transworld — Apply for Your Visa Online',
    description:
      'Immigration made simple. Apply for tourist, student, work, or business visas for 50+ countries. Track your application in real time.',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Pravasa Transworld',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    'Professional visa and immigration consultancy services for 50+ countries including tourist, student, work, and business visas.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  areaServed: 'Worldwide',
  serviceType: 'Immigration and Visa Services',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Pravasa Transworld',
  url: BASE_URL,
  description: 'Professional visa and immigration consultancy for 50+ countries.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Visa Application & Immigration Services',
  provider: { '@type': 'Organization', name: 'Pravasa Transworld', url: BASE_URL },
  description:
    'End-to-end visa application processing for tourist, student, work, and business visas across 50+ countries.',
  areaServed: 'Worldwide',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Visa Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tourist Visa Processing' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Student Visa Processing' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Work Visa Processing' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business Visa Processing' } },
    ],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-blue-950">
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={serviceSchema} />
      <Navbar />
      <Hero />
      <HowItWorks />
      <CountriesSlider />
      <Benefits />
      <Testimonials />
      <FAQ />
      <ContactSection />
      <Footer />
    </div>
  );
}
