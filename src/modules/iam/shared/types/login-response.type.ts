// Respuesta normal cuando MFA está desactivado
export type LoginResponse = {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
  user: {
    identityId: string;
    email: string;
    username: string;
    displayName: string;
    emailVerified: boolean | null;
  };
};

// Respuesta cuando MFA está activado: el cliente debe completar el challenge
export type MfaChallengeResponse = {
  mfaRequired: true;
  mfaToken: string; // JWT de corta vida para identificar la sesión pendiente
};

export type LoginResult = LoginResponse | MfaChallengeResponse;
