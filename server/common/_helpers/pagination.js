/** Normalises page/limit query params and returns Sequelize limit/offset. */
function getPaging(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

function buildMeta(count, page, limit) {
  return { total: count, page, limit, total_pages: Math.ceil(count / limit) || 1 };
}

module.exports = { getPaging, buildMeta };
