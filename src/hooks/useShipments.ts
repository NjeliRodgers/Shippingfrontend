import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShipmentsApi } from '../api';
import { Shipment, ShipmentPage, ShipmentStatus } from '../types/logistics';
import { useAsync } from './useAsync';

const PAGE_SIZE = 50;

/** Returns one bounded page at a time with server-side filters and exact total metadata. */
export function useShipments() {
  const { isAuthenticated, isStaff } = useAuth();
  const [offset, setOffset] = useState(0);
  const [filters, setFiltersState] = useState<{ q?: string; status?: ShipmentStatus }>({});
  const setFilters = useCallback((next: { q?: string; status?: ShipmentStatus }) => {
    setOffset(0);
    setFiltersState(next);
  }, []);
  const state = useAsync<ShipmentPage<Shipment>>(
    () => (isStaff
      ? ShipmentsApi.list({ ...filters, limit: PAGE_SIZE, offset })
      : ShipmentsApi.mine({ ...filters, limit: PAGE_SIZE, offset })),
    [isAuthenticated, isStaff, offset, filters.q, filters.status],
    isAuthenticated
  );
  const page = state.data;
  return {
    ...state,
    shipments: page?.items || [],
    page,
    offset,
    setOffset,
    setFilters,
  };
}
