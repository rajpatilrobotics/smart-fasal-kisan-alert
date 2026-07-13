export interface SecureNextConfigOptions {
  production?: boolean;
}

export interface SecureNextConfig {
  output: 'standalone';
  poweredByHeader: false;
  reactStrictMode: true;
  headers(): Promise<
    {
      source: string;
      headers: { key: string; value: string }[];
    }[]
  >;
}

export function createSecureNextConfig(options?: SecureNextConfigOptions): SecureNextConfig;
