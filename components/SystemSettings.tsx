import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Bell, Sliders, CheckCircle, Save, Store, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettingsProps {
  onSettingsSaved?: () => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ onSettingsSaved }) => {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('fasopharm_maintenance_mode') === 'true';
  });

  const [globalNotifications, setGlobalNotifications] = useState<boolean>(() => {
    return localStorage.getItem('fasopharm_global_notifications') !== 'false';
  });

  const [platformName, setPlatformName] = useState<string>(() => {
    return localStorage.getItem('fasopharm_platform_name') || 'Fasopharm Cloud';
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('fasopharm_currency') || 'FCFA';
  });

  const [stockThreshold, setStockThreshold] = useState<number>(() => {
    const val = localStorage.getItem('fasopharm_stock_threshold');
    return val ? parseInt(val) : 20;
  });

  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    return localStorage.getItem('fasopharm_auto_print') === 'true';
  });

  const handleToggleMaintenance = () => {
    const nextVal = !maintenanceMode;
    if (nextVal) {
      if (window.confirm("Activer le mode maintenance ? Seuls les comptes Super Administrateur pourront accéder aux données.")) {
        setMaintenanceMode(true);
        localStorage.setItem('fasopharm_maintenance_mode', 'true');
        toast.warning("Mode maintenance activé.");
      }
    } else {
      setMaintenanceMode(false);
      localStorage.setItem('fasopharm_maintenance_mode', 'false');
      toast.success("Mode maintenance désactivé. Accès rétabli pour tous les utilisateurs.");
    }
  };

  const handleToggleNotifications = () => {
    const nextVal = !globalNotifications;
    setGlobalNotifications(nextVal);
    localStorage.setItem('fasopharm_global_notifications', nextVal ? 'true' : 'false');
    toast.success(nextVal ? "Notifications système activées." : "Notifications système mises en sourdine.");
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fasopharm_platform_name', platformName);
    localStorage.setItem('fasopharm_currency', currency);
    localStorage.setItem('fasopharm_stock_threshold', stockThreshold.toString());
    localStorage.setItem('fasopharm_auto_print', autoPrintReceipt ? 'true' : 'false');

    toast.success("Paramètres généraux enregistrés avec succès !");
    if (onSettingsSaved) onSettingsSaved();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
          <Settings className="text-pharmacy-600" />
          Paramètres Généraux
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">
          Personnalisez le fonctionnement de la plateforme pour votre réseau d'officines.
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Module 1: Toggles */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-3">Contrôles Système</h3>

          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <ShieldAlert size={16} className={maintenanceMode ? 'text-amber-500' : 'text-gray-400'} />
                Mode Maintenance
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Désactiver l'accès pour tous les utilisateurs sauf Super Admin</p>
            </div>
            <button
              type="button"
              onClick={handleToggleMaintenance}
              className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                maintenanceMode ? 'bg-amber-500' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  maintenanceMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Bell size={16} className={globalNotifications ? 'text-pharmacy-600' : 'text-gray-400'} />
                Notifications Globales
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Activer les alertes système pour toutes les pharmacies en direct</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                globalNotifications ? 'bg-pharmacy-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  globalNotifications ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">Impression Automatique des Tickets</p>
              <p className="text-xs text-gray-400 mt-0.5">Ouvrir le dialogue d'impression directement après encaissement</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
              className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                autoPrintReceipt ? 'bg-pharmacy-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  autoPrintReceipt ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Module 2: Paramètres Opérationnels */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-3">Paramètres Opérationnels</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                Nom de la Plateforme
              </label>
              <input 
                type="text" 
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-pharmacy-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                Devise Monétaire
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-pharmacy-500"
              >
                <option value="FCFA">FCFA (Franc CFA)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                Seuil d'Alerte Stock Critique (unités)
              </label>
              <input 
                type="number" 
                min="1"
                max="1000"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(parseInt(e.target.value) || 20)}
                className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-pharmacy-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">Les produits sous cette quantité déclencheront une alerte de commande.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            className="px-8 py-4 bg-pharmacy-600 hover:bg-pharmacy-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-pharmacy-600/20 flex items-center gap-2 cursor-pointer transform active:scale-95"
          >
            <Save size={16} />
            Enregistrer les Paramètres
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;
