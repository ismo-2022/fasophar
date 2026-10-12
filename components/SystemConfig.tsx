import React, { useState } from 'react';
import { dbService } from '../services/databaseService';
import { User, Pharmacy, Drug, Sale } from '../types';
import { 
  Database, Server, RefreshCw, Download, Upload, CheckCircle, 
  AlertTriangle, ShieldCheck, Activity, Trash2, Cpu, HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemConfigProps {
  currentUser: User;
  pharmacies: Pharmacy[];
  drugs: Drug[];
  sales: Sale[];
  onDataRefresh?: () => void;
}

const SystemConfig: React.FC<SystemConfigProps> = ({ 
  currentUser, 
  pharmacies, 
  drugs, 
  sales,
  onDataRefresh 
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    cleanedLogs: number;
    totalRecords: number;
    latencyMs: number;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      // Simulate thorough indexing and cleanup
      const stats = await dbService.optimizeDatabase();
      setOptimizationStats(stats);
      toast.success(`Optimisation réussie : ${stats.totalRecords} enregistrements indexés (${stats.latencyMs}ms)`);
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      toast.error("Erreur lors de l'optimisation de la base.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleBackup = async () => {
    try {
      const data = await dbService.getBackupData(currentUser.role === 'SUPER_ADMIN' ? undefined : currentUser.pharmacyId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sauvegarde_fasopharm_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Sauvegarde téléchargée avec succès !");
    } catch (err) {
      toast.error("Échec du téléchargement de la sauvegarde.");
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsRestoring(true);
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error("Format de fichier JSON invalide");
        }
        await dbService.restoreBackupData(parsed, currentUser.id);
        toast.success("Restauration complète effectuée avec succès !");
        if (onDataRefresh) onDataRefresh();
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast.error("Fichier de sauvegarde invalide ou corrompu.");
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearLogs = async () => {
    if (window.confirm("Voulez-vous vraiment purger les logs anciens du système ?")) {
      try {
        await dbService.clearLogs();
        toast.success("Logs purgés avec succès !");
      } catch (err) {
        toast.error("Erreur lors de la purge des logs.");
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto">
      <div>
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
          <Database className="text-pharmacy-600" />
          Configuration & Maintenance Système
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">
          Surveillance du stockage, intégrité des tables et sauvegardes décentralisées.
        </p>
      </div>

      {/* Cloud Health & Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Server size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">État Serveur</p>
            <p className="text-base font-black text-gray-800">Connecté & Actif</p>
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 uppercase mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Synchronisé
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Références Produits</p>
            <p className="text-base font-black text-gray-800">{drugs.length} Articles</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Catalogue officine</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <HardDrive size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Transactions Enregistrées</p>
            <p className="text-base font-black text-gray-800">{sales.length} Ventes</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Historique persistant</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Points de Vente</p>
            <p className="text-base font-black text-gray-800">{pharmacies.length} Officines</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Réseau géré</p>
          </div>
        </div>
      </div>

      {/* Main Operations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Base de Données */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-pharmacy-50 text-pharmacy-600 rounded-xl">
                <RefreshCw size={20} className={isOptimizing ? 'animate-spin' : ''} />
              </div>
              <h3 className="font-black text-gray-800 text-lg">Optimisation & Indexation DB</h3>
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">
              Vérifie l'intégrité relationnelle, compacte le cache local, met à jour les index de recherche pour les médicaments et optimise la vitesse des requêtes.
            </p>

            {optimizationStats && (
              <div className="mt-4 p-4 bg-pharmacy-50/70 border border-pharmacy-100 rounded-2xl space-y-1 animate-fade-in">
                <p className="text-xs font-bold text-pharmacy-800 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-pharmacy-600" />
                  Dernier diagnostic complet :
                </p>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-white p-2 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Indexés</p>
                    <p className="text-xs font-black text-gray-800">{optimizationStats.totalRecords}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Latence</p>
                    <p className="text-xs font-black text-gray-800">{optimizationStats.latencyMs} ms</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Nettoyés</p>
                    <p className="text-xs font-black text-gray-800">{optimizationStats.cleanedLogs} logs</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleOptimize} 
            disabled={isOptimizing}
            className="w-full py-4 bg-pharmacy-600 hover:bg-pharmacy-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-pharmacy-600/20 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
          >
            <RefreshCw size={16} className={isOptimizing ? 'animate-spin' : ''} />
            {isOptimizing ? 'Optimisation en cours...' : 'Optimiser la Base Maintenant'}
          </button>
        </div>

        {/* Card 2: Sauvegardes & Restauration */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Download size={20} />
              </div>
              <h3 className="font-black text-gray-800 text-lg">Sauvegarde & Restauration</h3>
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">
              Exportez une copie intégrale de vos données en JSON (stocks, ventes, clients, comptes) pour archivage sécurisé hors-ligne ou restauration instantanée.
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleBackup} 
              className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-md flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
            >
              <Download size={16} />
              Télécharger Sauvegarde Complète (JSON)
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json"
              onChange={handleRestoreFile} 
              className="hidden" 
              id="restore-file-input"
            />
            <label 
              htmlFor="restore-file-input"
              className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Upload size={16} />
              {isRestoring ? 'Restauration...' : 'Restaurer depuis un Fichier JSON'}
            </label>
          </div>
        </div>
      </div>

      {/* Maintenance & Purge */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-black text-gray-800 text-base flex items-center gap-2">
            <Trash2 size={18} className="text-red-500" />
            Maintenance & Purge des Logs
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Supprime les traces d'audit et les journaux de session temporaires pour libérer de l'espace.
          </p>
        </div>
        <button 
          onClick={handleClearLogs}
          className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest transition shrink-0 cursor-pointer"
        >
          Purger les Logs
        </button>
      </div>
    </div>
  );
};

export default SystemConfig;
