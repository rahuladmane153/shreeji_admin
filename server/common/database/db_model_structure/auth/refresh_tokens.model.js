module.exports = (sequelize, Sequelize) => {
  const RefreshToken = sequelize.define(
    'refresh_tokens',
    {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_type: { type: Sequelize.ENUM('admin', 'customer'), allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      // SHA-256 of the refresh token, the raw token is never stored
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
    },
    {
      tableName: 'refresh_tokens',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['user_type', 'user_id'] }],
    }
  );

  return RefreshToken;
};
