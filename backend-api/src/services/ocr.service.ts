import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// llama-4-scout is the best free vision model on Groq as of 2025
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface ExtractedDocumentData {
  name?: string;
  dateOfBirth?: string;
  documentNumber?: string;
  nationality?: string;
  expiryDate?: string;
  address?: string;
  fatherName?: string;
  rawText: string;
  confidence: number;
}

export interface PassportExtraction {
  fields: Record<string, string>;
  rawText: string;
  confidence: number;
}

function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

async function callGroqVision(imageBuffer: Buffer, prompt: string): Promise<string> {
  const base64 = imageBuffer.toString('base64');
  const mimeType = detectMimeType(imageBuffer);

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || '';
}

function extractJSON(text: string): Record<string, any> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function str(val: unknown): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const s = val.trim();
  return s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'n/a' ? s : undefined;
}

function confidenceFromFields(fields: Record<string, string>): number {
  const total = Object.keys(fields).length;
  return total === 0 ? 0 : Math.min(95, 60 + total * 5);
}

// ── General document OCR (Aadhar, PAN, Passport) ─────────────────────────────

const GENERAL_PROMPT = `You are an expert OCR system for Indian identity documents.
Examine this document image carefully and extract all visible information.
The document may be an Aadhar card, PAN card, passport, or similar ID.

Return ONLY a JSON object with these fields (omit any field you cannot read):
{
  "name": "full name as printed",
  "dateOfBirth": "date in DD/MM/YYYY format",
  "documentNumber": "the main ID number (Aadhar: 12 digits, PAN: 10 chars, Passport: letter+7 digits)",
  "nationality": "nationality if printed",
  "expiryDate": "expiry date in DD/MM/YYYY if present",
  "address": "full address if present",
  "fatherName": "father or guardian name if present",
  "rawText": "all readable text from the document concatenated"
}
Return ONLY the JSON, no explanation.`;

export async function extractFromDocument(buffer: Buffer): Promise<ExtractedDocumentData> {
  const raw = await callGroqVision(buffer, GENERAL_PROMPT);
  const json = extractJSON(raw);

  if (!json) {
    return { rawText: raw, confidence: 0 };
  }

  const result: ExtractedDocumentData = {
    rawText: str(json.rawText) || raw,
    confidence: confidenceFromFields(json),
  };

  if (str(json.name)) result.name = json.name.trim();
  if (str(json.dateOfBirth)) result.dateOfBirth = json.dateOfBirth.trim();
  if (str(json.documentNumber)) result.documentNumber = json.documentNumber.trim();
  if (str(json.nationality)) result.nationality = json.nationality.trim();
  if (str(json.expiryDate)) result.expiryDate = json.expiryDate.trim();
  if (str(json.address)) result.address = json.address.trim();
  if (str(json.fatherName)) result.fatherName = json.fatherName.trim();

  return result;
}

// ── Passport-specific OCR ─────────────────────────────────────────────────────

const PASSPORT_FRONT_PROMPT = `You are an expert passport OCR system.
This is the FRONT page of an Indian passport. Extract all visible fields carefully.
Also read the Machine Readable Zone (MRZ) — two lines of uppercase letters and digits at the bottom — to cross-verify and fill any unclear fields.

Return ONLY a JSON object:
{
  "passportNo": "letter followed by 7 digits (e.g. A1234567)",
  "surname": "family/last name",
  "givenNames": "first and middle names",
  "nationality": "as printed (e.g. INDIAN)",
  "dateOfBirth": "DD/MM/YYYY",
  "sex": "Male or Female",
  "placeOfBirth": "city name",
  "placeOfIssue": "city name",
  "dateOfIssue": "DD/MM/YYYY",
  "dateOfExpiry": "DD/MM/YYYY",
  "rawText": "all readable text including MRZ lines"
}
Return ONLY the JSON, no explanation.`;

const PASSPORT_BACK_PROMPT = `You are an expert passport OCR system.
This is the BACK page of an Indian passport. Extract all visible fields carefully.

Return ONLY a JSON object:
{
  "fatherName": "father or legal guardian full name",
  "motherName": "mother's full name",
  "spouseName": "spouse name if present",
  "address": "full residential address as printed",
  "rawText": "all readable text from this page"
}
Return ONLY the JSON, no explanation.`;

export async function extractPassport(buffer: Buffer, side: 'front' | 'back'): Promise<PassportExtraction> {
  const prompt = side === 'front' ? PASSPORT_FRONT_PROMPT : PASSPORT_BACK_PROMPT;
  const raw = await callGroqVision(buffer, prompt);
  const json = extractJSON(raw);

  if (!json) {
    return { fields: {}, rawText: raw, confidence: 0 };
  }

  const fields: Record<string, string> = {};

  if (side === 'front') {
    if (str(json.passportNo)) fields['Passport No.'] = json.passportNo.trim().toUpperCase();
    if (str(json.surname)) fields['Surname'] = titleCase(json.surname);
    if (str(json.givenNames)) fields['Given Name(s)'] = titleCase(json.givenNames);
    if (str(json.nationality)) fields['Nationality'] = titleCase(json.nationality);
    if (str(json.dateOfBirth)) fields['Date of Birth'] = json.dateOfBirth.trim();
    if (str(json.sex)) fields['Sex'] = normalizeSex(json.sex);
    if (str(json.placeOfBirth)) fields['Place of Birth'] = titleCase(json.placeOfBirth);
    if (str(json.placeOfIssue)) fields['Place of Issue'] = titleCase(json.placeOfIssue);
    if (str(json.dateOfIssue)) fields['Date of Issue'] = json.dateOfIssue.trim();
    if (str(json.dateOfExpiry)) fields['Date of Expiry'] = json.dateOfExpiry.trim();
  } else {
    if (str(json.fatherName)) fields['Father / Legal Guardian'] = titleCase(json.fatherName);
    if (str(json.motherName)) fields['Mother'] = titleCase(json.motherName);
    if (str(json.spouseName)) fields['Spouse'] = titleCase(json.spouseName);
    if (str(json.address)) fields['Address'] = json.address.trim();
  }

  const rawText = str(json.rawText) || raw;
  return { fields, rawText, confidence: confidenceFromFields(fields) };
}

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ');
}

function normalizeSex(s: string): string {
  return /^m/i.test(s.trim()) ? 'Male' : 'Female';
}
