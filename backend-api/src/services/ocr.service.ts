import Tesseract from 'tesseract.js';

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

export async function extractFromDocument(buffer: Buffer): Promise<ExtractedDocumentData> {
  const { data } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {},
  });

  const text = data.text;
  const confidence = data.confidence;
  return { ...parseDocumentText(text), rawText: text, confidence };
}

function parseDocumentText(text: string): Omit<ExtractedDocumentData, 'rawText' | 'confidence'> {
  const result: Omit<ExtractedDocumentData, 'rawText' | 'confidence'> = {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Name: look for "Name" label or all-caps consecutive words
  const nameLabel = text.match(/(?:Name|NAME|Surname|Given Names?)[:\s]+([A-Za-z ]{4,40})/i);
  if (nameLabel) result.name = titleCase(nameLabel[1].trim());

  // Date of birth
  const dobMatch = text.match(
    /(?:DOB|Date of Birth|Birth Date|D\.O\.B)[:\s]+(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}|\d{2} [A-Za-z]{3} \d{4})/i
  );
  if (dobMatch) result.dateOfBirth = dobMatch[1].trim();

  // Passport number: letter + 7 digits
  const passportMatch = text.match(/\b([A-Z]\d{7})\b/);
  if (passportMatch) result.documentNumber = passportMatch[1];

  // Aadhar number: 12 digits (may be spaced)
  const aadharMatch = text.match(/\b(\d{4}[\s]?\d{4}[\s]?\d{4})\b/);
  if (!result.documentNumber && aadharMatch) {
    result.documentNumber = aadharMatch[1].replace(/\s/g, '');
  }

  // PAN number: 5 letters + 4 digits + 1 letter
  const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (!result.documentNumber && panMatch) result.documentNumber = panMatch[1];

  // Nationality
  const natMatch = text.match(/(?:Nationality|Citizenship)[:\s]+([A-Za-z]+)/i);
  if (natMatch) result.nationality = titleCase(natMatch[1]);

  // Expiry date
  const expiryMatch = text.match(
    /(?:Expiry|Expiration|Valid Until|Date of Expiry)[:\s]+(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}|\d{2} [A-Za-z]{3} \d{4})/i
  );
  if (expiryMatch) result.expiryDate = expiryMatch[1].trim();

  // Father's name (Aadhar specific)
  const fatherMatch = text.match(/(?:Father'?s? Name|S\/O|D\/O)[:\s]+([A-Za-z ]{4,40})/i);
  if (fatherMatch) result.fatherName = titleCase(fatherMatch[1].trim());

  // Address (look for multi-word address pattern)
  const addressMatch = text.match(/(?:Address|Addr)[:\s]+(.{10,100})/i);
  if (addressMatch) result.address = addressMatch[1].trim();

  return result;
}

function titleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();
}

// ── Passport-specific extraction ──────────────────────────────────────────
// Returns the fields keyed by their display label so the UI can render them
// directly. Tesseract output on phone photos is imperfect, so every field is
// best-effort: a missing field is simply omitted.

export interface PassportExtraction {
  fields: Record<string, string>;
  rawText: string;
  confidence: number;
}

