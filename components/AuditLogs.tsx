import React, { useState, useEffect } from 'react';
import { dbService } from '../services/databaseService';
import { ShieldCheck, Search, RefreshCw, Download, Trash2, Calendar, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'ERROR'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      toast.error("Erreur lors de la récupération des logs d'audit.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.info("Aucun log à exporter.");
      return;
    }

    const headers = ["Date", "Utilisateur", "Action", "Details", "Statut"];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp || l.date).toLocaleString('fr-FR'),
      l.user || l.userId || 'Inconnu',
      l.action,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.status || 'SUCCESS'
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport d'audit exporté en CSV !");
  };

  const handleClearLogs = async () => {
    if (window.confirm("Voulez-vous réinitialiser tous les journaux d'audit ?")) {
      try {
        await dbService.clearLogs();
        setLogs([]);
        toast.success("Journaux d'audit purgés avec succès !");
      } catch (e) {
        toast.error("Erreur lors de la purge.");
      }
    }
  };

  const filteredLogs = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    const actionMatch = (l.action || '').toLowerCase().includes(term);
    const userMatch = (l.user || l.userId || '').toLowerCase().includes(term);
    const detailsMatch = (l.details || '').toLowerCase().includes(term);
    const matchesSearch = actionMatch || userMatch || detailsMatch;

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && (l.status || 'SUCCESS') !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-pharmacy-600" />
            Journal d'Audit Système
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">
            Traçabilité des opérations sensibles, connexions et modifications de stocks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-pharmacy-600 hover:bg-pharmacy-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-pharmacy-600/20"
          >
            <Download size={14} />
            Exporter CSV
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
          >
            <Trash2 size={14} />
            Purger
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par action, utilisateur ou détail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-pharmacy-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase text-gray-400">Statut:</span>
            {(['ALL', 'SUCCESS', 'WARNING'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {st === 'ALL' ? 'Tous' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Horodatage</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilisateur / Auteur</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails de l'événement</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs font-bold">
                    Aucun enregistrement d'audit trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50/80 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {new Date(log.timestamp || log.date).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                          {(log.user || log.userId || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-gray-800">{log.user || log.userId || 'Système'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-md truncate">
                      {log.details || 'Opération enregistrée par le système'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
