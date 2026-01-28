"use client";

import { useState } from 'react';
import type { OrderUI } from '@/lib/types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Calendar, Network, Users, Clock, ExternalLink, X, ZoomIn, Target } from 'lucide-react';

type Order = OrderUI;

interface OrderCardProps {
  order: Order;
  onAccept: (orderId: string) => void;
  compact?: boolean;
  hideAcceptButton?: boolean;
  showScreenshotUpload?: boolean;
  onScreenshotUpload?: (file: File, orderId: string) => void;
  onDelete?: (orderId: string) => void;
  showDeleteButton?: boolean;
}

const socialNetworkIcons: Record<string, string> = {
  INSTAGRAM: '📷',
  TIKTOK: '🎵',
  VK: '🔵',
  TELEGRAM: '✈️',
  WHATSAPP: '💬',
  FACEBOOK: '👥',
};

const statusBadgeConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'gold', label: string }> = {
  PENDING: { variant: 'secondary', label: 'Ожидает' },
  IN_PROGRESS: { variant: 'default', label: 'В работе' },
  COMPLETED: { variant: 'gold', label: 'Выполнено' },
  CANCELLED: { variant: 'destructive', label: 'Отменено' },
};

export function OrderCard({ 
  order, 
  onAccept, 
  compact = false, 
  hideAcceptButton = false, 
  showScreenshotUpload = false, 
  onScreenshotUpload, 
  onDelete, 
  showDeleteButton = false 
}: OrderCardProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocation = () => {
    const parts = [order.targetCity, order.targetRegion, order.targetCountry].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : order.region || 'Не указано';
  };

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string>('');

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return '';
    // Если URL начинается с /uploads или uploads/, преобразуем в API путь
    if (url.startsWith('/uploads') || url.startsWith('uploads/')) {
      return `/api/uploads/${url.replace(/^\/?uploads\//, '')}`;
    }
    // Если URL относительный (начинается с /), оставляем как есть
    if (url.startsWith('/')) {
      return url;
    }
    // Если URL абсолютный (http/https), оставляем как есть
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Если URL без протокола, добавляем https://
    if (url.includes('.') && !url.startsWith('/')) {
      return `https://${url}`;
    }
    return url;
  };

  const processedImageSrc = resolveImageUrl(order.processedImageUrl ?? undefined);
  const qrImageSrc = resolveImageUrl(order.qrCodeUrl ?? undefined);

  const handleImageClick = (src: string) => {
    setModalImageSrc(src);
    setImageModalOpen(true);
  };

  const closeModal = () => {
    setImageModalOpen(false);
    setModalImageSrc('');
  };

  return (
    <Card className="hover:shadow-glow hover:scale-[1.01] sm:hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col h-full group min-h-[320px] sm:min-h-[380px]">
      {/* Статус бейдж слева вверху */}
      {order.status && statusBadgeConfig[order.status] && (
        <div className="absolute top-4 left-4 z-10">
          <Badge variant={statusBadgeConfig[order.status].variant} className="text-xs">
            {statusBadgeConfig[order.status].label}
          </Badge>
        </div>
      )}
      
      {/* Основная информация */}
      <div className={`${order.status ? 'pt-12' : 'pt-6'} px-6 pb-4`}>
        {/* Заголовок и цена */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0 space-y-1">
            <h3
              className="text-lg md:text-xl font-bold text-white leading-snug truncate group-hover:text-mb-turquoise transition-colors"
              title={order.title}
            >
              {order.title}
            </h3>
            {order.description && (
              <p className="text-mb-gray text-sm leading-relaxed break-words line-clamp-2">
                {order.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="gold" className="text-base md:text-lg px-3 py-1 shadow-lg shadow-mb-gold/20">
              {Number(order.totalReward ?? order.reward ?? 0).toLocaleString()}₽
            </Badge>
            {order.quantity && order.quantity > 1 && (
              <span className="text-xs text-mb-gray text-right">
                {order.completedCount || 0} / {order.quantity} выполнено
              </span>
            )}
          </div>
        </div>

        {/* Краткие метаданные для компактного вида */}
        {compact && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-mb-gray">
            {order.socialNetwork && (
              <div className="inline-flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-mb-turquoise shrink-0" />
                <span>
                  {socialNetworkIcons[order.socialNetwork] || '🌐'} {order.socialNetwork}
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-mb-turquoise shrink-0" />
              <span className="truncate max-w-[160px]" title={getLocation()}>
                {getLocation()}
              </span>
            </div>
            {order.deadline && (
              <div className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-mb-gold shrink-0" />
                <span>
                  до{' '}
                  {new Date(order.deadline).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ссылка на ресурс */}
        {order.targetUrl && (
          <a
            href={order.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mb-3 px-3 py-2 bg-mb-turquoise/10 hover:bg-mb-turquoise/20 border border-mb-turquoise/30 rounded-lg transition-all hover:shadow-lg hover:shadow-mb-turquoise/20 group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 text-mb-turquoise shrink-0 group-hover/link:scale-110 transition-transform" />
            <span className="text-sm text-mb-turquoise group-hover/link:text-mb-turquoise/80 truncate flex-1">
              {order.targetUrl}
            </span>
          </a>
        )}

        {/* Метаинформация - сетка */}
        {!compact && (
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            {/* Социальная сеть */}
            {order.socialNetwork && (
              <div className="flex items-center gap-2 text-mb-gray">
                <Network className="w-4 h-4 text-mb-turquoise shrink-0" />
                <span>
                  {socialNetworkIcons[order.socialNetwork] || '🌐'} {order.socialNetwork}
                </span>
              </div>
            )}

            {/* Локация */}
            <div className="flex items-center gap-2 text-mb-gray">
              <MapPin className="w-4 h-4 text-mb-turquoise shrink-0" />
              <span className="truncate" title={getLocation()}>
                {getLocation()}
              </span>
            </div>

            {/* Дедлайн */}
            {order.deadline && (
              <div className="flex items-center gap-2 text-mb-gray">
                <Clock className="w-4 h-4 text-mb-gold shrink-0" />
                <span className="text-xs">
                  Дедлайн:{' '}
                  {new Date(order.deadline).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Дата размещения */}
            {order.createdAt && (
              <div className="flex items-center gap-2 text-mb-gray">
                <Calendar className="w-4 h-4 text-mb-turquoise shrink-0" />
                <span className="text-xs">
                  Создано:{' '}
                  {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>
            )}

            {/* Целевая аудитория */}
            {order.targetAudience && (
              <div className="flex items-center gap-2 text-mb-gray col-span-2">
                <Users className="w-4 h-4 text-mb-turquoise shrink-0" />
                <span className="text-mb-turquoise text-xs">
                  {order.targetAudience}
                </span>
              </div>
            )}

            {/* Заказчик */}
            {order.customer?.name && (
              <div className="text-mb-gray col-span-2 text-xs">
                <span className="text-mb-white font-medium">Заказчик:</span> {order.customer.name}
                {order.customer.level && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {order.customer.level}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Изображения */}
        {(processedImageSrc || qrImageSrc) && (
          <>
            {compact ? (
              <div className="flex items-center gap-3 mb-3">
                {processedImageSrc && (
                  <div 
                    className="relative flex-1 h-20 sm:h-24 rounded-lg overflow-hidden border border-mb-turquoise/40 bg-mb-black/60 flex items-center justify-center cursor-pointer group/img"
                    onClick={() => handleImageClick(processedImageSrc)}
                  >
                    <img
                      src={processedImageSrc}
                      alt={order.title || 'Готовое изображение'}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/file.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                {qrImageSrc && (
                  <div 
                    className="flex items-center justify-center bg-white rounded-lg p-1.5 sm:p-2 border border-mb-gold/40 cursor-pointer hover:border-mb-gold/70 transition-all"
                    onClick={() => handleImageClick(qrImageSrc)}
                  >
                    <img
                      src={qrImageSrc}
                      alt="QR Code"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/file.svg';
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Готовое изображение */}
                {processedImageSrc && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-mb-white uppercase tracking-wide">
                      Готовое изображение
                    </h4>
                    <div 
                      className="relative w-full h-32 rounded-lg overflow-hidden border border-mb-turquoise/40 hover:border-mb-turquoise/70 transition-all cursor-pointer group bg-mb-black/60 flex items-center justify-center"
                      onClick={() => handleImageClick(processedImageSrc)}
                    >
                      <img
                        src={processedImageSrc}
                        alt={order.title || 'Готовое изображение'}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/file.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* QR код */}
                {qrImageSrc && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-mb-white uppercase tracking-wide">
                      QR код для отслеживания
                    </h4>
                    <div 
                      className="relative flex items-center justify-center bg-white rounded-lg p-3 border border-mb-gold/40 h-32 cursor-pointer hover:border-mb-gold/70 transition-all group"
                      onClick={() => handleImageClick(qrImageSrc)}
                    >
                      <img
                        src={qrImageSrc}
                        alt="QR Code"
                        className="w-full h-full max-w-[120px] max-h-[120px] object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/file.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none">
                        <ZoomIn className="w-5 h-5 text-mb-black" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Требования (если не compact) */}
        {!compact && (
          <div className="mb-3 p-3 bg-mb-black/30 rounded-lg border border-mb-gray/10 hover:border-mb-turquoise/30 transition-colors">
            <h4 className="text-xs font-semibold text-mb-white uppercase tracking-wide mb-2">
              Требования к выполнению
            </h4>
            <ul className="text-sm text-mb-gray space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-mb-turquoise shrink-0 font-bold">•</span>
                <span>Разместить в сторис {order.socialNetwork || 'Instagram/Telegram'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mb-turquoise shrink-0 font-bold">•</span>
                <span>Сделать скриншот размещения</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mb-turquoise shrink-0 font-bold">•</span>
                <span>Загрузить скриншот для проверки</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Кнопки и действия внизу */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5 space-y-3 mt-auto">
        {/* Кнопка принять */}
        {!hideAcceptButton && (
          <Button
            onClick={() => onAccept(order.id)}
            className="w-full hover:shadow-lg hover:shadow-mb-turquoise/50 transition-all duration-300 text-sm sm:text-base"
            size="lg"
          >
            <Target className="w-4 h-4 mr-2" />
            Принять задание
          </Button>
        )}

        {/* Окно загрузки скриншота */}
        {showScreenshotUpload && onScreenshotUpload && (
          <div className="p-4 border border-mb-turquoise/30 rounded-lg bg-mb-black/50">
            <h4 className="text-sm font-semibold mb-3 text-white">Загрузите скриншот выполнения:</h4>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onScreenshotUpload) {
                  onScreenshotUpload(file, order.id);
                }
              }}
              className="w-full p-3 border border-mb-gray/20 rounded-lg bg-mb-input text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-mb-turquoise file:text-mb-black hover:file:bg-mb-turquoise/80 transition-colors"
            />
            <p className="text-xs text-mb-gray mt-2">
              Скриншот сторис с размещением задания (PNG, JPG, макс. 10MB)
            </p>
          </div>
        )}

        {/* Кнопка удаления в правом нижнем углу карточки */}
        {showDeleteButton && onDelete && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onDelete(order.id)}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-md border border-red-500/40 hover:border-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
              aria-label="Удалить задание"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Удалить задание</span>
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно для увеличения изображения */}
      {imageModalOpen && modalImageSrc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={modalImageSrc}
              alt="Увеличенное изображение"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/file.svg';
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

