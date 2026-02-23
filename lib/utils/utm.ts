// utils/utm.ts
// Utility for capturing and retrieving UTM parameters, partner ref codes, and basic device/session info

export function getUTMParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
    const value = params.get(key);
    if (value) utm[key] = value;
  });
  return utm;
}

export function getRefCode() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}

export function storeUTMParams() {
  if (typeof window === 'undefined') return;
  const utm = getUTMParams();
  if (Object.keys(utm).length > 0) {
    localStorage.setItem('utm_params', JSON.stringify(utm));
  }
  // Also store ref code if present
  const ref = getRefCode();
  if (ref) {
    localStorage.setItem('partner_ref', ref);
  }
}

export function getStoredRefCode() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('partner_ref');
}

export function storeRefCode(code: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('partner_ref', code);
}

export function getStoredUTMParams() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('utm_params') || '{}');
  } catch {
    return {};
  }
}

export function getDeviceInfo() {
  if (typeof window === 'undefined') return {};
  const ua = navigator.userAgent;
  let device = 'desktop';
  if (/Mobi|Android/i.test(ua)) device = 'mobile';
  if (/iPad|Tablet/i.test(ua)) device = 'tablet';
  return {
    device,
    userAgent: ua,
    platform: navigator.platform,
    language: navigator.language,
  };
}

// Get user's location from IP (calls server API)
export async function getLocationInfo(): Promise<{ country: string | null; city: string | null }> {
  if (typeof window === 'undefined') return { country: null, city: null };
  try {
    const response = await fetch('/api/geolocation');
    if (!response.ok) return { country: null, city: null };
    const data = await response.json();
    return { country: data.country || null, city: data.city || null };
  } catch {
    return { country: null, city: null };
  }
}
