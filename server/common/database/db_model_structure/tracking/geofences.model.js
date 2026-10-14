const { GEOFENCE_ALERT_ON } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const Geofence = sequelize.define(
    'geofences',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      center_latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      center_longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      radius_meters: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      alert_on: { type: Sequelize.ENUM(...GEOFENCE_ALERT_ON), allowNull: false, defaultValue: 'both' },
      // NULL = applies to all devices, otherwise only to this device
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'geofences',
      timestamps: true,
      underscored: true,
    }
  );

  return Geofence;
};
