<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTicketStore } from '@/stores/tickets';
import { useAuthStore } from '@/stores/auth';
import Badge from '@/components/common/Badge.vue';
import Pagination from '@/components/common/Pagination.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import { useToast } from '@/composables/useToast';
import { useRole } from '@/composables/useRole';

const router = useRouter();
const ticketStore = useTicketStore();
const authStore = useAuthStore();
const { canDeleteTicket } = useRole();
const toast = useToast();

const deletingId = ref<number | null>(null);

onMounted(() => {
  ticketStore.fetchTickets();
  ticketStore.fetchStats();
  ticketStore.fetchCategories();
  if (authStore.isInternalStaff) {
    ticketStore.fetchStaff();
  }
});

function handleFilterChange(key: string, value: string | number) {
  ticketStore.setFilter(key, value);
  ticketStore.fetchTickets();
}

function handlePageChange(page: number) {
  ticketStore.filters.page = page;
  ticketStore.fetchTickets();
}

function handleSearch() {
  ticketStore.filters.page = 1;
  ticketStore.fetchTickets();
}

function handleStatusCardClick(key: string) {
  const next = ticketStore.filters.status === key ? '' : key;
  ticketStore.setFilter('status', next);
  ticketStore.fetchTickets();
}

function handlePriorityCardClick(key: string) {
  const next = ticketStore.filters.priority === key ? '' : key;
  ticketStore.setFilter('priority', next);
  ticketStore.fetchTickets();
}

const assigneeRows = computed(() => {
  const rows = ticketStore.stats.byAssignee || [];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return rows.map((r) => ({
    ...r,
    percent: Math.round((r.count / max) * 100),
  }));
});

function handleAssigneeClick(row: { assigned_to: number | null }) {
  if (row.assigned_to == null) return;
  const next = ticketStore.filters.assigned_to === row.assigned_to ? 0 : row.assigned_to;
  ticketStore.setFilter('assigned_to', next);
  ticketStore.fetchTickets();
}

function viewTicket(id: number) {
  router.push(`/tickets/${id}`);
}

