import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

export interface PaymentMethodConfig {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string;
    requiresAmountReceived: boolean;
    appliesRounding: boolean;
    requiresReference: boolean;
    generatesDebt: boolean;
    requiresCustomer: boolean;
    sortOrder: number;
}

export interface CalculateChangeRequest {
    totalAmount: number;
    amountReceived: number;
    appliesRounding: boolean;
}

export interface CalculateChangeResponse {
    originalTotal: number;
    roundedTotal: number;
    roundingAdjustment: number;
    amountReceived: number;
    change: number;
    isPaymentSufficient: boolean;
    deficit: number;
}

/**
 * Hook para obtener los métodos de pago configurados.
 * Reemplaza al hardcoded BusinessConfig.payment.methods
 */
export function usePaymentMethods() {
    return useQuery<PaymentMethodConfig[]>({
        queryKey: ['payment-methods'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/paymentmethods');
            return data;
        },
        staleTime: 1000 * 60 * 30, // 30 min — rara vez cambia
        retry: 2,
    });
}

/**
 * Aplica el redondeo en el frontend (para actualización en tiempo real).
 * Lógica: redondea al múltiplo de S/ 0.10 más cercano.
 */
export function applyBCRPRounding(amount: number): number {
    return Math.round(amount * 10) / 10;
}

/**
 * Calcula el vuelto con redondeo BCRP aplicado.
 * Uso local para feedback inmediato al usuario.
 */
export function calculateChangeLocal(
    totalAmount: number,
    amountReceived: number,
    appliesRounding: boolean
): CalculateChangeResponse {
    const roundedTotal = appliesRounding ? applyBCRPRounding(totalAmount) : totalAmount;
    const roundingAdjustment = roundedTotal - totalAmount;
    const change = amountReceived - roundedTotal;

    return {
        originalTotal: totalAmount,
        roundedTotal,
        roundingAdjustment: Math.round(roundingAdjustment * 100) / 100,
        amountReceived,
        change: Math.max(0, change),
        isPaymentSufficient: amountReceived >= roundedTotal,
        deficit: Math.max(0, roundedTotal - amountReceived),
    };
}

/**
 * Calcula el vuelto via backend (para validación autoritativa al procesar la venta).
 */
export async function calculateChangeServer(request: CalculateChangeRequest): Promise<CalculateChangeResponse> {
    const { data } = await apiClient.post('/api/paymentmethods/calculate-change', request);
    return data;
}
