import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, UpdateCreditLimitRequest, Credit } from '@/types/customer';

// URL Keys
const CUSTOMERS_URL = '/api/customer/customers';

export function useCustomers() {
    const query = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await apiClient.get(CUSTOMERS_URL);
            return response.data;
        }
    });

    return {
        customers: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refresh: query.refetch
    };
}

export function useCustomer(id?: string) {
    const query = useQuery<Customer>({
        queryKey: ['customer', id],
        queryFn: async () => {
            const response = await apiClient.get(`${CUSTOMERS_URL}/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    return {
        customer: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refresh: query.refetch
    };
}

// Actions
export async function createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    const response = await apiClient.post<Customer>(CUSTOMERS_URL, data);
    return response.data;
}

export async function updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    const response = await apiClient.put<Customer>(`${CUSTOMERS_URL}/${id}`, data);
    return response.data;
}

export async function updateCreditLimit(id: string, creditLimit: number): Promise<Customer> {
    const data: UpdateCreditLimitRequest = { creditLimit };
    const response = await apiClient.put<Customer>(`${CUSTOMERS_URL}/${id}/credit-limit`, data);
    return response.data;
}

export async function deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`${CUSTOMERS_URL}/${id}`);
}

export async function getCustomerByDocument(documentNumber: string): Promise<Customer | null> {
    try {
        const response = await apiClient.get<Customer>(`${CUSTOMERS_URL}/by-document/${documentNumber}`);
        return response.data;
    } catch (error) {
        return null;
    }
}

export async function getCustomerCredits(customerId: string): Promise<Credit[]> {
    const response = await apiClient.get<Credit[]>(`/api/customer/credits?customerId=${customerId}`);
    return response.data;
}

export async function addCreditPayment(creditId: string, amount: number, notes?: string): Promise<Credit> {
    const response = await apiClient.post<Credit>(`/api/customer/credits/${creditId}/payments`, {
        amount,
        notes
    });
    return response.data;
}

export async function getPendingCredits(): Promise<Credit[]> {
    const response = await apiClient.get<Credit[]>('/api/customer/credits/pending');
    return response.data;
}
