/**
 * Base Integration Interface
 * All platform integrations implement this interface
 */

export type IntegrationCategory = 'social' | 'dev' | 'database' | 'crm' | 'productivity' | 'blockchain';

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId?: string;
  clientSecret?: string;
}

export interface IntegrationAction {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
  returns?: string;
}

export interface Credentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: Date;
  extra?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseIntegration {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category: IntegrationCategory;
  abstract icon: string; // URL or emoji
  abstract oauth?: OAuthConfig;
  abstract actions: IntegrationAction[];

  /**
   * Get the OAuth authorization URL for user to connect
   */
  getAuthUrl(redirectUri: string, state?: string): string | null {
    if (!this.oauth) return null;
    
    const params = new URLSearchParams({
      client_id: this.oauth.clientId || process.env[`${this.id.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: redirectUri,
      scope: this.oauth.scopes.join(' '),
      response_type: 'code',
      ...(state && { state }),
    });
    
    return `${this.oauth.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<Credentials> {
    if (!this.oauth) throw new Error('OAuth not configured');
    
    const response = await fetch(this.oauth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.oauth.clientId || process.env[`${this.id.toUpperCase()}_CLIENT_ID`] || '',
        client_secret: this.oauth.clientSecret || process.env[`${this.id.toUpperCase()}_CLIENT_SECRET`] || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      extra: data,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(credentials: Credentials): Promise<Credentials> {
    if (!this.oauth || !credentials.refreshToken) {
      throw new Error('Cannot refresh: no OAuth config or refresh token');
    }

    const response = await fetch(this.oauth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: this.oauth.clientId || process.env[`${this.id.toUpperCase()}_CLIENT_ID`] || '',
        client_secret: this.oauth.clientSecret || process.env[`${this.id.toUpperCase()}_CLIENT_SECRET`] || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      extra: data,
    };
  }

  /**
   * Check if credentials are valid/not expired
   */
  isCredentialsValid(credentials: Credentials): boolean {
    if (!credentials.accessToken && !credentials.apiKey) return false;
    if (credentials.expiresAt && credentials.expiresAt < new Date()) return false;
    return true;
  }

  /**
   * Execute an action with credentials
   */
  abstract execute(action: string, params: Record<string, any>, credentials: Credentials): Promise<ActionResult>;

  /**
   * Validate action parameters
   */
  validateParams(action: string, params: Record<string, any>): boolean {
    const actionDef = this.actions.find(a => a.name === action);
    if (!actionDef) return false;

    for (const [key, schema] of Object.entries(actionDef.parameters)) {
      if (schema.required && !(key in params)) {
        return false;
      }
    }
    return true;
  }
}

export class IntegrationRegistry {
  private integrations: Map<string, BaseIntegration> = new Map();

  register(integration: BaseIntegration): void {
    this.integrations.set(integration.id, integration);
    console.log(`Registered integration: ${integration.name} (${integration.category})`);
  }

  get(id: string): BaseIntegration | undefined {
    return this.integrations.get(id);
  }

  getByCategory(category: IntegrationCategory): BaseIntegration[] {
    return Array.from(this.integrations.values()).filter(i => i.category === category);
  }

  list(): BaseIntegration[] {
    return Array.from(this.integrations.values());
  }
}

export const integrationRegistry = new IntegrationRegistry();
