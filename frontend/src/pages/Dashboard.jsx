import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';
import { 
  User, 
  Activity, 
  AlertCircle, 
  Pill, 
  FileText, 
  Phone, 
  QrCode, 
  LogOut, 
  Save, 
  Lock, 
  ShieldCheck, 
  History, 
  KeyRound, 
  Eye,
  Download,
  CreditCard,
  Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchAuditLogs();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await request('/profile');
      setProfile({
        emergencyPin: '123456',
        prescriptions: '',
        doctorNotes: '',
        ...res.profile
      });
    } catch {
      navigate('/auth');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await request('/profile/audit-logs');
      if (res.logs) setAuditLogs(res.logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    if (profile.emergencyPin && !/^\d{6}$/.test(String(profile.emergencyPin).trim())) {
      setErrorMsg('Emergency PIN must be exactly 6 digits (e.g. 123456)');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await request('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      setProfile(res.profile);
      setMsg('Profile and Two-Tier privacy settings updated successfully!');
      setTimeout(() => setMsg(''), 4000);
      fetchAuditLogs();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const downloadWalletCardPDF = async () => {
    if (!profile) return;
    setGeneratingPdf(true);
    try {
      // Wallet card dimensions: 85.6mm x 54mm (Credit card / ID-1 standard)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [54, 85.6]
      });

      const patientId = profile.userId || localStorage.getItem('medqr_userId') || 'demo';
      const emergencyUrl = `${window.location.origin}/emergency/${patientId}`;

      // Generate QR Code data URL
      const qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
        margin: 1,
        width: 250,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // 1. Card Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 85.6, 54, 'F');

      // 2. Outer Border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.rect(0.5, 0.5, 84.6, 53, 'S');

      // 3. Top Emergency Header Bar (Vibrant Red)
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, 85.6, 10, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('EMERGENCY MEDICAL ID', 4, 6.8);

      doc.setFontSize(5.5);
      doc.text('HEALTHX SMART ID', 62, 6.8);

      // 4. Patient Name
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const fullName = (profile.fullName || 'PATIENT NAME').toUpperCase();
      doc.text(fullName.substring(0, 22), 4, 16.5);

      // 5. Blood Group Badge
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(4, 18.5, 22, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`BLOOD: ${profile.bloodGroup || 'UNK'}`, 5.5, 22.8);

      // 6. Emergency Contact
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.text('EMERGENCY PHONE', 4, 28);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(profile.emergencyContact || 'None Listed', 4, 32);

      // 7. Break-Glass PIN Box (Tier 2 Unlock)
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.3);
      doc.roundedRect(4, 35, 47, 12, 1, 1, 'FD');

      doc.setTextColor(180, 83, 9); // amber-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text('BREAK-GLASS PIN (DOCTOR UNLOCK)', 5.5, 38.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.text(`PIN: ${profile.emergencyPin || '123456'}`, 5.5, 44.5);

      // 8. QR Code Image
      doc.addImage(qrDataUrl, 'PNG', 54, 12, 28, 28);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.text('Scan for vitals & allergies', 53.5, 43);
      doc.text('Use PIN on site to view Rx', 53.5, 45.5);

      // 9. Bottom Footer Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 49.5, 85.6, 4.5, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.text('Wallet Emergency Card - Keep in wallet behind ID/Driver License', 4, 52.8);

      const filename = `Emergency_Card_${(profile.fullName || 'Patient').replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF card:', err);
      alert('Failed to generate PDF card. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-primary-600 w-6 h-6" />
            <span className="font-bold text-xl text-slate-800">HealthX MedQR</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadWalletCardPDF}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-rose-600/20 text-xs sm:text-sm active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'Download Emergency Card (PDF)'}</span>
              <span className="sm:hidden">{generatingPdf ? '...' : 'PDF Card'}</span>
            </button>
            <Link 
              to="/qr" 
              className="flex items-center gap-2 bg-primary-50 text-primary-700 font-semibold hover:bg-primary-100 px-3.5 py-2 rounded-xl transition-colors text-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>My QR Code</span>
            </Link>
            <button 
              onClick={handleLogout} 
              title="Logout"
              className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 space-y-8">
        
        {/* Main Profile & Privacy Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Header Banner */}
          <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black">Medical Profile & Privacy</h1>
                <p className="text-slate-300 text-sm mt-1">Configure your Two-Tier Emergency Privacy and clinical records.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Two-Tier Privacy Active
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {msg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium">
                <Save className="w-5 h-5 text-emerald-600 shrink-0" /> {msg}
              </div>
            )}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" /> {errorMsg}
              </div>
            )}

            {/* PRINTABLE WALLET CARD ACTION BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Printable Emergency Wallet Card</h3>
                  <p className="text-xs text-slate-300">Wallet-sized (85.6mm × 54mm) PDF ID with QR code, blood group, emergency contact & Break-Glass PIN.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadWalletCardPDF}
                disabled={generatingPdf}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all text-xs sm:text-sm flex items-center gap-2 active:scale-95 shrink-0"
              >
                {generatingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Emergency Card (PDF)</span>
                  </>
                )}
              </button>
            </div>

            {/* TIER 1 SECTION */}
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md uppercase">Tier 1: Public</span>
                  <h2 className="text-lg font-bold text-slate-800">First Responder Emergency Info</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Immediately visible when anyone scans your emergency QR code.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Full Name</label>
                  <input 
                    name="fullName" 
                    value={profile.fullName || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Blood Group</label>
                  <select 
                    name="bloodGroup" 
                    value={profile.bloodGroup || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Emergency Contact Phone</label>
                  <input 
                    name="emergencyContact" 
                    placeholder="+1 234 567 8900" 
                    value={profile.emergencyContact || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Critical Allergies (Red Highlighted)</label>
                  <input 
                    name="allergies" 
                    placeholder="e.g. Penicillin, Peanuts, Latex" 
                    value={profile.allergies || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-rose-200 bg-rose-50/30 rounded-xl outline-none focus:ring-2 focus:ring-rose-400 font-medium" 
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Chronic Medical Conditions</label>
                  <input 
                    name="conditions" 
                    placeholder="e.g. Type 1 Diabetes, Epilepsy, Asthma, Hypertension" 
                    value={profile.conditions || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* TIER 2 SECTION */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-md uppercase">Tier 2: Break-Glass</span>
                  <h2 className="text-lg font-bold text-slate-800">Protected Clinical Records & PIN</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Hidden from public scan. Revealed only when the 6-digit emergency PIN is verified.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-800 mb-1">
                        6-Digit Emergency Break-Glass PIN
                      </label>
                      <p className="text-xs text-slate-600 mb-3">
                        Share this PIN with your trusted family or emergency doctor so they can unlock your full prescriptions and physician notes.
                      </p>
                      <input 
                        name="emergencyPin" 
                        maxLength={6}
                        placeholder="123456" 
                        value={profile.emergencyPin || ''} 
                        onChange={(e) => setProfile({ ...profile, emergencyPin: e.target.value.replace(/\D/g, '') })}
                        className="w-48 px-4 py-2.5 border-2 border-amber-400 bg-white rounded-xl text-center text-xl font-black tracking-widest outline-none focus:ring-4 focus:ring-amber-500/20" 
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary-500"/> Prescriptions & Active Dosages (Tier 2 Locked)
                  </label>
                  <textarea 
                    name="prescriptions" 
                    rows="3" 
                    placeholder="e.g. Metformin 500mg twice daily with meals; Atorvastatin 20mg at bedtime..." 
                    value={profile.prescriptions || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none font-medium text-slate-800"
                  ></textarea>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500"/> Doctor Notes & Clinical History (Tier 2 Locked)
                  </label>
                  <textarea 
                    name="doctorNotes" 
                    rows="3" 
                    placeholder="e.g. Dr. Davis (Cardiology): Coronary stenting performed Nov 2023. Patient on blood thinners. Avoid NSAIDs." 
                    value={profile.doctorNotes || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none font-medium text-slate-800"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t flex justify-end">
              <button 
                onClick={saveProfile} 
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center gap-2 text-base"
              >
                {saving ? 'Saving...' : <><Save className="w-5 h-5" /> Save Privacy & Profile</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* SECURITY AUDIT LOGS CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-primary-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Security & Scan Audit Log</h3>
                <p className="text-xs text-slate-500">Real-time log of every QR scan and break-glass unlock attempt</p>
              </div>
            </div>
            <button 
              onClick={fetchAuditLogs} 
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              Refresh
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No scan or break-glass access events recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {auditLogs.slice(0, 10).map((log, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${log.accessTier === 'tier2_break_glass' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {log.accessTier === 'tier2_break_glass' ? 'Tier 2: Break-Glass Unlocked' : 'Tier 1: Emergency QR Scan'}
                      </p>
                      <p className="text-xs text-slate-400">
                        IP: <span className="font-mono text-slate-500">{log.ipAddress}</span> • Action: {log.action || 'scan'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
