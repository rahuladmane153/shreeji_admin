module.exports = (sequelize, Sequelize) => {
  const DeviceHeartbeat = sequelize.define(
    'device_heartbeats',
    {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      battery_level: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      is_charging: { type: Sequelize.BOOLEAN, allowNull: true },
      network_type: { type: Sequelize.STRING(20), allowNull: true },
      app_version: { type: Sequelize.STRING(50), allowNull: true },
      admin_active: { type: Sequelize.BOOLEAN, allowNull: true },
      location_permission: { type: Sequelize.STRING(20), allowNull: true },
    },
    {
      tableName: 'device_heartbeats',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [{ fields: ['device_id', 'created_at'] }],
    }
  );

  return DeviceHeartbeat;
};
