import { format } from 'date-fns';
import { LineItem } from './InvoiceLineItems';

interface InvoicePDFPreviewProps {
  type: 'invoice' | 'estimate';
  documentNumber: string;
  company: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email: string;
    logo_url?: string;
  };
  client: {
    full_name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  lineItems: LineItem[];
  description?: string;
  notes?: string;
  dueDate?: string;
  validUntil?: string;
  status: string;
  createdAt: string;
}

export const InvoicePDFPreview = ({
  type,
  documentNumber,
  company,
  client,
  lineItems,
  description,
  notes,
  dueDate,
  validUntil,
  status,
  createdAt,
}: InvoicePDFPreviewProps) => {
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const isEstimate = type === 'estimate';

  return (
    <div className="bg-white text-gray-900 p-8 rounded-lg shadow-lg max-w-2xl mx-auto" id="invoice-preview">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-16 w-auto mb-2 object-contain" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          )}
          <div className="text-sm text-gray-600 mt-2">
            {company.address && <p>{company.address}</p>}
            {(company.city || company.state) && (
              <p>{[company.city, company.state].filter(Boolean).join(', ')}</p>
            )}
            {company.phone && <p>{company.phone}</p>}
            <p>{company.email}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase tracking-wide text-primary">
            {isEstimate ? 'Estimate' : 'Invoice'}
          </h2>
          <p className="text-lg font-mono mt-1">{documentNumber}</p>
          <div className="mt-2 text-sm text-gray-600">
            <p>Date: {format(new Date(createdAt), 'MMM dd, yyyy')}</p>
            {dueDate && <p>Due: {format(new Date(dueDate), 'MMM dd, yyyy')}</p>}
            {validUntil && <p>Valid Until: {format(new Date(validUntil), 'MMM dd, yyyy')}</p>}
          </div>
          <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            status === 'paid' ? 'bg-green-100 text-green-800' :
            status === 'accepted' ? 'bg-green-100 text-green-800' :
            status === 'sent' ? 'bg-blue-100 text-blue-800' :
            status === 'overdue' ? 'bg-red-100 text-red-800' :
            status === 'declined' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Bill To</h3>
        <div className="text-sm">
          <p className="font-semibold text-gray-900">{client.full_name}</p>
          <p className="text-gray-600">{client.email}</p>
          {client.address && <p className="text-gray-600">{client.address}</p>}
          {client.phone && <p className="text-gray-600">{client.phone}</p>}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Description</h3>
          <p className="text-sm text-gray-700">{description}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-700">Description</th>
              <th className="text-right py-2 font-semibold text-gray-700">Qty</th>
              <th className="text-right py-2 font-semibold text-gray-700">Rate</th>
              <th className="text-right py-2 font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-800">{item.description}</td>
                <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">${item.rate.toFixed(2)}</td>
                <td className="py-3 text-right font-medium text-gray-800">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 border-t-2 border-gray-900">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="border-t pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};
