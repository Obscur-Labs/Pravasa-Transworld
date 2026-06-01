import 'dotenv/config';
import { connectDB } from '../config/database';
import Admin from '../models/Admin';
import Country from '../models/Country';
import VisaType from '../models/VisaType';

// flag stores the ISO 3166-1 alpha-2 code (lowercase) — used with flagcdn.com
const countries = [
  { name: 'Canada', flag: 'ca', description: 'Experience the vast landscapes and multicultural cities of Canada.' },
  { name: 'United States', flag: 'us', description: 'Explore the land of opportunity from coast to coast.' },
  { name: 'United Kingdom', flag: 'gb', description: 'Discover historic Britain from London to the Scottish Highlands.' },
  { name: 'Australia', flag: 'au', description: 'Adventure awaits across the sunburnt country Down Under.' },
  { name: 'Germany', flag: 'de', description: 'Experience innovation, culture, and history in the heart of Europe.' },
  { name: 'France', flag: 'fr', description: 'Fall in love with art, cuisine, and the Eiffel Tower.' },
  { name: 'Japan', flag: 'jp', description: 'Blend tradition and modernity in the Land of the Rising Sun.' },
  { name: 'UAE', flag: 'ae', description: 'Experience luxury and ambition in the desert oasis.' },
];

async function seed() {
  await connectDB();
  console.log('Connected to MongoDB');

  // Seed Admin
  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@visaflow.com' });
  if (!existing) {
    await Admin.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@visaflow.com',
      phone: process.env.ADMIN_PHONE || '9999999999',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
    });
    console.log('Admin seeded');
  } else {
    console.log('Admin already exists');
  }

  // Seed Countries
  for (const c of countries) {
    await Country.findOneAndUpdate({ name: c.name }, c, { upsert: true, new: true });
  }
  console.log('Countries seeded');

  // Seed sample visa types
  const canada = await Country.findOne({ name: 'Canada' });
  const usa = await Country.findOne({ name: 'United States' });
  const uk = await Country.findOne({ name: 'United Kingdom' });

  const sampleVisaTypes = [
    {
      country: canada!._id,
      name: 'Tourist Visa',
      description: 'For tourism and leisure visits to Canada.',
      price: 150,
      processingDays: 15,
      formFields: [
        { label: 'Passport Number', fieldName: 'passportNumber', type: 'text', required: true, options: [], placeholder: 'e.g. A1234567', order: 1 },
        { label: 'Date of Birth', fieldName: 'dateOfBirth', type: 'date', required: true, options: [], placeholder: '', order: 2 },
        { label: 'Occupation', fieldName: 'occupation', type: 'text', required: true, options: [], placeholder: 'e.g. Software Engineer', order: 3 },
        { label: 'Purpose of Visit', fieldName: 'purposeOfVisit', type: 'textarea', required: true, options: [], placeholder: 'Describe your travel plans...', order: 4 },
        { label: 'Travel Dates', fieldName: 'travelDates', type: 'text', required: true, options: [], placeholder: 'e.g. 15 Jan 2025 - 30 Jan 2025', order: 5 },
      ],
      documentRequirements: [
        { name: 'Passport Copy', description: 'Clear scan of your passport (all pages)', required: true },
        { name: 'Photograph', description: 'Recent passport-sized photograph with white background', required: true },
        { name: 'Bank Statement', description: 'Last 3 months bank statement', required: true },
        { name: 'Travel Itinerary', description: 'Planned travel itinerary or hotel bookings', required: false },
      ],
    },
    {
      country: usa!._id,
      name: 'Student Visa (F-1)',
      description: 'For students admitted to US academic institutions.',
      price: 200,
      processingDays: 30,
      formFields: [
        { label: 'Passport Number', fieldName: 'passportNumber', type: 'text', required: true, options: [], placeholder: '', order: 1 },
        { label: 'Date of Birth', fieldName: 'dateOfBirth', type: 'date', required: true, options: [], placeholder: '', order: 2 },
        { label: 'University Name', fieldName: 'universityName', type: 'text', required: true, options: [], placeholder: 'Name of the US institution', order: 3 },
        { label: 'Course Name', fieldName: 'courseName', type: 'text', required: true, options: [], placeholder: 'e.g. Master of Computer Science', order: 4 },
        { label: 'Course Start Date', fieldName: 'courseStartDate', type: 'date', required: true, options: [], placeholder: '', order: 5 },
      ],
      documentRequirements: [
        { name: 'Passport Copy', description: 'Clear scan of passport', required: true },
        { name: 'I-20 Form', description: 'Form I-20 from your university', required: true },
        { name: 'Photograph', description: 'Recent passport-sized photograph', required: true },
        { name: 'Degree Certificate', description: 'Previous degree certificate', required: true },
        { name: 'Bank Statement', description: 'Proof of financial support', required: true },
      ],
    },
    {
      country: uk!._id,
      name: 'Business Visa',
      description: 'For business meetings, conferences, and trade in the UK.',
      price: 180,
      processingDays: 10,
      formFields: [
        { label: 'Passport Number', fieldName: 'passportNumber', type: 'text', required: true, options: [], placeholder: '', order: 1 },
        { label: 'Date of Birth', fieldName: 'dateOfBirth', type: 'date', required: true, options: [], placeholder: '', order: 2 },
        { label: 'Employer Name', fieldName: 'employerName', type: 'text', required: true, options: [], placeholder: 'Your company name', order: 3 },
        { label: 'Business Purpose', fieldName: 'businessPurpose', type: 'textarea', required: true, options: [], placeholder: 'Describe your business activities in the UK', order: 4 },
        { label: 'Duration of Stay', fieldName: 'durationOfStay', type: 'select', required: true, options: ['Less than 1 week', '1-2 weeks', '2-4 weeks', '1-3 months'], placeholder: '', order: 5 },
      ],
      documentRequirements: [
        { name: 'Passport Copy', description: 'Clear scan of passport', required: true },
        { name: 'Photograph', description: 'Recent passport-sized photograph', required: true },
        { name: 'Business Invitation Letter', description: 'Invitation letter from UK host company', required: true },
        { name: 'Company Registration', description: 'Your company registration documents', required: true },
        { name: 'Bank Statement', description: 'Last 6 months business bank statement', required: true },
      ],
    },
  ];

  for (const vt of sampleVisaTypes) {
    await VisaType.findOneAndUpdate(
      { country: vt.country, name: vt.name },
      vt,
      { upsert: true, new: true }
    );
  }
  console.log('Visa types seeded');
  console.log('\nSeed completed successfully!');
  console.log(`Admin: ${process.env.ADMIN_EMAIL || 'admin@visaflow.com'} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
