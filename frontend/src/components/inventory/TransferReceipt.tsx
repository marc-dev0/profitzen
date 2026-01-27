import { StoreInventoryItem } from '@/hooks/useInventoryMovements';
import { useAuthStore } from '@/store/authStore';

interface TransferReceiptProps {
    transferCode: string;
    items: StoreInventoryItem[];
    quantities: Record<string, number>;
    sourceStoreName: string;
    destinationStoreName: string;
    reason: string;
    date: Date;
}

export default function TransferReceipt({
    transferCode,
    items,
    quantities,
    sourceStoreName,
    destinationStoreName,
    reason,
    date
}: TransferReceiptProps) {
    const { user } = useAuthStore();

    return (
        <div className="print-only-container p-8 text-black" style={{ display: 'none' }}>
            <div className="border border-black p-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-black pb-4">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">Profitzen</h1>
                        <p className="text-sm mt-1">Gestión de Inventario</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">GUÍA DE REMISIÓN</h2>
                        <p className="text-lg font-mono mt-1">{transferCode}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                    <div className="space-y-2">
                        <div>
                            <span className="font-bold block text-xs uppercase text-gray-500">Origen</span>
                            <div className="font-medium text-lg">{sourceStoreName}</div>
                        </div>
                        <div className="pt-2">
                            <span className="font-bold block text-xs uppercase text-gray-500">Destino</span>
                            <div className="font-medium text-lg">{destinationStoreName}</div>
                        </div>
                    </div>
                    <div className="space-y-2 text-right">
                        <div>
                            <span className="font-bold block text-xs uppercase text-gray-500">Fecha</span>
                            <div className="font-medium">{date.toLocaleDateString()} {date.toLocaleTimeString()}</div>
                        </div>
                        <div className="pt-2">
                            <span className="font-bold block text-xs uppercase text-gray-500">Solicitado/Autorizado Por</span>
                            <div className="font-medium">{user?.fullName || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <span className="font-bold block text-xs uppercase text-gray-500">Motivo / Referencia</span>
                    <div className="border p-2 mt-1 bg-gray-50">{reason}</div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-12">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left py-2 font-bold uppercase w-32">Código</th>
                            <th className="text-left py-2 font-bold uppercase">Descripción</th>
                            <th className="text-right py-2 font-bold uppercase w-24">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-2">{item.productCode}</td>
                                <td className="py-2">{item.productName}</td>
                                <td className="py-2 text-right font-medium">{quantities[item.productId]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-12 mt-20 pt-12">
                    <div className="text-center">
                        <div className="border-t border-black pt-2">
                            <p className="text-sm font-medium">Entregado Por</p>
                            <p className="text-xs text-gray-500 mt-1">{sourceStoreName}</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black pt-2">
                            <p className="text-sm font-medium">Transportista</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black pt-2">
                            <p className="text-sm font-medium">Recibido Conforme</p>
                            <p className="text-xs text-gray-500 mt-1">{destinationStoreName}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                    Generado por Profitzen el {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
}
