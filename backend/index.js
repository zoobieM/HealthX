import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Patient from './models/Patient.js';
import AuditLog from './models/AuditLog.js';
import Hospital from './models/Hospital.js';
import { sampleHospitals, calculateDistanceMiles } from './hospitalsData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-medqr';
const DATA_FILE = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthx';

// MongoDB Connection with non-blocking graceful fallback
let isMongoConnected = false;
mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB database');
  })
  .catch((err) => {
    isMongoConnected = false;
    console.log('ℹ️ MongoDB server not reachable, using local fallback storage:', err.message);
  });

// Initialize data.json store
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], profiles: {}, auditLogs: [], hospitals: sampleHospitals }, null, 2));
}

const readData = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.auditLogs) parsed.auditLogs = [];
    if (!parsed.hospitals || parsed.hospitals.length === 0) parsed.hospitals = sampleHospitals;
    return parsed;
  } catch {
    return { users: [], profiles: {}, auditLogs: [], hospitals: sampleHospitals };
  }
};

// Seed sample hospitals into MongoDB if connected
async function seedMongoHospitals() {
  if (!isMongoConnected) return;
  try {
    const count = await Hospital.countDocuments();
    if (count === 0) {
      await Hospital.insertMany(sampleHospitals);
      console.log('✅ Seeded 8 sample emergency hospitals into MongoDB');
    }
  } catch (err) {
    console.error('Hospital seeding error:', err.message);
  }
}
mongoose.connection.on('connected', seedMongoHospitals);

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Helper: Extract caller IP address
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

// Helper: Hybrid Profile Fetcher
async function getPatientProfile(userId) {
  if (isMongoConnected) {
    try {
      const patient = await Patient.findOne({ userId });
      if (patient) return patient.toObject();
    } catch (e) {
      console.error('Mongo read error, reading from file store:', e.message);
    }
  }
  const data = readData();
  return data.profiles[userId] || null;
}

// Helper: Hybrid Profile Saver
async function savePatientProfile(userId, updates) {
  const data = readData();
  const current = data.profiles[userId] || {};
  const updatedProfile = {
    userId,
    fullName: '',
    bloodGroup: '',
    allergies: '',
    conditions: '',
    emergencyContact: '',
    emergencyPin: '123456',
    prescriptions: '',
    doctorNotes: '',
    history: '',
    medications: '',
    ...current,
    ...updates
  };

  data.profiles[userId] = updatedProfile;
  writeData(data);

  if (isMongoConnected) {
    try {
      await Patient.findOneAndUpdate(
        { userId },
        { $set: updatedProfile },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      console.error('Mongo profile upsert error:', e.message);
    }
  }

  return updatedProfile;
}

// Helper: Record Audit Log
async function recordAuditLog({ patientId, accessTier, ipAddress, action }) {
  const entry = {
    patientId,
    timestamp: new Date().toISOString(),
    accessTier, // 'tier1_public' | 'tier2_break_glass'
    ipAddress: ipAddress || 'unknown',
    action: action || 'scan'
  };

  // Persist to local data.json
  const data = readData();
  if (!data.auditLogs) data.auditLogs = [];
  data.auditLogs.unshift(entry);
  writeData(data);

  // Persist to MongoDB
  if (isMongoConnected) {
    try {
      await AuditLog.create({
        patientId,
        timestamp: new Date(),
        accessTier,
        ipAddress: ipAddress || 'unknown',
        action: action || 'scan'
      });
    } catch (e) {
      console.error('Mongo AuditLog create error:', e.message);
    }
  }

  console.log(`[AUDIT LOG] ${accessTier.toUpperCase()} | Patient: ${patientId} | Action: ${action} | IP: ${ipAddress}`);
  return entry;
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = user.id;
    next();
  });
};

// -- Auth Routes --
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const data = readData();
  const existingUser = data.users.find((u) => u.email === email);
  if (existingUser) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = `user-${Date.now()}`;

  data.users.push({ id: userId, email, password: hashedPassword, fullName });
  writeData(data);

  // Initialize patient profile with default 6-digit emergency PIN
  await savePatientProfile(userId, {
    fullName: fullName || '',
    emergencyPin: '123456',
    bloodGroup: '',
    allergies: '',
    conditions: '',
    medications: '',
    prescriptions: '',
    doctorNotes: '',
    history: '',
    emergencyContact: ''
  });

  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  const user = data.users.find((u) => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId: user.id });
});

// -- Profile Routes --
app.get('/api/profile', authenticateToken, async (req, res) => {
  const profile = await getPatientProfile(req.userId);
  res.json({ profile });
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  // Validate 6-digit PIN if provided
  if (req.body.emergencyPin && !/^\d{6}$/.test(String(req.body.emergencyPin).trim())) {
    return res.status(400).json({ error: 'Emergency PIN must be exactly 6 digits (e.g., 123456)' });
  }
  const updated = await savePatientProfile(req.userId, req.body);
  res.json({ profile: updated });
});

