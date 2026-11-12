import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  accessTier: {
    type: String,
    enum: ['tier1_public', 'tier2_break_glass'],
    required: true
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  action: {
    type: String,
    default: 'scan'
  }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
