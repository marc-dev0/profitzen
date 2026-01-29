import { z } from 'zod';

export const productSchema = z.object({
  code: z.string().optional(),
  barcode: z.string().optional(),
  shortScanCode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'El nombre es muy largo'),
  description: z.string().max(1000, 'La descripción es muy larga').optional(),
  categoryId: z.string().min(1, 'Debe seleccionar una categoría'),
  baseUOMId: z.string().optional(),
  allowFractional: z.boolean(),
  purchaseConversionMethod: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
