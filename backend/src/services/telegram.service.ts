import type { User, Ticket } from '../env';
import { UserService } from './user.service';
import { TicketService } from './ticket.service';
import { hashPassword } from '../utils/password';

interface TelegramMessage {
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      username?: string;
    };
    chat: {
      id: number;
    };
    text?: string;
    reply_to_message?: {
      message_id: number;
      text?: string;
    };
  };
}

export class TelegramService {
  private apiBase: string;
  private userService: UserService;
  private ticketService: TicketService;

  constructor(
    private botToken: string,
    private db: D1Database
  ) {
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    this.userService = new UserService(db);
    this.ticketService = new TicketService(db);
  }

  async handleWebhook(update: TelegramMessage): Promise<void> {
    const message = update.message;
    if (!message || !message.from) return;

    const chatId = message.chat.id;
    const text = message.text || '';

    // Check if this is a reply to a ticket message
    if (message.reply_to_message && text) {
      await this.handleReply(chatId, message.reply_to_message, text);
      return;
    }

    // Handle commands
    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, 'سلام! به سیستم پشتیبانی خوش آمدید.\n\nبرای ایجاد تیکت جدید، پیام خود را ارسال کنید.\nبرای مشاهده تیکت‌های خود، از دستور /tickets استفاده کنید.');
      return;
    }

    if (text.startsWith('/tickets')) {
      await this.listUserTickets(chatId);
      return;
    }

    // Create a new ticket from the message
    if (text.length > 0) {
      await this.createTicketFromMessage(chatId, text, message.from);
    }
  }

  private async createTicketFromMessage(
    chatId: number,
    text: string,
    from: { id: number; first_name?: string; username?: string }
  ): Promise<void> {
    // Find or create user
    let user = await this.userService.findByTelegramChatId(String(chatId));

    if (!user) {
      // Create customer from Telegram
      const username = from.username || `tg_${chatId}`;
      const fullName = from.first_name || `کاربر تلگرام ${chatId}`;
      const randomPassword = Math.random().toString(36).substring(2, 10);
      const passwordHash = await hashPassword(randomPassword);

      try {
        user = await this.userService.createCustomer(fullName, username, passwordHash, String(chatId));
      } catch {
        // Username might exist, try with chat ID
        user = await this.userService.createCustomer(
          fullName,
          `tg_${chatId}`,
          passwordHash,
          String(chatId)
        );
      }
    }

    // Create ticket
    const ticket = await this.ticketService.create(
      `تیکت از تلگرام - ${new Date().toLocaleDateString('fa-IR')}`,
      text,
      undefined, // default category
      'medium',
      user.id
    );

    await this.sendMessage(
      chatId,
      `✅ تیکت شما با شماره #${ticket.id} ثبت شد.\n\nکاربران پشتیبانی به زودی پاسخ خواهند داد.`
    );
  }

  private async handleReply(
    chatId: number,
    replyTo: { message_id: number; text?: string },
    text: string
  ): Promise<void> {
    // Try to find ticket ID from the replied message
    const ticketMatch = replyTo.text?.match(/#(\d+)/);
    if (!ticketMatch) {
      await this.sendMessage(chatId, '❌ لطفاً روی پیام تیکت reply کنید.');
      return;
    }

    const ticketId = parseInt(ticketMatch[1]);
    const user = await this.userService.findByTelegramChatId(String(chatId));

    if (!user) {
      await this.sendMessage(chatId, '❌ لطفاً ابتدا با دستور /start شروع کنید.');
      return;
    }

    try {
      await this.ticketService.addComment(ticketId, user.id, text);
      await this.sendMessage(chatId, `✅ پاسخ شما به تیکت #${ticketId} ثبت شد.`);
    } catch {
      await this.sendMessage(chatId, '❌ خطا در ثبت پاسخ. لطفاً دوباره تلاش کنید.');
    }
  }

  private async listUserTickets(chatId: number): Promise<void> {
    const user = await this.userService.findByTelegramChatId(String(chatId));
    if (!user) {
      await this.sendMessage(chatId, '❌ شما هنوز ثبت‌نام نکرده‌اید. لطفاً یک پیام ارسال کنید تا حساب شما ایجاد شود.');
      return;
    }

    const { tickets } = await this.ticketService.getAll(
      { page: 1, limit: 10 },
      ['tickets.view'],
      user.id
    );

    if (tickets.length === 0) {
      await this.sendMessage(chatId, '📋 شما تیکتی ندارید.');
      return;
    }

    const statusLabels: Record<string, string> = {
      open: '🔵 باز',
      in_progress: '🟡 در حال بررسی',
      closed: '🟢 بسته‌شده',
      waiting_customer: '🟠 در انتظار شما',
    };

    const ticketList = tickets
      .map((t) => `${statusLabels[t.status]} #${t.id} - ${t.title}`)
      .join('\n');

    await this.sendMessage(chatId, `📋 تیکت‌های شما:\n\n${ticketList}`);
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }
}
