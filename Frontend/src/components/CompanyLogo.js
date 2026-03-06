import React, { useState, useMemo, useEffect } from 'react';

const CLEARBIT_LOGO_URL = (domain) => `https://logo.clearbit.com/${domain}`;

/** Guess domain from company name when company_domain is not in DB (e.g. wellsfargo.com from "Wells Fargo") */
function guessDomainFromCompanyName(company) {
  if (!company || typeof company !== 'string') return null;
  const t = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (t.length < 2) return null;
  return `${t}.com`;
}

/**
 * Company logo from Clearbit (by domain). Uses company_domain if set, else guesses from company name.
 * Falls back to first letter on load error.
 */
function CompanyLogo({ company_domain, company, className = '', size = 12 }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const domain = useMemo(() => {
    if (company_domain && typeof company_domain === 'string') {
      const d = company_domain.trim().toLowerCase();
      if (d.length > 0) return d;
    }
    return guessDomainFromCompanyName(company);
  }, [company_domain, company]);
  useEffect(() => setLogoFailed(false), [domain]);
  const showLogo = domain && !logoFailed;
  const initial = (company || '?').charAt(0).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-xl flex-shrink-0 overflow-hidden ${className}`}
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem`, minWidth: `${size * 0.25}rem`, minHeight: `${size * 0.25}rem` }}
    >
      {showLogo ? (
        <img
          src={CLEARBIT_LOGO_URL(domain)}
          alt=""
          className="w-full h-full object-contain bg-white"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="w-full h-full bg-jobhunter-surface border border-jobhunter-border flex items-center justify-center text-jobhunter-textMuted font-semibold text-lg">
          {initial}
        </span>
      )}
    </div>
  );
}

export default CompanyLogo;
