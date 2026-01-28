'use client';

import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface CustomerImageUploadProps {
  onImageProcessed: (processedImageUrl: string, qrCodeUrl: string, orderId: string) => void;
}

export function CustomerImageUpload({ onImageProcessed }: CustomerImageUploadProps) {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    console.log('[CustomerImageUpload] Начало загрузки файла:', file.name, file.size, 'bytes');
    setProcessing(true);
    
    try {
      // 1. Загружаем оригинальное изображение
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('[CustomerImageUpload] Отправка запроса на /api/images/process');
      const response = await fetch('/api/images/process', {
        method: 'POST',
        body: formData
      });
      
      console.log('[CustomerImageUpload] Статус ответа:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('[CustomerImageUpload] Данные ответа:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки изображения');
      }
      
      const { processedImageUrl, qrCodeUrl, orderId } = data;
      
      if (!processedImageUrl || !qrCodeUrl || !orderId) {
        console.error('[CustomerImageUpload] Неполные данные в ответе:', data);
        throw new Error('Сервер вернул неполные данные');
      }
      
      console.log('[CustomerImageUpload] Успешная обработка:', {
        processedImageUrl,
        qrCodeUrl,
        orderId
      });
      
      // Для превью используем /api/uploads, чтобы обойти возможные проблемы со статикой /uploads
      const toUploadsApi = (url: string): string => {
        if (!url) return url;
        // '/uploads/xxx.png' или 'uploads/xxx.png' → '/api/uploads/xxx.png'
        const cleaned = url.replace(/^\/?uploads\//, '');
        return `/api/uploads/${cleaned}`;
      };

      const previewProcessed = processedImageUrl.startsWith('/uploads') || processedImageUrl.startsWith('uploads/')
        ? toUploadsApi(processedImageUrl)
        : processedImageUrl;

      const previewQr = qrCodeUrl.startsWith('/uploads') || qrCodeUrl.startsWith('uploads/')
        ? toUploadsApi(qrCodeUrl)
        : qrCodeUrl;

      setProcessedImage(previewProcessed);
      setQrCodeUrl(previewQr);
      setOrderId(orderId);
      onImageProcessed(processedImageUrl, qrCodeUrl, orderId);
      
    } catch (error) {
      console.error('[CustomerImageUpload] ОШИБКА:', error);
      alert(`Ошибка обработки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Загрузите изображение для рекламы</h3>
      
      <div className="space-y-4">
        {/* Загрузка файла */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setOriginalImage(file);
                handleImageUpload(file);
              }
            }}
            className="hidden"
          />
          
          <Button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="w-full"
          >
            {processing ? 'Обрабатывается...' : 'Выбрать изображение'}
          </Button>
        </div>

        {/* Предпросмотр оригинального изображения */}
        {originalImage && (
          <div className="text-center">
            <h4 className="text-sm font-medium mb-2 text-white">Ваше изображение:</h4>
            <img 
              src={URL.createObjectURL(originalImage)} 
              alt="Original" 
              className="mx-auto h-48 w-auto object-cover rounded" 
            />
          </div>
        )}

        {/* Предпросмотр обработанного изображения с QR кодом */}
        {processedImage && (
          <div className="text-center">
            <h4 className="text-sm font-medium mb-2 text-white">Готовое изображение с QR кодом:</h4>
            <div className="relative">
              <img 
                src={processedImage} 
                alt="Processed" 
                className="mx-auto h-48 w-auto object-cover rounded border-2 border-mb-turquoise" 
                onError={(e) => {
                  console.error('[CustomerImageUpload] Ошибка загрузки обработанного изображения:', processedImage);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => {
                  console.log('[CustomerImageUpload] ✅ Обработанное изображение загружено:', processedImage);
                }}
              />
            </div>
          </div>
        )}

        {/* QR код отдельно */}
        {qrCodeUrl && (
          <div className="text-center">
            <h4 className="text-sm font-medium mb-2 text-white">QR код для размещения:</h4>
            <div className="relative">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto w-32 h-32" 
                onError={(e) => {
                  console.error('[CustomerImageUpload] Ошибка загрузки QR кода:', qrCodeUrl);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => {
                  console.log('[CustomerImageUpload] ✅ QR код загружен:', qrCodeUrl);
                }}
              />
            </div>
          </div>
        )}

        {/* ID заказа */}
        {orderId && (
          <div className="text-center">
            <p className="text-sm text-mb-gray">ID заказа: {orderId}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

