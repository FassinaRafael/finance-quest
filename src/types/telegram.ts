import type { TransactionType } from './database';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  username?: string;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface ParsedExpense {
  amount: number;
  rawText: string;
  categoryQuery?: string;
  matchedCategoryId?: string;
  matchedCategoryName?: string;
  matchedCategoryIcon?: string;
  description?: string;
  isFixed: boolean;
  type: TransactionType;
  confidence: 'HIGH' | 'MEDIUM' | 'FALLBACK';
}
