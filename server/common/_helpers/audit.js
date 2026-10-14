/**
 * Writes an audit log row. Never throws - auditing must not break the request.
 * @param {object} AuditLog  Sequelize model (db.audit_logs)
 */
async function writeAudit(AuditLog, { actor, action, entity, description, meta, service, req }) {
  try {
    await AuditLog.create({
      actor_type: actor?.type || 'system',
      actor_id: actor?.id || null,
      actor_name: actor?.name || null,
      action,
      entity_type: entity?.type || null,
      entity_id: entity?.id != null ? String(entity.id) : null,
      description: description || null,
      meta: meta || null,
      service: service || null,
      ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      user_agent: req?.headers?.['user-agent']?.slice(0, 255) || null,
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
  }
}

module.exports = { writeAudit };
