import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      default: ''
    },
    bloodGroup: {
      type: String,
      default: ''
    },
    allergies: {
      type: String,
      default: ''
    },
    conditions: {
      type: String,
      default: ''
    },
    emergencyContact: {
      type: String,
      default: ''
    },
    emergencyPin: {
      type: String,
      default: '123456',
      validate: {
        validator: function (v) {
          return !v || /^\d{6}$/.test(v);
        },
        message: 'Emergency PIN must be a 6-digit number'
      }
    },
    prescriptions: {
      type: String,
      default: ''
    },
    doctorNotes: {
      type: String,
      default: ''
    },
    history: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

export default Patient;
