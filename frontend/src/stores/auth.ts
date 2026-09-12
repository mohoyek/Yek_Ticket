import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/client';
import type { User } from '@/api/client';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );
  const permissions = ref<string[]>(
    localStorage.getItem('permissions')
      ? (JSON.parse(localStorage.getItem('permissions')!) as string[])
      : []
  );

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isManager = computed(() => user.value?.role === 'manager');
  const isSupport = computed(() => user.value?.role === 'support');
  const isCustomer = computed(() => user.value?.role === 'customer');
  const isInternalStaff = computed(() =>
    ['admin', 'manager', 'support'].includes(user.value?.role || '')
  );

  function hasPermission(perm: string): boolean {
    return permissions.value.includes(perm);
  }

  function setSession(newToken: string, userData: User, perms: string[]) {
    token.value = newToken;
    user.value = userData;
    permissions.value = perms || [];
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('permissions', JSON.stringify(perms || []));
  }

  async function login(username: string, password: string) {
    const response = await api.post<{
      success: boolean;
      data: { token: string; user: User; permissions: string[] };
    }>('/auth/login', { username, password });

    const { token: newToken, user: userData, permissions: perms } = response.data.data;
    setSession(newToken, userData, perms);
  }

  async function register(
    username: string,
    password: string,
    customerType: 'shop' | 'company',
    fullName?: string,
    companyName?: string
  ) {
    const response = await api.post<{
      success: boolean;
      data: { token: string; user: User; permissions: string[] };
    }>('/auth/register', {
      full_name: customerType === 'shop' ? fullName : undefined,
      company_name: customerType === 'company' ? companyName : undefined,
      username,
      password,
      customer_type: customerType,
    });

    const { token: newToken, user: userData, permissions: perms } = response.data.data;
    setSession(newToken, userData, perms);
  }

  async function fetchMe() {
    try {
      const response = await api.get<{
        success: boolean;
        data: { user: User; permissions: string[] };
      }>('/auth/me');
      user.value = response.data.data.user;
      permissions.value = response.data.data.permissions || [];
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      localStorage.setItem('permissions', JSON.stringify(permissions.value));
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    permissions.value = [];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    router.push({ name: 'Login' });
  }

  return {
    token,
    user,
    permissions,
    isAuthenticated,
    isAdmin,
    isManager,
    isSupport,
    isCustomer,
    isInternalStaff,
    hasPermission,
    login,
    register,
    fetchMe,
    logout,
  };
});