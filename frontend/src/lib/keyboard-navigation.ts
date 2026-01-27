import { KeyboardEvent, RefObject } from 'react';

export interface KeyboardNavigationOptions {
  onSubmit?: () => void;
  nextRef?: RefObject<HTMLElement | null>;
  submitOnEnter?: boolean;
  moveToNextOnEnter?: boolean;
}

/**
 * Creates a keyboard event handler for form field navigation.
 * Supports Enter to move to next field or submit, and standard Tab behavior.
 *
 * @param options - Navigation options
 * @returns KeyboardEvent handler
 *
 * @example
 * // Move to next field on Enter
 * <input onKeyDown={createKeyboardHandler({ nextRef: quantityRef })} />
 *
 * @example
 * // Submit form on Enter (for last field)
 * <input onKeyDown={createKeyboardHandler({ onSubmit: handleSubmit, submitOnEnter: true })} />
 *
 * @example
 * // Auto-decide: move next if nextRef exists, otherwise submit
 * <input onKeyDown={createKeyboardHandler({ nextRef: priceRef, onSubmit: handleSubmit })} />
 */
export function createKeyboardHandler(options: KeyboardNavigationOptions = {}) {
  const { onSubmit, nextRef, submitOnEnter = false, moveToNextOnEnter = true } = options;

  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (submitOnEnter && onSubmit) {
        onSubmit();
        return;
      }

      if (moveToNextOnEnter && nextRef?.current) {
        nextRef.current.focus();
        if (nextRef.current instanceof HTMLInputElement) {
          nextRef.current.select();
        }
        return;
      }

      if (onSubmit) {
        onSubmit();
      }
    }
  };
}

/**
 * Focuses the next element in a sequence of refs.
 * Useful for programmatic navigation after an action.
 *
 * @param refs - Array of refs in navigation order
 * @param currentIndex - Current position in the sequence
 */
export function focusNext(refs: RefObject<HTMLElement | null>[], currentIndex: number) {
  const nextIndex = currentIndex + 1;
  if (nextIndex < refs.length && refs[nextIndex]?.current) {
    refs[nextIndex].current?.focus();
    if (refs[nextIndex].current instanceof HTMLInputElement) {
      refs[nextIndex].current?.select();
    }
  }
}

/**
 * Focuses the previous element in a sequence of refs.
 * Useful for Shift+Tab-like navigation.
 *
 * @param refs - Array of refs in navigation order
 * @param currentIndex - Current position in the sequence
 */
export function focusPrevious(refs: RefObject<HTMLElement | null>[], currentIndex: number) {
  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0 && refs[prevIndex]?.current) {
    refs[prevIndex].current?.focus();
    if (refs[prevIndex].current instanceof HTMLInputElement) {
      refs[prevIndex].current?.select();
    }
  }
}

/**
 * Creates a handler for form-wide keyboard shortcuts.
 * Typically used at the form level for global shortcuts.
 *
 * @param options - Shortcut handlers
 * @returns KeyboardEvent handler
 *
 * @example
 * <form onKeyDown={createFormShortcuts({ onSave: handleSave, onCancel: handleCancel })}>
 */
export function createFormShortcuts(options: {
  onSave?: () => void;
  onCancel?: () => void;
  onNew?: () => void;
}) {
  const { onSave, onCancel, onNew } = options;

  return (e: KeyboardEvent<HTMLElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      onNew?.();
      return;
    }
  };
}
