/**
 * Единый файл типов для UI компонентов и страниц
 * Все типы для работы с заказами, выполнениями и пользователями
 */

export interface UserMini {
  id?: string;
  name?: string;
  level?: string;
}

export interface ExecutionUI {
  id: string;
  status: string;
  reward?: number;
  executor?: UserMini;
  createdAt?: string;
  screenshotUrl?: string;
}

export interface OrderUI {
  id: string;
  title: string;
  description?: string;
  targetAudience?: string | null;
  targetUrl?: string | null; // Ссылка на ресурс
  reward?: number; // per-execution
  totalReward?: number | null; // total paid
  processedImageUrl?: string | null;
  qrCodeUrl?: string | null;
  deadline?: string | null;
  status?: string;
  createdAt?: string;
  executions?: ExecutionUI[];
  customer?: UserMini;
  region?: string;
  socialNetwork?: string;
  quantity?: number;
  targetCountry?: string | null;
  targetRegion?: string | null;
  targetCity?: string | null;
  completedCount?: number;
  maxExecutions?: number;
}

// Экспортируем OrderUI как Order для обратной совместимости
export type Order = OrderUI;
export type Execution = ExecutionUI;

