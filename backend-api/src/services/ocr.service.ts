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
  return str.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();
}
