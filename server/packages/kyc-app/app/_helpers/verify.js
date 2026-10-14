/**
 * Cross-checks the details extracted from the customer's documents against
 * each other and against what the customer entered at registration.
 *
 * Each check is { key, label, status, detail } where status is one of:
 *   pass    - details agree
 *   warn    - partial match, likely OCR noise or a name variant; admin should look
 *   fail    - details disagree
 *   pending - the documents needed for this check are not uploaded/read yet
 */

const normalizeName = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Tokens match exactly, as an initial ("R" vs "RAHUL"), or within one OCR typo. */
const tokenMatches = (x, y) =>
  x === y ||
  (x.length === 1 && y.startsWith(x)) ||
  (y.length === 1 && x.startsWith(y)) ||
  (Math.min(x.length, y.length) >= 4 && levenshtein(x, y) <= 1);

/**
 * Compares two names token by token. Every token of the shorter name must be
 * found in the longer one for a pass, so "Rahul Admane" matches
 * "Rahul Ramesh Admane" (middle name on the card).
 */
function compareNames(a, b) {
  const ta = normalizeName(a).split(' ').filter(Boolean);
  const tb = normalizeName(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return null;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const matched = short.filter((t) => long.some((u) => tokenMatches(t, u))).length;
  const ratio = matched / short.length;
  if (ratio === 1) return 'pass';
  return ratio >= 0.5 ? 'warn' : 'fail';
}

const check = (key, label, status, detail) => ({ key, label, status, detail });

function nameCheck(key, label, a, aLabel, b, bLabel) {
  if (!a || !b) return check(key, label, 'pending', `Waiting for ${!a ? aLabel : bLabel}`);
  const status = compareNames(a, b);
  const detail = status === 'pass' ? `"${a}" matches "${b}"` : `${aLabel} "${a}" vs ${bLabel} "${b}"`;
  return check(key, label, status, detail);
}

/**
 * @param {object} registered  { full_name }
 * @param {object} docs        doc_type -> extracted fields
 *                             (aadhaar_front, aadhaar_back, pan)
 */
function verifyDocuments(registered, docs) {
  const front = docs.aadhaar_front || {};
  const back = docs.aadhaar_back || {};
  const pan = docs.pan || {};
  const checks = [];

  checks.push(nameCheck('aadhaar_name', 'Aadhaar name matches registration',
    front.name, 'Aadhaar name', registered.full_name, 'registered name'));
  checks.push(nameCheck('pan_name', 'PAN name matches registration',
    pan.name, 'PAN name', registered.full_name, 'registered name'));
  checks.push(nameCheck('pan_aadhaar_name', 'PAN name matches Aadhaar',
    pan.name, 'PAN name', front.name, 'Aadhaar name'));

  // Date of birth on Aadhaar vs PAN (Aadhaar may only carry the year of birth)
  if (pan.dob && (front.dob || front.yob)) {
    const same = front.dob ? front.dob === pan.dob : Number(pan.dob.slice(0, 4)) === front.yob;
    checks.push(check('dob', 'Date of birth matches on Aadhaar and PAN', same ? 'pass' : 'fail',
      same ? pan.dob : `Aadhaar ${front.dob || front.yob} vs PAN ${pan.dob}`));
  } else {
    checks.push(check('dob', 'Date of birth matches on Aadhaar and PAN', 'pending',
      'Waiting for date of birth on both documents'));
  }

  // Aadhaar number must pass the UIDAI Verhoeff checksum
  if (front.aadhaar_last4) {
    const valid = front.aadhaar_checksum_valid;
    checks.push(check('aadhaar_number', 'Aadhaar number is valid',
      valid === true ? 'pass' : valid === false ? 'fail' : 'warn',
      valid === true ? `XXXX XXXX ${front.aadhaar_last4}`
        : valid === false ? 'Number read from the card failed the checksum - retake the photo or correct it on review'
          : 'Only the masked number could be read'));
  } else {
    checks.push(check('aadhaar_number', 'Aadhaar number is valid', 'pending', 'Waiting for Aadhaar front'));
  }

  // Front and back must belong to the same card
  if (front.aadhaar_last4 && back.aadhaar_last4) {
    const same = front.aadhaar_hash && back.aadhaar_hash
      ? front.aadhaar_hash === back.aadhaar_hash
      : front.aadhaar_last4 === back.aadhaar_last4;
    checks.push(check('aadhaar_front_back', 'Aadhaar front and back are the same card', same ? 'pass' : 'fail',
      same ? 'Numbers on both sides match' : 'Numbers on front and back differ'));
  } else {
    checks.push(check('aadhaar_front_back', 'Aadhaar front and back are the same card', 'pending',
      'Waiting for the number on both sides'));
  }

  // PAN: 4th char "P" = individual; 5th char = first letter of the surname
  if (pan.pan_number) {
    const surname = normalizeName(front.name || registered.full_name).split(' ').pop();
    const individual = pan.pan_number[3] === 'P';
    const initialOk = !surname || pan.pan_number[4] === surname[0];
    checks.push(check('pan_number', 'PAN belongs to this individual',
      individual && initialOk ? 'pass' : individual ? 'warn' : 'fail',
      !individual ? 'PAN is not an individual PAN (4th character is not P)'
        : !initialOk ? `5th character "${pan.pan_number[4]}" does not match surname initial "${surname[0]}"`
          : pan.pan_number));
  } else {
    checks.push(check('pan_number', 'PAN belongs to this individual', 'pending', 'Waiting for PAN card'));
  }

  const counts = checks.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
  const overall = counts.fail ? 'mismatch' : counts.warn ? 'needs_review' : counts.pending ? 'incomplete' : 'verified';
  return { overall, counts, checks, verified_at: new Date().toISOString() };
}

module.exports = { verifyDocuments, compareNames };