// Patient Audit Logs
app.get('/api/profile/audit-logs', authenticateToken, async (req, res) => {
  let logs = [];
  if (isMongoConnected) {
    try {
      logs = await AuditLog.find({ patientId: req.userId }).sort({ timestamp: -1 }).limit(20);
    } catch (e) {
      console.error('Failed to query Mongo audit logs:', e.message);
    }
  }

  if (!logs || logs.length === 0) {
    const data = readData();
    logs = (data.auditLogs || []).filter((l) => l.patientId === req.userId);
  }

  res.json({ logs });
});

// -- Emergency Routes --

// Tier 1 (Public Access): Returns only triage-vital info. Filters out prescriptions, notes, and PIN.
app.get('/api/emergency/:id', async (req, res) => {
  const patientId = req.params.id;
  const profile = await getPatientProfile(patientId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const ipAddress = getClientIp(req);

  // Record Tier 1 Public Scan in AuditLog
  await recordAuditLog({
    patientId,
    accessTier: 'tier1_public',
    ipAddress,
    action: 'qr_scan'
  });

  // Strict Tier 1 Payload Filtering (Zero sensitive clinical history leaked)
  const tier1Profile = {
    userId: patientId,
    fullName: profile.fullName || 'Unknown',
    bloodGroup: profile.bloodGroup || '',
    allergies: profile.allergies || '',
    conditions: profile.conditions || '',
    emergencyContact: profile.emergencyContact || '',
    hasTier2: true
  };

  res.json({
    accessTier: 'tier1_public',
    profile: tier1Profile
  });
});

// Tier 2 (Break-Glass Unlock): Verifies 6-digit emergency PIN and reveals full medical history
app.post('/api/emergency/unlock/:id', async (req, res) => {
  const patientId = req.params.id;
  const { pin } = req.body;

  const profile = await getPatientProfile(patientId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const expectedPin = String(profile.emergencyPin || '123456').trim();
  const inputPin = String(pin || '').trim();

  const ipAddress = getClientIp(req);

  if (!inputPin || inputPin !== expectedPin) {
    return res.status(401).json({ error: 'Invalid 6-digit emergency PIN' });
  }

  // Record Tier 2 Break-Glass Unlock in AuditLog
  await recordAuditLog({
    patientId,
    accessTier: 'tier2_break_glass',
    ipAddress,
    action: 'break_glass_unlock'
  });

  // Return Tier 2 sensitive clinical history
  res.json({
    unlocked: true,
    accessTier: 'tier2_break_glass',
    prescriptions: profile.prescriptions || profile.medications || 'None recorded',
    doctorNotes: profile.doctorNotes || profile.history || 'No doctor notes on file',
    history: profile.history || 'None recorded',
    medications: profile.medications || ''
  });
});

// Simulated AI Guidance Module
app.post('/api/emergency/ai/:id', async (req, res) => {
  const profile = await getPatientProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const conditionsLower = (profile.conditions || '').toLowerCase();
  const allergiesLower = (profile.allergies || '').toLowerCase();

  let steps = [];
  if (conditionsLower.includes('epilepsy') || conditionsLower.includes('seizure')) {
    steps = [
      'Do not restrain the patient.',
      'Turn the patient gently onto one side to keep the airway clear.',
      'Time the seizure. If it lasts >5 mins, call an ambulance immediately.',
      'Remove any hard or sharp objects nearby.'
    ];
  } else if (conditionsLower.includes('diabetes')) {
    steps = [
      'Check for a medical bracelet or glucose monitor.',
      'If the patient is conscious and can swallow, provide a sugary drink or candy.',
      'If unconscious, do NOT put anything in their mouth; call emergency services immediately.',
      'Monitor closely until help arrives.'
    ];
  } else if (
    allergiesLower.includes('peanut') ||
    allergiesLower.includes('anaphylaxis') ||
    allergiesLower.includes('bee')
  ) {
    steps = [
      "Check patient's belongings for an EpiPen or auto-injector.",
      "If they have one and can't use it, help them administer it to their outer thigh.",
      'Call emergency services immediately, mentioning a severe allergic reaction.',
      'Have the patient lie flat and elevate their legs if possible.'
    ];
  } else {
    steps = [
      'Keep the patient calm and comfortable.',
      'Do not move them unless they are in immediate danger.',
      'Ask if they have any medication on them.',
      `Contact their emergency contact: ${profile.emergencyContact || 'Not provided'}`,
      'Call emergency services if the situation appears critical or you are unsure.'
    ];
  }

  setTimeout(() => {
    res.json({ instructions: steps });
  }, 600);
});

// SMS simulated alert
app.post('/api/emergency/alert/:id', async (req, res) => {
  const profile = await getPatientProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const loc = req.body.location || 'Unknown';
  console.log(`\n\n=== 🚨 EMERGENCY ALERT TRIGGERED 🚨 ===`);
  console.log(`Sending SMS to ${profile.emergencyContact || 'Emergency Contact'}`);
  console.log(`Message: Emergency! ${profile.fullName} needs help. View medical profile and location.`);
  console.log(`GPS Location: ${loc}`);
  console.log(`========================================\n\n`);

  res.json({ message: 'Emergency contacts alerted successfully.' });
});

// -- Nearest Hospitals Route --
app.get('/api/hospitals/nearest', async (req, res) => {
  // Default fallback coordinates: San Francisco Civic Center (37.7749, -122.4194)
  const userLat = parseFloat(req.query.lat) || 37.7749;
  const userLng = parseFloat(req.query.lng) || -122.4194;

  let hospitalsList = [];
  if (isMongoConnected) {
    try {
      hospitalsList = await Hospital.find().lean();
    } catch (e) {
      console.error('Mongo hospital fetch error:', e.message);
    }
  }

  if (!hospitalsList || hospitalsList.length === 0) {
    const data = readData();
    hospitalsList = data.hospitals || sampleHospitals;
  }

  // Calculate distance for all hospitals and sort ascending
  const sorted = hospitalsList
    .map((h) => {
      const distMiles = calculateDistanceMiles(userLat, userLng, h.latitude, h.longitude);
      const distKm = distMiles * 1.60934;
      return {
        _id: h._id || h.name,
        name: h.name,
        address: h.address,
        phone: h.phone,
        latitude: h.latitude,
        longitude: h.longitude,
        specialties: h.specialties || [],
        emergencyWaitTime: h.emergencyWaitTime || '15 mins',
        distanceMiles: parseFloat(distMiles.toFixed(2)),
        distanceKm: parseFloat(distKm.toFixed(2))
      };
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  // Return the 3 closest emergency hospitals
  const topThree = sorted.slice(0, 3);

  res.json({
    userLocation: { latitude: userLat, longitude: userLng },
    count: topThree.length,
    hospitals: topThree
  });
});

// -- ML Service Integration (Proxy with Local Clinical Fallback) --
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.post('/api/ml/predict-triage', async (req, res) => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict-triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (mlResponse.ok) {
      const data = await mlResponse.json();
      return res.json(data);
    }
  } catch (err) {
    console.log('ML Service unreachable, using clinical rule fallback:', err.message);
  }

  // Clinical Rule Fallback if Python ML Service is offline
  const { heartRate = 80, spo2 = 98, systolicBP = 120, respiratoryRate = 16, consciousness = 0, bleeding = 0 } = req.body;
  const cNum = typeof consciousness === 'string' ? (consciousness.includes('un') ? 3 : (consciousness.includes('pain') ? 2 : (consciousness.includes('voice') ? 1 : 0))) : consciousness;
  const bNum = typeof bleeding === 'string' ? (bleeding.includes('sev') ? 2 : (bleeding.includes('mod') ? 1 : 0)) : bleeding;

  let tag = 'GREEN';
  let color = '#10b981';
  let priority = 'Priority 3 (Minor / Ambulatory)';
  let action = 'Non-urgent stable vitals. Standard supportive care.';

  if (heartRate === 0 && spo2 <= 40 && systolicBP <= 40) {
    tag = 'BLACK';
    color = '#1f2937';
    priority = 'Priority 0 (Expectant)';
    action = 'No signs of life.';
  } else if (spo2 < 85 || systolicBP < 80 || heartRate > 135 || respiratoryRate > 32 || cNum >= 2 || bNum === 2) {
    tag = 'RED';
    color = '#ef4444';
    priority = 'Priority 1 (Immediate / Resuscitation)';
    action = 'Immediate life-saving resuscitation required.';
  } else if (spo2 < 93 || systolicBP < 95 || heartRate > 105 || respiratoryRate > 22 || cNum === 1 || bNum === 1) {
    tag = 'YELLOW';
    color = '#f59e0b';
    priority = 'Priority 2 (Delayed / Urgent)';
    action = 'Serious condition requiring urgent evaluation.';
  }

  res.json({
    triage_tag: tag,
    confidence: 0.95,
    probabilities: { [tag]: 0.95 },
    vital_alerts: [],
    color_code: color,
    priority_level: priority,
    recommended_action: action
  });
});

app.post('/api/ml/check-safety', async (req, res) => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/check-safety`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (mlResponse.ok) {
      const data = await mlResponse.json();
      return res.json(data);
    }
  } catch (err) {
    console.log('ML Service unreachable, using safety fallback:', err.message);
  }

  res.json({
    safe: true,
    conflicts_count: 0,
    conflicts: [],
    notes: ['ML service offline - standard protocol active.']
  });
});

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint not found' });
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Please run "npm run build" in the frontend directory.');
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
