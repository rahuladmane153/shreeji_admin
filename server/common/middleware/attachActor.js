/** Builds req.admin / req.customer from the verified JWT payload. */
function attachAdmin(req, res, next) {
  req.admin = { id: req.auth.sub, uuid: req.auth.uuid, role: req.auth.role, name: req.auth.name || null };
  next();
}

function attachCustomer(req, res, next) {
  req.customer = { id: req.auth.sub, uuid: req.auth.uuid };
  next();
}

module.exports = { attachAdmin, attachCustomer };
