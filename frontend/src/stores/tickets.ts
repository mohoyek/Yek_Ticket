import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/client';
import type { Ticket, TicketDetail, User, Category } from '@/api/client';

export const useTicketStore = defineStore('tickets', () => {
  const tickets = ref<Ticket[]>([]);
  const currentTicket = ref<TicketDetail | null>(null);
  const loading = ref(false);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Filters
  const filters = ref({
    status: '',
    priority: '',
    category: 0,
    assigned_to: 0,
    search: '',
    page: 1,
    limit: 20,
  });

  async function fetchTickets() {
    loading.value = true;
    try {
      const params: Record<string, string | number> = {};
      if (filters.value.status) params.status = filters.value.status;
      if (filters.value.priority) params.priority = filters.value.priority;
      if (filters.value.category) params.category = filters.value.category;
      if (filters.value.assigned_to) params.assigned_to = filters.value.assigned_to;
      if (filters.value.search) params.search = filters.value.search;
      params.page = filters.value.page;
      params.limit = filters.value.limit;

      const response = await api.get('/tickets', { params });
      tickets.value = response.data.data;
      pagination.value = response.data.pagination;
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicket(id: number) {
    loading.value = true;
    try {
      const response = await api.get(`/tickets/${id}`);
      currentTicket.value = response.data.data;
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(data: {
    title: string;
    description?: string;
    category_id?: number;
    priority?: string;
    contact_phone?: string;
    employee_name?: string;
  }) {
    const response = await api.post('/tickets', data);
    return response.data.data as Ticket;
  }

  async function updateTicket(id: number, data: Record<string, unknown>) {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data.data as Ticket;
  }

  async function deleteTicket(id: number) {
    await api.delete(`/tickets/${id}`);
  }

  async function addComment(ticketId: number, body: string) {
    const response = await api.post(`/tickets/${ticketId}/comments`, { body });
    return response.data.data;
  }

  async function uploadAttachment(ticketId: number, file: File, commentId?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (commentId) formData.append('comment_id', String(commentId));

    const response = await api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  async function assignTicket(ticketId: number, assignedTo: number | null) {
    await api.put(`/tickets/${ticketId}/assign`, { assigned_to: assignedTo });
  }

  // Stats
  const statsLoading = ref(false);
  const stats = ref<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: { assigned_to: number | null; assigned_to_name: string | null; count: number }[];
  }>({
    total: 0,
    byStatus: { open: 0, in_progress: 0, closed: 0, waiting_customer: 0 },
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    byAssignee: [],
  });

  async function fetchStats() {
    statsLoading.value = true;
    try {
      const response = await api.get('/tickets/stats');
      stats.value = response.data.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      statsLoading.value = false;
    }
  }

  // Reference data
  const staff = ref<User[]>([]);
  const categories = ref<Category[]>([]);

  async function fetchStaff() {
    try {
      const response = await api.get('/users/staff');
      staff.value = response.data.data;
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }

  async function fetchCategories() {
    try {
      const response = await api.get('/categories');
      categories.value = response.data.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  function setFilter(key: string, value: string | number) {
    (filters.value as Record<string, unknown>)[key] = value;
    filters.value.page = 1;
  }

  function resetFilters() {
    filters.value = {
      status: '',
      priority: '',
      category: 0,
      assigned_to: 0,
      search: '',
      page: 1,
      limit: 20,
    };
  }

  return {
    tickets,
    currentTicket,
    loading,
    pagination,
    filters,
    stats,
    statsLoading,
    staff,
    categories,
    fetchTickets,
    fetchStats,
    fetchTicket,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment,
    uploadAttachment,
    assignTicket,
    fetchStaff,
    fetchCategories,
    setFilter,
    resetFilters,
  };
});
