export type LoginResponse = {
  accessToken: string;
  user: {
    identityId: string;
    email: string;
    username: string;
    displayName: string;
    emailVerified: boolean | null;
  };
};
