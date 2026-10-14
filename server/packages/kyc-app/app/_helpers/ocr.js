/**
 * Parses the text recognised from a KYC document photo into structured fields.
 *
 * The mobile app runs on-device OCR (Google ML Kit) and uploads the raw text
 * with the image. Parsing lives here so the rules are in one place and the
 * server decides what was extracted. To switch to a server-side OCR provider,
 * produce `rawText` from the image instead and keep these parsers.
 */

// Lines on Aadhaar / PAN cards that are labels or boilerplate, never a name
const NOT_A_NAME = /\b(GOVERNMENT|GOVT|INDIA|INCOME|TAX|DEPARTMENT|PERMANENT|ACCOUNT|NUMBER|CARD|SIGNATURE|DOB|BIRTH|YEAR|MALE|FEMALE|TRANSGENDER|AADHAAR|AADHAR|UNIQUE|IDENTIFICATION|AUTHORITY|ENROLMENT|ENROLLMENT|ISSUE|DOWNLOAD|ADDRESS|VID|HELP|WWW|UIDAI|FATHER|NAME|MERA|PEHCHAAN|DATE)\b/i;

const splitLines = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

/** A line that looks like a person's name in Latin script. */
const isNameLine = (line) =>
  /^[A-Za-z][A-Za-z .']{2,60}$/.test(line) && /[A-Za-z]{2,}/.test(line) && !NOT_A_NAME.test(line);

const titleCase = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();

/** dd/mm/yyyy (also - or .) -> yyyy-mm-dd, validated as a real date. */
function toIsoDate(d, m, y) {
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) return null;
  if (Number(y) < 1900 || dt > new Date()) return null;
  return iso;
}

function findDob(text) {
  const labelled = text.match(/(?:DOB|D0B|Date\s*of\s*Birth|Birth)\s*[:\-]?\s*(\d{2})\s*[/\-.]\s*(\d{2})\s*[/\-.]\s*(\d{4})/i);
  const any = labelled || text.match(/\b(\d{2})\s*[/\-.]\s*(\d{2})\s*[/\-.]\s*(\d{4})\b/);
  if (any) {
    const iso = toIsoDate(any[1], any[2], any[3]);
    if (iso) return { dob: iso, yob: Number(any[3]) };
  }
  const yob = text.match(/(?:Year\s*of\s*Birth|YOB)\s*[:\-]?\s*(\d{4})/i);
  return yob ? { dob: null, yob: Number(yob[1]) } : { dob: null, yob: null };
}

function findGender(text) {
  const g = text.match(/\b(FEMALE|MALE|TRANSGENDER)\b/i);
  return g ? g[1].toLowerCase() : null;
}

// ---- Aadhaar number (Verhoeff checksum, as used by UIDAI) ----
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function isValidAadhaar(num) {
  if (!/^[2-9]\d{11}$/.test(num)) return false;
  let c = 0;
  num.split('').reverse().forEach((ch, i) => {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(ch)]];
  });
  return c === 0;
}

/** Finds the 12 digit Aadhaar number, skipping the 16 digit VID. */
function findAadhaar(lines) {
  const candidates = [];
  let last4 = null;
  for (const line of lines) {
    if (/\bVID\b/i.test(line)) continue;
    for (const m of line.matchAll(/(?<![\d])(\d{4})\s?(\d{4})\s?(\d{4})(?!\s?\d)/g)) {
      candidates.push(m[1] + m[2] + m[3]);
    }
    const masked = line.match(/[Xx*]{4}\s?[Xx*]{4}\s?(\d{4})(?!\d)/);
    if (masked) last4 = masked[1];
  }
  const number = candidates.find(isValidAadhaar) || candidates[0] || null;
  return {
    aadhaar_number: number,
    aadhaar_last4: number ? number.slice(-4) : last4,
    aadhaar_checksum_valid: number ? isValidAadhaar(number) : null,
  };
}

// ---- Parsers per document type ----

function parseAadhaarFront(text) {
  const lines = splitLines(text);
  const { dob, yob } = findDob(text);

  // The name sits just above the DOB / Year of Birth line
  let name = null;
  const dobIdx = lines.findIndex((l) => /(DOB|D0B|Birth|YOB)/i.test(l));
  if (dobIdx > 0) {
    for (let i = dobIdx - 1; i >= Math.max(0, dobIdx - 3) && !name; i -= 1) {
      if (isNameLine(lines[i])) name = lines[i];
    }
  }
  if (!name) name = lines.find(isNameLine) || null;

  return {
    name: name ? titleCase(name) : null,
    dob,
    yob,
    gender: findGender(text),
    ...findAadhaar(lines),
  };
}

