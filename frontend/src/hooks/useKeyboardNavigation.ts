import { useRef, useCallback, RefObject, KeyboardEvent } from 'react';

interface UseKeyboardNavigationOptions {
  onSubmit?: () => void;
  autoSelectOnFocus?: boolean;
}

/**
 * Hook for managing keyboard navigation in forms.
 * Creates refs for form fields and provides handlers for Enter key navigation.
 *
 * @param fieldCount - Number of fields in the form
 * @param options - Navigation options
 *
 * @example
 * const { refs, getKeyHandler, focusField } = useKeyboardNavigation(3, { onSubmit: handleSave });
 *
 * <input ref={refs[0]} onKeyDown={getKeyHandler(0)} />
 * <input ref={refs[1]} onKeyDown={getKeyHandler(1)} />
 * <input ref={refs[2]} onKeyDown={getKeyHandler(2)} /> // Last field submits on Enter
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLInputElement>(
  fieldCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const { onSubmit, autoSelectOnFocus = true } = options;

  const refs = useRef<RefObject<T | null>[]>(
    Array.from({ length: fieldCount }, () => ({ current: null }))
  );

  const focusField = useCallback((index: number) => {
    const field = refs.current[index]?.current;
    if (field) {
      field.focus();
      if (autoSelectOnFocus && field instanceof HTMLInputElement) {
        field.select();
      }
    }
  }, [autoSelectOnFocus]);

  const focusNext = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < fieldCount) {
      focusField(nextIndex);
    } else if (onSubmit) {
      onSubmit();
    }
  }, [fieldCount, focusField, onSubmit]);

  const focusPrevious = useCallback((currentIndex: number) => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      focusField(prevIndex);
    }
  }, [focusField]);

  const getKeyHandler = useCallback((index: number) => {
    return (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        focusNext(index);
      }
    };
  }, [focusNext]);

  const setRef = useCallback((index: number) => {
    return (element: T | null) => {
      if (refs.current[index]) {
        (refs.current[index] as { current: T | null }).current = element;
      }
    };
  }, []);

  return {
    refs: refs.current,
    setRef,
    getKeyHandler,
    focusField,
    focusNext,
    focusPrevious,
  };
}

/**
 * Simpler hook for sequential field navigation.
 * Use when you have a known sequence of refs.
 *
 * @example
 * const nameRef = useRef<HTMLInputElement>(null);
 * const emailRef = useRef<HTMLInputElement>(null);
 *
 * const handleNameKeyDown = useEnterToNext(emailRef);
 * const handleEmailKeyDown = useEnterToSubmit(handleSubmit);
 */
export function useEnterToNext(nextRef: RefObject<HTMLElement | null>) {
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = nextRef.current;
      if (next) {
        next.focus();
        if (next instanceof HTMLInputElement) {
          next.select();
        }
      }
    }
  }, [nextRef]);
}

export function useEnterToSubmit(onSubmit: () => void) {
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);
}
