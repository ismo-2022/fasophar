import { Drug, Sale, User, Supplier, Insurance, Pharmacy, Broadcast } from '../types';
import { supabase } from './supabase';
import { 
  INITIAL_PHARMACIES, 
  INITIAL_USERS, 
  INITIAL_DRUGS, 
  INITIAL_SUPPLIERS, 
  INITIAL_INSURANCES 
} from '../constants';

const STORAGE_KEYS = {
  PHARMACIES: 'fasopharm_pharmacies',
  USERS: 'fasopharm_users',
  DRUGS: 'fasopharm_drugs',
  SALES: 'fasopharm_sales',
  SUPPLIERS: 'fasopharm_suppliers',
  INSURANCES: 'fasopharm_insurances',
  LOGS: 'fasopharm_logs',
  BROADCASTS: 'fasopharm_broadcasts'
};

const getLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[dbService] Error reading localStorage for ${key}:`, err);
    return defaultValue;
  }
};

const setLocal = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`[dbService] Error writing localStorage for ${key}:`, err);
  }
};

class DatabaseService {
  // --- PHARMACIES ---
  async getPharmacies(): Promise<Pharmacy[]> {
    try {
      const { data, error } = await supabase.from('pharmacies').select('*');
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.PHARMACIES, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getPharmacies fallback:', e);
    }
    return getLocal<Pharmacy[]>(STORAGE_KEYS.PHARMACIES, INITIAL_PHARMACIES);
  }

  async savePharmacy(pharmacy: Partial<Pharmacy>): Promise<Pharmacy> {
    const id = pharmacy.id || `pharma_${Date.now()}`;
    const list = getLocal<Pharmacy[]>(STORAGE_KEYS.PHARMACIES, INITIAL_PHARMACIES);
    const existing = list.find(p => p.id === id);

    const completePharma: Pharmacy = {
      id,
      name: pharmacy.name || existing?.name || 'Nouvelle Pharmacie',
      address: pharmacy.address !== undefined ? pharmacy.address : (existing?.address || ''),
      phone: pharmacy.phone !== undefined ? pharmacy.phone : (existing?.phone || ''),
      status: pharmacy.status || existing?.status || 'ACTIVE',
      createdAt: pharmacy.createdAt || existing?.createdAt || new Date(),
      logo: pharmacy.logo !== undefined ? pharmacy.logo : existing?.logo,
      ticketFooter: pharmacy.ticketFooter !== undefined ? pharmacy.ticketFooter : existing?.ticketFooter
    };

    // Update local immediately
    const existingIdx = list.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = completePharma;
    } else {
      list.push(completePharma);
    }
    setLocal(STORAGE_KEYS.PHARMACIES, list);

    // Sync Supabase in background
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .upsert({ ...pharmacy, id })
        .select()
        .single();
      if (!error && data) return { ...completePharma, ...data };
    } catch (e) {
      console.warn('[dbService] Supabase savePharmacy sync failed, using local:', e);
    }

    return completePharma;
  }

  async updatePharmacyProfile(id: string, updates: Partial<Pharmacy>, userId?: string): Promise<Pharmacy> {
    const updated = await this.savePharmacy({ ...updates, id });
    if (userId) {
      await this.logAction(
        userId,
        'UPDATE_STORE_PROFILE',
        `Mise à jour du profil de la boutique "${updated.name}" (Logo: ${updated.logo ? 'Oui' : 'Non'})`
      );
    }
    return updated;
  }

  async deletePharmacy(id: string): Promise<void> {
    const list = getLocal<Pharmacy[]>(STORAGE_KEYS.PHARMACIES, INITIAL_PHARMACIES).filter(p => p.id !== id);
    setLocal(STORAGE_KEYS.PHARMACIES, list);

    try {
      await supabase.from('pharmacies').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deletePharmacy sync failed:', e);
    }
  }

  // --- USERS ---
  async getUsers(pharmacyId?: string): Promise<User[]> {
    try {
      let query = supabase.from('users').select('*');
      if (pharmacyId) {
        query = query.eq('pharmacyId', pharmacyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.USERS, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getUsers fallback:', e);
    }

    const localUsers = getLocal<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (pharmacyId) {
      return localUsers.filter(u => u.pharmacyId === pharmacyId || u.role === 'SUPER_ADMIN');
    }
    return localUsers;
  }

  async saveUser(user: Partial<User>): Promise<User> {
    const id = user.id || `user_${Date.now()}`;
    const completeUser: User = {
      id,
      username: user.username || `user_${Date.now()}`,
      password: user.password || '123',
      fullName: user.fullName || 'Nouvel Agent',
      role: user.role || 'SELLER',
      pharmacyId: user.pharmacyId
    };

    const list = getLocal<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const existingIdx = list.findIndex(u => u.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...completeUser };
    } else {
      list.push(completeUser);
    }
    setLocal(STORAGE_KEYS.USERS, list);

    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({ ...user, id })
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dbService] Supabase saveUser sync failed, using local:', e);
    }

    return completeUser;
  }

  async deleteUser(id: string): Promise<void> {
    const list = getLocal<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).filter(u => u.id !== id);
    setLocal(STORAGE_KEYS.USERS, list);

    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deleteUser sync failed:', e);
    }
  }

  // --- DRUGS ---
  async getDrugs(pharmacyId?: string): Promise<Drug[]> {
    try {
      let query = supabase.from('drugs').select('*');
      if (pharmacyId) {
        query = query.eq('pharmacyId', pharmacyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.DRUGS, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getDrugs fallback:', e);
    }

    const localDrugs = getLocal<Drug[]>(STORAGE_KEYS.DRUGS, INITIAL_DRUGS);
    if (pharmacyId) {
      return localDrugs.filter(d => d.pharmacyId === pharmacyId);
    }
    return localDrugs;
  }

  async saveDrug(drug: Partial<Drug>, userId?: string): Promise<Drug> {
    const id = drug.id || `drug_${Date.now()}`;
    const completeDrug: Drug = {
      id,
      pharmacyId: drug.pharmacyId || 'pharma_1',
      name: drug.name || 'Produit sans nom',
      description: drug.description || '',
      price: Number(drug.price) || 0,
      stock: Number(drug.stock) || 0,
      category: drug.category || 'Général',
      dosage: drug.dosage || '',
      expiryDate: drug.expiryDate || new Date().toISOString().split('T')[0],
      supplierId: drug.supplierId
    };

    const list = getLocal<Drug[]>(STORAGE_KEYS.DRUGS, INITIAL_DRUGS);
    const existingIdx = list.findIndex(d => d.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...completeDrug };
    } else {
      list.push(completeDrug);
    }
    setLocal(STORAGE_KEYS.DRUGS, list);

    if (userId) {
      this.logAction(userId, 'SAVE_DRUG', `Produit ${completeDrug.name} mis à jour/créé`);
    }

    try {
      const { data, error } = await supabase
        .from('drugs')
        .upsert({ ...drug, id })
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dbService] Supabase saveDrug sync failed, using local:', e);
    }

    return completeDrug;
  }

  async deleteDrug(id: string, userId?: string): Promise<void> {
    const list = getLocal<Drug[]>(STORAGE_KEYS.DRUGS, INITIAL_DRUGS).filter(d => d.id !== id);
    setLocal(STORAGE_KEYS.DRUGS, list);

    if (userId) {
      this.logAction(userId, 'DELETE_DRUG', `Produit ${id} supprimé`);
    }

    try {
      await supabase.from('drugs').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deleteDrug sync failed:', e);
    }
  }

  // --- SALES ---
  async createSale(sale: Sale, userId: string): Promise<Sale> {
    const id = sale.id || `S${Date.now().toString().slice(-8)}`;
    const completeSale: Sale = {
      ...sale,
      id,
      timestamp: sale.timestamp || new Date()
    };

    // 1. Enregistrer localement la vente
    const list = getLocal<Sale[]>(STORAGE_KEYS.SALES, []);
    list.unshift(completeSale);
    setLocal(STORAGE_KEYS.SALES, list);

    // 2. Décrémenter le stock localement
    const drugsList = getLocal<Drug[]>(STORAGE_KEYS.DRUGS, INITIAL_DRUGS);
    for (const item of sale.items) {
      const targetDrug = drugsList.find(d => d.id === item.id);
      if (targetDrug) {
        targetDrug.stock = Math.max(0, targetDrug.stock - item.quantity);
      }
    }
    setLocal(STORAGE_KEYS.DRUGS, drugsList);

    // 3. Log
    this.logAction(userId, 'CREATE_SALE', `Vente ${completeSale.id} enregistrée (${completeSale.total} F)`);

    // 4. Tenter Supabase
    try {
      await supabase.from('sales').insert({
        ...completeSale,
        items: completeSale.items
      });

      for (const item of sale.items) {
        const { data: drug } = await supabase
          .from('drugs')
          .select('stock')
          .eq('id', item.id)
          .single();
        if (drug) {
          await supabase
            .from('drugs')
            .update({ stock: Math.max(0, drug.stock - item.quantity) })
            .eq('id', item.id);
        }
      }
    } catch (e) {
      console.warn('[dbService] Supabase createSale sync failed, saved locally:', e);
    }

    return completeSale;
  }

  async getSales(pharmacyId?: string): Promise<Sale[]> {
    try {
      let query = supabase.from('sales').select('*').order('timestamp', { ascending: false });
      if (pharmacyId) {
        query = query.eq('pharmacyId', pharmacyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.SALES, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getSales fallback:', e);
    }

    const localSales = getLocal<Sale[]>(STORAGE_KEYS.SALES, []);
    if (pharmacyId) {
      return localSales.filter(s => s.pharmacyId === pharmacyId);
    }
    return localSales;
  }

  // --- SUPPLIERS ---
  async getSuppliers(pharmacyId?: string): Promise<Supplier[]> {
    try {
      let query = supabase.from('suppliers').select('*');
      if (pharmacyId) {
        query = query.eq('pharmacyId', pharmacyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.SUPPLIERS, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getSuppliers fallback:', e);
    }

    const localSuppliers = getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    if (pharmacyId) {
      return localSuppliers.filter(s => s.pharmacyId === pharmacyId);
    }
    return localSuppliers;
  }

  async saveSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const id = supplier.id || `sup_${Date.now()}`;
    const completeSupplier: Supplier = {
      id,
      pharmacyId: supplier.pharmacyId || 'pharma_1',
      name: supplier.name || 'Nouveau Fournisseur',
      contact: supplier.contact || '',
      email: supplier.email || '',
      address: supplier.address || ''
    };

    const list = getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    const existingIdx = list.findIndex(s => s.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...completeSupplier };
    } else {
      list.push(completeSupplier);
    }
    setLocal(STORAGE_KEYS.SUPPLIERS, list);

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .upsert({ ...supplier, id })
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dbService] Supabase saveSupplier sync failed:', e);
    }

    return completeSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    const list = getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS).filter(s => s.id !== id);
    setLocal(STORAGE_KEYS.SUPPLIERS, list);

    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deleteSupplier sync failed:', e);
    }
  }

  // --- INSURANCES ---
  async getInsurances(pharmacyId?: string): Promise<Insurance[]> {
    try {
      let query = supabase.from('insurances').select('*');
      if (pharmacyId) {
        query = query.eq('pharmacyId', pharmacyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.INSURANCES, data);
        return data;
      }
    } catch (e) {
      console.warn('[dbService] Supabase getInsurances fallback:', e);
    }

    const localInsurances = getLocal<Insurance[]>(STORAGE_KEYS.INSURANCES, INITIAL_INSURANCES);
    if (pharmacyId) {
      return localInsurances.filter(i => i.pharmacyId === pharmacyId);
    }
    return localInsurances;
  }

  async saveInsurance(insurance: Partial<Insurance>): Promise<Insurance> {
    const id = insurance.id || `ins_${Date.now()}`;
    const completeInsurance: Insurance = {
      id,
      pharmacyId: insurance.pharmacyId || 'pharma_1',
      name: insurance.name || 'Nouvelle Assurance',
      defaultCoverage: Number(insurance.defaultCoverage) || 80
    };

    const list = getLocal<Insurance[]>(STORAGE_KEYS.INSURANCES, INITIAL_INSURANCES);
    const existingIdx = list.findIndex(i => i.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...completeInsurance };
    } else {
      list.push(completeInsurance);
    }
    setLocal(STORAGE_KEYS.INSURANCES, list);

    try {
      const { data, error } = await supabase
        .from('insurances')
        .upsert({ ...insurance, id })
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dbService] Supabase saveInsurance sync failed:', e);
    }

    return completeInsurance;
  }

  async deleteInsurance(id: string): Promise<void> {
    const list = getLocal<Insurance[]>(STORAGE_KEYS.INSURANCES, INITIAL_INSURANCES).filter(i => i.id !== id);
    setLocal(STORAGE_KEYS.INSURANCES, list);

    try {
      await supabase.from('insurances').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deleteInsurance sync failed:', e);
    }
  }

  // --- LOGGING & AUDIT ---
  async logAction(userId: string, action: string, details: string) {
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    };

    const logs = getLocal<any[]>(STORAGE_KEYS.LOGS, [
      { id: '1', date: new Date().toISOString(), user: 'SuperAdmin', action: 'Initialisation Système', details: 'Démarrage du Cloud', status: 'SUCCESS', timestamp: new Date().toISOString() },
      { id: '2', date: new Date().toISOString(), user: 'Dr. Sawadogo', action: 'Connexion', details: 'Session officine ouverte', status: 'SUCCESS', timestamp: new Date().toISOString() }
    ]);
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop();
    setLocal(STORAGE_KEYS.LOGS, logs);

    try {
      await supabase.from('logs').insert({
        userId,
        action,
        details,
        timestamp: newLog.timestamp
      });
    } catch (error) {
      // Ignore background log error
    }
  }

  async getAuditLogs(pharmacyId?: string) {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.LOGS, data);
        return data;
      }
    } catch (e) {
      // fallback
    }

    return getLocal<any[]>(STORAGE_KEYS.LOGS, [
      { id: '1', timestamp: new Date().toISOString(), userId: 'super_1', user: 'Directeur Général', action: 'Connexion réussie', details: 'Console centrale', status: 'SUCCESS' },
      { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), userId: 'admin_1', user: 'Dr. Sawadogo', action: 'Vérification inventaire', details: 'Contrôle automatique', status: 'SUCCESS' },
      { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), userId: 'system', user: 'Système Cloud', action: 'Synchronisation automatique', details: 'Sauvegarde des transactions', status: 'SUCCESS' }
    ]);
  }

  async clearLogs(): Promise<void> {
    setLocal(STORAGE_KEYS.LOGS, []);
    try {
      await supabase.from('logs').delete().neq('id', 0);
    } catch (e) {
      // local cleared
    }
  }

  // --- BACKUP & RESTORE ---
  async getBackupData(pharmacyId?: string) {
    const backup: Record<string, any[]> = {
      pharmacies: getLocal(STORAGE_KEYS.PHARMACIES, INITIAL_PHARMACIES),
      users: getLocal(STORAGE_KEYS.USERS, INITIAL_USERS),
      drugs: getLocal(STORAGE_KEYS.DRUGS, INITIAL_DRUGS),
      sales: getLocal(STORAGE_KEYS.SALES, []),
      suppliers: getLocal(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
      insurances: getLocal(STORAGE_KEYS.INSURANCES, INITIAL_INSURANCES),
      broadcasts: getLocal(STORAGE_KEYS.BROADCASTS, []),
      logs: getLocal(STORAGE_KEYS.LOGS, [])
    };

    if (pharmacyId) {
      backup.drugs = backup.drugs.filter(d => d.pharmacyId === pharmacyId);
      backup.sales = backup.sales.filter(s => s.pharmacyId === pharmacyId);
      backup.suppliers = backup.suppliers.filter(s => s.pharmacyId === pharmacyId);
      backup.insurances = backup.insurances.filter(i => i.pharmacyId === pharmacyId);
      backup.users = backup.users.filter(u => u.pharmacyId === pharmacyId);
    }

    return backup;
  }

  async restoreBackupData(backup: Record<string, any[]>, userId: string) {
    if (backup.pharmacies) setLocal(STORAGE_KEYS.PHARMACIES, backup.pharmacies);
    if (backup.users) setLocal(STORAGE_KEYS.USERS, backup.users);
    if (backup.drugs) setLocal(STORAGE_KEYS.DRUGS, backup.drugs);
    if (backup.sales) setLocal(STORAGE_KEYS.SALES, backup.sales);
    if (backup.suppliers) setLocal(STORAGE_KEYS.SUPPLIERS, backup.suppliers);
    if (backup.insurances) setLocal(STORAGE_KEYS.INSURANCES, backup.insurances);
    if (backup.broadcasts) setLocal(STORAGE_KEYS.BROADCASTS, backup.broadcasts);

    const tables = ['pharmacies', 'users', 'suppliers', 'insurances', 'drugs', 'sales'];
    for (const table of tables) {
      if (backup[table] && backup[table].length > 0) {
        try {
          await supabase.from(table).upsert(backup[table]);
        } catch (e) {
          console.warn(`[dbService] Supabase restore table ${table} failed:`, e);
        }
      }
    }

    await this.logAction(userId, 'RESTORE_BACKUP', `Restauration complète effectuée (${Object.keys(backup).length} modules)`);
  }

  // --- BROADCASTS ---
  async getBroadcasts(): Promise<Broadcast[]> {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) {
        setLocal(STORAGE_KEYS.BROADCASTS, data);
        return data;
      }
    } catch (e) {
      // fallback
    }
    return getLocal<Broadcast[]>(STORAGE_KEYS.BROADCASTS, [
      {
        id: 'bc_1',
        title: 'Campagne de Réapprovisionnement',
        message: 'Pensez à vérifier vos niveaux de stock avant le week-end.',
        type: 'INFO',
        timestamp: new Date(),
        authorId: 'Administration'
      }
    ]);
  }

  async saveBroadcast(broadcast: Partial<Broadcast>): Promise<Broadcast> {
    const id = broadcast.id || `bc_${Date.now()}`;
    const completeBc: Broadcast = {
      id,
      title: broadcast.title || 'Annonce',
      message: broadcast.message || '',
      type: broadcast.type || 'INFO',
      timestamp: broadcast.timestamp || new Date(),
      authorId: broadcast.authorId || 'Système'
    };

    const list = getLocal<Broadcast[]>(STORAGE_KEYS.BROADCASTS, []);
    list.unshift(completeBc);
    setLocal(STORAGE_KEYS.BROADCASTS, list);

    try {
      await supabase.from('broadcasts').upsert(completeBc);
    } catch (e) {
      console.warn('[dbService] Supabase saveBroadcast sync failed:', e);
    }

    return completeBc;
  }

  async deleteBroadcast(id: string): Promise<void> {
    const list = getLocal<Broadcast[]>(STORAGE_KEYS.BROADCASTS, []).filter(b => b.id !== id);
    setLocal(STORAGE_KEYS.BROADCASTS, list);

    try {
      await supabase.from('broadcasts').delete().eq('id', id);
    } catch (e) {
      console.warn('[dbService] Supabase deleteBroadcast sync failed:', e);
    }
  }

  // --- SYSTEM UTILITIES ---
  async optimizeDatabase(): Promise<{ cleanedLogs: number; totalRecords: number; latencyMs: number }> {
    const startTime = performance.now();
    const logs = getLocal<any[]>(STORAGE_KEYS.LOGS, []);
    const initialLogCount = logs.length;
    // Keep most recent 50 logs
    const cleaned = logs.slice(0, 50);
    setLocal(STORAGE_KEYS.LOGS, cleaned);

    const pharmacies = getLocal<any[]>(STORAGE_KEYS.PHARMACIES, []);
    const users = getLocal<any[]>(STORAGE_KEYS.USERS, []);
    const drugs = getLocal<any[]>(STORAGE_KEYS.DRUGS, []);
    const sales = getLocal<any[]>(STORAGE_KEYS.SALES, []);

    const totalRecords = pharmacies.length + users.length + drugs.length + sales.length + cleaned.length;
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      cleanedLogs: Math.max(0, initialLogCount - cleaned.length),
      totalRecords,
      latencyMs
    };
  }

  clearCache(): void {
    const backupUsers = getLocal(STORAGE_KEYS.USERS, INITIAL_USERS);
    const backupPharmas = getLocal(STORAGE_KEYS.PHARMACIES, INITIAL_PHARMACIES);
    sessionStorage.clear();
    // Keep credentials and fundamental setup
    setLocal(STORAGE_KEYS.USERS, backupUsers);
    setLocal(STORAGE_KEYS.PHARMACIES, backupPharmas);
  }

  resetStats(): void {
    setLocal(STORAGE_KEYS.SALES, []);
    // Reset stock to default demo level
    setLocal(STORAGE_KEYS.DRUGS, INITIAL_DRUGS);
  }
}

export const dbService = new DatabaseService();
