// Declaraciones de tipos personalizados para Afirmative Pill

declare module 'graphql-ws/lib/use/ws' {
  import { ServerOptions } from 'graphql-ws';
  import { WebSocketServer } from 'ws';
  
  export function useServer(
    options: ServerOptions,
    wsServer: WebSocketServer
  ): {
    dispose: () => Promise<void>;
  };
}

declare module 'graphql-subscriptions' {
  export class PubSub {
    publish<T>(triggerName: string, payload: T): Promise<void>;
    asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>;
  }
}

// Declaración para módulos JSON
declare module '*.json' {
  const value: any;
  export default value;
}

// Declaración para variables de entorno
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
  }
}

// Tipos para Express con Apollo
declare module 'express' {
  export interface Request {
    headers: {
      authorization?: string;
    };
  }
}