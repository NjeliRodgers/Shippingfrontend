import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FreightBookingPaystack } from '../components/booking/FreightBookingPaystack';

export const BookingPage: React.FC = () => {
  const nav = useNavigate();
  return (
    <FreightBookingPaystack
      onShipmentCreated={() => undefined}
      onNavigateToTracking={(tn) => { nav(`/track/${encodeURIComponent(tn)}`); window.scrollTo({ top: 0 }); }}
    />
  );
};
