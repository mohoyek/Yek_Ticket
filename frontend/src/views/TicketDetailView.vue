<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTicketStore } from '@/stores/tickets';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/composables/useRole';
import { useToast } from '@/composables/useToast';
import api from '@/api/client';
import Badge from '@/components/common/Badge.vue';
import FileUpload from '@/components/common/FileUpload.vue';

const route = useRoute();
const router = useRouter();
const ticketStore = useTicketStore();
const authStore = useAuthStore();
const toast = useToast();
const { canAssignTicket, canChangePriority, canDeleteTicket, canReferTicket } = useRole();

const ticketId = computed(() => Number(route.params.id));
const loading = ref(true);
const loadError = ref('');

// Comment form
const newComment = ref('');
const submittingComment = ref(false);

// Status change
const changingStatus = ref(false);

// Assignment
const showAssignModal = ref(false);
const selectedAssignee = ref<number | null>(null);
const assigning = ref(false);

// Refer (ارجاع به همکار)
const showReferModal = ref(false);
const selectedReferee = ref<number | null>(null);
const referNote = ref('');
const referCreateTodo = ref(true);
const referring = ref(false);

// File upload
const MAX_ATTACHMENTS = 5;
const selectedFile = ref<File | null>(null);
const uploadingFile = ref(false);

const attachmentCount = computed(
  () => ticketStore.currentTicket?.attachments?.length || 0
);
const canUploadMore = computed(
  () => attachmentCount.value < MAX_ATTACHMENTS
);

onMounted(async () => {
  try {
    await ticketStore.fetchTicket(ticketId.value);
    await ticketStore.fetchCategories();
    if (authStore.isInternalStaff) {
      await ticketStore.fetchStaff();
    }
  } catch {
    loadError.value = 'خطا در بارگذاری تیکت';
  } finally {
    loading.value = false;
  }
});

async function handleStatusChange(newStatus: string) {
  changingStatus.value = true;
  try {
    await ticketStore.updateTicket(ticketId.value, { status: newStatus });
    await ticketStore.fetchTicket(ticketId.value);
    toast.success('وضعیت تیکت با موفقیت تغییر کرد');
  } catch {
    toast.error('خطا در تغییر وضعیت');
  } finally {
    changingStatus.value = false;
  }
}

async function handlePriorityChange(newPriority: string) {
  try {
    await ticketStore.updateTicket(ticketId.value, { priority: newPriority });
    await ticketStore.fetchTicket(ticketId.value);
    toast.success('اولویت تیکت با موفقیت تغییر کرد');
  } catch {
    toast.error('خطا در تغییر اولویت');
  }
}

async function handleSubmitComment() {
  if (!newComment.value.trim()) return;
  submittingComment.value = true;
  try {
    await ticketStore.addComment(ticketId.value, newComment.value);
    newComment.value = '';
    await ticketStore.fetchTicket(ticketId.value);
    toast.success('کامنت با موفقیت ارسال شد');
  } catch {
    toast.error('خطا در ارسال کامنت');
  } finally {
    submittingComment.value = false;
  }
}

async function handleAssign() {
  assigning.value = true;
  try {
    await ticketStore.assignTicket(ticketId.value, selectedAssignee.value);
    showAssignModal.value = false;
    await ticketStore.fetchTicket(ticketId.value);
    toast.success('تیکت با موفقیت منتسب شد');
  } catch {
    toast.error('خطا در انتساب تیکت');
  } finally {
    assigning.value = false;
  }
}

function staffRoleLabel(role: string): string {
  return role === 'admin' ? 'مدیر سیستم' : role === 'manager' ? 'مدیر' : 'پشتیبان';
}

const referableStaff = computed(() =>
  ticketStore.staff.filter(
    (s) => s.id !== authStore.user?.id && s.role !== 'customer'
  )
);

async function handleRefer() {
  if (!selectedReferee.value) {
    toast.error('همکار موردنظر را انتخاب کنید');
    return;
  }
  referring.value = true;
  try {
    const response = await api.put(`/tickets/${ticketId.value}/refer`, {
      to_user_id: selectedReferee.value,
      note: referNote.value.trim() || undefined,
      create_todo: referCreateTodo.value,
    });
    showReferModal.value = false;
    selectedReferee.value = null;
    referNote.value = '';
    referCreateTodo.value = true;
    await ticketStore.fetchTicket(ticketId.value);
    const todoMsg = response.data?.data?.todo_created
      ? ' (یک کار به لیست کارهای او اضافه شد)'
      : '';
    toast.success(`تیکت به همکار ارجاع شد${todoMsg}`);
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در ارجاع تیکت');
  } finally {
    referring.value = false;
  }
}

async function handleFileUpload() {
  if (!selectedFile.value) return;
  uploadingFile.value = true;
  try {
    await ticketStore.uploadAttachment(ticketId.value, selectedFile.value);
    selectedFile.value = null;
    await ticketStore.fetchTicket(ticketId.value);
    toast.success('فایل با موفقیت آپلود شد');
  } catch {
    toast.error('خطا در آپلود فایل');
  } finally {
    uploadingFile.value = false;
  }
}

