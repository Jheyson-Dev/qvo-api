import { v7 as uuidv7 } from 'uuid';
import { sql } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  date,
  integer,
  index,
  primaryKey,
  unique,
  uniqueIndex,
  char,
  doublePrecision,
  check,
} from 'drizzle-orm/pg-core';

// ========================================================
// SCHEMAS
// ========================================================
export const iamSchema = pgSchema('iam');

// ========================================================
// ENUMS
// ========================================================
export const identityTypeEnum = iamSchema.enum('identity_type', [
  'HUMAN',
  'SERVICE',
  'API_CLIENT',
]);
export const serviceTypeEnum = iamSchema.enum('service_type', [
  'TELEGRAM',
  'DISCORD',
  'INTERNAL_API',
  'WHATSAPP',
]);
export const mfaTypeEnum = iamSchema.enum('mfa_type', ['TOTP', 'SMS']);
export const oauthProviderEnum = iamSchema.enum('oauth_provider', [
  'GOOGLE',
  'GITHUB',
  'APPLE',
  'FACEBOOK',
  'MICROSOFT',
  'DISCORD',
  'TIKTOK',
  'X',
]);

// ========================================================
// CORE IDENTITY
// ========================================================
export const identities = iamSchema.table(
  'identities',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    type: identityTypeEnum('type').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    typeIdx: index('identities_type_idx').on(table.type),
  }),
);

// ========================================================
// HUMAN USERS
// ========================================================
// ON DELETE: identities.id no usa cascade para proteger los datos y preferir soft-delete.
export const users = iamSchema.table(
  'users',
  {
    identityId: uuid('identity_id')
      .primaryKey()
      .references(() => identities.id),
    username: varchar('username', { length: 32 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    passwordHash: varchar('password_hash', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    phone: varchar('phone', { length: 20 }).unique(),
    birthDate: date('birth_date'),
    bio: varchar('bio', { length: 500 }),
    preferences: jsonb('preferences'),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockoutUntil: timestamp('lockout_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    usernameUniqueCi: uniqueIndex('users_username_unique_ci').on(
      sql`lower(${table.username})`,
    ),
    emailUniqueCi: uniqueIndex('users_email_unique_ci').on(
      sql`lower(${table.email})`,
    ),
  }),
);

// ========================================================
// SERVICES / BOTS / INTEGRATIONS
// ========================================================
// ON DELETE: Sin cascade para evitar hard deletes accidentales.
export const services = iamSchema.table(
  'services',
  {
    identityId: uuid('identity_id')
      .primaryKey()
      .references(() => identities.id),
    serviceType: serviceTypeEnum('service_type').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    config: jsonb('config').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    serviceExternalUnique: unique(
      'services_service_type_external_id_unique',
    ).on(table.serviceType, table.externalId),
  }),
);

// ========================================================
// API CLIENTS
// ========================================================
// ON DELETE: Sin cascade para proteger histórico de tokens y auditoría.
export const apiClients = iamSchema.table('api_clients', {
  identityId: uuid('identity_id')
    .primaryKey()
    .references(() => identities.id),
  name: varchar('name', { length: 100 }).notNull(),
  clientId: varchar('client_id', { length: 100 }).notNull().unique(),
  secretHash: varchar('secret_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastRotatedAt: timestamp('last_rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========================================================
// OAUTH ACCOUNTS
// ========================================================
export const oauthAccounts = iamSchema.table(
  'oauth_accounts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    provider: oauthProviderEnum('provider').notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    identityIdIdx: index('oauth_accounts_identity_id_idx').on(table.identityId),
    oauthProviderAccountUnique: unique(
      'oauth_accounts_provider_account_unique',
    ).on(table.provider, table.providerAccountId),
    oauthIdentityProviderUnique: unique(
      'oauth_accounts_identity_provider_unique',
    ).on(table.identityId, table.provider),
  }),
);

// ========================================================
// DEVICES
// ========================================================
export const devices = iamSchema.table(
  'devices',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    fingerprint: varchar('fingerprint', { length: 255 }),
    deviceName: varchar('device_name', { length: 100 }),
    browser: varchar('browser', { length: 100 }),
    operatingSystem: varchar('operating_system', { length: 100 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identityLastSeenIdx: index('devices_identity_last_seen_idx').on(
      table.identityId,
      table.lastSeenAt,
    ),
    fingerprintIdx: index('devices_fingerprint_idx').on(table.fingerprint),
  }),
);

// ========================================================
// SESSIONS
// ========================================================
export const sessions = iamSchema.table(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    deviceId: uuid('device_id').references(() => devices.id),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: varchar('user_agent', { length: 500 }).notNull(),
    platform: varchar('platform', { length: 50 }),
    city: varchar('city', { length: 150 }),
    region: varchar('region', { length: 150 }),
    country: varchar('country', { length: 100 }),
    countryCode: char('country_code', { length: 2 }),
    continent: varchar('continent', { length: 100 }),
    continentCode: char('continent_code', { length: 2 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    timezone: varchar('timezone', { length: 64 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => ({
    identityIdIdx: index('sessions_identity_id_idx').on(table.identityId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

// ========================================================
// MFA FACTORS
// ========================================================
export const mfaFactors = iamSchema.table(
  'mfa_factors',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    type: mfaTypeEnum('type').notNull(),
    // El secreto TOTP debe almacenarse cifrado a nivel de aplicación/KMS y no como plaintext.
    secret: varchar('secret', { length: 255 }),
    isVerified: boolean('is_verified').notNull().default(false),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identityIdIdx: index('mfa_factors_identity_id_idx').on(table.identityId),
    identityTypeUnique: unique('mfa_factors_identity_type_unique').on(
      table.identityId,
      table.type,
    ),
  }),
);

// ========================================================
// MFA BACKUP CODES
// ========================================================
export const mfaBackupCodes = iamSchema.table(
  'mfa_backup_codes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    backupCodeUnique: unique('mfa_backup_codes_identity_hash_unique').on(
      table.identityId,
      table.codeHash,
    ),
  }),
);

// ========================================================
// EMAIL VERIFICATION & PASSWORD RESET
// ========================================================
// ON DELETE CASCADE: Es seguro eliminar tokens efímeros si la identidad se purga o elimina.
export const emailVerifications = iamSchema.table(
  'email_verifications',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identityIdIdx: index('email_verifications_identity_id_idx').on(
      table.identityId,
    ),
  }),
);

export const passwordResets = iamSchema.table(
  'password_resets',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identityIdIdx: index('password_resets_identity_id_idx').on(
      table.identityId,
    ),
  }),
);

// ========================================================
// LOGIN ATTEMPTS
// ========================================================
export const loginAttempts = iamSchema.table(
  'login_attempts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    identityId: uuid('identity_id').references(() => identities.id),
    email: varchar('email', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: varchar('user_agent', { length: 500 }),
    success: boolean('success').notNull(),
    failureReason: varchar('failure_reason', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ipCreatedAtIdx: index('login_attempts_ip_created_at_idx').on(
      table.ipAddress,
      table.createdAt,
    ),
    emailCreatedAtIdx: index('login_attempts_email_created_at_idx').on(
      table.email,
      table.createdAt,
    ),
  }),
);

// ========================================================
// AUDIT LOGS
// ========================================================
export const auditLogs = iamSchema.table(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    actorId: uuid('actor_id').references(() => identities.id),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }),
    resourceId: varchar('resource_id', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actorCreatedAtIdx: index('audit_logs_actor_created_at_idx').on(
      table.actorId,
      table.createdAt,
    ),
    resourceCreatedAtIdx: index('audit_logs_resource_created_at_idx').on(
      table.resource,
      table.resourceId,
      table.createdAt,
    ),
  }),
);

