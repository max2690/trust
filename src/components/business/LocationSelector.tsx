'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import { getAllRegions, getRegionByCity as getRegionByCityFromData } from '@/lib/russia-geo-data';

interface Location {
  country: string | null;
  region: string | null;
  city: string | null;
}

interface LocationSelectorProps {
  onLocationChange: (location: Location) => void;
  initialLocation?: Location;
}

type Suggestion = { city?: string; region?: string; value?: string };

export function LocationSelector({ onLocationChange, initialLocation }: LocationSelectorProps) {
  const [scope, setScope] = useState<'country' | 'region' | 'city'>('country');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  const [countryInput, setCountryInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация
  useEffect(() => {
    if (initialLocation) {
      setSelectedCountry(initialLocation.country);
      setSelectedRegion(initialLocation.region);
      setSelectedCity(initialLocation.city);
      
      setCountryInput(initialLocation.country || 'Россия');
      setRegionInput(initialLocation.region || '');
      setCityInput(initialLocation.city || '');
      
      if (initialLocation.city) setScope('city');
      else if (initialLocation.region) setScope('region');
      else setScope('country');
    } else {
      setCountryInput('Россия');
    }
  }, [initialLocation]);

  // Получаем все регионы из справочника
  const regions = getAllRegions();

  const handleScopeChange = (newScope: 'country' | 'region' | 'city') => {
    setScope(newScope);
    
    if (newScope === 'country') {
      setSelectedRegion(null);
      setSelectedCity(null);
      setRegionInput('');
      setCityInput('');
    } else if (newScope === 'region') {
      setSelectedCity(null);
      setCityInput('');
    }
    
    updateLocation(selectedCountry, selectedRegion, selectedCity, newScope);
  };

  const updateLocation = (country: string | null, region: string | null, city: string | null, currentScope: 'country' | 'region' | 'city') => {
    const finalCountry = country || 'Россия';
    let finalRegion = null;
    let finalCity = null;

    if (currentScope === 'region' && region) {
      finalRegion = region;
    } else if (currentScope === 'city' && city) {
      finalCity = city;
      // Автоматически определяем регион для города
      const cityRegion = getRegionByCity(city);
      finalRegion = cityRegion;
    }

    onLocationChange({
      country: finalCountry,
      region: finalRegion,
      city: finalCity
    });
  };

  const getRegionByCity = (city: string): string | null => {
    // Используем справочник из russia-geo-data
    return getRegionByCityFromData(city);
  };

  const handleCountrySelect = () => {
    setSelectedCountry('Россия');
    updateLocation('Россия', null, null, 'country');
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    setRegionInput(region);
    updateLocation(selectedCountry, region, null, 'region');
  };

  const handleCityInputChange = async (value: string) => {
    setCityInput(value);
    setSelectedCity(value);
    
    // Автодополнение через DaData
    if (value.length >= 2) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(value)}&type=city`);
        const data = await response.json();
        setCitySuggestions(data.suggestions?.map((s: Suggestion) => s.city || s.value) || []);
      } catch (error) {
        console.error('Ошибка автодополнения:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    updateLocation(selectedCountry, null, value, 'city');
  };

  const handleRegionInputChange = async (value: string) => {
    setRegionInput(value);
    
    // Автодополнение для регионов
    if (value.length >= 2) {
      try {
        const response = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(value)}&type=region`);
        const data = await response.json();
        setRegionSuggestions(data.suggestions?.map((s: Suggestion) => s.region || s.value) || []);
      } catch (error) {
        console.error('Ошибка автодополнения регионов:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Выберите геолокацию для задания
        </label>
      </div>

      {/* Кнопки выбора области действия */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => handleScopeChange('country')}
          className={`px-4 py-2 rounded-lg border transition-all ${
            scope === 'country'
              ? 'border-mb-turquoise bg-mb-turquoise/10 text-mb-turquoise'
              : 'border-mb-gray/20 bg-mb-black/50 text-mb-gray hover:border-mb-turquoise/50'
          }`}
        >
          🌍 Вся страна
        </button>
        <button
          type="button"
          onClick={() => handleScopeChange('region')}
          className={`px-4 py-2 rounded-lg border transition-all ${
            scope === 'region'
              ? 'border-mb-turquoise bg-mb-turquoise/10 text-mb-turquoise'
              : 'border-mb-gray/20 bg-mb-black/50 text-mb-gray hover:border-mb-turquoise/50'
          }`}
        >
          🗺️ Регион/Край
        </button>
        <button
          type="button"
          onClick={() => handleScopeChange('city')}
          className={`px-4 py-2 rounded-lg border transition-all ${
            scope === 'city'
              ? 'border-mb-turquoise bg-mb-turquoise/10 text-mb-turquoise'
              : 'border-mb-gray/20 bg-mb-black/50 text-mb-gray hover:border-mb-turquoise/50'
          }`}
        >
          📍 Город
        </button>
      </div>

      {/* Вся страна */}
      {scope === 'country' && (
        <Card className="p-4 bg-mb-turquoise/5 border-mb-turquoise/20">
          <p className="text-sm text-mb-gray">
            Задание будет доступно для всех исполнителей в России
          </p>
          <input type="hidden" value="Россия" />
        </Card>
      )}

      {/* Выбор региона */}
      {scope === 'region' && (
        <div>
            <div className="relative">
              <Input
                value={regionInput}
                onChange={(e) => {
                  setRegionInput(e.target.value);
                  handleRegionInputChange(e.target.value);
                }}
                placeholder="Начните вводить регион или край..."
                className="w-full"
              />
              {regionSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-mb-black border border-mb-gray/20 rounded-lg max-h-48 overflow-auto">
                  {regionSuggestions.map((region, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setRegionInput(region);
                        setRegionSuggestions([]);
                        handleRegionSelect(region);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-mb-gray/10 transition-colors"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>
          
          {regionInput && (
            <div className="mt-2 p-2 bg-mb-black/50 rounded">
              <p className="text-xs text-mb-gray">
                Задание будет доступно для исполнителей в: <strong className="text-mb-turquoise">{regionInput}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Выбор города */}
      {scope === 'city' && (
        <div>
          <div className="relative">
            <Input
              value={cityInput}
              onChange={(e) => handleCityInputChange(e.target.value)}
              placeholder="Введите город (например, Москва, Воронеж, Краснодар)"
              className="w-full pr-10"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-mb-turquoise border-t-transparent rounded-full" />
              </div>
            )}
            {citySuggestions.length > 0 && !isLoading && (
              <div className="absolute z-10 w-full mt-1 bg-mb-black border border-mb-gray/20 rounded-lg max-h-48 overflow-auto">
                {citySuggestions.map((city, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setCityInput(city);
                      setCitySuggestions([]);
                      handleCityInputChange(city);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-mb-gray/10 transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {cityInput && (
            <div className="mt-2 p-2 bg-mb-black/50 rounded">
              <p className="text-xs text-mb-gray">
                Задание будет доступно для исполнителей в: <strong className="text-mb-turquoise">{cityInput}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

