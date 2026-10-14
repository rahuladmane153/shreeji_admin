module.exports = (sequelize, Sequelize) => {
  const DeviceLocation = sequelize.define(
    'device_locations',
    {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      accuracy: { type: Sequelize.FLOAT, allowNull: true },
      altitude: { type: Sequelize.FLOAT, allowNull: true },
      speed: { type: Sequelize.FLOAT, allowNull: true },
      heading: { type: Sequelize.FLOAT, allowNull: true },
      battery_level: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      // When the location was captured on the device (may be earlier than created_at for offline sync)
      recorded_at: { type: Sequelize.DATE, allowNull: false },
      is_offline_sync: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'device_locations',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [{ fields: ['device_id', 'recorded_at'] }, { fields: ['customer_id'] }],
    }
  );

  return DeviceLocation;
};
