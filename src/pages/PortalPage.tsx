import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipments } from '../hooks/useShipments';
import { CustomerPortal } from '../components/customer/CustomerPortal';
import { ProtectedRoute } from '../routes/ProtectedRoute';

export const PortalPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const nav = useNavigate();
  const { shipments, loading, reload, page, setOffset } = useShipments();
  return (
    <ProtectedRoute onLogin={onLogin}>
      <CustomerPortal
        shipments={shipments}
        pagination={page}
        onPageChange={setOffset}
        loading={loading}
        onReload={reload}
        onSelectShipmentToTrack={(s) => nav(`/track/${encodeURIComponent(s.trackingNumber)}`)}
        onOpenAuthModal={onLogin}
      />
    </ProtectedRoute>
  );
};
