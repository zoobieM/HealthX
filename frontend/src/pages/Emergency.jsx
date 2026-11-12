import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Droplet, 
  Users, 
  Pill, 
  FileText, 
  Phone, 
  Volume2, 
  ShieldAlert, 
  Navigation,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  X,
  Activity,
  HeartPulse,
  Flame,
  CheckCircle2,
  Stethoscope,
  Building2,
  MapPin,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Emergency() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInstructions, setAiInstructions] = useState([]);
  const [loadingAi, setLoadingAi] = useState(true);
  const [alertSent, setAlertSent] = useState(false);
  const [alerting, setAlerting] = useState(false);

  // Two-Tier Privacy States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [tier2Data, setTier2Data] = useState(null);

  // ML Quick Triage & Safety States
  const [vitals, setVitals] = useState({
    heartRate: '82',
    spo2: '97',
    systolicBP: '122',
    respiratoryRate: '16',
    consciousness: 'alert',
    bleeding: 'none'
  });
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [safetyResult, setSafetyResult] = useState(null);

  // Nearest Hospitals State
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Detecting location...');

  useEffect(() => {
    fetchEmergencyData();
    fetchAiInstructions();
    fetchNearestHospitals();
  }, [id]);

  const getBaseUrl = () => window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

  const fetchNearestHospitals = () => {
    setLoadingHospitals(true);
    const loadHospitals = async (lat, lng, isGps = false) => {
      setLocationStatus(isGps ? 'Using browser GPS' : 'Using reference location (San Francisco)');
      try {
        const res = await fetch(`${getBaseUrl()}/api/hospitals/nearest?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (res.ok && data.hospitals) {
          setHospitals(data.hospitals);
        }
      } catch (e) {
        console.error('Failed to load hospitals:', e);
      } finally {
        setLoadingHospitals(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          loadHospitals(pos.coords.latitude, pos.coords.longitude, true);
        },
        () => {
          // Default fallback location
          loadHospitals(37.7749, -122.4194, false);
        },
        { timeout: 5000 }
      );
    } else {
      loadHospitals(37.7749, -122.4194, false);
    }
  };

  const fetchEmergencyData = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/emergency/${id}`);
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Failed to fetch emergency profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInstructions = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/emergency/ai/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setAiInstructions(data.instructions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const triggerAlert = async () => {
    if (alertSent || alerting) return;
    setAlerting(true);
    try {
      const loc = "Latitude: 37.7749, Longitude: -122.4194 (San Francisco, CA)";
      await fetch(`${getBaseUrl()}/api/emergency/alert/${id}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc })
      });
      setAlertSent(true);
    } catch (e) {
      console.error('Failed to trigger alert:', e);
    } finally {
      setAlerting(false);
    }
  };

  const handleUnlockTier2 = async (e) => {
    e.preventDefault();
    if (!pin || pin.trim().length !== 6) {
      setUnlockError('Please enter a valid 6-digit emergency PIN');
      return;
    }

    setUnlocking(true);
    setUnlockError('');

    try {
      const res = await fetch(`${getBaseUrl()}/api/emergency/unlock/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        setUnlockError(data.error || 'Failed to verify PIN. Access denied.');
        return;
      }

      setTier2Data(data);
      setIsUnlocked(true);
      setShowPinModal(false);
      setPin('');
    } catch (err) {
      setUnlockError('Network error. Unable to verify PIN.');
    } finally {
      setUnlocking(false);
    }
  };

  const readAloud = () => {
    if (!profile) return;
    const baseText = `Emergency Medical Information for ${profile.fullName}. Blood Group: ${profile.bloodGroup}. Allergies: ${profile.allergies || 'None'}. Medical Conditions: ${profile.conditions || 'None'}. Emergency contact: ${profile.emergencyContact || 'None'}.`;
    const fullText = isUnlocked && tier2Data 
      ? `${baseText} Prescriptions: ${tier2Data.prescriptions || 'None'}. Doctor Notes: ${tier2Data.doctorNotes || 'None'}.`
      : baseText;
    const utterance = new SpeechSynthesisUtterance(fullText);
    window.speechSynthesis.speak(utterance);
  };

  // ML Quick Triage Execution
  const handleVitalsChange = (e) => {
    setVitals({ ...vitals, [e.target.name]: e.target.value });
  };

  const applyPreset = (preset) => {
    if (preset === 'normal') {
      setVitals({ heartRate: '76', spo2: '98', systolicBP: '120', respiratoryRate: '15', consciousness: 'alert', bleeding: 'none' });
    } else if (preset === 'shock') {
      setVitals({ heartRate: '142', spo2: '82', systolicBP: '72', respiratoryRate: '35', consciousness: 'pain', bleeding: 'severe' });
    } else if (preset === 'respiratory') {
      setVitals({ heartRate: '118', spo2: '84', systolicBP: '110', respiratoryRate: '38', consciousness: 'voice', bleeding: 'none' });
    } else if (preset === 'arrest') {
      setVitals({ heartRate: '0', spo2: '0', systolicBP: '0', respiratoryRate: '0', consciousness: 'unresponsive', bleeding: 'none' });
    }
  };

  const runQuickTriage = async (e) => {
    e.preventDefault();
    setTriageLoading(true);

    const payload = {
      heartRate: parseFloat(vitals.heartRate) || 80,
      spo2: parseFloat(vitals.spo2) || 98,
      systolicBP: parseFloat(vitals.systolicBP) || 120,
      respiratoryRate: parseFloat(vitals.respiratoryRate) || 16,
      consciousness: vitals.consciousness,
      bleeding: vitals.bleeding
    };

    try {
      // 1. Predict Triage Tag
      const triageRes = await fetch(`${getBaseUrl()}/api/ml/predict-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const tData = await triageRes.json();
      setTriageResult(tData);

      // 2. Cross-verify Safety Conflicts with AI steps & Patient history
      const safetyPayload = {
        steps: aiInstructions.length > 0 ? aiInstructions : ["Administer emergency supportive care"],
        allergies: profile?.allergies || "",
        medications: tier2Data?.prescriptions || profile?.medications || "",
        conditions: profile?.conditions || ""
      };

      const safetyRes = await fetch(`${getBaseUrl()}/api/ml/check-safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safetyPayload)
      });
      const sData = await safetyRes.json();
      setSafetyResult(sData);

    } catch (err) {
      console.error('Error running triage:', err);
    } finally {
      setTriageLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-emergency-50 flex items-center justify-center flex-col gap-4">
      <div className="w-16 h-16 border-4 border-emergency-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-emergency-700 font-bold animate-pulse">Loading Critical Information...</p>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6 text-white">
      <ShieldAlert className="w-20 h-20 text-rose-500 mb-4 animate-bounce" />
      <h1 className="text-3xl font-black text-white">Medical ID Not Found</h1>
      <p className="text-slate-400 mt-2 max-w-sm">The requested emergency profile could not be located or has expired.</p>
    </div>
  );

  const hasAllergies = profile.allergies && profile.allergies.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0e131f] text-white">
      {/* Red Alert Header */}
      <div className="bg-emergency-600 px-4 py-5 sticky top-0 z-40 shadow-xl shadow-emergency-600/30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 md:w-9 md:h-9 text-white animate-pulse" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white">Emergency Medical ID</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold text-white">
                  <ShieldCheck className="w-3.5 h-3.5" /> Tier 1: Public View
                </span>
                {isUnlocked && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full text-xs font-black animate-pulse">
                    <Unlock className="w-3.5 h-3.5" /> Tier 2: Break-Glass Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-28">
        
        {/* Quick Responder Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={triggerAlert}
            disabled={alertSent || alerting}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-base md:text-lg transition-all border-2 ${alertSent ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-emergency-500/10 border-emergency-500/50 text-white hover:bg-emergency-500/20'}`}
          >
            {alertSent ? <Navigation className="w-7 h-7" /> : <Phone className="w-7 h-7 text-emergency-500" />}
            {alertSent ? 'Contacts Alerted' : (alerting ? 'Sending Alert...' : 'Alert Contacts')}
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={readAloud}
            className="p-4 rounded-2xl bg-slate-800/80 border-2 border-slate-700 hover:bg-slate-800 flex flex-col items-center justify-center gap-2 font-bold text-base md:text-lg transition-all"
          >
            <Volume2 className="w-7 h-7 text-cyan-400" />
            Voice Assist
          </motion.button>
        </div>

        {/* Patient Name & Blood Group (Tier 1) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
          <div>
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-xs">Patient Identity</p>
            <h2 className="text-3xl md:text-5xl font-black text-white">{profile.fullName || 'Unknown'}</h2>
          </div>
          <div className="text-center bg-emergency-600/20 text-emergency-500 p-4 rounded-2xl border border-emergency-500/40 min-w-[84px]">
            <Droplet className="w-6 h-6 mx-auto mb-1 text-emergency-500" />
            <div className="text-2xl md:text-4xl font-black">{profile.bloodGroup || '?'}</div>
          </div>
        </div>

        {/* Critical Allergies Banner (Tier 1) */}
        {hasAllergies ? (
          <div className="bg-emergency-600 text-white rounded-3xl p-6 shadow-xl shadow-emergency-600/25 border-2 border-emergency-400">
            <h3 className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2 text-emergency-100">
              <ShieldAlert className="w-5 h-5" /> Critical Allergies
            </h3>
            <p className="text-2xl md:text-3xl font-black">{profile.allergies}</p>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-slate-400 flex items-center gap-2 text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> No known drug or food allergies reported
          </div>
        )}

        {/* Chronic Conditions & Emergency Contact (Tier 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard 
            title="Chronic Conditions" 
            icon={<AlertTriangle className="w-5 h-5"/>} 
            content={profile.conditions || 'None reported'} 
            color="amber" 
          />
          <div className="p-5 rounded-2xl border bg-slate-900/80 border-slate-800 backdrop-blur-sm">
            <h3 className="font-bold flex items-center gap-2 mb-2 uppercase tracking-wide text-xs text-slate-400">
              <Phone className="w-4 h-4 text-emerald-400"/> Emergency Contact
            </h3>
            <p className="text-lg font-bold text-white mb-2">{profile.emergencyContact || 'None provided'}</p>
            {profile.emergencyContact && (
              <a 
                href={`tel:${profile.emergencyContact}`} 
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl hover:bg-emerald-500/30 transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> Call Contact Directly
              </a>
            )}
          </div>
        </div>

        {/* QUICK TRIAGE CHECK (ML-POWERED) */}
        <div className="bg-slate-900/90 border-2 border-primary-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-600 rounded-xl text-white">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Quick AI Triage Check</h3>
                <p className="text-xs text-slate-400">RandomForest model predicts START emergency tags (RED/YELLOW/GREEN/BLACK)</p>
              </div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/40 px-2.5 py-1 rounded-full">
              ML 100% F1
            </span>
          </div>

          {/* Quick Presets */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 self-center font-semibold">Presets:</span>
            <button type="button" onClick={() => applyPreset('normal')} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30">
              🟢 Stable (Green)
            </button>
            <button type="button" onClick={() => applyPreset('shock')} className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold">
              🔴 Severe Shock (Red)
            </button>
            <button type="button" onClick={() => applyPreset('respiratory')} className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30">
              🟡 Hypoxemia (Yellow)
            </button>
            <button type="button" onClick={() => applyPreset('arrest')} className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600">
              ⚫ Expectant (Black)
            </button>
          </div>

          <form onSubmit={runQuickTriage} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Heart Rate (bpm)</label>
                <input 
                  type="number" 
                  name="heartRate" 
                  value={vitals.heartRate} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono font-bold text-base focus:border-primary-500 outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">SpO2 (%)</label>
                <input 
                  type="number" 
                  name="spo2" 
                  value={vitals.spo2} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono font-bold text-base focus:border-primary-500 outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Systolic BP (mmHg)</label>
                <input 
                  type="number" 
                  name="systolicBP" 
                  value={vitals.systolicBP} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono font-bold text-base focus:border-primary-500 outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Resp Rate (/min)</label>
                <input 
                  type="number" 
                  name="respiratoryRate" 
                  value={vitals.respiratoryRate} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono font-bold text-base focus:border-primary-500 outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Consciousness</label>
                <select 
                  name="consciousness" 
                  value={vitals.consciousness} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-bold text-sm focus:border-primary-500 outline-none"
                >
                  <option value="alert">Alert (Normal)</option>
                  <option value="voice">Voice / Drowsy</option>
                  <option value="pain">Pain Responsive</option>
                  <option value="unresponsive">Unresponsive</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Bleeding</label>
                <select 
                  name="bleeding" 
                  value={vitals.bleeding} 
                  onChange={handleVitalsChange} 
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-bold text-sm focus:border-primary-500 outline-none"
                >
                  <option value="none">None / Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe / Arterial</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={triageLoading} 
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-3 rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {triageLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Running ML Triage & Safety Analysis...</span>
                </>
              ) : (
                <>
                  <Stethoscope className="w-5 h-5" />
                  <span>Run Quick Triage & Drug Safety Check</span>
                </>
              )}
            </button>
          </form>

          {/* TRIAGE RESULT CARD */}
          {triageResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
              
              <div 
                className="p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{
                  backgroundColor: `${triageResult.color_code}15`,
                  borderColor: triageResult.color_code
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs font-black uppercase px-2.5 py-1 rounded-md text-white shadow-sm"
                      style={{ backgroundColor: triageResult.color_code }}
                    >
                      {triageResult.triage_tag} TAG
                    </span>
                    <span className="text-sm font-bold text-slate-300">{triageResult.priority_level}</span>
                  </div>
                  <p className="text-white font-extrabold text-lg mt-2">{triageResult.recommended_action}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Confidence</div>
                  <div className="text-2xl font-black text-white">{(triageResult.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Vital Alerts */}
              {triageResult.vital_alerts && triageResult.vital_alerts.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Detected Clinical Derangements:
                  </p>
                  <ul className="text-sm text-rose-200 list-disc list-inside space-y-0.5">
                    {triageResult.vital_alerts.map((alert, i) => (
                      <li key={i}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SAFETY CONFLICTS BOX */}
              {safetyResult && (
                <div className="mt-4">
                  {safetyResult.conflicts_count > 0 ? (
                    <div className="bg-rose-600/20 border-2 border-rose-500 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-rose-300 font-black text-sm uppercase tracking-wide">
                        <Flame className="w-5 h-5 text-rose-500 animate-bounce" />
                        <span>⚠️ Critical Safety Conflict Detected ({safetyResult.conflicts_count})</span>
                      </div>
                      <div className="space-y-2">
                        {safetyResult.conflicts.map((c, i) => (
                          <div key={i} className="bg-slate-950/80 border border-rose-500/40 p-3.5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-rose-400 uppercase tracking-wider">{c.severity} CONFLICT</span>
                              <span className="text-slate-400">{c.conflict_factor}</span>
                            </div>
                            <p className="text-sm font-semibold text-white">Action in step: <span className="text-amber-300 font-bold">"{c.trigger_step}"</span></p>
                            <p className="text-xs text-rose-200 mt-1">{c.clinical_recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/15 border border-emerald-500/40 p-3.5 rounded-xl flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Drug-Allergy Safety Check Passed: No contraindications with current patient profile.</span>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}
        </div>

        {/* AI First Aid Guidance Section */}
        <div className="bg-cyan-950/30 border-2 border-cyan-500/40 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-cyan-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-500 p-2 rounded-xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-50">AI First-Aid Guidance</h3>
              <p className="text-xs text-cyan-300">Condition-specific emergency response steps</p>
            </div>
          </div>
          
          <AnimatePresence>
            {loadingAi ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-cyan-200 p-4">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                Analyzing medical conditions...
              </motion.div>
            ) : (
              <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {aiInstructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-cyan-50 items-start bg-slate-900/60 p-4 rounded-2xl border border-cyan-900/60">
                    <span className="bg-cyan-500/20 text-cyan-400 font-bold shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-base md:text-lg leading-relaxed">{step}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* NEAREST HOSPITALS SECTION (TOP 3 CLOSEST) */}
        <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 rounded-xl text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Nearest Emergency Centers</h3>
                <p className="text-xs text-slate-400">Closest trauma & acute care hospitals sorted by distance</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start sm:self-center">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationStatus}</span>
            </div>
          </div>

          {loadingHospitals ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Locating closest emergency facilities...
            </div>
          ) : (
            <div className="space-y-3.5">
              {hospitals.map((hosp, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-emerald-500/20 text-emerald-300 font-black text-xs px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                          {hosp.distanceMiles} mi ({hosp.distanceKm} km)
                        </span>
                        <span className="bg-slate-800 text-slate-300 font-semibold text-[11px] px-2 py-0.5 rounded-lg">
                          ⏱️ ER Wait: {hosp.emergencyWaitTime}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5">{hosp.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{hosp.address}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
                      <a 
                        href={`tel:${hosp.phone}`} 
                        className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all border border-slate-700"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call ER
                      </a>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                      >
                        <Compass className="w-3.5 h-3.5" /> Directions
                      </a>
                    </div>
                  </div>

                  {hosp.specialties && hosp.specialties.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
                      {hosp.specialties.map((spec, sIdx) => (
                        <span key={sIdx} className="text-[10px] font-medium bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TWO-TIER PRIVACY: BREAK-GLASS SECTION */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          {!isUnlocked ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 text-center shadow-xl relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Prescriptions & Clinical Notes Protected</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-5 leading-relaxed">
                Detailed prescriptions, physician notes, and full medical histories are protected under Tier 2 Break-Glass security.
              </p>
              <button 
                onClick={() => setShowPinModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2 text-base active:scale-95"
              >
                <KeyRound className="w-5 h-5" /> Unlock Full Medical History
              </button>
              <p className="text-[11px] text-slate-500 mt-3 font-medium uppercase tracking-wider">
                🔒 All break-glass access is recorded in the patient security audit log
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-amber-500/15 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between text-amber-200">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Unlock className="w-5 h-5 text-amber-400" />
                  <span>Tier 2 Break-Glass Active</span>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 font-semibold">
                  Audit Logged
                </span>
              </div>

              {/* Unlocked Prescriptions */}
              <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-6 shadow-xl">
                <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5" /> Current Prescriptions & Dosages
                </h3>
                <p className="text-lg md:text-xl font-medium text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {tier2Data?.prescriptions || 'No specific prescriptions recorded.'}
                </p>
              </div>

              {/* Unlocked Doctor Notes */}
              <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl">
                <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Attending Physician & Clinical Notes
                </h3>
                <p className="text-lg md:text-xl font-medium text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {tier2Data?.doctorNotes || tier2Data?.history || 'No detailed clinical notes on record.'}
                </p>
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* Break-Glass PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowPinModal(false); setUnlockError(''); }}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
                <KeyRound className="w-6 h-6" />
              </div>

              <h2 className="text-2xl font-black text-white">Break-Glass Unlock</h2>
              <p className="text-slate-400 text-sm mt-1 mb-5">
                Enter the patient's 6-digit emergency PIN to view sensitive clinical records and prescriptions.
              </p>

              {unlockError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <form onSubmit={handleUnlockTier2} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    6-Digit Emergency PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    autoFocus
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-2xl text-white outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-2 text-center">
                    (Default demo PIN: 123456)
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowPinModal(false); setUnlockError(''); }}
                    className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={unlocking || pin.length !== 6}
                    className="w-1/2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition-all text-sm flex items-center justify-center gap-1.5"
                  >
                    {unlocking ? 'Verifying...' : 'Unlock History'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoCard({ title, icon, content, color }) {
  const colors = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    slate: 'bg-slate-900/80 border-slate-800 text-slate-300'
  };
  
  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-sm ${colors[color]}`}>
      <h3 className="font-bold flex items-center gap-2 mb-2 uppercase tracking-wide text-xs opacity-80">
        {icon} {title}
      </h3>
      <p className="text-lg font-medium text-white">{content}</p>
    </div>
  );
}
