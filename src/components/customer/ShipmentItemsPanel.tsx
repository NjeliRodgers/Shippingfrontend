import React, { useCallback, useEffect, useState } from 'react';
import { ShipmentItem } from '../../types/logistics';
import { ShipmentItemInput, ShipmentItemsApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  shipmentId: string;
  shipmentStatus: string;
  canManage?: boolean;
  onChanged?: () => void;
}

interface Draft {
  itemReference: string;
  description: string;
  quantity: string;
  unitOfMeasure: string;
  unitWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  hsCode: string;
  countryOfOrigin: string;
  declaredValue: string;
  currency: string;
  isFragile: boolean;
  isHazardous: boolean;
  handlingNotes: string;
}

const emptyDraft: Draft = {
  itemReference: '',
  description: '',
  quantity: '1',
  unitOfMeasure: 'unit',
  unitWeightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  hsCode: '',
  countryOfOrigin: '',
  declaredValue: '',
  currency: 'USD',
  isFragile: false,
  isHazardous: false,
  handlingNotes: '',
};

function draftFromItem(item: ShipmentItem): Draft {
  return {
    itemReference: item.itemReference,
    description: item.description,
    quantity: String(item.quantity),
    unitOfMeasure: item.unitOfMeasure,
    unitWeightKg: String(item.unitWeightKg),
    lengthCm: item.lengthCm === null ? '' : String(item.lengthCm),
    widthCm: item.widthCm === null ? '' : String(item.widthCm),
    heightCm: item.heightCm === null ? '' : String(item.heightCm),
    hsCode: item.hsCode || '',
    countryOfOrigin: item.countryOfOrigin || '',
    declaredValue: item.declaredValue === null ? '' : String(item.declaredValue),
    currency: item.currency,
    isFragile: item.isFragile,
    isHazardous: item.isHazardous,
    handlingNotes: item.handlingNotes || '',
  };
}

