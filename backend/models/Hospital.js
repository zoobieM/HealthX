import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    specialties: {
      type: [String],
      default: []
    },
    emergencyWaitTime: {
      type: String,
      default: '15 mins'
    }
  },
  { timestamps: true }
);

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

export default Hospital;
