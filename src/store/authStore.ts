import { create } from 'zustand';

export type UserRole = 'admin' | 'team';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const mockUsers = {
  admin: {
    id: '1',
    name: '관리자',
    email: 'admin@company.com',
    role: 'admin' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  team: {
    id: '2',
    name: '김철수',
    email: 'team@company.com',
    role: 'team' as UserRole,
    departmentId: 'HR001',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team',
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (_email: string, _password: string, role: UserRole) => {
    const user = role === 'admin' ? mockUsers.admin : mockUsers.team;
    set({ user, isAuthenticated: true });
    return true;
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
