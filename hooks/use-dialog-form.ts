"use client";

import { useState, useCallback } from "react";

export interface DialogFormOptions<TFormData = Record<string, unknown>> {
  /** Initial form data */
  initialData?: TFormData;
  /** Called when form is submitted successfully */
  onSuccess?: () => void;
  /** Called when form submission fails */
  onError?: (error: Error) => void;
  /** Reset form data when dialog closes */
  resetOnClose?: boolean;
}

export interface DialogFormReturn<TFormData = Record<string, unknown>> {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Open the dialog, optionally with edit data */
  open: (editData?: TFormData | null) => void;
  /** Close the dialog */
  close: () => void;
  /** Toggle the dialog */
  toggle: () => void;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Set the submitting state */
  setIsSubmitting: (value: boolean) => void;
  /** Current form data */
  formData: TFormData;
  /** Update a single field */
  setField: <K extends keyof TFormData>(field: K, value: TFormData[K]) => void;
  /** Update multiple fields at once */
  setFields: (data: Partial<TFormData>) => void;
  /** Reset form to initial data */
  resetForm: () => void;
  /** Whether the dialog is in edit mode (has edit data) */
  isEditMode: boolean;
  /** Handle submit with automatic loading state */
  handleSubmit: (submitFn: () => Promise<void>) => Promise<void>;
}

/**
 * Hook for managing dialog/sheet forms with loading state and form data
 *
 * @example
 * ```tsx
 * interface GoalForm {
 *   name: string;
 *   targetAmount: number;
 * }
 *
 * const {
 *   isOpen,
 *   open,
 *   close,
 *   isSubmitting,
 *   formData,
 *   setField,
 *   isEditMode,
 *   handleSubmit,
 * } = useDialogForm<GoalForm>({
 *   initialData: { name: "", targetAmount: 0 },
 *   onSuccess: () => toast.success("Goal saved!"),
 * });
 *
 * // Open for creating
 * <Button onClick={() => open()}>Create Goal</Button>
 *
 * // Open for editing
 * <Button onClick={() => open({ name: "Vacation", targetAmount: 1000 })}>
 *   Edit Goal
 * </Button>
 *
 * // In the dialog
 * <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
 *   <Input
 *     value={formData.name}
 *     onChange={(e) => setField("name", e.target.value)}
 *   />
 *   <LoadingButton
 *     loading={isSubmitting}
 *     onClick={() => handleSubmit(async () => {
 *       await saveGoal(formData);
 *     })}
 *   >
 *     {isEditMode ? "Update" : "Create"}
 *   </LoadingButton>
 * </Sheet>
 * ```
 */
export function useDialogForm<TFormData = Record<string, unknown>>(
  options: DialogFormOptions<TFormData> = {}
): DialogFormReturn<TFormData> {
  const {
    initialData = {} as TFormData,
    onSuccess,
    onError,
    resetOnClose = true,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TFormData>(initialData);
  const [isEditMode, setIsEditMode] = useState(false);

  const open = useCallback(
    (editData?: TFormData | null) => {
      if (editData) {
        setFormData(editData);
        setIsEditMode(true);
      } else {
        setFormData(initialData);
        setIsEditMode(false);
      }
      setIsOpen(true);
    },
    [initialData]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setIsSubmitting(false);
    if (resetOnClose) {
      // Delay reset to allow close animation
      setTimeout(() => {
        setFormData(initialData);
        setIsEditMode(false);
      }, 200);
    }
  }, [initialData, resetOnClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, close, open]);

  const setField = useCallback(
    <K extends keyof TFormData>(field: K, value: TFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const setFields = useCallback((data: Partial<TFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setIsEditMode(false);
  }, [initialData]);

  const handleSubmit = useCallback(
    async (submitFn: () => Promise<void>) => {
      setIsSubmitting(true);
      try {
        await submitFn();
        onSuccess?.();
        close();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [close, onSuccess, onError]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    isSubmitting,
    setIsSubmitting,
    formData,
    setField,
    setFields,
    resetForm,
    isEditMode,
    handleSubmit,
  };
}

/**
 * Simplified hook for dialogs without form data (just open/close state)
 *
 * @example
 * ```tsx
 * const { isOpen, open, close, isSubmitting, handleSubmit } = useDialog({
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useDialog(
  options: Omit<DialogFormOptions<never>, "initialData"> = {}
) {
  const result = useDialogForm<never>(options);

  return {
    isOpen: result.isOpen,
    open: () => result.open(),
    close: result.close,
    toggle: result.toggle,
    isSubmitting: result.isSubmitting,
    setIsSubmitting: result.setIsSubmitting,
    handleSubmit: result.handleSubmit,
  };
}
