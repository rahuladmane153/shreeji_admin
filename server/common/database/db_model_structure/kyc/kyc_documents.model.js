const { DOC_TYPES } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const KycDocument = sequelize.define(
    'kyc_documents',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      kyc_application_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      doc_type: { type: Sequelize.ENUM(...DOC_TYPES), allowNull: false },
      // Path relative to UPLOAD_DIR
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      original_name: { type: Sequelize.STRING(255), allowNull: true },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      file_size: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      sha256: { type: Sequelize.STRING(64), allowNull: true },
      ocr_text: { type: Sequelize.TEXT, allowNull: true },
      ocr_data: {
        type: Sequelize.JSON,
        allowNull: true,
        // MariaDB stores JSON as LONGTEXT, so reads come back as a string
        get() {
          const v = this.getDataValue('ocr_data');
          return typeof v === 'string' ? JSON.parse(v) : v;
        },
      },
    },
    {
      tableName: 'kyc_documents',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['kyc_application_id'] }, { fields: ['customer_id'] }],
    }
  );

  return KycDocument;
};
