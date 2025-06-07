/**
 * Authentication token structure
 */
export interface AuthToken {
  /** Authentication provider metadata */
  app_metadata: {
    provider: string;
  };
  /** Audience for the token */
  aud: string;
  /** Authorized party (client ID) */
  azp: string;
  /** User email address */
  email: string;
  /** Expiration time (Unix timestamp) */
  exp: number;
  /** Feature version array */
  fva: number[];
  /** Issued at time (Unix timestamp) */
  iat: number;
  /** Issuer of the token */
  iss: string;
  /** JWT ID (unique identifier) */
  jti: string;
  /** Not valid before time (Unix timestamp) */
  nbf: number;
  /** User role */
  user_role: string;
  /** Session ID */
  sid: string;
  /** Subject (user identifier) */
  sub: string;
  /** User ID */
  user_id: string;
  /** User metadata */
  user_metadata: {
    name: string;
  };
  /** Version number */
  v: number;
}
