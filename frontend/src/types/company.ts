export interface CompanySettings {
    id?: string;
    companyName: string;
    tradeName: string;
    ruc: string;
    address: string;
    phone: string;
    email: string;
    website?: string;

    logoUrl?: string;
    logoBase64?: string;

    ticketHeader?: string;
    ticketFooter?: string;
    showLogo: boolean;
    ticketWidth: number;
    ticketMargin: number;

    taxName: string;
    taxRate: number;
    pricesIncludeTax: boolean;

    primaryColor?: string;
    secondaryColor?: string;

    currency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;

    createdAt?: string;
    updatedAt?: string;
}

export interface UpdateCompanySettingsRequest {
    companyName?: string;
    tradeName?: string;
    ruc?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoBase64?: string;
    ticketHeader?: string;
    ticketFooter?: string;
    showLogo?: boolean;
    ticketWidth?: number;
    ticketMargin?: number;
    taxName?: string;
    taxRate?: number;
    pricesIncludeTax?: boolean;
    primaryColor?: string;
    secondaryColor?: string;
    currency?: string;
    currencySymbol?: string;
    timezone?: string;
    dateFormat?: string;
}
