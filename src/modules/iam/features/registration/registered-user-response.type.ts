export type RegisteredUserResponse = {
  identityId: string;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean | null;
  createdAt: Date;
};
