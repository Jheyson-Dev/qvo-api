// Respuesta del setup: el frontend necesita esto para generar el QR
export type MfaSetupResponse = {
  secret: string; // Secreto base32 (mostrar como texto como backup)
  otpauthUrl: string; // URL para generar el QR con cualquier librería
};
