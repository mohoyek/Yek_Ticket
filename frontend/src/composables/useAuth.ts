import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  const store = useAuthStore();
  const { user, isAuthenticated, isAdmin, isManager, isSupport, isCustomer, isInternalStaff } =
    storeToRefs(store);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isManager,
    isSupport,
    isCustomer,
    isInternalStaff,
    login: store.login,
    register: store.register,
    logout: store.logout,
  };
}
