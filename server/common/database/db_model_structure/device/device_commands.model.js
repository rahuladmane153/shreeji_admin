const { DEVICE_ACTIONS, COMMAND_STATUS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const DeviceCommand = sequelize.define(
    'device_commands',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      command: { type: Sequelize.ENUM(...DEVICE_ACTIONS), allowNull: false },
      status: { type: Sequelize.ENUM(...COMMAND_STATUS), allowNull: false, defaultValue: 'pending' },
      payload: { type: Sequelize.JSON, allowNull: true },
      reason: { type: Sequelize.STRING(255), allowNull: true },
      result_message: { type: Sequelize.STRING(500), allowNull: true },
      issued_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      executed_at: { type: Sequelize.DATE, allowNull: true },
    },
    {
      tableName: 'device_commands',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['device_id', 'status'] }],
    }
  );

  return DeviceCommand;
};
