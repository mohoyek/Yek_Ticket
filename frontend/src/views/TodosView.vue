<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTodoStore } from '@/stores/todos';
import { useToast } from '@/composables/useToast';
import { useRole } from '@/composables/useRole';
import AssignTodoModal from '@/components/AssignTodoModal.vue';
import type { User } from '@/api/client';

const todoStore = useTodoStore();
const toast = useToast();
const { canAssignTodo } = useRole();

const showAssignModal = ref(false);

function openAssignModal() {
  showAssignModal.value = true;
}

function handleAssigned(payload: { user: User | null; title: string }) {
  toast.success(`وظیفه «${payload.title}» به ${payload.user?.full_name ?? 'کارمند'} واگذار شد`);
}

const newTitle = ref('');
const newDueDate = ref('');
const adding = ref(false);
const editingId = ref<number | null>(null);
const editTitle = ref('');
const editDueDate = ref('');

onMounted(() => {
  todoStore.fetchTodos();
});

const visibleItems = computed(() => {
  if (todoStore.filter === 'pending') return todoStore.items.filter((t) => !t.is_done);
  if (todoStore.filter === 'done') return todoStore.items.filter((t) => !!t.is_done);
  return todoStore.items;
});

async function handleAdd() {
  if (!newTitle.value.trim()) return;
  adding.value = true;
  try {
    await todoStore.addTodo(newTitle.value.trim(), newDueDate.value || null);
    newTitle.value = '';
    newDueDate.value = '';
    toast.success('کار جدید اضافه شد');
  } catch {
    toast.error('خطا در افزودن کار');
  } finally {
    adding.value = false;
  }
}

async function handleToggle(todo: { id: number; is_done: number }) {
  try {
    await todoStore.toggleTodo(todo as never);
  } catch {
    toast.error('خطا در تغییر وضعیت کار');
  }
}

function startEdit(todo: { id: number; title: string; due_date: string | null }) {
  editingId.value = todo.id;
  editTitle.value = todo.title;
  editDueDate.value = todo.due_date || '';
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(id: number) {
  if (!editTitle.value.trim()) {
    toast.error('عنوان نمی‌تواند خالی باشد');
    return;
  }
  try {
    await todoStore.updateTodo(id, {
      title: editTitle.value.trim(),
      due_date: editDueDate.value || null,
    });
    editingId.value = null;
    toast.success('کار به‌روزرسانی شد');
  } catch {
    toast.error('خطا در به‌روزرسانی کار');
  }
}

async function handleDelete(id: number) {
  if (!confirm('آیا از حذف این کار اطمینان دارید؟')) return;
  try {
    await todoStore.deleteTodo(id);
    toast.success('کار حذف شد');
  } catch {
    toast.error('خطا در حذف کار');
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isOverdue(todo: { due_date: string | null; is_done: number }): boolean {
  if (!todo.due_date || todo.is_done) return false;
  const today = new Date().toISOString().slice(0, 10);
  return todo.due_date < today;
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">کارهای روزانه من</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          فهرست کارهای شخصی شما — فقط خودتان این لیست را می‌بینید
        </p>
      </div>
      <button v-if="canAssignTodo()" @click="openAssignModal" class="btn-secondary whitespace-nowrap">
        <svg class="w-5 h-5 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        واگذاری وظیفه
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ todoStore.stats.total }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">کل کارها</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-orange-500">{{ todoStore.stats.pending }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">انجام‌نشده</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-green-500">{{ todoStore.stats.done }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">انجام‌شده</p>
      </div>
    </div>

    <!-- Add form -->
    <div class="card mb-6">
      <form @submit.prevent="handleAdd" class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="newTitle"
          type="text"
          class="input-field flex-1"
          placeholder="کار جدیدی اضافه کنید..."
          maxlength="500"
        />
        <input
          v-model="newDueDate"
          type="date"
          class="input-field sm:w-40"
          title="سررسید (اختیاری)"
        />
        <button type="submit" :disabled="adding || !newTitle.trim()" class="btn-primary whitespace-nowrap">
          <svg class="w-5 h-5 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          افزودن
        </button>
      </form>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="f in (['all', 'pending', 'done'] as const)"
        :key="f"
        @click="todoStore.setFilter(f); todoStore.fetchTodos()"
        class="px-4 py-1.5 text-sm rounded-full transition-colors"
        :class="
          todoStore.filter === f
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        "
      >
        {{ f === 'all' ? 'همه' : f === 'pending' ? 'انجام‌نشده' : 'انجام‌شده' }}
      </button>
    </div>

    <!-- Todo list -->
    <div class="card">
      <div v-if="todoStore.loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else-if="visibleItems.length === 0" class="text-center py-12">
        <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {{ todoStore.filter === 'all' ? 'هنوز کاری اضافه نکرده‌اید' : 'موردی در این دسته نیست' }}
        </p>
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="todo in visibleItems"
          :key="todo.id"
          class="p-3 rounded-xl border transition-colors"
          :class="
            todo.is_done
              ? 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/30'
              : 'border-gray-200 dark:border-gray-700'
          "
        >
          <!-- Edit mode -->
          <div v-if="editingId === todo.id" class="flex flex-col sm:flex-row gap-2">
            <input v-model="editTitle" type="text" class="input-field flex-1" maxlength="500" />
            <input v-model="editDueDate" type="date" class="input-field sm:w-40" />
            <div class="flex gap-2">
              <button @click="saveEdit(todo.id)" class="btn-primary text-sm !px-3">ذخیره</button>
              <button @click="cancelEdit" class="btn-secondary text-sm !px-3">لغو</button>
            </div>
          </div>

          <!-- View mode -->
          <div v-else class="flex items-center gap-3">
            <button
              @click="handleToggle(todo)"
              class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
              :class="
                todo.is_done
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-primary-500 dark:border-gray-500'
              "
              :title="todo.is_done ? 'علامت‌گذاری به‌عنوان انجام‌نشده' : 'علامت‌گذاری به‌عنوان انجام‌شده'"
            >
              <svg v-if="todo.is_done" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </button>

            <div class="flex-1 min-w-0">
              <p
                class="text-sm break-words"
                :class="todo.is_done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'"
              >
                {{ todo.title }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span
                  v-if="todo.due_date"
                  class="text-[11px] px-2 py-0.5 rounded-full"
                  :class="isOverdue(todo) ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                >
                  📅 {{ formatDate(todo.due_date) }}{{ isOverdue(todo) ? ' (گذشته)' : '' }}
                </span>
                <router-link
                  v-if="todo.ticket_id"
                  :to="`/tickets/${todo.ticket_id}`"
                  class="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                >
                  🎫 تیکت #{{ todo.ticket_id }}
                </router-link>
              </div>
            </div>

            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                @click="startEdit(todo)"
                class="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors dark:hover:text-primary-400"
                title="ویرایش"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="handleDelete(todo.id)"
                class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors dark:hover:text-red-400"
                title="حذف"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Assign task to an employee / support agent (manager only) -->
    <AssignTodoModal :show="showAssignModal" @close="showAssignModal = false" @assigned="handleAssigned" />
  </div>
</template>
