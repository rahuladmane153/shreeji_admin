module.exports = (sequelize, Sequelize) => {
  const CustomerOtp = sequelize.define(
    'customer_otps',
    {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      mobile: { type: Sequelize.STRING(15), allowNull: false },
      otp_hash: { type: Sequelize.STRING(255), allowNull: false },
      purpose: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'login' },
      attempts: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
    },
    {
      tableName: 'customer_otps',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['mobile', 'purpose'] }],
    }
  );

  return CustomerOtp;
};