async function handleDeleteTicket(id: number, title: string) {
  if (!confirm(`آیا از حذف تیکت «${title}» (#${id}) اطمینان دارید؟`)) return;

  deletingId.value = id;

  try {
    await ticketStore.deleteTicket(id);
    toast.success(`تیکت #${id} با موفقیت حذف شد`);
    await ticketStore.fetchTickets();
  } catch {
    toast.error('خطا در حذف تیکت');
  } finally {
    deletingId.value = null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusCards = [
  {
    key: 'open',
    label: 'باز',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  },
  {
    key: 'in_progress',
    label: 'در حال بررسی',
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'closed',
    label: 'بسته‌شده',
    bg: 'bg-green-100',
    text: 'text-green-600',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'waiting_customer',
    label: 'در انتظار مشتری',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const priorityCards = [
  {
    key: 'low',
    label: 'اولویت کم',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: 'M5 15l7-7 7 7',
  },
  {
    key: 'medium',
    label: 'اولویت متوسط',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: 'M5 10l7 7 7-7',
  },
  {
    key: 'high',
    label: 'اولویت زیاد',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    icon: 'M5 10l7-7 7 7M5 19l7-7 7 7',
  },
  {
    key: 'urgent',
    label: 'اولویت فوری',
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
];
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">داشبورد</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ authStore.isCustomer ? 'تیکت‌های شما' : 'مدیریت تیکت‌ها' }}
        </p>
      </div>
      <router-link to="/tickets/create" class="btn-primary">
        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        تیکت جدید
      </router-link>
    </div>

    <!-- Stats: by status (clickable filters) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <button
        v-for="card in statusCards"
        :key="card.key"
        @click="handleStatusCardClick(card.key)"
        :disabled="ticketStore.statsLoading"
        class="card flex items-center gap-3 !p-4 text-right cursor-pointer transition-all"
        :class="
          ticketStore.filters.status === card.key
            ? 'ring-2 ring-primary-500 border-primary-500 shadow-md'
            : 'hover:border-gray-300 hover:shadow-md'
        "
        :title="ticketStore.filters.status === card.key ? 'کلیک برای حذف فیلتر' : 'فیلتر بر اساس این وضعیت'"
      >
        <template v-if="ticketStore.statsLoading">
          <SkeletonBlock skeletonClass="flex-shrink-0 w-11 h-11 rounded-xl" />
          <div class="flex-1 space-y-2">
            <SkeletonBlock skeletonClass="w-10 h-6 rounded" />
            <SkeletonBlock skeletonClass="w-16 h-3 rounded" />
          </div>
        </template>
        <template v-else>
          <div
            class="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            :class="card.bg"
          >
            <svg class="w-6 h-6" :class="card.text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.icon" />
            </svg>
          </div>
          <div class="flex-1 text-right min-w-0">
            <p class="text-2xl font-bold text-gray-900 leading-none dark:text-gray-100">
              {{ ticketStore.stats.byStatus[card.key] || 0 }}
            </p>
            <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">{{ card.label }}</p>
          </div>
        </template>
        <span
          v-if="ticketStore.filters.status === card.key"
          class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </button>
    </div>

    <!-- Stats: by priority (clickable filters) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <button
        v-for="card in priorityCards"
        :key="card.key"
        @click="handlePriorityCardClick(card.key)"
        :disabled="ticketStore.statsLoading"
        class="card flex items-center gap-3 !p-4 text-right cursor-pointer transition-all"
        :class="
          ticketStore.filters.priority === card.key
            ? 'ring-2 ring-primary-500 border-primary-500 shadow-md'
            : 'hover:border-gray-300 hover:shadow-md'
        "
        :title="ticketStore.filters.priority === card.key ? 'کلیک برای حذف فیلتر' : 'فیلتر بر اساس این اولویت'"
      >
        <template v-if="ticketStore.statsLoading">
          <SkeletonBlock skeletonClass="flex-shrink-0 w-11 h-11 rounded-xl" />
          <div class="flex-1 space-y-2">
            <SkeletonBlock skeletonClass="w-10 h-6 rounded" />
            <SkeletonBlock skeletonClass="w-16 h-3 rounded" />
          </div>
        </template>
        <template v-else>
          <div
            class="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            :class="card.bg"
          >
            <svg class="w-6 h-6" :class="card.text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.icon" />
            </svg>
          </div>
          <div class="flex-1 text-right min-w-0">
            <p class="text-2xl font-bold text-gray-900 leading-none dark:text-gray-100">
              {{ ticketStore.stats.byPriority[card.key] || 0 }}
            </p>
            <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">{{ card.label }}</p>
          </div>
        </template>
        <span
          v-if="ticketStore.filters.priority === card.key"
          class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </button>
    </div>

    <!-- Chart: tickets per assignee (admin/manager) -->
    <div
      v-if="authStore.isAdmin || authStore.isManager"
      class="card mb-6"
    >
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">تیکت‌ها بر اساس پشتیبان</h2>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">توزیع تیکت‌ها بین کارکنان داخلی</p>
      </div>

      <div v-if="assigneeRows.length === 0" class="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        تیکتی برای نمایش وجود ندارد
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="row in assigneeRows"
          :key="row.assigned_to ?? 'unassigned'"
          @click="handleAssigneeClick(row)"
          class="group"
          :class="
            row.assigned_to != null
              ? 'cursor-pointer'
              : 'cursor-default'
          "
        >
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-sm font-medium flex items-center gap-2"
              :class="
                ticketStore.filters.assigned_to === row.assigned_to
                  ? 'text-primary-700 dark:text-primary-300'
                  : row.assigned_to == null
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-700 group-hover:text-primary-700 dark:text-gray-300'
              "
            >
              {{ row.assigned_to_name || 'بدون انتساب' }}
              <span
                v-if="ticketStore.filters.assigned_to === row.assigned_to"
                class="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full dark:bg-primary-900/60 dark:text-primary-300"
              >
                فیلتر فعال
              </span>
            </span>
            <span class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ row.count }} تیکت</span>
          </div>
          <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-700">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="
                ticketStore.filters.assigned_to === row.assigned_to
                  ? 'bg-primary-600'
                  : 'bg-primary-400 group-hover:bg-primary-500'
              "
              :style="{ width: Math.max(row.percent, 2) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">جستجو</label>
          <div class="relative">
            <input
              v-model="ticketStore.filters.search"
              @keyup.enter="handleSearch"
              type="text"
              class="input-field pr-10"
              placeholder="جستجو در عنوان و توضیحات..."
            />
            <svg
              class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Status filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">وضعیت</label>
          <select
            :value="ticketStore.filters.status"
            @change="handleFilterChange('status', ($event.target as HTMLSelectElement).value)"
            class="input-field"
          >
            <option value="">همه</option>
            <option value="open">باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="closed">بسته‌شده</option>
            <option value="waiting_customer">در انتظار مشتری</option>
          </select>
        </div>

        <!-- Priority filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">اولویت</label>
          <select
            :value="ticketStore.filters.priority"
            @change="handleFilterChange('priority', ($event.target as HTMLSelectElement).value)"
            class="input-field"
          >
            <option value="">همه</option>
            <option value="low">کم</option>
            <option value="medium">متوسط</option>
            <option value="high">زیاد</option>
            <option value="urgent">فوری</option>
          </select>
        </div>

        <!-- Category filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">دسته‌بندی</label>
          <select
            :value="ticketStore.filters.category"
            @change="handleFilterChange('category', Number(($event.target as HTMLSelectElement).value))"
            class="input-field"
          >
            <option :value="0">همه</option>
            <option v-for="cat in ticketStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Additional filters for internal staff -->
      <div v-if="authStore.isInternalStaff" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">منتسب‌شونده</label>
          <select
            :value="ticketStore.filters.assigned_to"
            @change="handleFilterChange('assigned_to', Number(($event.target as HTMLSelectElement).value))"
            class="input-field"
          >
            <option :value="0">همه</option>
            <option v-for="staff in ticketStore.staff" :key="staff.id" :value="staff.id">
              {{ staff.full_name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tickets Table -->
    <div class="card">
      <!-- Loading state: skeleton rows -->
      <div v-if="ticketStore.loading" class="divide-y divide-gray-100 dark:divide-gray-700/60">
        <div v-for="n in 5" :key="n" class="p-4 space-y-3">
          <!-- badges row skeleton -->
          <div class="flex items-center gap-2">
            <SkeletonBlock skeletonClass="w-10 h-4 rounded" />
            <SkeletonBlock skeletonClass="w-16 h-5 rounded-full" />
            <SkeletonBlock skeletonClass="w-14 h-5 rounded-full" />
          </div>
          <!-- title skeleton -->
          <SkeletonBlock skeletonClass="w-2/3 h-4 rounded" />
          <!-- meta rows skeleton -->
          <div class="space-y-2">
            <SkeletonBlock skeletonClass="w-1/2 h-3 rounded" />
            <SkeletonBlock skeletonClass="w-1/3 h-3 rounded" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="ticketStore.tickets.length === 0"
        class="text-center py-12"
      >
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="mt-2 text-sm text-gray-500">تیکتی یافت نشد</p>
      </div>

      <!-- Table (desktop only) -->
      <div v-else class="hidden md:block overflow-x-auto">
        <table class="w-full min-w-[720px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">شماره</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">عنوان</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">دسته‌بندی</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">وضعیت</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">اولویت</th>
              <th v-if="authStore.isInternalStaff" class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">سازنده</th>
              <th v-if="authStore.isInternalStaff" class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">منتسب‌شونده</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">تاریخ</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">کامنت</th>
              <th v-if="canDeleteTicket" class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in ticketStore.tickets"
              :key="ticket.id"
              @click="viewTicket(ticket.id)"
              class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors dark:border-gray-700/60 dark:hover:bg-gray-700/40"
            >
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">#{{ ticket.id }}</td>
              <td class="py-3 px-4">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ ticket.title }}</span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ ticket.category_name || '-' }}</td>
              <td class="py-3 px-4">
                <Badge type="status" :value="ticket.status" />
              </td>
              <td class="py-3 px-4">
                <Badge type="priority" :value="ticket.priority" />
              </td>
              <td v-if="authStore.isInternalStaff" class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                {{ ticket.created_by_name || '-' }}
              </td>
              <td v-if="authStore.isInternalStaff" class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                {{ ticket.assigned_to_name || 'بدون انتساب' }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(ticket.created_at) }}</td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ ticket.comment_count || 0 }}</td>
              <td v-if="canDeleteTicket" class="py-3 px-4">
                <button
                  @click.stop="handleDeleteTicket(ticket.id, ticket.title)"
                  :disabled="deletingId === ticket.id"
                  class="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300"
                  title="حذف تیکت"
                >
                  <span v-if="deletingId === ticket.id">در حال حذف...</span>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cards (mobile only) -->
      <div v-if="!ticketStore.loading && ticketStore.tickets.length > 0" class="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
        <div
          v-for="ticket in ticketStore.tickets"
          :key="ticket.id"
          @click="viewTicket(ticket.id)"
          class="p-4 active:bg-gray-50 cursor-pointer transition-colors dark:active:bg-gray-700/40"
        >
          <!-- Top row: id + badges + date -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-medium text-gray-400 dark:text-gray-500">#{{ ticket.id }}</span>
            <Badge type="status" :value="ticket.status" />
            <Badge type="priority" :value="ticket.priority" />
            <span
              v-if="canDeleteTicket"
              class="mr-auto text-red-600 hover:text-red-700 dark:text-red-400 p-1"
              role="button"
              title="حذف تیکت"
              @click.stop="handleDeleteTicket(ticket.id, ticket.title)"
            >
              <span v-if="deletingId === ticket.id" class="text-xs">در حال حذف...</span>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          </div>

          <!-- Title -->
          <h3 class="mt-2 text-sm font-semibold text-gray-900 leading-relaxed dark:text-gray-100">
            {{ ticket.title }}
          </h3>

          <!-- Meta rows -->
          <div class="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p v-if="ticket.category_name">
              دسته‌بندی: <span class="text-gray-700 dark:text-gray-300">{{ ticket.category_name }}</span>
            </p>
            <p v-if="authStore.isInternalStaff">
              سازنده: <span class="text-gray-700 dark:text-gray-300">{{ ticket.created_by_name || '-' }}</span>
            </p>
            <p v-if="authStore.isInternalStaff">
              منتسب: <span class="text-gray-700 dark:text-gray-300">{{ ticket.assigned_to_name || 'بدون انتساب' }}</span>
            </p>
            <p class="flex items-center gap-3">
              <span>{{ formatDate(ticket.created_at) }}</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {{ ticket.comment_count || 0 }}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div v-if="ticketStore.pagination.totalPages > 1" class="mt-4 px-4 pb-4">
        <Pagination
          :current-page="ticketStore.pagination.page"
          :total-pages="ticketStore.pagination.totalPages"
          :total="ticketStore.pagination.total"
          @page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
