import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  json,
  timestamp,
  integer,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

// ========================================================
// NAMESPACE: AUTH
// ========================================================
export const authSchema = pgSchema('auth');

// ========================================================
// ENUMS
// ========================================================
export const identityTypeEnum = authSchema.enum('identity_type', [
  'HUMAN',
  'SERVICE',
  'API_CLIENT',
]);
export const serviceTypeEnum = authSchema.enum('service_type', [
  'TELEGRAM',
  'DISCORD',
  'INTERNAL_API',
  'WHATSAPP',
]);
export const oauthProviderEnum = authSchema.enum('oauth_provider', [
  'GOOGLE',
  'GITHUB',
  'APPLE',
]);
export const mfaTypeEnum = authSchema.enum('mfa_type', ['TOTP', 'SMS']);

// ========================================================
// CORE IDENTITY
// ========================================================
export const identities = authSchema.table(
  'identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: identityTypeEnum('type').notNull(),
    isActive: boolean('is_active').default(true),
    metadata: json('metadata'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => ({
    typeIdx: index('identities_type_idx').on(table.type),
    isActiveIdx: index('identities_is_active_idx').on(table.isActive),
  }),
);

// ========================================================
// HUMAN USERS
// ========================================================
export const users = authSchema.table('users', {
  identityId: uuid('identity_id')
    .primaryKey()
    .references(() => identities.id),
  username: varchar('username', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  phone: varchar('phone', { length: 20 }),
  birthDate: timestamp('birth_date'),
  bio: varchar('bio', { length: 500 }),
  preferences: json('preferences'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockoutUntil: timestamp('lockout_until'),
  lastLoginAt: timestamp('last_login_at'),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ========================================================
// SERVICES / BOTS / INTEGRATIONS
// ========================================================
export const services = authSchema.table(
  'services',
  {
    identityId: uuid('identity_id')
      .primaryKey()
      .references(() => identities.id),
    serviceType: serviceTypeEnum('service_type').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    config: json('config').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => ({
    serviceExternalUnique: unique('service_external_unique').on(
      table.serviceType,
      table.externalId,
    ),
  }),
);

// ========================================================
// API CLIENTS
// ========================================================
export const apiClients = authSchema.table('api_clients', {
  identityId: uuid('identity_id')
    .primaryKey()
    .references(() => identities.id),
  name: varchar('name', { length: 100 }).notNull(),
  clientId: varchar('client_id', { length: 100 }).notNull().unique(),
  secretHash: varchar('secret_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  lastRotatedAt: timestamp('last_rotated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ========================================================
// OAUTH ACCOUNTS
// ========================================================
export const oauthAccounts = authSchema.table(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    provider: oauthProviderEnum('provider').notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => ({
    oauthProviderAccountUnique: unique('oauth_provider_account_unique').on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

// ========================================================
// SESSIONS
// ========================================================
export const sessions = authSchema.table(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: varchar('user_agent', { length: 500 }).notNull(),
    platform: varchar('platform', { length: 50 }),
    location: varchar('location', { length: 255 }),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').default(false),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => ({
    identityIdIdx: index('sessions_identity_id_idx').on(table.identityId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

// ========================================================
// DEVICES
// ========================================================
export const devices = authSchema.table(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    fingerprint: varchar('fingerprint', { length: 255 }),
    deviceName: varchar('device_name', { length: 100 }),
    browser: varchar('browser', { length: 100 }),
    operatingSystem: varchar('operating_system', { length: 100 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    lastSeenAt: timestamp('last_seen_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    fingerprintIdx: index('device_fingerprint_idx').on(table.fingerprint),
  }),
);

// ========================================================
// MFA FACTORS
// ========================================================
export const mfaFactors = authSchema.table('mfa_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  identityId: uuid('identity_id')
    .notNull()
    .references(() => identities.id),
  type: mfaTypeEnum('type').notNull(),
  secret: varchar('secret', { length: 255 }),
  isVerified: boolean('is_verified').default(false),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================================
// MFA BACKUP CODES
// ========================================================
export const mfaBackupCodes = authSchema.table(
  'mfa_backup_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    backupCodeUnique: unique('backup_code_unique').on(
      table.identityId,
      table.codeHash,
    ),
  }),
);

// ========================================================
// EMAIL VERIFICATION & PASSWORD RESET
// ========================================================
export const emailVerifications = authSchema.table('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identityId: uuid('identity_id')
    .notNull()
    .references(() => identities.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const passwordResets = authSchema.table('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  identityId: uuid('identity_id')
    .notNull()
    .references(() => identities.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================================
// LOGIN ATTEMPTS
// ========================================================
export const loginAttempts = authSchema.table(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityId: uuid('identity_id').references(() => identities.id),
    email: varchar('email', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: varchar('user_agent', { length: 500 }),
    success: boolean('success').notNull(),
    failureReason: varchar('failure_reason', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    ipAddressIdx: index('login_attempts_ip_address_idx').on(table.ipAddress),
    emailIdx: index('login_attempts_email_idx').on(table.email),
    createdAtIdx: index('login_attempts_created_at_idx').on(table.createdAt),
  }),
);

// ========================================================
// AUDIT LOGS
// ========================================================
export const auditLogs = authSchema.table(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => identities.id),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }),
    resourceId: varchar('resource_id', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

// ========================================================
// RBAC (ROLES & PERMISSIONS)
// ========================================================
export const roles = authSchema.table('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const identityRoles = authSchema.table(
  'identity_roles',
  {
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identityId, table.roleId] }),
  }),
);

export const permissions = authSchema.table('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const rolePermissions = authSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
    assignedAt: timestamp('assigned_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);
