<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'select', file: File): void;
  (e: 'error', message: string): void;
}>();

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    maxSizeMB?: number;
    allowedTypes?: string[];
  }>(),
  {
    disabled: false,
    maxSizeMB: 10,
    allowedTypes: () => [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  }
);

const isDragging = ref(false);
const selectedFile = ref<File | null>(null);

const extensionTypeMap: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/x-zip-compressed',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function validateFile(file: File): string | null {
  const maxBytes = props.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `حجم فایل بیش از حد مجاز است (حداکثر ${props.maxSizeMB} مگابایت)`;
  }

  const mimeAllowed = props.allowedTypes.includes(file.type);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const typeByExt = extensionTypeMap[ext];
  const typeAllowed = mimeAllowed || (typeByExt !== undefined && props.allowedTypes.includes(typeByExt));

  if (!typeAllowed) {
    return 'فرمت فایل پشتیبانی نمی‌شود (تصویر، PDF، Word، Excel یا ZIP)';
  }

  return null;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    selectFile(files[0]);
  }
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectFile(input.files[0]);
  }
  // Reset input so selecting the same file again re-triggers change
  input.value = '';
}

function selectFile(file: File) {
  const validationError = validateFile(file);
  if (validationError) {
    selectedFile.value = null;
    emit('error', validationError);
    return;
  }
  selectedFile.value = file;
  emit('select', file);
}

function removeFile() {
  selectedFile.value = null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
</script>

<template>
  <div>
    <!-- Drop zone -->
    <div
      v-if="!selectedFile"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
      :class="
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : disabled
            ? 'border-gray-200 opacity-50 cursor-not-allowed dark:border-gray-700'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
      "
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        فایل را اینجا رها کنید یا
        <label
          class="text-primary-600 hover:text-primary-700 cursor-pointer dark:text-primary-400 dark:hover:text-primary-300"
          :class="{ 'opacity-50 pointer-events-none': disabled }"
        >
          انتخاب کنید
          <input
            type="file"
            class="hidden"
            @change="handleFileInput"
            :disabled="disabled"
          />
        </label>
      </p>
      <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
        حداکثر حجم: {{ maxSizeMB }} مگابایت — تصویر، PDF، Word، Excel یا ZIP
      </p>
    </div>

    <!-- Selected file preview -->
    <div
      v-else
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600"
    >
      <div class="flex items-center gap-3">
        <svg
          class="w-8 h-8 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ selectedFile.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatFileSize(selectedFile.size) }}</p>
        </div>
      </div>
      <button
        @click="removeFile"
        class="p-1 text-gray-400 hover:text-red-500 transition-colors dark:text-gray-500"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>