// ========================================================
// RBAC (ROLES & PERMISSIONS)
// ========================================================
export const roles = iamSchema.table(
  'roles',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    nameUniqueCi: uniqueIndex('roles_name_unique_ci').on(
      sql`lower(${table.name})`,
    ),
  }),
);

export const identityRoles = iamSchema.table(
  'identity_roles',
  {
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identityId, table.roleId] }),
    roleIdIdx: index('identity_roles_role_id_idx').on(table.roleId),
  }),
);

export const permissions = iamSchema.table(
  'permissions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    // Ambos campos (resource y action) son identificadores técnicos y deben persistirse siempre en lowercase.
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    nameUniqueCi: uniqueIndex('permissions_name_unique_ci').on(
      sql`lower(${table.name})`,
    ),
    resourceActionUnique: unique('permissions_resource_action_unique').on(
      table.resource,
      table.action,
    ),
    resourceLowercaseCheck: check(
      'permissions_resource_lowercase_check',
      sql`${table.resource} = lower(${table.resource})`,
    ),
    actionLowercaseCheck: check(
      'permissions_action_lowercase_check',
      sql`${table.action} = lower(${table.action})`,
    ),
  }),
);

export const rolePermissions = iamSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    permissionIdIdx: index('role_permissions_permission_id_idx').on(
      table.permissionId,
    ),
  }),
);

// ========================================================
// SSO EXCHANGE TICKETS
// ========================================================
// ON DELETE CASCADE: Tokens efímeros
export const ssoExchangeTickets = iamSchema.table(
  'sso_exchange_tickets',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    ticketHash: varchar('ticket_hash', { length: 255 }).notNull().unique(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    isUsed: boolean('is_used').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    expiresAtIdx: index('sso_exchange_tickets_expires_at_idx').on(
      table.expiresAt,
    ),
  }),
);
