export interface User {
  id: string;
  whop_user_id?: string;
  company_id: string;
  username: string;
  email?: string | null;
  avatar_url?: string | null;
  character_class: 'scout' | 'sage' | 'champion';
  level: number;
  experience_points: number;
  prestige_level: number;
  total_referrals: number;
  total_commission: number;
  created_at: string;
  updated_at: string;
  raw_user_meta?: Record<string, any> | null;
}

export interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
