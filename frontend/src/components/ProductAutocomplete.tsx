'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useProductSearch } from '@/hooks/useProductSearch';
import type { ProductSearchResult } from '@/types/inventory';

interface ProductAutocompleteProps {
  onSelect: (product: ProductSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
  onNextField?: () => void;
}

export interface ProductAutocompleteRef {
  focus: () => void;
}

const ProductAutocomplete = forwardRef<ProductAutocompleteRef, ProductAutocompleteProps>(({
  onSelect,
  disabled = false,
  placeholder = "Buscar por código o nombre...",
  onNextField
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const { data: products, isLoading } = useProductSearch(searchTerm, !disabled);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectProduct = (product: ProductSearchResult) => {
    onSelect(product);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onNextField) {
      setTimeout(() => onNextField(), 0);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(value.length >= 2);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !products || products.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < products.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < products.length) {
          handleSelectProduct(products[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        autoComplete="off"
      />

      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Buscando productos...
            </div>
          )}

          {!isLoading && (!products || products.length === 0) && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No se encontraron productos
            </div>
          )}

          {!isLoading && products && products.length > 0 && (
            <ul ref={listRef} className="py-1">
              {products.map((product, index) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {product.code} - {product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.categoryName} • Stock: {product.currentStock}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-500">Compra</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(product.purchasePrice)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

ProductAutocomplete.displayName = 'ProductAutocomplete';

export default ProductAutocomplete;
