import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Droplet, Users, Pill, FileText, Phone, Volume2, ShieldAlert, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Emergency() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInstructions, setAiInstructions] = useState([]);
  const [loadingAi, setLoadingAi] = useState(true);
  const [alertSent, setAlertSent] = useState(false);
  const [alerting, setAlerting] = useState(false);

  useEffect(() => {
    fetchEmergencyData();
    fetchAiInstructions();
  }, [id]);

  const getBaseUrl = () => window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

  const fetchEmergencyData = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/emergency/${id}`);
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (err) {
      console.error(err);
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
      console.error('Failed to trigger alert');
    } finally {
      setAlerting(false);
    }
  };

  const readAloud = () => {
    if (!profile) return;
    const text = `Emergency Medical Information for ${profile.fullName}. Blood Group: ${profile.bloodGroup}. Allergies: ${profile.allergies || 'None'}. Medical Conditions: ${profile.conditions || 'None'}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return (
    <div className="min-h-screen bg-emergency-50 flex items-center justify-center flex-col gap-4">
      <div className="w-16 h-16 border-4 border-emergency-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-emergency-700 font-bold animate-pulse">Loading Critical Information...</p>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
      <ShieldAlert className="w-20 h-20 text-slate-400 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800">Profile Not Found</h1>
      <p className="text-slate-500 mt-2">The requested medical profile is invalid or has been removed.</p>
    </div>
  );

  const hasAllergies = profile.allergies && profile.allergies.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Red Alert Header */}
      <div className="bg-emergency-600 px-4 py-6 sticky top-0 z-50 animate-pulse-emergency shadow-lg shadow-emergency-600/30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-white" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white">Emergency ID</h1>
              <p className="text-emergency-100 font-medium text-sm">Do Not Close This Page</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={triggerAlert}
            disabled={alertSent || alerting}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-lg transition-colors border-2 ${alertSent ? 'bg-green-600 border-green-500 text-white' : 'bg-emergency-50 border-emergency-500 text-emergency-700 hover:bg-emergency-100'}`}
          >
            {alertSent ? <Navigation className="w-8 h-8" /> : <Phone className="w-8 h-8 text-emergency-600" />}
            {alertSent ? 'Contacts Alerted' : (alerting ? 'Sending...' : 'Alert Contacts')}
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={readAloud}
            className="p-4 rounded-2xl bg-white/10 border-2 border-white/20 hover:bg-white/20 flex flex-col items-center justify-center gap-2 font-bold text-lg transition-colors"
          >
            <Volume2 className="w-8 h-8" />
            Listen Aloud
          </motion.button>
        </div>

        {/* Patient Name & Blood Group */}
        <div className="bg-slate-800 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full"></div>
          <div>
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-sm">Patient Name</p>
            <h2 className="text-3xl md:text-5xl font-black">{profile.fullName || 'Unknown'}</h2>
          </div>
          <div className="text-center bg-emergency-600/20 text-emergency-500 p-4 rounded-2xl border border-emergency-500/30">
            <Droplet className="w-6 h-6 mx-auto mb-1" />
            <div className="text-2xl md:text-4xl font-black">{profile.bloodGroup || '?'}</div>
          </div>
        </div>

        {/* Highlight Allergies */}
        {hasAllergies && (
          <div className="bg-emergency-600 text-white rounded-3xl p-6 shadow-lg shadow-emergency-600/20 border-2 border-emergency-400">
            <h3 className="text-xl font-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" /> Critical Allergies
            </h3>
            <p className="text-2xl md:text-3xl font-bold">{profile.allergies}</p>
          </div>
        )}

        {/* AI First Aid Agent Section */}
        <div className="bg-cyan-900/30 border-2 border-cyan-500/50 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-cyan-900/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-500 p-2 rounded-xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-cyan-50">AI First-Aid Guidance</h3>
          </div>
          
          <AnimatePresence>
            {loadingAi ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-cyan-200 p-4">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                Analyzing conditions...
              </motion.div>
            ) : (
              <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {aiInstructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-cyan-50 items-start bg-cyan-950/50 p-4 rounded-2xl border border-cyan-800/50">
                    <span className="bg-cyan-500/20 text-cyan-400 font-bold shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                      {idx + 1}
                    </span>
                    <span className="text-lg leading-relaxed">{step}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Other Medical Details */}
        <div className="space-y-4">
          <InfoCard title="Chronic Conditions" icon={<AlertTriangle className="w-5 h-5"/>} content={profile.conditions || 'None reported'} color="amber" />
          <InfoCard title="Current Medications" icon={<Pill className="w-5 h-5"/>} content={profile.medications || 'None recorded'} color="blue" />
          <InfoCard title="Medical History" icon={<FileText className="w-5 h-5"/>} content={profile.history || 'No significant history'} color="slate" />
        </div>

      </main>
    </div>
  );
}

function InfoCard({ title, icon, content, color }) {
  const colors = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    slate: 'bg-slate-800/50 border-slate-700 text-slate-300'
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