async function handleDeleteTicket() {
  if (!confirm('آیا از حذف این تیکت اطمینان دارید؟')) return;
  try {
    await ticketStore.deleteTicket(ticketId.value);
    toast.success('تیکت با موفقیت حذف شد');
    router.push('/');
  } catch {
    toast.error('خطا در حذف تیکت');
  }
}

function downloadFile(attachmentId: number, fileName: string) {
  const link = document.createElement('a');
  link.href = `/tickets/${ticketId.value}/files/${attachmentId}`;
  link.download = fileName;
  link.target = '_blank';
  link.click();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusOptions = [
  { value: 'open', label: 'باز' },
  { value: 'in_progress', label: 'در حال بررسی' },
  { value: 'closed', label: 'بسته‌شده' },
  { value: 'waiting_customer', label: 'در انتظار مشتری' },
];

const priorityOptions = [
  { value: 'low', label: 'کم' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high', label: 'زیاد' },
  { value: 'urgent', label: 'فوری' },
];
</script>

<template>
  <div>
    <!-- Back button -->
    <button
      @click="router.push('/')"
      class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      بازگشت به داشبورد
    </button>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
    </div>

    <!-- Error -->
    <div v-else-if="loadError && !ticketStore.currentTicket" class="text-center py-12">
      <p class="text-red-500">{{ loadError }}</p>
    </div>

    <!-- Ticket Content -->
    <div v-else-if="ticketStore.currentTicket" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Ticket Header -->
        <div class="card">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                {{ ticketStore.currentTicket.title }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
                تیکت #{{ ticketStore.currentTicket.id }} • ایجاد شده در {{ formatDate(ticketStore.currentTicket.created_at) }}
              </p>
            </div>
            <button
              v-if="canDeleteTicket()"
              @click="handleDeleteTicket"
              class="btn-danger text-sm"
            >
              حذف تیکت
            </button>
          </div>

          <!-- Description -->
          <div v-if="ticketStore.currentTicket.description" class="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
            <p class="text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-200">{{ ticketStore.currentTicket.description }}</p>
          </div>
        </div>

        <!-- Comments -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            کامنت‌ها ({{ ticketStore.currentTicket.comments?.length || 0 }})
          </h2>

          <!-- Comment list -->
          <div class="space-y-4">
            <div
              v-for="comment in ticketStore.currentTicket.comments"
              :key="comment.id"
              class="p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ comment.user_name }}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(comment.created_at) }}</span>
              </div>
              <p class="text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-200">{{ comment.body }}</p>
            </div>

            <div
              v-if="ticketStore.currentTicket.comments?.length === 0"
              class="text-center py-8 text-sm text-gray-500 dark:text-gray-400"
            >
              هنوز کامنتی ثبت نشده است
            </div>
          </div>

          <!-- Add comment form -->
          <div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <textarea
              v-model="newComment"
              class="input-field"
              rows="3"
              placeholder="کامنت خود را بنویسید..."
            ></textarea>
            <div class="flex justify-end mt-2">
              <button
                @click="handleSubmitComment"
                :disabled="submittingComment || !newComment.trim()"
                class="btn-primary"
              >
                <span v-if="submittingComment" class="ml-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                ارسال کامنت
              </button>
            </div>
          </div>
        </div>

        <!-- Attachments -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            فایل‌های پیوست ({{ ticketStore.currentTicket.attachments?.length || 0 }})
          </h2>

          <!-- Attachment list -->
          <div class="space-y-2">
            <div
              v-for="attachment in ticketStore.currentTicket.attachments"
              :key="attachment.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700/50"
            >
              <div class="flex items-center gap-3 min-w-0">
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-700 truncate dark:text-gray-200">{{ attachment.file_name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{{ attachment.uploaded_by_name }}</p>
                </div>
              </div>
              <button
                @click="downloadFile(attachment.id, attachment.file_name)"
                class="text-primary-600 hover:text-primary-700 text-sm flex-shrink-0 dark:text-primary-400 dark:hover:text-primary-300"
              >
                دانلود
              </button>
            </div>

            <div
              v-if="ticketStore.currentTicket.attachments?.length === 0"
              class="text-center py-4 text-sm text-gray-500 dark:text-gray-400"
            >
              فایلی پیوست نشده است
            </div>
          </div>

          <!-- File upload -->
          <div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div v-if="canUploadMore">
              <FileUpload
                @select="(file: File) => selectedFile = file"
                @error="(msg: string) => toast.error(msg)"
                :disabled="uploadingFile"
              />
              <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {{ attachmentCount }} از {{ MAX_ATTACHMENTS }} فایل پیوست استفاده شده
              </p>
              <div v-if="selectedFile" class="flex justify-end mt-2">
                <button
                  @click="handleFileUpload"
                  :disabled="uploadingFile"
                  class="btn-primary"
                >
                  <span v-if="uploadingFile" class="ml-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  آپلود فایل
                </button>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-sm text-orange-600">
                حداکثر {{ MAX_ATTACHMENTS }} فایل برای هر تیکت مجاز است
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Status & Priority -->
        <div class="card">
          <h3 class="text-sm font-semibold text-gray-900 mb-3 dark:text-gray-100">اطلاعات تیکت</h3>

          <div class="space-y-3">
            <!-- Status -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">وضعیت</label>
              <div class="mt-1">
                <Badge type="status" :value="ticketStore.currentTicket.status" />
              </div>
              <select
                v-if="authStore.isInternalStaff"
                :value="ticketStore.currentTicket.status"
                @change="handleStatusChange(($event.target as HTMLSelectElement).value)"
                :disabled="changingStatus"
                class="input-field mt-2 text-sm"
              >
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Priority -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">اولویت</label>
              <div class="mt-1">
                <Badge type="priority" :value="ticketStore.currentTicket.priority" />
              </div>
              <select
                v-if="canChangePriority"
                :value="ticketStore.currentTicket.priority"
                @change="handlePriorityChange(($event.target as HTMLSelectElement).value)"
                class="input-field mt-2 text-sm"
              >
                <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Category -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">دسته‌بندی</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">{{ ticketStore.currentTicket.category_name || 'نامشخص' }}</p>
            </div>

            <!-- Created by -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">سازنده</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">{{ ticketStore.currentTicket.created_by_name }}</p>
            </div>

            <!-- Contact phone -->
            <div v-if="ticketStore.currentTicket.contact_phone">
              <label class="text-xs text-gray-500 dark:text-gray-400">شماره تماس</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300" dir="ltr">
                {{ ticketStore.currentTicket.contact_phone }}
              </p>
            </div>

            <!-- Employee name -->
            <div v-if="ticketStore.currentTicket.employee_name">
              <label class="text-xs text-gray-500 dark:text-gray-400">نام کارمند</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">{{ ticketStore.currentTicket.employee_name }}</p>
            </div>

            <!-- Assigned to -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">منتسب‌شونده</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">
                {{ ticketStore.currentTicket.assigned_to_name || 'بدون انتساب' }}
              </p>
              <div class="flex items-center gap-3 mt-1">
                <button
                  v-if="canAssignTicket"
                  @click="showAssignModal = true; selectedAssignee = ticketStore.currentTicket?.assigned_to"
                  class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  تغییر انتساب
                </button>
                <button
                  v-if="canReferTicket"
                  @click="showReferModal = true; selectedReferee = null; referNote = ''"
                  class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  ارجاع به همکار
                </button>
              </div>
            </div>

            <!-- Created at -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">تاریخ ایجاد</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">{{ formatDate(ticketStore.currentTicket.created_at) }}</p>
            </div>

            <!-- Updated at -->
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">آخرین به‌روزرسانی</label>
              <p class="text-sm text-gray-700 mt-1 dark:text-gray-300">{{ formatDate(ticketStore.currentTicket.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Refer Modal -->
    <div
      v-if="showReferModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-md dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 mb-1 dark:text-gray-100">ارجاع تیکت به همکار</h3>
        <p class="text-xs text-gray-500 mb-4 dark:text-gray-400">
          تیکت برای همکار ارسال می‌شود؛ انتساب اصلی تغییر نمی‌کند.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">همکار مقصد</label>
            <select v-model="selectedReferee" class="input-field">
              <option :value="null" disabled>انتخاب کنید...</option>
              <option v-for="staff in referableStaff" :key="staff.id" :value="staff.id">
                {{ staff.full_name }} ({{ staffRoleLabel(staff.role) }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">یادداشت (اختیاری)</label>
            <textarea
              v-model="referNote"
              class="input-field"
              rows="3"
              maxlength="1000"
              placeholder="مثلاً: لطفاً بخش مودیان این تیکت را بررسی کن"
            ></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer dark:text-gray-300">
            <input
              type="checkbox"
              v-model="referCreateTodo"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            افزودن کار به لیست کارهای روزانه همکار
          </label>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button @click="showReferModal = false" class="btn-secondary">لغو</button>
          <button
            @click="handleRefer"
            :disabled="referring || !selectedReferee"
            class="btn-primary"
          >
            {{ referring ? 'در حال ارجاع...' : 'ارجاع' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Assign Modal -->
    <div
      v-if="showAssignModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-sm dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">انتساب تیکت</h3>
        <select
          v-model="selectedAssignee"
          class="input-field"
        >
          <option :value="null">بدون انتساب</option>
          <option v-for="staff in ticketStore.staff" :key="staff.id" :value="staff.id">
            {{ staff.full_name }} ({{ staff.role === 'admin' ? 'مدیر سیستم' : staff.role === 'manager' ? 'مدیر' : 'پشتیبان' }})
          </option>
        </select>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showAssignModal = false" class="btn-secondary">لغو</button>
          <button @click="handleAssign" :disabled="assigning" class="btn-primary">
            {{ assigning ? 'در حال انتساب...' : 'انتساب' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
