import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const NotFoundPage: React.FC = () => {
  const { tx } = useLanguage();
  return (
    <div className="py-24 text-center space-y-3">
      <h2 className="text-3xl font-extrabold">{tx('Page not found')}</h2>
      <Link to="/" className="text-cyan-300 hover:underline text-sm">{tx('Back to tracking')}</Link>
    </div>
  );
};
