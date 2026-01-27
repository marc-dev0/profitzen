import React, { useState, useEffect } from 'react';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  className = '',
  onFocus
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Permitir vacío
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Validar formato: números, punto decimal y comas
    const regex = /^[0-9]*[,.]?[0-9]*$/;
    if (!regex.test(inputValue)) {
      return; // No actualizar si no cumple el formato
    }

    // Actualizar el display value
    setDisplayValue(inputValue);

    // Convertir a número (remover comas, reemplazar coma por punto si es necesario)
    const cleanValue = inputValue.replace(/,/g, '');
    const numericValue = parseFloat(cleanValue);

    if (!isNaN(numericValue)) {
      onChange(numericValue);
    } else if (inputValue === '.' || inputValue === ',') {
      // Permitir escribir punto/coma inicial
      onChange(0);
    }
  };

  const handleBlur = () => {
    // Al perder foco, formatear el número si tiene valor
    if (displayValue && value > 0) {
      setDisplayValue(value.toString());
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
    />
  );
};
