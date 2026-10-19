module.exports = (sequelize, Sequelize) => sequelize.define(
  'device_contact_snapshots',
  {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    contact_id: { type: Sequelize.STRING(100), allowNull: false },
    display_name: { type: Sequelize.STRING(300), allowNull: false, defaultValue: '' },
    phones: { type: Sequelize.JSON, allowNull: false },
    photo: { type: Sequelize.BLOB('medium'), allowNull: true },
    sync_id: { type: Sequelize.UUID, allowNull: false },
    synced_at: { type: Sequelize.DATE, allowNull: false },
  },
  {
    tableName: 'device_contact_snapshots',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, name: 'uq_contact_customer_device_id', fields: ['customer_id', 'device_id', 'contact_id'] },
      { fields: ['customer_id', 'contact_id'] },
      { fields: ['device_id'] },
      { fields: ['sync_id'] },
    ],
  }
);