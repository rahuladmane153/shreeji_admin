const { KYC_STATUS } = require('../../../config/constant.config');

module.exports = (sequelize, Sequelize) => {
  const KycApplication = sequelize.define(
    'kyc_applications',
    {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      customer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      device_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      status: { type: Sequelize.ENUM(...KYC_STATUS), allowNull: false, defaultValue: 'in_progress' },

      // Details extracted by OCR / confirmed by customer on the review screen
      name_on_document: { type: Sequelize.STRING(150), allowNull: true },
      dob_on_document: { type: Sequelize.DATEONLY, allowNull: true },
      gender_on_document: { type: Sequelize.STRING(10), allowNull: true },
      address_on_document: { type: Sequelize.STRING(500), allowNull: true },
      // Aadhaar number is stored encrypted (AES-256-GCM); last 4 digits kept for display
      aadhaar_number_enc: { type: Sequelize.STRING(255), allowNull: true },
      aadhaar_last4: { type: Sequelize.STRING(4), allowNull: true },
      pan_number: { type: Sequelize.STRING(10), allowNull: true },
      // Latest document verification result (see kyc-app _helpers/verify.js)
      ocr_data: {
        type: Sequelize.JSON,
        allowNull: true,
        // MariaDB stores JSON as LONGTEXT, so reads come back as a string
        get() {
          const v = this.getDataValue('ocr_data');
          return typeof v === 'string' ? JSON.parse(v) : v;
        },
      },

      selfie_liveness: { type: Sequelize.JSON, allowNull: true },
      selfie_captured_at: { type: Sequelize.DATE, allowNull: true },

      declaration_accepted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      reviewed_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      review_remarks: { type: Sequelize.STRING(500), allowNull: true },
    },
    {
      tableName: 'kyc_applications',
      timestamps: true,
      underscored: true,
      // One application per customer; a rejected application is re-opened for corrections
      indexes: [{ unique: true, fields: ['customer_id'] }, { fields: ['status'] }],
    }
  );

  return KycApplication;
};
