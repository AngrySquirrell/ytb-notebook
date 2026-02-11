export interface AuthConfig {
  clientId: string;
  clientSecret?: string; // Required for desktop
  scopes: string[];
  redirectUri?: string;
}

export interface UserData {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any; // For any additional fields in the ID token
}
