import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShipments } from '../hooks/useShipments';
import { usePorts } from '../hooks/usePorts';
import { AdminDashboard, AdminSubTab } from '../components/admin/AdminDashboard';
import { ProtectedRoute } from '../routes/ProtectedRoute';

const SUB_PATHS: Record<AdminSubTab, string> = {
  SHIPMENTS: '/admin', ANALYTICS: '/admin/analytics', NOTIFICATIONS: '/admin/notifications',
  SECURITY: '/admin/security', PORTS: '/admin/ports', USERS: '/admin/users',
};

function subTabFromPath(p: string): AdminSubTab {
  const hit = (Object.entries(SUB_PATHS) as [AdminSubTab, string][]).find(([k, v]) => k !== 'SHIPMENTS' && p.startsWith(v));
  return hit ? hit[0] : 'SHIPMENTS';
}

export const AdminPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { shipments, loading, reload, page, setOffset, setFilters } = useShipments();
  const { ports, reload: reloadPorts } = usePorts();
  return (
    <ProtectedRoute staffOnly onLogin={onLogin}>
      <AdminDashboard
        shipments={shipments}
        pagination={page}
        onPageChange={setOffset}
        onFilterChange={setFilters}
        ports={ports}
        loading={loading}
        onRefreshShipments={reload}
        onRefreshPorts={reloadPorts}
        onSelectShipment={(s) => nav(`/track/${encodeURIComponent(s.trackingNumber)}`)}
        subTab={subTabFromPath(pathname)}
        onChangeSubTab={(t) => nav(SUB_PATHS[t])}
      />
    </ProtectedRoute>
  );
};
