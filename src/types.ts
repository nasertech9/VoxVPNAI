export interface Server {
  id: string;
  name: string;
  country: string;
  flag: string;
  ip: string;
  ping: number;
  isPremium: boolean;
}

export interface ConnectionStats {
  download: number;
  upload: number;
  ping: number;
  duration: number;
  ip: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type View = 'dashboard' | 'settings' | 'profile' | 'auth' | 'checkout' | 'add-server' | 'chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
