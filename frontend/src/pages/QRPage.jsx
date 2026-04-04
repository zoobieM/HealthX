import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QRPage() {
  const [userId, setUserId] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('medqr_userId');
    if (id) {
      setUserId(id);
      const emergencyUrl = `${window.location.origin}/emergency/${id}`;
      setUrl(emergencyUrl);
    }
  }, []);

  if (!userId) return <div className="p-8 text-center">Please login first.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg text-slate-800 flex-1">Your Emergency QR</h1>
        </div>

        <div className="p-8 pb-10 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 mb-8 inline-block relative group">
            <QRCodeSVG 
              value={url} 
              size={220} 
              level={"H"}
              includeMargin={true}
              className="rounded-xl"
            />
            <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
               <button className="bg-white text-slate-800 p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                 <Download className="w-6 h-6" />
               </button>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">Save to Lockscreen</h2>
          <p className="text-slate-500 mb-6 text-sm px-4">
            Print this code, add it to your Apple/Google Wallet, or set it as your lock screen wallpaper to ensure first responders can scan it instantly.
          </p>

          <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500 truncate">{url}</span>
            <Link 
              to={`/emergency/${userId}`}
              target="_blank"
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Test Link <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-2 text-left text-xs text-slate-500 bg-blue-50 p-3 rounded-lg text-blue-800">
            <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <p>Your medical information is securely accessible via this QR code in case of an emergency without requiring a password.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
