const { ADMIN_ROLES, USER_STATUS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const AdminUser = sequelize.define(
    'admin_users',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      mobile: { type: Sequelize.STRING(15), allowNull: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM(...ADMIN_ROLES), allowNull: false, defaultValue: 'admin' },
      status: { type: Sequelize.ENUM(...USER_STATUS), allowNull: false, defaultValue: 'active' },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
    },
    {
      tableName: 'admin_users',
      timestamps: true,
      underscored: true,
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withPassword: { attributes: { include: ['password_hash'] } } },
    }
  );

  return AdminUser;
};
