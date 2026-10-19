function parseContactPhones(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = { parseContactPhones };
