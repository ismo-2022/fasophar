import React, { useState } from 'react';
import { User, Pharmacy } from '../types';
import { INITIAL_USERS } from '../constants';
import { Lock, User as UserIcon, Activity, AlertCircle, ShieldAlert, Sparkles, Key } from 'lucide-react';

interface LoginProps {
  users: User[];
  pharmacies?: Pharmacy[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, pharmacies = [], onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPharmaSuspended, setIsPharmaSuspended] = useState(false);

  // Guarantee user pool is never empty
  const activeUsers = users && users.length > 0 ? users : INITIAL_USERS;

  const performLogin = (uName: string, pWord: string) => {
    setError('');
    setIsPharmaSuspended(false);

    const user = activeUsers.find(u => u.username === uName && u.password === pWord);
    
    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        onLogin(user);
        return;
      }

      if (user.pharmacyId) {
        const pharma = pharmacies.find(p => p.id === user.pharmacyId);
        if (pharma && pharma.status === 'SUSPENDED') {
          setIsPharmaSuspended(true);
          setError(`Accès révoqué : L'établissement "${pharma.name}" est actuellement suspendu par l'administration centrale.`);
          return;
        }
      }
      
      onLogin(user);
    } else {
      setError('Identifiants de connexion incorrects. Veuillez réessayer.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(username, password);
  };

  const handleQuickLogin = (uName: string, pWord: string) => {
    setUsername(uName);
    setPassword(pWord);
    performLogin(uName, pWord);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-pharmacy-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={120} />
          </div>
          <div className="inline-flex p-2.5 bg-white/20 rounded-2xl mb-3 backdrop-blur-md shadow-inner overflow-hidden w-16 h-16 items-center justify-center">
            {pharmacies && pharmacies.length > 0 && pharmacies[0].logo ? (
              <img src={pharmacies[0].logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Activity className="text-white w-9 h-9" />
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase truncate px-2">
            {pharmacies && pharmacies.length > 0 && pharmacies[0].name ? pharmacies[0].name : 'Fasopharm'}
          </h1>
          <p className="text-pharmacy-100 mt-1 text-xs font-medium tracking-wide">Infrastructure Cloud Pharmaceutique</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 bg-white">
          {error && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
                isPharmaSuspended ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isPharmaSuspended ? <ShieldAlert size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
              <p className="font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Identifiant Staff</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-300" />
                </div>
                <input
                  type="text"
                  required
                  className="pl-11 w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pharmacy-500 outline-none transition-all bg-gray-50/50 text-sm font-semibold"
                  placeholder="nom.utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Clé d'Accès</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-300" />
                </div>
                <input
                  type="password"
                  required
                  className="pl-11 w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pharmacy-500 outline-none transition-all bg-gray-50/50 text-sm font-semibold"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-pharmacy-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-pharmacy-700 transition duration-300 shadow-xl shadow-pharmacy-600/20 transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer"
          >
            S'authentifier
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Accès Rapide (1-Clic Démo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin', 'root')}
                className="p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl text-left transition cursor-pointer"
              >
                <p className="text-[10px] font-black text-indigo-700 uppercase">Super Admin</p>
                <p className="text-[9px] text-gray-400 font-mono">superadmin / root</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', '123')}
                className="p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-xl text-left transition cursor-pointer"
              >
                <p className="text-[10px] font-black text-purple-700 uppercase">Dr. Gérant</p>
                <p className="text-[9px] text-gray-400 font-mono">admin / 123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('vendeur', '123')}
                className="p-2.5 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-xl text-left transition cursor-pointer"
              >
                <p className="text-[10px] font-black text-orange-700 uppercase">Vendeur / Comptoir</p>
                <p className="text-[9px] text-gray-400 font-mono">vendeur / 123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('caisse', '123')}
                className="p-2.5 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl text-left transition cursor-pointer"
              >
                <p className="text-[10px] font-black text-green-700 uppercase">Caisse Principale</p>
                <p className="text-[9px] text-gray-400 font-mono">caisse / 123</p>
              </button>
            </div>
          </div>
        </form>
      </div>
      <p className="mt-6 text-gray-400 text-xs font-medium">© Fasopharm Cloud Infrastructure. Prêt à l'emploi.</p>
    </div>
  );
};

export default Login;
