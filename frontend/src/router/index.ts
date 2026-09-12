import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'tickets/create',
          name: 'CreateTicket',
          component: () => import('@/views/CreateTicketView.vue'),
        },
        {
          path: 'tickets/:id',
          name: 'TicketDetail',
          component: () => import('@/views/TicketDetailView.vue'),
        },
        {
          path: 'knowledge',
          name: 'KnowledgeBase',
          component: () => import('@/views/KnowledgeBaseView.vue'),
          meta: { requiresPermission: ['kb.view', 'kb.manage'] },
        },
        {
          path: 'notifications',
          name: 'Notifications',
          component: () => import('@/views/NotificationsView.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/ProfileView.vue'),
        },
        {
          path: 'todos',
          name: 'Todos',
          component: () => import('@/views/TodosView.vue'),
          meta: { requiresPermission: 'todos.manage' },
        },
        // Admin routes
        {
          path: 'admin/users',
          name: 'AdminUsers',
          component: () => import('@/views/admin/UsersView.vue'),
          meta: { requiresRole: ['admin'] },
        },
        {
          path: 'admin/categories',
          name: 'AdminCategories',
          component: () => import('@/views/admin/CategoriesView.vue'),
          meta: { requiresRole: ['admin'] },
        },
        {
          path: 'admin/roles',
          name: 'AdminRoles',
          component: () => import('@/views/admin/RolesView.vue'),
          meta: { requiresRole: ['admin'] },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' });
  } else if (to.meta.requiresGuest && token) {
    next({ name: 'Dashboard' });
  } else if (to.meta.requiresRole && user) {
    const requiredRoles = to.meta.requiresRole as string[];
    if (!requiredRoles.includes(user.role)) {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
  } else if (to.meta.requiresPermission && user) {
    const permsStr = localStorage.getItem('permissions');
    const perms: string[] = permsStr ? JSON.parse(permsStr) : [];
    const required = to.meta.requiresPermission;
    const requiredPerms = Array.isArray(required) ? required : [required];
    if (!requiredPerms.some((p) => perms.includes(p))) {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
