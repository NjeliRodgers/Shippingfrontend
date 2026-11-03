import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/** Opens the reset form from the e-mailed link (/reset-password?token=…&email=…). */
export const ResetPasswordPage: React.FC<{ onOpenReset: (token: string) => void }> = ({ onOpenReset }) => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { tx } = useLanguage();
  const token = params.get('token') || '';
  useEffect(() => { onOpenReset(token); nav('/', { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <p className="py-24 text-center text-sm opacity-70">{tx('Opening password reset…')}</p>;
};
