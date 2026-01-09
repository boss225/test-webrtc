import type { ApiResponse } from './supabase-types';

/**
 * Create a success API response
 */
export function successResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
  };
}

/**
 * Safe type assertion for Supabase query results
 */
export function assertType<T>(data: unknown): T {
  return data as T;
}

/**
 * Extract user select fields
 */
export const USER_SELECT_FIELDS = 'id, username, email, avatar_url' as const;

/**
 * Safe username extractor
 */
export function extractUsername(
  user: { username: string } | { username: string }[] | null | undefined
): string {
  if (!user) return 'user';
  if (Array.isArray(user)) {
    return user[0]?.username || 'user';
  }
  return user.username || 'user';
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}