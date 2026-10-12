
import React, { useState, useEffect } from 'react';
import { ViewState, Drug, Sale, User, UserRole, Supplier, Insurance, PendingOrder, Pharmacy } from './types';
import { INITIAL_USERS, INITIAL_PHARMACIES } from './constants';
import { dbService } from './services/databaseService';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import SalesHistory from './components/SalesHistory';
import Suppliers from './components/Suppliers';
import Insurances from './components/Insurances';
import DataExport from './components/DataExport';
import Orders from './components/Orders';
import CashClosing from './components/CashClosing';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SystemConfig from './components/SystemConfig';
import SystemSettings from './components/SystemSettings';
import AuditLogs from './components/AuditLogs';
import StoreSettings from './components/StoreSettings';

import { 
  LayoutDashboard, Package, ShoppingCart, Activity, LogOut, Users, 
  History, Truck, Database, ShoppingBag, Wallet,
  Building2, Globe, Loader2, Server, ShieldCheck,
  Menu, X as CloseIcon, Settings, Sliders, Store
} from 'lucide-react';

import { Toaster, toast } from 'sonner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showCashClosing, setShowCashClosing] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('App: Starting loadInitialData...');
      try {
        const [p, u] = await Promise.all([
          dbService.getPharmacies(),
          dbService.getUsers()
        ]);
        console.log('App: Initial data loaded successfully', { pharmaciesCount: p.length, usersCount: u.length });
        setPharmacies(p);
        setUsers(u);
      } catch (err) {
        console.error('App: Failed to load initial data:', err);
      } finally {
        console.log('App: loadInitialData finished, setting isLoading to false');
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadAppData = async () => {
      if (!currentUser) {
        console.log('App: No currentUser, skipping loadAppData');
        return;
      }
      console.log('App: Starting loadAppData for user:', currentUser.username);
      setIsLoading(true);
      try {
        const phId = currentUser.role === 'SUPER_ADMIN' ? undefined : currentUser.pharmacyId;
        const [d, s] = await Promise.all([
          dbService.getDrugs(phId),
          dbService.getSales(phId)
        ]);
        
        if (currentUser.pharmacyId) {
          const [sup, ins] = await Promise.all([
            dbService.getSuppliers(currentUser.pharmacyId),
            dbService.getInsurances(currentUser.pharmacyId)
          ]);
          setSuppliers(sup);
          setInsurances(ins);
        }

        console.log('App: App data loaded successfully', { drugsCount: d.length, salesCount: s.length });
        setDrugs(d);
        setSales(s);
      } catch (err) {
        console.error('App: Failed to load app data:', err);
      } finally {
        console.log('App: loadAppData finished, setting isLoading to false');
        setIsLoading(false);
      }
    };
    loadAppData();
  }, [currentUser]);

  const handleSaleComplete = async (sale: Sale) => {
    if (!currentUser) return;
    try {
      const completedSale = await dbService.createSale(sale, currentUser.id);
      setSales(prev => [completedSale, ...prev]);
      // Refresh stock
      const updatedDrugs = await dbService.getDrugs(currentUser.role === 'SUPER_ADMIN' ? undefined : currentUser.pharmacyId);
      setDrugs(updatedDrugs);
      toast.success(`Vente #${completedSale.id.slice(-6)} enregistrée avec succès !`);
    } catch (err) {
      console.error("Sale complete error:", err);
      toast.error("Erreur lors de l'enregistrement de la vente.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-pharmacy-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black uppercase tracking-widest text-[10px]">Initialisation du Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login users={users} pharmacies={pharmacies} onLogin={(user) => {
      setCurrentUser(user);
      if (user.role === 'SUPER_ADMIN') {
        setCurrentView(ViewState.SUPER_ADMIN_DASHBOARD);
      } else {
        setCurrentView(ViewState.DASHBOARD);
      }
    }} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case ViewState.SUPER_ADMIN_DASHBOARD:
        return <SuperAdminDashboard pharmacies={pharmacies} setPharmacies={setPharmacies} users={users} setUsers={setUsers} allDrugs={drugs} allSales={sales} />;
      case ViewState.DASHBOARD:
        return <Dashboard drugs={drugs} sales={sales} />;
      case ViewState.INVENTORY:
        return <Inventory drugs={drugs} setDrugs={setDrugs} currentUser={currentUser} />;
      case ViewState.POS:
        return <POS drugs={drugs} setDrugs={setDrugs} insurances={insurances} onSaleComplete={handleSaleComplete} currentUser={currentUser} pendingOrders={pendingOrders} setPendingOrders={setPendingOrders} pharmacies={pharmacies} />;
      case ViewState.USERS:
        return <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} pharmacies={pharmacies} />;
      case ViewState.SALES_HISTORY:
        return <SalesHistory sales={sales} pharmacies={pharmacies} />;
      case ViewState.SUPPLIERS:
        return <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} currentUser={currentUser} />;
      case ViewState.INSURANCES:
        return <Insurances insurances={insurances} setInsurances={setInsurances} currentUser={currentUser} />;
      case ViewState.EXPORTS:
        return <DataExport drugs={drugs} sales={sales} users={users} suppliers={suppliers} insurances={insurances} pharmacies={pharmacies} />;
      case ViewState.STORE_SETTINGS:
        return (
          <StoreSettings 
            currentUser={currentUser} 
            pharmacies={pharmacies} 
            onPharmacyUpdated={(updatedPharma) => {
              setPharmacies(prev => prev.map(p => p.id === updatedPharma.id ? updatedPharma : p));
            }} 
          />
        );
      case ViewState.SYSTEM_CONFIG:
        return (
          <SystemConfig 
            currentUser={currentUser} 
            pharmacies={pharmacies} 
            drugs={drugs} 
            sales={sales} 
            onDataRefresh={async () => {
              const phId = currentUser.role === 'SUPER_ADMIN' ? undefined : currentUser.pharmacyId;
              const [d, s] = await Promise.all([
                dbService.getDrugs(phId),
                dbService.getSales(phId)
              ]);
              setDrugs(d);
              setSales(s);
            }} 
          />
        );
      case ViewState.SETTINGS:
        return <SystemSettings />;
      case ViewState.AUDIT_LOGS:
        return <AuditLogs />;
      case ViewState.ORDERS:
        return <Orders drugs={drugs} suppliers={suppliers} />;
      default:
        return null;
    }
  };

  const NavItem = ({ view, icon: Icon, label, allowedRoles }: { view: ViewState, icon: any, label: string, allowedRoles: UserRole[] }) => {
    if (!allowedRoles.includes(currentUser.role)) return null;
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => {
          setCurrentView(view);
          setIsMobileMenuOpen(false);
        }} 
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-0.5 ${isActive ? 'bg-pharmacy-600 text-white shadow-lg' : 'text-gray-500 hover:bg-pharmacy-50 hover:text-pharmacy-700'}`}
      >
        <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
        <span className="font-bold text-[11px] uppercase tracking-tight">{label}</span>
      </button>
    );
  };

  const activePharmacy = currentUser.pharmacyId 
    ? pharmacies.find(p => p.id === currentUser.pharmacyId) 
    : pharmacies[0];

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      <Toaster position="top-right" richColors />
      {showCashClosing && <CashClosing sales={sales} currentUser={currentUser} onClose={() => setShowCashClosing(false)} pharmacies={pharmacies} />}
      
      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-pharmacy-600 text-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 bg-white/20 p-1 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
              {activePharmacy?.logo ? (
                <img src={activePharmacy.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Activity size={20} />
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none truncate">
                {activePharmacy?.name || 'Fasopharm'}
              </h1>
              <p className="text-[9px] text-pharmacy-100 font-black uppercase tracking-widest mt-0.5 truncate">
                {currentUser.role === 'SUPER_ADMIN' ? 'Supervision Réseau' : 'Officine Connectée'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {currentUser.role === 'SUPER_ADMIN' ? (
            <div className="space-y-1">
              <NavItem view={ViewState.SUPER_ADMIN_DASHBOARD} icon={Globe} label="Réseau Global" allowedRoles={['SUPER_ADMIN']} />
              <NavItem view={ViewState.USERS} icon={Users} label="Utilisateurs" allowedRoles={['SUPER_ADMIN', 'ADMIN']} />
              <NavItem view={ViewState.EXPORTS} icon={Database} label="Logs & Rapports" allowedRoles={['SUPER_ADMIN']} />
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Système</p>
                <NavItem view={ViewState.STORE_SETTINGS} icon={Store} label="Paramètres Boutique" allowedRoles={['SUPER_ADMIN']} />
                <NavItem view={ViewState.SYSTEM_CONFIG} icon={Sliders} label="Configuration" allowedRoles={['SUPER_ADMIN']} />
                <NavItem view={ViewState.SETTINGS} icon={Settings} label="Paramètres" allowedRoles={['SUPER_ADMIN']} />
                <NavItem view={ViewState.AUDIT_LOGS} icon={ShieldCheck} label="Audit Système" allowedRoles={['SUPER_ADMIN']} />
              </div>
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-gray-100">
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilotage</p>
                <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" allowedRoles={['ADMIN']} />
                <NavItem view={ViewState.POS} icon={ShoppingCart} label="Caisse" allowedRoles={['ADMIN', 'CASHIER', 'SELLER']} />
              </div>
              
              <div className="py-4 border-b border-gray-100">
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestion</p>
                <NavItem view={ViewState.INVENTORY} icon={Package} label="Stocks" allowedRoles={['ADMIN', 'AGENT', 'SELLER']} />
                <NavItem view={ViewState.ORDERS} icon={ShoppingBag} label="Commandes" allowedRoles={['ADMIN', 'AGENT']} />
                <NavItem view={ViewState.SUPPLIERS} icon={Truck} label="Fournisseurs" allowedRoles={['ADMIN']} />
                <NavItem view={ViewState.INSURANCES} icon={ShieldCheck} label="Assurances" allowedRoles={['ADMIN']} />
                <NavItem view={ViewState.SALES_HISTORY} icon={History} label="Historique" allowedRoles={['ADMIN']} />
                <NavItem view={ViewState.USERS} icon={Users} label="Utilisateurs" allowedRoles={['ADMIN']} />
                <NavItem view={ViewState.STORE_SETTINGS} icon={Store} label="Ma Boutique" allowedRoles={['ADMIN']} />
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Système</p>
                <NavItem view={ViewState.SYSTEM_CONFIG} icon={Database} label="Sauvegarde" allowedRoles={['ADMIN']} />
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div 
            onClick={() => {
              if (['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
                setCurrentView(ViewState.STORE_SETTINGS);
                setIsMobileMenuOpen(false);
              }
            }}
            className={`flex items-center gap-3 mb-4 p-2 bg-white rounded-xl border border-gray-100 shadow-sm transition ${
              ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) ? 'hover:border-pharmacy-300 hover:bg-pharmacy-50/60 cursor-pointer' : ''
            }`}
            title={['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) ? 'Gérer le nom et logo de la boutique' : undefined}
          >
             <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs overflow-hidden shrink-0 border border-gray-100 bg-white">
                {activePharmacy?.logo ? (
                  <img src={activePharmacy.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-pharmacy-100 text-pharmacy-600 flex items-center justify-center font-black">
                    {currentUser.fullName.charAt(0)}
                  </div>
                )}
             </div>
             <div className="overflow-hidden flex-1">
                <p className="text-[10px] font-black text-gray-800 truncate">{currentUser.fullName}</p>
                <p className="text-[9px] font-bold text-pharmacy-600 truncate">{activePharmacy?.name || 'Central'}</p>
             </div>
             {['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && (
               <Store size={14} className="text-gray-400 hover:text-pharmacy-600 shrink-0" />
             )}
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 hover:bg-red-50 rounded-xl transition text-[10px] font-black uppercase tracking-widest cursor-pointer">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-20 shrink-0">
          <div className="flex items-center gap-3 lg:gap-4">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition text-gray-500 cursor-pointer"
             >
               <Menu size={20} />
             </button>
             <h2 className="text-[11px] lg:text-xs font-black text-gray-800 uppercase tracking-tight truncate max-w-[150px] lg:max-w-none">
               {currentView.replace('_', ' ')}
             </h2>
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-pharmacy-50 rounded-full border border-pharmacy-100">
                {activePharmacy?.logo ? (
                  <img src={activePharmacy.logo} alt="Logo" className="w-3.5 h-3.5 object-contain rounded" />
                ) : (
                  <Store size={12} className="text-pharmacy-600" />
                )}
                <span className="text-[9px] font-black text-pharmacy-700 uppercase tracking-widest truncate max-w-[180px]">
                  {activePharmacy?.name || 'Officine'}
                </span>
             </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {['ADMIN', 'CASHIER'].includes(currentUser.role) && (
               <button onClick={() => setShowCashClosing(true)} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pharmacy-600 text-white rounded-xl text-[9px] lg:text-[10px] font-black uppercase hover:bg-pharmacy-700 transition shadow-lg shadow-pharmacy-600/20">
                   <Wallet size={14} />
                   <span className="hidden xs:inline">Clôture</span>
               </button>
            )}
            <div className="hidden xs:block w-px h-6 bg-gray-200 mx-1 lg:mx-2"></div>
            <div className="flex items-center gap-2 text-gray-400">
               <ShieldCheck size={16} />
               <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Secured</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-gray-50/50">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