function parseAadhaarBack(text) {
  const lines = splitLines(text);
  let address = null;
  const start = lines.findIndex((l) => /^address\b/i.test(l) || /\b(S\/O|D\/O|W\/O|C\/O)\b/i.test(l));
  if (start >= 0) {
    const parts = [];
    for (let i = start; i < lines.length && parts.length < 8; i += 1) {
      const line = lines[i].replace(/^address\s*[:\-]?\s*/i, '');
      if (/uidai|www\.|help@|^\d{4}\s?\d{4}\s?\d{4}$/i.test(line)) break;
      // Keep only Latin-script content (the Hindi copy of the address is skipped)
      if (line && /[A-Za-z0-9]/.test(line) && /^[\x20-\x7E]+$/.test(line)) parts.push(line);
      if (/\b\d{6}\b/.test(line)) break;
    }
    address = parts.join(', ').replace(/\s*,\s*,+/g, ',').replace(/,\s*$/, '').trim() || null;
  }
  const pin = (address || text).match(/\b(\d{6})\b/);
  const careOf = text.match(/\b(?:S\/O|D\/O|W\/O|C\/O)\s*[:\-]?\s*([A-Za-z .]{3,60}?)(?:,|\n|$)/i);

  return {
    address,
    pincode: pin ? pin[1] : null,
    care_of: careOf ? titleCase(careOf[1]) : null,
    ...findAadhaar(lines),
  };
}

/** Repairs common OCR confusions in a PAN-shaped token (AAAAA9999A). */
function fixPan(token) {
  if (token.length !== 10) return null;
  const toLetter = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 8: 'B' };
  const toDigit = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
  const chars = token.toUpperCase().split('').map((ch, i) =>
    i >= 5 && i <= 8 ? (toDigit[ch] || ch) : (toLetter[ch] || ch)
  );
  const pan = chars.join('');
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan) ? pan : null;
}

function parsePan(text) {
  const lines = splitLines(text);
  let pan = null;
  for (const token of text.split(/[^A-Za-z0-9]+/)) {
    pan = fixPan(token);
    if (pan) break;
  }

  // New format: "Name" / "Father's Name" labels with the value on the next line
  const valueAfter = (re) => {
    const idx = lines.findIndex((l) => re.test(l));
    if (idx < 0) return null;
    for (let i = idx + 1; i < Math.min(lines.length, idx + 3); i += 1) {
      if (isNameLine(lines[i])) return lines[i];
    }
    return null;
  };
  let name = valueAfter(/(^|\/)\s*name\b/i);
  let father = valueAfter(/father/i);

  // Old format: name and father's name are the first name-like lines under the header
  if (!name) {
    const header = lines.findIndex((l) => /GOVT|INDIA/i.test(l));
    const names = lines.slice(header + 1).filter(isNameLine);
    [name, father] = [names[0] || null, father || names[1] || null];
  }

  const { dob } = findDob(text);
  return {
    pan_number: pan,
    name: name ? titleCase(name) : null,
    father_name: father ? titleCase(father) : null,
    dob,
  };
}

function parseAddressProof(text) {
  const lines = splitLines(text).filter((l) => /^[\x20-\x7E]+$/.test(l));
  const pin = text.match(/\b(\d{6})\b/);
  return { address: lines.slice(-4).join(', ') || null, pincode: pin ? pin[1] : null };
}

const PARSERS = {
  aadhaar_front: parseAadhaarFront,
  aadhaar_back: parseAadhaarBack,
  pan: parsePan,
  address_proof: parseAddressProof,
};

/** Extracts structured fields for a document from its recognised text. */
function extractFromDocument(docType, rawText) {
  const parser = PARSERS[docType];
  if (!parser) return { fields: {}, found: 0, total: 0 };
  if (!rawText || !rawText.trim()) {
    return { fields: {}, found: 0, total: 0, note: 'No text could be read from the image' };
  }
  const fields = parser(rawText);
  const keys = Object.keys(fields).filter((k) => k !== 'aadhaar_checksum_valid' && k !== 'yob');
  return { fields, found: keys.filter((k) => fields[k]).length, total: keys.length };
}

module.exports = { extractFromDocument, isValidAadhaar };
