import React from 'react';
import { ShipmentPage } from '../../types/logistics';

interface Props {
  page: ShipmentPage<unknown> | null | undefined;
  onChange: (offset: number) => void;
}

export const ShipmentPageControls: React.FC<Props> = ({ page, onChange }) => {
  if (!page) return null;
  const first = page.total === 0 ? 0 : page.offset + 1;
  const last = Math.min(page.offset + page.items.length, page.total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-400/30 px-4 py-3 text-xs">
      <span>Showing {first}-{last} of {page.total} shipments</span>
      <div className="flex gap-2">
        <button type="button" disabled={page.offset <= 0} onClick={() => onChange(Math.max(0, page.offset - page.limit))}
          className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
        <button type="button" disabled={!page.hasMore} onClick={() => onChange(page.offset + page.limit)}
          className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};
