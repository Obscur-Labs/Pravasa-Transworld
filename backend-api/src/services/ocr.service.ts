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

const PASSPORT_FRONT_PROMPT = `You are an expert passport OCR system specialising in Indian passports.

STRICT NAME EXTRACTION RULES — read carefully before extracting any name field:
- Indian passports print all names in CAPITAL LETTERS in English (Latin script).
- Extract ONLY the English printed text. Completely ignore any Hindi/Devanagari script — it appears next to or below the English name and must NOT be included.
- Names contain ONLY the letters A–Z and spaces. No numbers, no punctuation, no country codes, no gender codes (M/F), no 2–3 letter abbreviations.
- If you see stray 1–2 letter uppercase tokens after a name (e.g. "SHARMA FA", "KUMAR AS") those are romanised Hindi syllable fragments — strip them, return only "SHARMA" / "KUMAR".
- Do NOT copy characters from the MRZ (the two machine-readable lines at the bottom) into name fields — use MRZ only to cross-verify passport number, DOB, expiry, and sex.

Extract the following from the FRONT page and return ONLY a JSON object (no explanation):
{
  "passportNo": "one letter followed by exactly 7 digits as printed (e.g. A1234567) — verify against MRZ line 2",
  "surname": "family name in CAPITAL LETTERS, English only, letters and spaces only",
  "givenNames": "given/first/middle name(s) in CAPITAL LETTERS, English only, letters and spaces only",
  "nationality": "as printed in English (e.g. INDIAN)",
  "dateOfBirth": "DD/MM/YYYY — verify against MRZ",
  "sex": "Male or Female",
  "placeOfBirth": "city name in English",
  "placeOfIssue": "city name in English",
  "dateOfIssue": "DD/MM/YYYY",
  "dateOfExpiry": "DD/MM/YYYY — verify against MRZ",
  "rawText": "all readable English text including both MRZ lines"
}`;

const PASSPORT_BACK_PROMPT = `You are an expert passport OCR system specialising in Indian passports.

STRICT NAME EXTRACTION RULES — read carefully before extracting any name field:
- Indian passports print all names in CAPITAL LETTERS in English (Latin script).
- Extract ONLY the English printed text. Completely ignore any Hindi/Devanagari script that appears near the name — do NOT include it.
- Names contain ONLY the letters A–Z and spaces. No numbers, no codes, no abbreviations.
- If you see stray 1–2 letter uppercase tokens after a name (e.g. "DEVI FA", "LAL AS") those are romanised Hindi fragments — strip them entirely.

Extract the following from the BACK page and return ONLY a JSON object (no explanation):
{
  "fatherName": "father/legal guardian full name — CAPITAL LETTERS, English only, letters and spaces only",
  "motherName": "mother full name — CAPITAL LETTERS, English only, letters and spaces only",
  "spouseName": "spouse name if present — CAPITAL LETTERS, English only, letters and spaces only; omit if not present",
  "address": "full residential address exactly as printed in English",
  "rawText": "all readable English text from this page"
}`;

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
    const surname = str(json.surname) ? cleanPassportName(json.surname) : '';
    if (surname) fields['Surname'] = titleCase(surname);
    const givenNames = str(json.givenNames) ? cleanPassportName(json.givenNames) : '';
    if (givenNames) fields['Given Name(s)'] = titleCase(givenNames);
    if (str(json.nationality)) fields['Nationality'] = titleCase(json.nationality);
    if (str(json.dateOfBirth)) fields['Date of Birth'] = json.dateOfBirth.trim();
    if (str(json.sex)) fields['Sex'] = normalizeSex(json.sex);
    if (str(json.placeOfBirth)) fields['Place of Birth'] = titleCase(json.placeOfBirth);
    if (str(json.placeOfIssue)) fields['Place of Issue'] = titleCase(json.placeOfIssue);
    if (str(json.dateOfIssue)) fields['Date of Issue'] = json.dateOfIssue.trim();
    if (str(json.dateOfExpiry)) fields['Date of Expiry'] = json.dateOfExpiry.trim();
  } else {
    const fatherName = str(json.fatherName) ? cleanPassportName(json.fatherName) : '';
    if (fatherName) fields['Father / Legal Guardian'] = titleCase(fatherName);
    const motherName = str(json.motherName) ? cleanPassportName(json.motherName) : '';
    if (motherName) fields['Mother'] = titleCase(motherName);
    const spouseName = str(json.spouseName) ? cleanPassportName(json.spouseName) : '';
    if (spouseName) fields['Spouse'] = titleCase(spouseName);
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

// Strips artifacts that commonly appear in Indian passport OCR:
// - Non-ASCII characters (romanised Devanagari fragments, e.g. "ā", "ī")
// - Any character that is not a Latin letter, space, hyphen, or apostrophe
// - Trailing 1–2 letter uppercase tokens ("FA", "AS", "M", "S" etc.) that are
//   Hindi syllable remnants or stray label abbreviations
function cleanPassportName(raw: string): string {
  // Drop non-ASCII (Devanagari leaking through vision model)
  let s = raw.replace(/[^\x00-\x7F]/g, ' ');
  // Keep only valid name characters
  s = s.replace(/[^A-Za-z '\-]/g, ' ');
  // Collapse whitespace
  s = s.trim().replace(/\s+/g, ' ');
  // Repeatedly strip trailing 1–2 letter tokens (handles "NAME FA AS")
  s = s.replace(/(\s+[A-Z]{1,2})+$/g, '').trim();
  // Strip leading 1–2 letter tokens too
  s = s.replace(/^([A-Z]{1,2}\s+)+/g, '').trim();
  return s;
}
