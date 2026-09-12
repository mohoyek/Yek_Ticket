import { useAuthStore } from '@/stores/auth';

export function useRole() {
  const authStore = useAuthStore();

  function hasPermission(perm: string): boolean {
    return authStore.hasPermission(perm);
  }

  function hasRole(...roles: string[]): boolean {
    if (!authStore.user) return false;
    return roles.includes(authStore.user.role);
  }

  function canManageUsers(): boolean {
    return hasPermission('users.manage');
  }

  function canManageCategories(): boolean {
    return hasPermission('categories.manage');
  }

  function canManageRoles(): boolean {
    return hasPermission('roles.manage');
  }

  function canDeleteTicket(): boolean {
    return hasPermission('tickets.delete');
  }

  function canAssignTicket(): boolean {
    return hasPermission('tickets.assign');
  }

  function canChangePriority(): boolean {
    return hasPermission('tickets.change_priority');
  }

  function canChangeStatus(): boolean {
    return hasPermission('tickets.update_status');
  }

  function canReferTicket(): boolean {
    return hasPermission('tickets.refer');
  }

  function canManageTodos(): boolean {
    return hasPermission('todos.manage');
  }

  function canAssignTodo(): boolean {
    return hasPermission('todos.assign');
  }

  function canViewKb(): boolean {
    return hasPermission('kb.view') || hasPermission('kb.manage');
  }

  function canManageKb(): boolean {
    return hasPermission('kb.manage');
  }

  function canRespondToTicket(): boolean {
    return (
      hasPermission('tickets.comment') ||
      hasPermission('tickets.update_status') ||
      hasPermission('tickets.assign')
    );
  }

  function canCreateTicket(): boolean {
    return hasPermission('tickets.create');
  }

  function canViewAllTickets(): boolean {
    return hasPermission('tickets.view_all');
  }

  function canViewUnassignedTickets(): boolean {
    return hasPermission('tickets.view_unassigned');
  }

  return {
    hasRole,
    hasPermission,
    canManageUsers,
    canManageCategories,
    canManageRoles,
    canDeleteTicket,
    canAssignTicket,
    canChangePriority,
    canChangeStatus,
    canReferTicket,
    canManageTodos,
    canAssignTodo,
    canViewKb,
    canManageKb,
    canRespondToTicket,
    canCreateTicket,
    canViewAllTickets,
    canViewUnassignedTickets,
  };
}