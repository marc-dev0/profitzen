'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';

interface AutocompleteOption {
  id: string;
  code: string;
  name: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  onCreateNew?: () => void;
  createNewLabel?: string;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
  className = '',
  emptyMessage = 'No se encontraron resultados',
  onCreateNew,
  createNewLabel = '+ Crear nuevo'
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [searchTerm, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 + (onCreateNew ? 1 : 0) ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === filteredOptions.length && onCreateNew) {
          handleCreateNew();
        } else if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      setIsOpen(false);
      setSearchTerm('');
      onCreateNew();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    inputRef.current?.select();
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : (selectedOption ? `${selectedOption.name} (${selectedOption.code})` : '')}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${className}`}
        autoComplete="off"
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-gray-900 hover:bg-gray-50'
                } ${option.id === value ? 'font-semibold' : ''}`}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span>{option.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({option.code})</span>
                </div>
              </div>
            ))
          )}

          {onCreateNew && (
            <>
              {filteredOptions.length > 0 && (
                <div className="border-t border-gray-200" />
              )}
              <div
                className={`px-4 py-2 cursor-pointer text-sm text-blue-600 hover:bg-blue-50 ${
                  highlightedIndex === filteredOptions.length ? 'bg-blue-50' : ''
                }`}
                onClick={handleCreateNew}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              >
                {createNewLabel}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
