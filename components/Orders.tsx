import React, { useState } from 'react';
import { Drug, Supplier } from '../types';
import { ShoppingBag, MessageCircle, AlertTriangle, Phone, Printer, Download, CheckCircle, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface OrdersProps {
  drugs: Drug[];
  suppliers: Supplier[];
}

const Orders: React.FC<OrdersProps> = ({ drugs, suppliers }) => {
  // Low stock items (<20)
  const lowStockDrugs = drugs.filter(d => d.stock < 20);

  // Custom quantities per drug id
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    lowStockDrugs.forEach(d => {
      initial[d.id] = Math.max(10, 50 - d.stock);
    });
    return initial;
  });

  // Track transmitted orders by supplierId
  const [transmittedSuppliers, setTransmittedSuppliers] = useState<Record<string, boolean>>({});

  // Group by Supplier
  const ordersBySupplier = lowStockDrugs.reduce((acc, drug) => {
    const supplierId = drug.supplierId || (suppliers[0] ? suppliers[0].id : 'unknown');
    if (!acc[supplierId]) {
      acc[supplierId] = [];
    }
    acc[supplierId].push(drug);
    return acc;
  }, {} as Record<string, Drug[]>);

  const getSupplierDetails = (id: string) => suppliers.find(s => s.id === id);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-FR') + ' FCFA';
  };

  const getQty = (drugId: string, currentStock: number) => {
    return quantities[drugId] !== undefined ? quantities[drugId] : Math.max(10, 50 - currentStock);
  };

  const updateQty = (drugId: string, delta: number, currentStock: number) => {
    const current = getQty(drugId, currentStock);
    const nextVal = Math.max(1, current + delta);
    setQuantities(prev => ({ ...prev, [drugId]: nextVal }));
  };

  const generateWhatsAppLink = (supplier: Supplier | undefined, items: Drug[]) => {
    if (!supplier) return '#';
    
    let phone = supplier.contact.replace(/\s+/g, '').replace(/-/g, '');
    if (!phone.startsWith('+')) {
      phone = '+226' + phone;
    }

    const date = new Date().toLocaleDateString('fr-FR');
    let message = `*COMMANDE FASOPHARM - ${date}*\n\n`;
    message += `Bonjour ${supplier.name},\nVoici une commande de réapprovisionnement urgente :\n\n`;
    
    items.forEach(item => {
      const quantityToOrder = getQty(item.id, item.stock);
      message += `- ${item.name} (${item.dosage}) : *${quantityToOrder} boîtes*\n`;
    });

    message += `\nMerci de confirmer la réception et le délai de livraison.\nCordialement.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleDownloadPO = (supplier: Supplier | undefined, items: Drug[]) => {
    const supplierName = supplier ? supplier.name : 'Fournisseur';
    const date = new Date().toLocaleDateString('fr-FR');
    const headers = ["Produit", "Dosage", "Stock Actuel", "Quantité Commandée", "Prix Estimé (FCFA)", "Total Ligne (FCFA)"];
    
    const rows = items.map(i => {
      const q = getQty(i.id, i.stock);
      return [
        `"${i.name}"`,
        `"${i.dosage}"`,
        i.stock,
        q,
        i.price,
        q * i.price
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bon_Commande_${supplierName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Bon de commande généré pour ${supplierName} !`);
  };

  const handleMarkTransmitted = (supplierId: string) => {
    setTransmittedSuppliers(prev => {
      const nextVal = !prev[supplierId];
      if (nextVal) {
        toast.success("Commande marquée comme transmise au fournisseur !");
      }
      return { ...prev, [supplierId]: nextVal };
    });
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col animate-fade-in overflow-y-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <ShoppingBag className="text-pharmacy-600" />
          Réapprovisionnement Intelligent
        </h2>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Le système analyse les ruptures imminentes et génère les commandes groupées par fournisseur. Ajustez les quantités et transmettez par WhatsApp ou Bon de Commande.
        </p>
      </div>

      {lowStockDrugs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="p-4 bg-green-100 text-green-600 rounded-2xl mb-4">
            <CheckCircle size={36} />
          </div>
          <h3 className="text-xl font-black text-gray-800">Tous les stocks sont sous contrôle !</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md">
            Aucun produit n'est actuellement sous le seuil d'alerte critique. Vos rayons sont bien approvisionnés.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.keys(ordersBySupplier).map(supplierId => {
            const items = ordersBySupplier[supplierId];
            const supplier = getSupplierDetails(supplierId);
            const isTransmitted = transmittedSuppliers[supplierId];
            const estimatedCost = items.reduce((sum, item) => sum + (item.price * getQty(item.id, item.stock)), 0);

            return (
              <div key={supplierId} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition hover:shadow-md">
                <div className="p-5 bg-gray-50/80 border-b border-gray-100 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg">
                      {supplier ? supplier.name : 'Fournisseur Central / Principal'}
                    </h3>
                    {supplier && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-semibold">
                        <Phone size={13} className="text-pharmacy-600" /> {supplier.contact}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                      {items.length} articles critiques
                    </span>
                    {isTransmitted && (
                      <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> Transmise
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-5 flex-1 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100 uppercase text-[9px] font-black tracking-widest">
                        <th className="pb-2.5">Produit</th>
                        <th className="pb-2.5 text-center">Stock</th>
                        <th className="pb-2.5 text-right">Quantité à Commander</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(item => {
                        const qty = getQty(item.id, item.stock);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 font-bold text-gray-800">
                              <p className="truncate max-w-[180px]">{item.name}</p>
                              <span className="text-[10px] text-gray-400 font-normal">{item.dosage}</span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600">
                                {item.stock}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                                <button 
                                  onClick={() => updateQty(item.id, -5, item.stock)}
                                  className="p-1 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer"
                                  title="-5"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center font-black text-xs text-pharmacy-700">{qty}</span>
                                <button 
                                  onClick={() => updateQty(item.id, 5, item.stock)}
                                  className="p-1 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer"
                                  title="+5"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Valeur estimée</span>
                    <span className="font-black text-gray-800 text-sm">{formatCurrency(estimatedCost)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {supplier ? (
                      <a 
                        href={generateWhatsAppLink(supplier, items)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => toast.success("Transmission WhatsApp lancée !")}
                        className="flex-1 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </a>
                    ) : (
                      <button disabled className="flex-1 py-3 bg-gray-200 text-gray-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed">
                        <AlertTriangle size={16} />
                        Sans Contact
                      </button>
                    )}

                    <button 
                      onClick={() => handleDownloadPO(supplier, items)}
                      className="px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                      title="Télécharger Bon de Commande CSV"
                    >
                      <Download size={15} />
                      Bon
                    </button>

                    <button 
                      onClick={() => handleMarkTransmitted(supplierId)}
                      className={`px-3 py-3 rounded-xl font-black text-xs uppercase transition cursor-pointer flex items-center justify-center ${
                        isTransmitted 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                      title={isTransmitted ? "Marquée transmise" : "Marquer comme transmise"}
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;