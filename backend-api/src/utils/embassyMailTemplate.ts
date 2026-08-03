import { IApplication } from '../models/Application';
import { IDocument } from '../models/Document';

/**
 * Fills the saved embassy-mail template with one application's data.
 *
 * The result is plain text and lands in the composer for the admin to edit before
 * sending, so everything here is written to be readable as-is — the mail that goes out
 * is exactly the text they approved, rendered with its line breaks preserved.
 *
 * Unknown placeholders are deliberately left untouched: a typo like {{referenceID}}
 * then shows up in the draft, where it can still be fixed, rather than silently
 * vanishing from a mail already on its way to an embassy.
 */

export interface Placeholder {
  token: string;
  description: string;
}

/** Advertised to the config page, so the documented tokens are always the working ones. */
export const PLACEHOLDERS: Placeholder[] = [
  { token: 'referenceId', description: 'Application number, e.g. PRS-GEN-1234' },
  { token: 'applicantName', description: 'Name on the account that applied' },
  { token: 'applicantEmail', description: 'Applicant email address' },
  { token: 'applicantPhone', description: 'Applicant phone number' },
  { token: 'country', description: 'Destination country' },
  { token: 'visaType', description: 'Visa type applied for' },
  { token: 'travellers', description: 'e.g. 2 adults, 1 child' },
  { token: 'travelDates', description: 'Travel date, or the date range if both were given' },
  { token: 'travelDate', description: 'Travel start date only' },
  { token: 'travelEndDate', description: 'Travel end date only' },
  { token: 'adults', description: 'Number of adults' },
  { token: 'children', description: 'Number of children' },
  { token: 'embassyName', description: 'Embassy name recorded on the application' },
  { token: 'processingReference', description: 'Embassy reference number, once entered' },
  { token: 'submissionDate', description: 'Date submitted to the embassy' },
  { token: 'expectedDate', description: 'Expected decision date' },
  { token: 'formData', description: 'Every answer from the form, grouped per traveller' },
  { token: 'documentList', description: 'The documents attached to this mail' },
  { token: 'companyName', description: 'Your company name, from Receipt Config' },
  { token: 'status', description: 'Current application status' },
  { token: 'today', description: "Today's date" },
];

const TRAVELER_RE = /^(Adult \d+|Child \d+)\s*[-–—]\s*/i;

/** "Adult 1 — Full Name" → "Adult 1"; empty for answers that belong to the trip. */
function travelerOf(key: string): string {
  const m = key.match(TRAVELER_RE);
  return m ? m[1] : '';
}

function stripTraveler(key: string): string {
  return key.replace(TRAVELER_RE, '');
}

function sortTravelers(a: string, b: string): number {
  const aAdult = a.toLowerCase().startsWith('adult');
  const bAdult = b.toLowerCase().startsWith('adult');
  if (aAdult !== bAdult) return aAdult ? -1 : 1;
  return Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0);
}

/** Answers as an indented block, one group per traveller, trip-wide answers first. */
export function formatFormData(application: IApplication): string {
  const responses = application.formResponses instanceof Map
    ? Array.from(application.formResponses.entries())
    : Object.entries((application.formResponses || {}) as Record<string, string>);

  if (responses.length === 0) return '(no form answers recorded)';

  const groups = new Map<string, [string, string][]>();
  for (const [key, value] of responses) {
    const group = travelerOf(key);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push([stripTraveler(key), String(value ?? '')]);
  }

  const labelWidth = Math.max(
    ...responses.map(([k]) => stripTraveler(k).length),
    0
  );

  const order = Array.from(groups.keys()).sort((a, b) => {
    if (!a) return -1;
    if (!b) return 1;
    return sortTravelers(a, b);
  });

  return order
    .map((group) => {
      const rows = groups.get(group)!
        .map(([label, value]) => `  ${label.padEnd(labelWidth)} : ${value}`)
        .join('\n');
      return group ? `${group}\n${rows}` : rows;
    })
    .join('\n\n');
}

/** The documents going out with this mail, in the order they will be attached. */
export function formatDocumentList(documents: IDocument[]): string {
  if (documents.length === 0) return '(no documents attached)';
  return documents.map((d) => `  - ${d.requirementName}`).join('\n');
}

export function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : whole
  );
}