export const ShipmentItemsPanel: React.FC<Props> = ({
  shipmentId,
  shipmentStatus,
  canManage = false,
  onChanged,
}) => {
  const { isStaff } = useAuth();
  const { isOcean } = useTheme();
  const { tx } = useLanguage();

  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const canEdit = isStaff || (canManage && shipmentStatus === 'BOOKED');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await ShipmentItemsApi.list(shipmentId));
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const item: ShipmentItemInput = {
      itemReference: draft.itemReference.trim(),
      description: draft.description.trim(),
      quantity: Number(draft.quantity),
      unitOfMeasure: draft.unitOfMeasure.trim() || 'unit',
      unitWeightKg: Number(draft.unitWeightKg),
      lengthCm: draft.lengthCm ? Number(draft.lengthCm) : null,
      widthCm: draft.widthCm ? Number(draft.widthCm) : null,
      heightCm: draft.heightCm ? Number(draft.heightCm) : null,
      hsCode: draft.hsCode.trim() || null,
      countryOfOrigin: draft.countryOfOrigin.trim() || null,
      declaredValue: draft.declaredValue ? Number(draft.declaredValue) : null,
      currency: draft.currency.trim().toUpperCase(),
      isFragile: draft.isFragile,
      isHazardous: draft.isHazardous,
      handlingNotes: draft.handlingNotes.trim() || null,
    };

    try {
      if (editingId) {
        await ShipmentItemsApi.update(shipmentId, editingId, item);
      } else {
        await ShipmentItemsApi.create(shipmentId, item);
      }

      closeForm();
      await loadItems();
      onChanged?.();
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const updateItemStatus = async (item: ShipmentItem, status: ShipmentItem['status']) => {
    setError('');
    try {
      await ShipmentItemsApi.setStatus(shipmentId, item.id, status);
      await loadItems();
      onChanged?.();
    } catch (err) {
      setError(tx(errorMessage(err)));
    }
  };

  const deleteItem = async (item: ShipmentItem) => {
    if (!window.confirm(`${tx('Remove item')} ${item.itemReference}?`)) return;

    setError('');
    try {
      await ShipmentItemsApi.remove(shipmentId, item.id);
      await loadItems();
      onChanged?.();
    } catch (err) {
      setError(tx(errorMessage(err)));
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-white';

  return (
    <section className={`p-5 rounded-2xl border space-y-4 ${
      isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{tx('Shipment items')} ({items.length})</h3>
          <p className={`text-xs mt-1 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
            {tx('Product descriptions, quantities, weight, dimensions, and handling details')}
          </p>
        </div>

        {canEdit && !formOpen && (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setEditingId(null);
              setFormOpen(true);
            }}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#f05a36] text-white"
          >
            {tx('Add item')}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {formOpen && (
        <form onSubmit={saveItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-100">
          <input className={inputClass} required placeholder={tx('Item reference')} value={draft.itemReference}
            onChange={e => setDraft({ ...draft, itemReference: e.target.value })} />
          <input className={inputClass} required placeholder={tx('Description')} value={draft.description}
            onChange={e => setDraft({ ...draft, description: e.target.value })} />
          <input className={inputClass} required type="number" min="1" step="1" placeholder={tx('Quantity')} value={draft.quantity}
            onChange={e => setDraft({ ...draft, quantity: e.target.value })} />
          <input className={inputClass} placeholder={tx('Unit (e.g. carton)')} value={draft.unitOfMeasure}
            onChange={e => setDraft({ ...draft, unitOfMeasure: e.target.value })} />
          <input className={inputClass} required type="number" min="0.001" step="0.001" placeholder={tx('Weight per unit (kg)')} value={draft.unitWeightKg}
            onChange={e => setDraft({ ...draft, unitWeightKg: e.target.value })} />
          <input className={inputClass} type="number" min="0.01" step="0.01" placeholder={tx('Length (cm)')} value={draft.lengthCm}
            onChange={e => setDraft({ ...draft, lengthCm: e.target.value })} />
          <input className={inputClass} type="number" min="0.01" step="0.01" placeholder={tx('Width (cm)')} value={draft.widthCm}
            onChange={e => setDraft({ ...draft, widthCm: e.target.value })} />
          <input className={inputClass} type="number" min="0.01" step="0.01" placeholder={tx('Height (cm)')} value={draft.heightCm}
            onChange={e => setDraft({ ...draft, heightCm: e.target.value })} />
          <input className={inputClass} placeholder={tx('HS code')} value={draft.hsCode}
            onChange={e => setDraft({ ...draft, hsCode: e.target.value })} />
          <input className={inputClass} placeholder={tx('Country of origin')} value={draft.countryOfOrigin}
            onChange={e => setDraft({ ...draft, countryOfOrigin: e.target.value })} />
          <input className={inputClass} type="number" min="0" step="0.01" placeholder={tx('Declared value')} value={draft.declaredValue}
            onChange={e => setDraft({ ...draft, declaredValue: e.target.value })} />
          <input className={inputClass} required maxLength={3} placeholder={tx('Currency (USD)')} value={draft.currency}
            onChange={e => setDraft({ ...draft, currency: e.target.value })} />
          <label className="text-sm text-slate-800 flex items-center gap-2">
            <input type="checkbox" checked={draft.isFragile}
              onChange={e => setDraft({ ...draft, isFragile: e.target.checked })} />
            {tx('Fragile')}
          </label>
          <label className="text-sm text-slate-800 flex items-center gap-2">
            <input type="checkbox" checked={draft.isHazardous}
              onChange={e => setDraft({ ...draft, isHazardous: e.target.checked })} />
            {tx('Hazardous goods')}
          </label>
          <textarea className={`${inputClass} sm:col-span-2 lg:col-span-4`} rows={2}
            placeholder={tx('Handling notes')} value={draft.handlingNotes}
            onChange={e => setDraft({ ...draft, handlingNotes: e.target.value })} />
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="px-3 py-2 rounded-lg text-sm text-slate-700">
              {tx('Cancel')}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#005f9e] text-white disabled:opacity-50">
              {saving ? tx('Saving…') : editingId ? tx('Save item') : tx('Add item')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm opacity-70">{tx('Loading items…')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm opacity-70">{tx('No items recorded for this shipment.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" role="region" aria-label={tx('Product manifest; scroll horizontally on small screens')} tabIndex={0}>
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>
              <tr>
                <th className="py-2 pr-3">{tx('Reference / product')}</th>
                <th className="py-2 pr-3">{tx('Handling status')}</th>
                <th className="py-2 pr-3">{tx('Qty')}</th>
                <th className="py-2 pr-3">{tx('Weight per unit')}</th>
                <th className="py-2 pr-3">{tx('Dimensions')}</th>
                <th className="py-2 pr-3">{tx('Handling')}</th>
                {canEdit && <th className="py-2 text-right">{tx('Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-slate-300/30 align-top">
                  <td className="py-3 pr-3">
                    <strong>{item.itemReference}</strong>
                    <span className="block">{item.description}</span>
                    {item.hsCode && <span className="block opacity-70">{tx('HS')} {item.hsCode}</span>}
                  </td>
                  <td className="py-3 pr-3">
                    {isStaff ? (
                      <select value={item.status} onChange={e => void updateItemStatus(item, e.target.value as ShipmentItem['status'])} className="rounded border px-2 py-1 text-slate-900">
                        {['BOOKED', 'PACKED', 'PICKED_UP', 'IN_TRANSIT', 'HELD', 'DELIVERED', 'DAMAGED', 'MISSING'].map(status => <option key={status} value={status}>{tx(status.replace(/_/g, ' '))}</option>)}
                      </select>
                    ) : <span className="font-semibold">{tx(item.status.replace(/_/g, ' '))}</span>}
                  </td>
                  <td className="py-3 pr-3">{item.quantity} {item.unitOfMeasure}</td>
                  <td className="py-3 pr-3">{item.unitWeightKg} kg</td>
                  <td className="py-3 pr-3">
                    {item.lengthCm && item.widthCm && item.heightCm
                      ? `${item.lengthCm} × ${item.widthCm} × ${item.heightCm} cm`
                      : '—'}
                  </td>
                  <td className="py-3 pr-3">
                    {item.isFragile && <span className="block">{tx('Fragile')}</span>}
                    {item.isHazardous && <span className="block text-rose-500">{tx('Hazardous')}</span>}
                    {item.handlingNotes && <span className="block opacity-70">{item.handlingNotes}</span>}
                    {!item.isFragile && !item.isHazardous && !item.handlingNotes && '—'}
                  </td>
                  {canEdit && (
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setDraft(draftFromItem(item));
                          setFormOpen(true);
                        }}
                        className="px-2 py-1 rounded bg-[#005f9e] text-white mr-1"
                      >
                        {tx('Edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteItem(item)}
                        className="px-2 py-1 rounded bg-rose-600 text-white"
                      >
                        {tx('Remove')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};