import React, { useState, useEffect, useRef } from 'react';
import { Pharmacy, User } from '../types';
import { dbService } from '../services/databaseService';
import { 
  Store, Upload, Trash2, CheckCircle2, Building2, Phone, MapPin, 
  Receipt, Eye, Sparkles, Image as ImageIcon, ShieldCheck, RefreshCw,
  HeartPulse, Pill, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreSettingsProps {
  currentUser: User;
  pharmacies: Pharmacy[];
  onPharmacyUpdated: (updatedPharmacy: Pharmacy) => void;
}

// Preset vector logos for instant selection if the admin doesn't have an image ready
const PRESET_LOGOS = [
  {
    id: 'green_cross',
    name: 'Croix Verte Officine',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2316a34a"/><rect x="40" y="18" width="20" height="64" rx="6" fill="white"/><rect x="18" y="40" width="64" height="20" rx="6" fill="white"/><circle cx="50" cy="50" r="7" fill="%2316a34a"/></svg>`
  },
  {
    id: 'caduceus_gold',
    name: 'Caducée & Serpent',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230f172a"/><circle cx="50" cy="50" r="42" fill="none" stroke="%23f59e0b" stroke-width="3"/><path d="M50 20 L50 80 M42 35 C42 28 58 28 58 35 C58 45 42 45 42 55 C42 65 58 65 58 75" fill="none" stroke="%2310b981" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="22" r="5" fill="%23f59e0b"/></svg>`
  },
  {
    id: 'mortar_pestle',
    name: 'Mortier Traditionnel',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%23047857"/><path d="M25 45 C25 70 38 80 50 80 C62 80 75 70 75 45 Z" fill="white"/><path d="M20 40 C20 37 80 37 80 40 L75 46 L25 46 Z" fill="white"/><line x1="68" y1="20" x2="48" y2="60" stroke="%23fbbf24" stroke-width="8" stroke-linecap="round"/></svg>`
  },
  {
    id: 'capsule_heart',
    name: 'Santé & Gélule',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%232563eb"/><path d="M30 50 C30 35 45 20 60 35 L70 45 C80 55 70 70 60 80 L50 70 Z" fill="none" stroke="white" stroke-width="6"/><circle cx="45" cy="45" r="8" fill="%23ec4899"/><path d="M50 30 L50 50 M40 40 L60 40" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>`
  }
];

const StoreSettings: React.FC<StoreSettingsProps> = ({ 
  currentUser, 
  pharmacies, 
  onPharmacyUpdated 
}) => {
  // If Super Admin, allow selecting which pharmacy to edit; otherwise default to currentUser.pharmacyId
  const [selectedPharmaId, setSelectedPharmaId] = useState<string>(() => {
    if (currentUser.pharmacyId) return currentUser.pharmacyId;
    return pharmacies[0]?.id || '';
  });

  const currentPharmacy = pharmacies.find(p => p.id === selectedPharmaId) || pharmacies[0];

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketFooter, setTicketFooter] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<'HEADER' | 'RECEIPT'>('HEADER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentPharmacy) {
      setName(currentPharmacy.name || '');
      setAddress(currentPharmacy.address || '');
      setPhone(currentPharmacy.phone || '');
      setTicketFooter(currentPharmacy.ticketFooter || 'Merci de votre confiance • Bon rétablissement');
      setLogo(currentPharmacy.logo || null);
    }
  }, [currentPharmacy?.id, currentPharmacy?.name, currentPharmacy?.logo]);

  // Handle image upload with auto-resizing via Canvas to keep data lightweight & crisp
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image valide (PNG, JPEG, SVG ou WebP).");
      return;
    }

    // Limit original size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 10 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // If SVG, save directly
      if (file.type.includes('svg')) {
        setLogo(result);
        toast.success("Logo SVG chargé avec succès !");
        return;
      }

      // Resize bitmap images to optimal logo resolution (max 400x400)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.9);
          setLogo(compressed);
          toast.success("Logo importé et optimisé avec succès !");
        } else {
          setLogo(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPharmacy) return;
    if (!name.trim()) {
      toast.error("Le nom de la boutique ne peut pas être vide.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await dbService.updatePharmacyProfile(
        currentPharmacy.id,
        {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          ticketFooter: ticketFooter.trim(),
          logo: logo || undefined
        },
        currentUser.id
      );

      onPharmacyUpdated(updated);
      toast.success(`Boutique "${updated.name}" mise à jour avec succès !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement des modifications.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info("Logo supprimé. N'oubliez pas d'enregistrer.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pharmacy-600 text-white rounded-2xl shadow-lg shadow-pharmacy-600/20">
              <Store size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                Paramètres de la Boutique
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Personnalisez le nom, le logo officiel et les coordonnées imprimées sur les reçus
              </p>
            </div>
          </div>
        </div>

        {/* Pharmacy selector for Super Admin */}
        {currentUser.role === 'SUPER_ADMIN' && pharmacies.length > 1 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
            <Building2 size={16} className="text-indigo-600" />
            <select
              value={selectedPharmaId}
              onChange={(e) => setSelectedPharmaId(e.target.value)}
              className="bg-transparent text-xs font-black uppercase text-gray-700 outline-none pr-3 py-1 cursor-pointer"
            >
              {pharmacies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Name, Logo & Details (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Card 1: Nom & Identité */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-3 flex items-center gap-2">
              <Store size={15} className="text-pharmacy-600" />
              Identité de l'Officine
            </h3>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                Nom officiel de la boutique / Pharmacie <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pharmacie du Progrès"
                className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-pharmacy-500 focus:bg-white transition"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Ce nom s'affichera sur toute la plateforme, l'en-tête du logiciel et sur tous les reçus de caisse.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400" />
                  Adresse géographique
                </label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Secteur 15, Ouagadougou"
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-pharmacy-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  Contact Téléphonique
                </label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +226 25 30 00 00"
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-pharmacy-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                <Receipt size={13} className="text-gray-400" />
                Message en pied de ticket
              </label>
              <input 
                type="text" 
                value={ticketFooter}
                onChange={(e) => setTicketFooter(e.target.value)}
                placeholder="Ex: Merci de votre confiance • Bon rétablissement !"
                className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-pharmacy-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Card 2: Logo Upload & Preset Selection */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <ImageIcon size={15} className="text-pharmacy-600" />
                Logo Officiel de la Boutique
              </h3>
              {logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 size={13} /> Supprimer le logo
                </button>
              )}
            </div>

            {/* Dropzone & Preview Box */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-3xl transition flex flex-col sm:flex-row items-center gap-6 ${
                logo ? 'border-pharmacy-200 bg-pharmacy-50/30' : 'border-gray-200 bg-gray-50 hover:bg-gray-100/60'
              }`}
            >
              {/* Current Logo Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden p-2">
                  {logo ? (
                    <img 
                      src={logo} 
                      alt="Logo Boutique" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-2 text-gray-400">
                      <Store size={32} className="mx-auto text-gray-300 mb-1" />
                      <span className="text-[9px] font-black uppercase">Aucun logo</span>
                    </div>
                  )}
                </div>
                {logo && (
                  <div className="absolute -top-2 -right-2 bg-pharmacy-600 text-white p-1 rounded-full shadow">
                    <Check size={12} />
                  </div>
                )}
              </div>

              {/* Upload CTA */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h4 className="text-sm font-bold text-gray-800">
                  {logo ? "Changer l'image du logo" : "Importer le logo de votre boutique"}
                </h4>
                <p className="text-xs text-gray-500">
                  Glissez-déposez votre fichier ici, ou parcourez depuis votre appareil. Formats acceptés : PNG, JPG, SVG, WebP.
                </p>

                <div className="pt-2">
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                    id="store-logo-file"
                  />
                  <label 
                    htmlFor="store-logo-file"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-pharmacy-600 hover:bg-pharmacy-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-pharmacy-600/20 cursor-pointer transform active:scale-95"
                  >
                    <Upload size={14} />
                    Choisir un fichier
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Preset Selector */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" />
                Ou choisissez un emblème pharmaceutique prédéfini :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_LOGOS.map((preset) => {
                  const isSelected = logo === preset.svg;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setLogo(preset.svg);
                        toast.success(`Emblème "${preset.name}" sélectionné !`);
                      }}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                        isSelected 
                          ? 'border-pharmacy-600 bg-pharmacy-50 ring-2 ring-pharmacy-600/20' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <img src={preset.svg} alt={preset.name} className="w-10 h-10 object-contain" />
                      <span className="text-[10px] font-black uppercase text-gray-700 truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-4 bg-pharmacy-600 hover:bg-pharmacy-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-xl shadow-pharmacy-600/25 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Enregistrer les Modifications
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Panel: Live Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 sticky top-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <Eye size={15} className="text-indigo-600" />
                Aperçu en Direct
              </h3>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewTab('HEADER')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                    previewTab === 'HEADER' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  En-tête
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('RECEIPT')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                    previewTab === 'RECEIPT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Reçu Caisse
                </button>
              </div>
            </div>

            {previewTab === 'HEADER' ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 font-medium">
                  Voici comment les clients et utilisateurs verront votre boutique sur le panneau de bord :
                </p>

                {/* Mock Application Topbar */}
                <div className="bg-pharmacy-700 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 p-1 flex items-center justify-center overflow-hidden border border-white/20">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Store size={20} className="text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight leading-tight">
                        {name || 'Nom de la Boutique'}
                      </h4>
                      <p className="text-[9px] text-pharmacy-100 uppercase tracking-widest font-bold">
                        {address || 'Officine Partenaire'}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <span className="px-2.5 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase">
                      En Service
                    </span>
                  </div>
                </div>

                {/* Mock Sidebar Badge */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center shadow-xs">
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-gray-900 truncate">{name || 'Ma Boutique'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{phone || 'Aucun numéro'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">
                  Aperçu du ticket thermique imprimé pour les patients lors des ventes :
                </p>

                {/* Mock POS Receipt Paper */}
                <div className="bg-[#fafaf7] border border-gray-300 rounded-xl p-5 font-mono text-xs shadow-inner space-y-3 text-gray-800">
                  <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
                    {logo && (
                      <div className="w-14 h-14 mx-auto mb-1 flex items-center justify-center">
                        <img src={logo} alt="Logo Ticket" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <p className="font-black text-sm uppercase tracking-tight text-gray-900">
                      {name || 'NOM DE LA BOUTIQUE'}
                    </p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase">
                      {address || 'ADRESSE OFFICINE'}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      Tél: {phone || '+226 XX XX XX XX'}
                    </p>
                  </div>

                  <div className="text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span>TICKET: #TK-8492</span>
                      <span>{new Date().toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VENDEUR: {currentUser.fullName}</span>
                      <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>PARACETAMOL 500MG x2</span>
                      <span>3 000 F</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>AMOXICILLINE 1G x1</span>
                      <span>4 500 F</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-400 pt-2 flex justify-between font-black text-sm">
                    <span>TOTAL TTC</span>
                    <span>7 500 FCFA</span>
                  </div>

                  <div className="text-center pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-500 font-bold italic">
                    {ticketFooter || 'Merci de votre confiance • Bon rétablissement'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
