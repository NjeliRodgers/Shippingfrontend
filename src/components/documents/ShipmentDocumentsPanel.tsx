import React, { useCallback, useEffect, useState } from 'react';
import { ShipmentDocument } from '../../types/logistics';
import { ShipmentDocumentsApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  shipmentId: string;
  documentTypes?: ShipmentDocument['documentType'][];
}

const documentLabels: Record<ShipmentDocument['documentType'], string> = {
  BILL_OF_LADING: 'Bill of lading',
  COMMERCIAL_INVOICE: 'Commercial invoice',
  PACKING_LIST: 'Packing list',
  CUSTOMS_DECLARATION: 'Customs declaration',
  CERTIFICATE_OF_ORIGIN: 'Certificate of origin',
  DELIVERY_PROOF: 'Delivery proof',
  INSURANCE_CERTIFICATE: 'Insurance certificate',
  OTHER: 'Other',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ShipmentDocumentsPanel: React.FC<Props> = ({ shipmentId, documentTypes }) => {
  const { isStaff } = useAuth();
  const { isOcean } = useTheme();
  const { tx } = useLanguage();

  const [documents, setDocuments] = useState<ShipmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] =
    useState<ShipmentDocument['documentType']>('BILL_OF_LADING');
  const [visibility, setVisibility] =
    useState<ShipmentDocument['visibility']>('STAFF_ONLY');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuer, setIssuer] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDocuments(await ShipmentDocumentsApi.list(shipmentId));
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const download = async (document: ShipmentDocument) => {
    setError('');
    try {
      await ShipmentDocumentsApi.download(
        shipmentId,
        document.id,
        document.originalFilename
      );
    } catch (err) {
      setError(tx(errorMessage(err)));
    }
  };

  const revoke = async (document: ShipmentDocument) => {
    if (!window.confirm(`${tx('Revoke')} ${document.originalFilename}?`)) return;

    setError('');
    try {
      await ShipmentDocumentsApi.revoke(shipmentId, document.id);
      await loadDocuments();
    } catch (err) {
      setError(tx(errorMessage(err)));
    }
  };

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError(tx('Choose a PDF, PNG, or JPEG file first.'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      await ShipmentDocumentsApi.upload(shipmentId, file, {
        documentType,
        visibility,
        documentNumber: documentNumber.trim() || undefined,
        issuer: issuer.trim() || undefined,
      });

      event.currentTarget.reset();
      setFile(null);
      setDocumentNumber('');
      setIssuer('');
      await loadDocuments();
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setUploading(false);
    }
  };

  const visibleDocuments = documentTypes
    ? documents.filter(document => documentTypes.includes(document.documentType))
    : documents;

  const panelClass = isOcean
    ? 'bg-[#00385c] border-[#005f9e] text-white'
    : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <section className={`rounded-xl border p-4 space-y-4 ${panelClass}`}>
      <div>
        <h4 className="font-bold text-sm">{tx('Shipment documents')}</h4>
        <p className="text-xs opacity-70 mt-1">
          {tx('Uploaded shipment files available to your account')}
        </p>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {loading ? (
        <p className="text-sm opacity-70">{tx('Loading documents…')}</p>
      ) : visibleDocuments.length === 0 ? (
        <p className="text-sm opacity-70">{tx('No documents have been uploaded for this shipment.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" role="region" aria-label={tx('Shipment documents; scroll horizontally on small screens')} tabIndex={0}>
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>
              <tr>
                <th className="py-2 pr-3">{tx('Document')}</th>
                <th className="py-2 pr-3">{tx('Number')}</th>
                <th className="py-2 pr-3">{tx('File size')}</th>
                <th className="py-2 pr-3">{tx('Visibility')}</th>
                <th className="py-2 text-right">{tx('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map(document => (
                <tr key={document.id} className="border-t border-slate-300/30">
                  <td className="py-3 pr-3">
                    <strong>{tx(documentLabels[document.documentType])}</strong>
                    <span className="block opacity-70">{document.originalFilename}</span>
                    {document.checksumSha256 && (
                      <span className="block opacity-60 break-all">
                        {tx('SHA-256:')} {document.checksumSha256}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">{document.documentNumber || '—'}</td>
                  <td className="py-3 pr-3">{formatBytes(document.sizeBytes)}</td>
                  <td className="py-3 pr-3">{tx(document.visibility === 'STAFF_ONLY' ? 'Staff only' : 'Customer can access')}</td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => void download(document)}
                      className="px-2 py-1 rounded bg-[#005f9e] text-white"
                    >
                      {tx('Download')}
                    </button>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => void revoke(document)}
                        className="px-2 py-1 rounded bg-rose-600 text-white ml-1"
                      >
                        {tx('Revoke')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isStaff && (
        <form onSubmit={upload} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-300/30 pt-4">
          <label className="text-xs space-y-1">
            <span>{tx('Document type')}</span>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value as ShipmentDocument['documentType'])}
              className="w-full px-3 py-2 rounded-lg text-slate-900 bg-white border"
            >
              {Object.entries(documentLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs space-y-1">
            <span>{tx('Customer access')}</span>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as ShipmentDocument['visibility'])}
              className="w-full px-3 py-2 rounded-lg text-slate-900 bg-white border"
            >
              <option value="STAFF_ONLY">{tx('Staff only')}</option>
              <option value="CUSTOMER">{tx('Customer can access')}</option>
            </select>
          </label>

          <input
            value={documentNumber}
            onChange={e => setDocumentNumber(e.target.value)}
            placeholder={tx('Document number (optional)')}
            className="px-3 py-2 rounded-lg text-slate-900 bg-white border text-sm"
          />

          <input
            value={issuer}
            onChange={e => setIssuer(e.target.value)}
            placeholder={tx('Issuer (optional)')}
            className="px-3 py-2 rounded-lg text-slate-900 bg-white border text-sm"
          />

          <input
            required
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="sm:col-span-2 text-xs"
          />

          <button
            type="submit"
            disabled={uploading}
            className="sm:col-span-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#f05a36] text-white disabled:opacity-50"
          >
            {uploading ? tx('Uploading…') : tx('Upload document')}
          </button>
        </form>
      )}
    </section>
  );
};