const DATE_RE = /(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/;

export async function extractPassport(buffer: Buffer, side: 'front' | 'back'): Promise<PassportExtraction> {
  const { data } = await Tesseract.recognize(buffer, 'eng', { logger: () => {} });
  const text = data.text || '';
  const fields = side === 'back' ? parsePassportBack(text) : parsePassportFront(text);
  return { fields, rawText: text, confidence: data.confidence };
}

// Indian passports print the label and value on SEPARATE lines, with bilingual
// (Hindi/English) labels — so we work line-by-line: find a label line, take the
// next usable line as its value. The machine-readable zone (MRZ) is a reliable
// cross-check for names, number, nationality, DOB and sex.

const LABEL_RE = /name of|surname|given|date of|place of|nationality|\btype\b|\bcode\b|passport|emigration|file no|old passport|address|republic|guardian|mother|spouse|father/i;

function cleanName(s: string): string {
  return (s || '').replace(/[^A-Za-z .]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function toLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

// The first value-looking line after the label index (skips other label lines).
function valueAfter(lines: string[], idx: number, accept: (l: string) => boolean): string | undefined {
  for (let j = idx + 1; j < Math.min(lines.length, idx + 4); j++) {
    const l = lines[j];
    if (accept(l)) return l;
  }
  return undefined;
}

function findLabel(lines: string[], re: RegExp): number {
  return lines.findIndex((l) => re.test(l));
}

function fmtDate(d: string, m: string, y: string): string {
  const yr = y.length === 2 ? (Number(y) <= (new Date().getFullYear() % 100) + 1 ? `20${y}` : `19${y}`) : y;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${yr}`;
}

function mrzDate(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = yymmdd.slice(0, 2), mm = yymmdd.slice(2, 4), dd = yymmdd.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return undefined;
  return fmtDate(dd, mm, yy);
}

interface Mrz { surname?: string; given?: string; passportNo?: string; nationality?: string; dob?: string; sex?: string; expiry?: string; }

function parseMrz(rawLines: string[]): Mrz {
  const out: Mrz = {};
  const mrz = rawLines
    .map((l) => l.replace(/\s/g, '').toUpperCase())
    .filter((l) => l.length >= 20 && /^[A-Z0-9<]+$/.test(l) && (l.match(/</g) || []).length >= 3);

  const l1 = mrz.find((l) => /^P[<K]/.test(l));
  if (l1) {
    let b = l1.replace(/^P[<K]/, '').replace(/^IND/, '').replace(/^<+/, '');
    const parts = b.split('<<');
    const surname = (parts[0] || '').replace(/</g, ' ').trim();
    const given = (parts[1] || '').replace(/</g, ' ').trim();
    if (surname) out.surname = surname;
    if (given) out.given = given;
  }

  const l2 = mrz.find((l) => /^[A-Z0-9<]{9}\d?[A-Z]{3}\d{6}/.test(l));
  if (l2) {
    const m = l2.match(/^([A-Z0-9<]{9})\d?([A-Z]{3})(\d{6})\d?([MFX<])(\d{6})/);
    if (m) {
      const num = m[1].replace(/</g, '');
      if (/^[A-Z][0-9]{6,8}$/.test(num)) out.passportNo = num;
      out.nationality = m[2];
      const dob = mrzDate(m[3]); if (dob) out.dob = dob;
      if (m[4] === 'M' || m[4] === 'F') out.sex = m[4];
      const exp = mrzDate(m[5]); if (exp) out.expiry = exp;
    }
  }
  return out;
}

const NATIONALITY: Record<string, string> = { IND: 'Indian' };

function parsePassportFront(text: string): Record<string, string> {
  const f: Record<string, string> = {};
  const lines = toLines(text);
  const joined = lines.join('\n');
  const mrz = parseMrz(lines);

  const isName = (l: string) => !LABEL_RE.test(l) && /[A-Za-z]/.test(cleanName(l)) && cleanName(l).length >= 2;
  const hasDate = (l: string) => DATE_RE.test(l);

  // Passport No. — printed token (letter + 7 digits), else MRZ.
  const pp = joined.match(/\b([A-PR-WYZ][0-9]{7})\b/);
  if (pp) f['Passport No.'] = pp[1].toUpperCase();
  else if (mrz.passportNo) f['Passport No.'] = mrz.passportNo;

  // Surname / Given names — value line beneath the label; MRZ as fallback.
  let i = findLabel(lines, /surname/i);
  let v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Surname'] = titleCase(cleanName(v));
  else if (mrz.surname) f['Surname'] = titleCase(mrz.surname);

  i = findLabel(lines, /given\s*name/i);
  v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Given Name(s)'] = titleCase(cleanName(v));
  else if (mrz.given) f['Given Name(s)'] = titleCase(mrz.given);

  // Nationality
  if (/\bINDIAN\b/i.test(joined)) f['Nationality'] = 'Indian';
  else if (mrz.nationality) f['Nationality'] = NATIONALITY[mrz.nationality] || titleCase(mrz.nationality);

  // Date of Birth (+ Sex, often on the same value line)
  i = findLabel(lines, /date of birth/i);
  const dobLine = i >= 0 ? valueAfter(lines, i, hasDate) : undefined;
  if (dobLine) {
    const m = dobLine.match(DATE_RE); if (m) f['Date of Birth'] = fmtDate(m[1], m[2], m[3]);
    const s = dobLine.match(/\b([MF])\b/); if (s) f['Sex'] = s[1] === 'M' ? 'Male' : 'Female';
  } else if (mrz.dob) f['Date of Birth'] = mrz.dob;

  if (!f['Sex']) {
    i = findLabel(lines, /\bsex\b|\bgender\b/i);
    const sl = i >= 0 ? valueAfter(lines, i, (l) => /\b[MF]\b|male|female/i.test(l)) : undefined;
    const s = (sl || '').match(/\b(male|female|m|f)\b/i);
    if (s) f['Sex'] = /^m/i.test(s[1]) ? 'Male' : 'Female';
    else if (mrz.sex) f['Sex'] = mrz.sex === 'M' ? 'Male' : 'Female';
  }

  // Place of Birth / Place of Issue
  i = findLabel(lines, /place of birth/i);
  v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Place of Birth'] = titleCase(v.replace(/[^A-Za-z ,]+/g, ' ').replace(/\s+/g, ' ').trim());

  i = findLabel(lines, /place of issue/i);
  v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Place of Issue'] = titleCase(v.replace(/[^A-Za-z ,]+/g, ' ').replace(/\s+/g, ' ').trim());

  // Date of Issue / Date of Expiry — usually the same value line carries both.
  i = findLabel(lines, /date of issue/i);
  const issLine = i >= 0 ? valueAfter(lines, i, hasDate) : undefined;
  if (issLine) {
    const dates = issLine.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/g) || [];
    if (dates[0]) { const m = dates[0].match(DATE_RE)!; f['Date of Issue'] = fmtDate(m[1], m[2], m[3]); }
    if (dates[1]) { const m = dates[1].match(DATE_RE)!; f['Date of Expiry'] = fmtDate(m[1], m[2], m[3]); }
  }
  if (!f['Date of Expiry']) {
    i = findLabel(lines, /date of expiry|expiry|valid until/i);
    const exLine = i >= 0 ? valueAfter(lines, i, hasDate) : undefined;
    const m = (exLine || '').match(DATE_RE);
    if (m) f['Date of Expiry'] = fmtDate(m[1], m[2], m[3]);
    else if (mrz.expiry) f['Date of Expiry'] = mrz.expiry;
  }

  return f;
}

function parsePassportBack(text: string): Record<string, string> {
  const f: Record<string, string> = {};
  const lines = toLines(text);
  const isName = (l: string) => !LABEL_RE.test(l) && cleanName(l).length >= 2;

  let i = findLabel(lines, /name of father|legal guardian/i);
  let v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Father / Legal Guardian'] = titleCase(cleanName(v));

  i = findLabel(lines, /name of mother|\bmother\b/i);
  v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Mother'] = titleCase(cleanName(v));

  i = findLabel(lines, /name of spouse|\bspouse\b|husband|wife/i);
  v = i >= 0 ? valueAfter(lines, i, isName) : undefined;
  if (v) f['Spouse'] = titleCase(cleanName(v));

  // Address: collect lines after the "Address" label until the next section
  // (old passport / file no / MRZ). Keeps digits, commas and PIN codes.
  i = findLabel(lines, /\baddress\b/i);
  if (i >= 0) {
    const parts: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/old passport|file no|date and place|^P[<K]|^[A-Z0-9<]{20,}$/i.test(l)) break;
      const cleaned = l.replace(/[^A-Za-z0-9 ,.\-\/:]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned && /[A-Za-z0-9]/.test(cleaned)) parts.push(cleaned);
      if (parts.length >= 4) break;
    }
    const addr = parts.join(', ').replace(/\s*,\s*,+/g, ', ').replace(/,\s*$/, '').trim();
    if (addr) f['Address'] = addr;
  }

  return f;
}
