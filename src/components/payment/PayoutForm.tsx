'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, AlertCircle, CheckCircle, Lock } from 'lucide-react';

interface PayoutFormProps {
  currentBalance: number;
  availableBalance: number;
  onPayoutComplete: () => void;
  onClose: () => void;
  telegramWalletVerified?: boolean;
}

const PAYOUT_AMOUNTS = [
  { amount: 500, label: '500₽' },
  { amount: 1000, label: '1 000₽' },
  { amount: 3000, label: '3 000₽' },
  { amount: 5000, label: '5 000₽' }
];

export function PayoutForm({ 
  currentBalance, 
  availableBalance, 
  onPayoutComplete, 
  onClose,
  telegramWalletVerified = false 
}: PayoutFormProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'TELEGRAM_WALLET' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramWalletAddress, setTelegramWalletAddress] = useState('');

  const getAmount = () => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseFloat(customAmount);
    return 0;
  };

  const handlePayout = async () => {
    const amount = getAmount();
    
    if (amount < 500) {
      setError('Минимальная сумма вывода: 500₽');
      return;
    }
    
    if (amount > availableBalance) {
      setError(`Недостаточно средств. Доступно: ${availableBalance}₽`);
      return;
    }

    if (!selectedMethod) {
      setError('Выберите способ вывода');
      return;
    }

    if (!telegramWalletVerified && selectedMethod === 'TELEGRAM_WALLET') {
      setError('Telegram Wallet не верифицирован. Привяжите кошелек в настройках.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          method: selectedMethod
        })
      });

      const data = await response.json();

      if (data.success) {
        // Показываем успех
        alert(`Выплата на сумму ${amount}₽ создана и обрабатывается!`);
        onPayoutComplete();
        onClose();
      } else {
        throw new Error(data.error || 'Ошибка создания выплаты');
      }
    } catch (error) {
      console.error('Ошибка вывода:', error);
      setError(error instanceof Error ? error.message : 'Ошибка вывода средств');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl bg-gradient-to-br from-mb-black to-black">
        <CardHeader className="border-b border-mb-gray/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl bg-gradient-to-r from-mb-turquoise to-mb-gold bg-clip-text text-transparent">
                Вывести средства
              </CardTitle>
              <CardDescription className="text-mb-gray mt-1">
                Доступно к выводу: <span className="text-mb-gold font-semibold">{availableBalance}₽</span>
              </CardDescription>
            </div>
            <button
              onClick={onClose}
              className="text-mb-gray hover:text-mb-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Выбор суммы */}
          <div>
            <label className="block text-sm font-medium mb-3 text-mb-white">
              Сумма вывода
            </label>
            
            {/* Быстрый выбор */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PAYOUT_AMOUNTS.map(({ amount, label }) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  disabled={amount > availableBalance}
                  className={`px-3 py-2 rounded-lg border transition-all ${
                    selectedAmount === amount
                      ? 'border-mb-gold bg-mb-gold/10 text-mb-gold'
                      : 'border-mb-gray/20 bg-mb-black/50 text-mb-gray hover:border-mb-gold/50 disabled:opacity-30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Кастомная сумма */}
            <Input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              placeholder="Введите сумму"
              min={500}
              max={availableBalance}
              className="w-full"
            />
            
            <p className="text-xs text-mb-gray mt-2">
              Минимум: 500₽, Максимум: {availableBalance}₽
            </p>
          </div>

          {/* Итоговая сумма */}
          {getAmount() > 0 && (
            <div className="bg-mb-gold/10 border border-mb-gold/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-mb-gray">Сумма вывода:</span>
                <span className="text-xl font-bold text-mb-gold">{getAmount()}₽</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-mb-gray">Останется на балансе:</span>
                <span className="font-semibold text-mb-white">{(availableBalance - getAmount()).toLocaleString()}₽</span>
              </div>
            </div>
          )}

          {/* Способ вывода */}
          <div>
            <label className="block text-sm font-medium mb-3 text-mb-white">
              Способ вывода
            </label>
            
            <button
              onClick={() => setSelectedMethod('TELEGRAM_WALLET')}
              disabled={!telegramWalletVerified}
              className={`w-full p-4 rounded-lg border transition-all ${
                selectedMethod === 'TELEGRAM_WALLET'
                  ? 'border-mb-gold bg-mb-gold/10'
                  : 'border-mb-gray/20 bg-mb-black/50 hover:border-mb-gold/50 disabled:opacity-30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-mb-white flex items-center space-x-2">
                      <span>Telegram Wallet</span>
                      {telegramWalletVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-mb-gray">
                      {telegramWalletVerified ? 'Готов к выводу' : 'Требуется верификация'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-mb-gray">
                  Комиссия 1.5%
                </div>
              </div>
            </button>

            {!telegramWalletVerified && (
              <p className="text-xs text-red-500 mt-2 flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>Привяжите Telegram Wallet в настройках для вывода</span>
              </p>
            )}
          </div>

          {/* Срок выплаты */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-500 font-semibold mb-1">Срок выплаты:</p>
                <p className="text-mb-gray">
                  Обычно выплата происходит в течение <strong className="text-mb-white">1-3 часов</strong> 
                  после подтверждения
                </p>
              </div>
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Кнопка вывода */}
          <Button
            onClick={handlePayout}
            disabled={isProcessing || getAmount() === 0 || !selectedMethod || !telegramWalletVerified}
            className="w-full bg-gradient-to-r from-mb-gold to-mb-turquoise text-mb-black font-semibold hover:shadow-glow transition-all"
          >
            {isProcessing ? 'Обработка...' : `Вывести ${getAmount()}₽`}
          </Button>

          {/* Мелкий шрифт */}
          <p className="text-xs text-center text-mb-gray/70">
            Создавая выплату, вы соглашаетесь с условиями использования и обработки персональных данных
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

