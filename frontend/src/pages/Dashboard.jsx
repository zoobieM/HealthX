import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';
import { User, Activity, AlertCircle, Pill, FileText, Phone, QrCode, LogOut, Save, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await request('/profile');
      setProfile(res.profile);
    } catch {
      navigate('/auth');
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await request('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      setProfile(res.profile);
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-primary-600 w-6 h-6" />
            <span className="font-bold text-xl text-slate-800">MedQR AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/qr" className="flex items-center gap-2 text-primary-600 font-medium hover:bg-primary-50 px-3 py-2 rounded-lg transition-colors">
              <QrCode className="w-5 h-5" />
              <span className="hidden sm:inline">My QR Code</span>
            </Link>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h1 className="text-2xl sm:text-3xl font-bold relative z-10">Medical Profile</h1>
            <p className="text-slate-300 mt-2 relative z-10">Keep your information up to date for emergencies.</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {msg && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-2">
                <Save className="w-5 h-5" /> {msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <User className="text-primary-500 w-5 h-5" /> Basic Details
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                  <input name="fullName" value={profile.fullName} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Blood Group</label>
                  <select name="bloodGroup" value={profile.bloodGroup} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                    <option value="">Select</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Phone className="text-primary-500 w-5 h-5" /> Emergency Contact
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
                  <input name="emergencyContact" placeholder="+1 234 567 8900" value={profile.emergencyContact} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4 sm:col-span-2">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2 mt-4">
                  <AlertCircle className="text-red-500 w-5 h-5" /> Medical Details
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Allergies (comma separated)</label>
                  <input name="allergies" placeholder="Peanuts, Penicillin..." value={profile.allergies} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-red-400 border-red-100 bg-red-50/30" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Chronic Conditions</label>
                  <input name="conditions" placeholder="Epilepsy, Diabetes, Asthma..." value={profile.conditions} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-2"><Pill className="w-4 h-4 text-slate-400"/> Current Medications</label>
                  <textarea name="medications" rows="2" placeholder="List your current medications..." value={profile.medications} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> Past Medical History</label>
                  <textarea name="history" rows="2" placeholder="Major surgeries, past conditions..." value={profile.history} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
              <button 
                onClick={saveProfile} 
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {saving ? 'Saving...' : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
