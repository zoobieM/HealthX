import { Link } from 'react-router-dom';
import { HeartPulse, QrCode, ShieldAlert, Zap, ArrowRight, Activity, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HeartPulse className="text-primary-600 w-8 h-8 drop-shadow-sm" />
            <span className="font-extrabold text-2xl tracking-tight text-slate-800">MedQR<span className="text-primary-500">.ai</span></span>
          </div>
          <Link 
            to="/auth" 
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-100/50 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emergency-50 text-emergency-700 font-bold text-sm mb-6 border border-emergency-100">
              <Zap className="w-4 h-4" /> AI-Powered First Aid
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Your Life-Saving <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">
                Medical ID
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mt-6 leading-relaxed">
              Generate a secure QR code that instantly provides first responders with your critical health information and AI-guided emergency instructions.
            </p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              to="/auth" 
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Create Free Profile <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ScanLine className="w-5 h-5 text-slate-500" /> View Demo
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-900 py-24 text-white relative" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How MedQR Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Three simple steps to protect yourself in an emergency.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Activity />}
              step="1"
              title="Add Medical Data"
              desc="Securely store your blood group, allergies, conditions, and emergency contacts."
            />
            <FeatureCard 
              icon={<QrCode />}
              step="2"
              title="Get Your QR"
              desc="Download your unique QR code to keep as a lockscreen or physical card."
            />
            <FeatureCard 
              icon={<ShieldAlert />}
              step="3"
              title="Instant Scan & Alert"
              desc="Responders scan code to view info, get AI first-aid tips, and trigger SMS alerts."
              highlight={true}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, step, title, desc, highlight }) {
  return (
    <div className={`p-8 rounded-3xl relative overflow-hidden transition-transform duration-300 hover:-translate-y-2 ${highlight ? 'bg-gradient-to-b from-emergency-900/50 to-primary-900/40 border border-emergency-500/30' : 'bg-slate-800 border border-slate-700'}`}>
      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-primary-400">
        <div className="scale-150">{icon}</div>
      </div>
      <div className="absolute top-6 right-6 text-6xl font-black text-white/5">{step}</div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
