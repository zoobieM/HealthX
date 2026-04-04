import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-medqr';
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], profiles: {} }, null, 2));
}

const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

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
  const existingUser = data.users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = `user-${Date.now()}`;
  
  data.users.push({ id: userId, email, password: hashedPassword, fullName });
  // Initialize empty profile
  data.profiles[userId] = {
    fullName: fullName || '',
    bloodGroup: '',
    allergies: '',
    conditions: '',
    medications: '',
    history: '',
    emergencyContact: ''
  };
  
  writeData(data);
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  const user = data.users.find(u => u.email === email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId: user.id });
});

// -- Profile Routes --
app.get('/api/profile', authenticateToken, (req, res) => {
  const data = readData();
  const profile = data.profiles[req.userId];
  res.json({ profile });
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const data = readData();
  data.profiles[req.userId] = { ...data.profiles[req.userId], ...req.body };
  writeData(data);
  res.json({ profile: data.profiles[req.userId] });
});

// -- Emergency Routes --
app.get('/api/emergency/:id', (req, res) => {
  const data = readData();
  const profile = data.profiles[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile });
});

// Simulated AI Module
app.post('/api/emergency/ai/:id', (req, res) => {
  const data = readData();
  const profile = data.profiles[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  
  const conditionsLower = (profile.conditions || '').toLowerCase();
  const allergiesLower = (profile.allergies || '').toLowerCase();
  
  let steps = [];
  if (conditionsLower.includes('epilepsy') || conditionsLower.includes('seizure')) {
    steps = [
      "Do not restrain the patient.",
      "Turn the patient gently onto one side to keep the airway clear.",
      "Time the seizure. If it lasts >5 mins, call an ambulance immediately.",
      "Remove any hard or sharp objects nearby."
    ];
  } else if (conditionsLower.includes('diabetes')) {
    steps = [
      "Check for a medical bracelet or glucose monitor.",
      "If the patient is conscious and can swallow, provide a sugary drink or candy.",
      "If unconscious, do NOT put anything in their mouth; call emergency services immediately.",
      "Monitor closely until help arrives."
    ];
  } else if (allergiesLower.includes('peanut') || allergiesLower.includes('anaphylaxis') || allergiesLower.includes('bee')) {
    steps = [
      "Check patient's belongings for an EpiPen or auto-injector.",
      "If they have one and can't use it, help them administer it to their outer thigh.",
      "Call emergency services immediately, mentioning a severe allergic reaction.",
      "Have the patient lie flat and elevate their legs if possible."
    ];
  } else {
    steps = [
      "Keep the patient calm and comfortable.",
      "Do not move them unless they are in immediate danger.",
      "Ask if they have any medication on them.",
      `Contact their emergency contact: ${profile.emergencyContact || 'Not provided'}`,
      "Call emergency services if the situation appears critical or you are unsure."
    ];
  }

  // artificial delay to feel like AI processing
  setTimeout(() => {
    res.json({ instructions: steps });
  }, 1000);
});

// SMS simulated alert
app.post('/api/emergency/alert/:id', (req, res) => {
  const data = readData();
  const profile = data.profiles[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  
  const loc = req.body.location || 'Unknown';
  console.log(`\n\n=== 🚨 EMERGENCY ALERT TRIGGERED 🚨 ===`);
  console.log(`Sending SMS to ${profile.emergencyContact || 'Emergency Contact'}`);
  console.log(`Message: Emergency! ${profile.fullName} needs help. View medical profile and location.`);
  console.log(`GPS Location: ${loc}`);
  console.log(`========================================\n\n`);
  
  res.json({ message: 'Emergency contacts alerted successfully.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
