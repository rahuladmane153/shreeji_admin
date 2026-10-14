const { DEVICE_STATUS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const Device = sequelize.define(
    'devices',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      // Unique device identifier (UUID) shared with the mobile app
      device_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      // Human friendly code shown in the admin panel e.g. DVC1001
      device_code: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      android_id: { type: Sequelize.STRING(100), allowNull: false },
      app_version: { type: Sequelize.STRING(50), allowNull: true },
      device_model: { type: Sequelize.STRING(100), allowNull: true },
      manufacturer: { type: Sequelize.STRING(100), allowNull: true },
      os_version: { type: Sequelize.STRING(50), allowNull: true },
      sdk_int: { type: Sequelize.INTEGER, allowNull: true },
      fcm_token: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.ENUM(...DEVICE_STATUS), allowNull: false, defaultValue: 'active' },
      uninstall_protection: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      admin_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      battery_level: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      is_charging: { type: Sequelize.BOOLEAN, allowNull: true },
      network_type: { type: Sequelize.STRING(20), allowNull: true },

      last_latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      last_longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      last_location_at: { type: Sequelize.DATE, allowNull: true },
      last_seen: { type: Sequelize.DATE, allowNull: true },
      registered_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    },
    {
      tableName: 'devices',
      timestamps: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['customer_id', 'android_id'] },
        { fields: ['status'] },
        { fields: ['last_seen'] },
      ],
    }
  );

  // Device codes are generated from the auto-increment id after insert
  Device.addHook('afterCreate', async (device, options) => {
    if (!device.device_code) {
      await device.update(
        { device_code: `DVC${1000 + device.id}` },
        { hooks: false, transaction: options.transaction }
      );
    }
  });

  return Device;
};
