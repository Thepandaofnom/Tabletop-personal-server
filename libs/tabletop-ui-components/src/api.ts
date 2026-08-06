const isLocalDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const apiBaseUrl = isLocalDevelopment
  ? ''
  : 'https://tabletop-personal-server-production.up.railway.app';
