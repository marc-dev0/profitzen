'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCompanySettings, useUpdateCompanySettings, useUploadLogo } from '@/hooks/useCompanySettings';
import { useDocumentSeries } from '@/hooks/useDocumentSeries';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import {
    Building2,
    FileText,
    Palette,
    Upload,
    Save,
    Image as ImageIcon,
    Phone,
    Mail,
    MapPin,
    Globe,
    Receipt,
    Coins
} from 'lucide-react';

export default function CompanySettingsPage() {
    const router = useRouter();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const { data: settings, isLoading } = useCompanySettings();
    const updateSettings = useUpdateCompanySettings();
    const uploadLogo = useUploadLogo();

    const [formData, setFormData] = useState({
        companyName: '',
        tradeName: '',
        ruc: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        ticketHeader: '',
        ticketFooter: '',
        showLogo: true,
        ticketWidth: 80,
        ticketMargin: 5,
        taxName: 'IGV',
        taxRate: 0.18,
        pricesIncludeTax: true,
        currency: 'PEN',
        currencySymbol: 'S/',
    });

    const [logoPreview, setLogoPreview] = useState<string>('');
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    useEffect(() => {
        if (settings) {
            setFormData({
                companyName: settings.companyName || '',
                tradeName: settings.tradeName || '',
                ruc: settings.ruc || '',
                address: settings.address || '',
                phone: settings.phone || '',
                email: settings.email || '',
                website: settings.website || '',
                ticketHeader: settings.ticketHeader || '',
                ticketFooter: settings.ticketFooter || '¡Gracias por su compra!\\nVuelva pronto',
                showLogo: settings.showLogo ?? true,
                ticketWidth: settings.ticketWidth || 80,
                ticketMargin: settings.ticketMargin ?? 5,
                taxName: settings.taxName || 'IGV',
                taxRate: settings.taxRate || 0.18,
                pricesIncludeTax: settings.pricesIncludeTax ?? true,
                currency: settings.currency || 'PEN',
                currencySymbol: settings.currencySymbol || 'S/',
            });
            if (settings.logoUrl) {
                // If it's a relative path, prepend API URL
                const fullUrl = settings.logoUrl.startsWith('http') || settings.logoUrl.startsWith('data:')
                    ? settings.logoUrl
                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${settings.logoUrl}`;
                setLogoPreview(fullUrl);
            }
        }
    }, [settings]);

    if (!_hasHydrated || !isAuthenticated) {
        return null;
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('El logo no debe superar 5MB');
                return;
            }

            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const { data: documentSeries } = useDocumentSeries();

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (existing handleSubmit)
        e.preventDefault();

        try {
            // Upload logo first if changed
            if (logoFile) {
                await uploadLogo.mutateAsync(logoFile);
                // Do NOT update preview with server URL here. 
                // We already have the local FileReader preview which works perfectly.
                // Updating it with server URL might cause flickering or 404s before propagation.
                setLogoFile(null); // Clear the file after upload
            }

            // Update settings
            await updateSettings.mutateAsync(formData);
            toast.success('Configuración guardada correctamente');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al guardar la configuración');
        }
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-5xl mx-auto">

                    {/* Header */}
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Configuración de Empresa</h1>
                            <p className="text-muted-foreground mt-1">Personaliza los datos de tu empresa y tickets</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                            <p className="text-muted-foreground">Cargando configuración...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Datos de la Empresa */}
                            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Building2 className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl font-bold text-foreground">Datos de la Empresa</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Razón Social *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="Mi Empresa S.A.C."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Nombre Comercial
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.tradeName}
                                            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="Mi Tienda"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            RUC *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.ruc}
                                            onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="20123456789"
                                            maxLength={11}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="(01) 123-4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="contacto@miempresa.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Globe className="w-4 h-4" />
                                            Sitio Web
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="https://miempresa.com"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            Dirección
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            rows={2}
                                            placeholder="Av. Principal 123, Lima, Perú"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logo */}
                            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <ImageIcon className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl font-bold text-foreground">Logo de la Empresa</h2>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Subir Logo (máx. 5MB)
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer transition-colors">
                                                <Upload className="w-4 h-4" />
                                                Seleccionar Archivo
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            {logoFile && (
                                                <span className="text-sm text-slate-600">{logoFile.name}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Formatos aceptados: JPG, PNG, SVG. Recomendado: 200x200px
                                        </p>
                                    </div>

                                    {logoPreview && (
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-sm font-medium text-muted-foreground">Vista Previa</p>
                                            <div className="w-32 h-32 border-2 border-border rounded-lg flex items-center justify-center bg-background p-2">
                                                <img
                                                    src={logoPreview}
                                                    alt="Logo preview"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Configuración de Tickets */}
                            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Receipt className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl font-bold text-foreground">Configuración de Tickets</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="showLogo"
                                            checked={formData.showLogo}
                                            onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                                            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                                        />
                                        <label htmlFor="showLogo" className="text-sm font-medium text-muted-foreground">
                                            Mostrar logo en el ticket
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Ancho del Ticket
                                        </label>
                                        <select
                                            value={formData.ticketWidth}
                                            onChange={(e) => setFormData({ ...formData, ticketWidth: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                        >
                                            <option value={58}>58mm (Térmico pequeño)</option>
                                            <option value={80}>80mm (Térmico estándar)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Margen del Ticket (mm)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="1"
                                            value={formData.ticketMargin}
                                            onChange={(e) => setFormData({ ...formData, ticketMargin: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Ajusta el margen para optimizar el uso del papel (0-10mm)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Encabezado del Ticket
                                        </label>
                                        <textarea
                                            value={formData.ticketHeader}
                                            onChange={(e) => setFormData({ ...formData, ticketHeader: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            rows={2}
                                            placeholder="Texto adicional en el encabezado (opcional)"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Pie del Ticket
                                        </label>
                                        <textarea
                                            value={formData.ticketFooter}
                                            onChange={(e) => setFormData({ ...formData, ticketFooter: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            rows={3}
                                            placeholder="¡Gracias por su compra!\nVuelva pronto"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Usa \n para saltos de línea
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Configuración Fiscal */}
                            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Coins className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl font-bold text-foreground">Configuración Fiscal y Moneda</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Nombre del Impuesto
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.taxName}
                                            onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="IGV, IVA, etc."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Tasa de Impuesto (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.taxRate * 100}
                                            onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) / 100 })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="18"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Ejemplo: 18 para 18%
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Moneda
                                        </label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                        >
                                            <option value="PEN">Soles Peruanos (PEN)</option>
                                            <option value="USD">Dólares Americanos (USD)</option>
                                            <option value="EUR">Euros (EUR)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Símbolo de Moneda
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.currencySymbol}
                                            onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                            placeholder="S/"
                                            maxLength={5}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="pricesIncludeTax"
                                                checked={formData.pricesIncludeTax}
                                                onChange={(e) => setFormData({ ...formData, pricesIncludeTax: e.target.checked })}
                                                className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                                            />
                                            <label htmlFor="pricesIncludeTax" className="text-sm font-medium text-muted-foreground">
                                                Los precios incluyen impuestos
                                            </label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 ml-7">
                                            Si está marcado, los precios de venta ya incluyen el impuesto
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Numeración de Documentos */}
                            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <FileText className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl font-bold text-foreground">Numeración de Documentos</h2>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 border-b border-border">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo de Documento</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Serie</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Último Correlativo</th>
                                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Por Defecto</th>
                                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {documentSeries?.map((serie) => (
                                                <tr key={serie.id} className="hover:bg-muted/20">
                                                    <td className="px-4 py-3 text-foreground font-medium">{serie.documentTypeName}</td>
                                                    <td className="px-4 py-3 text-foreground">{serie.seriesCode}</td>
                                                    <td className="px-4 py-3 text-foreground text-right font-mono">{serie.currentNumber.toString().padStart(8, '0')}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {serie.isDefault ? (
                                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Por Defecto"></span>
                                                        ) : (
                                                            <span className="inline-block w-2 h-2 rounded-full bg-slate-200" title="No"></span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${serie.isActive
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                            }`}>
                                                            {serie.isActive ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!documentSeries || documentSeries.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                        No hay series de documentos configuradas.
                                                        <br />
                                                        <span className="text-xs">
                                                            Las series se crean automáticamente al realizar la primera venta de cada tipo.
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard')}
                                    className="flex-1 px-6 py-3 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateSettings.isPending || uploadLogo.isPending}
                                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5" />
                                    {updateSettings.isPending || uploadLogo.isPending ? 'Guardando...' : 'Guardar Configuración'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
