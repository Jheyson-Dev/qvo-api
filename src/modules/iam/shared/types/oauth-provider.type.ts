export const OAUTH_PROVIDERS = [
  'GOOGLE',
  'GITHUB',
  'APPLE',
  'FACEBOOK',
  'MICROSOFT',
  'DISCORD',
  'TIKTOK',
  'X',
] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
