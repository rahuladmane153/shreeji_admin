const { KYC_STATUS, USER_STATUS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const Customer = sequelize.define(
    'customers',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      mobile: { type: Sequelize.STRING(15), allowNull: false, unique: true },
      full_name: { type: Sequelize.STRING(150), allowNull: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      dob: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.ENUM('male', 'female', 'other'), allowNull: true },
      address: { type: Sequelize.STRING(500), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      pincode: { type: Sequelize.STRING(10), allowNull: true },
      kyc_status: { type: Sequelize.ENUM(...KYC_STATUS), allowNull: false, defaultValue: 'not_started' },
      status: { type: Sequelize.ENUM(...USER_STATUS), allowNull: false, defaultValue: 'active' },
      consent_accepted_at: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
    },
    {
      tableName: 'customers',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['kyc_status'] }, { fields: ['status'] }],
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withPassword: { attributes: { include: ['password_hash'] } } },
    }
  );

  return Customer;
};
