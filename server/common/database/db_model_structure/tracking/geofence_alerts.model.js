const { GEOFENCE_EVENTS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const GeofenceAlert = sequelize.define(
    'geofence_alerts',
    {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      geofence_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      event: { type: Sequelize.ENUM(...GEOFENCE_EVENTS), allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      recorded_at: { type: Sequelize.DATE, allowNull: false },
      acknowledged_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
    },
    {
      tableName: 'geofence_alerts',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [{ fields: ['geofence_id', 'device_id'] }, { fields: ['acknowledged_at'] }],
    }
  );

  return GeofenceAlert;
};
