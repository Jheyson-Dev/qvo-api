export type HumanJwtPayload = {
  type: 'HUMAN';
  sub: string;
  email: string;
  username: string;
  sessionId: string;
  iat?: number;
  exp?: number;
};

export type ApiClientPayload = {
  type: 'API_CLIENT';
  sub: string; // identityId del api_client
  clientId: string;
  iat?: number;
  exp?: number;
};

/** Union discriminada: usar type guard `payload.type === 'HUMAN'` para distinguirlos */
export type JwtPayload = HumanJwtPayload | ApiClientPayload;
