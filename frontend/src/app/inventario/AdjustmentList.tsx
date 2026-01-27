
import { useInventoryMovements, InventoryMovementItem, InventoryMovementType } from '@/hooks/useInventoryMovements';
import { useAuthStore } from '@/store/authStore';
import { useStores } from '@/hooks/useStores';
import { useUsers } from '@/hooks/useUsers';
import { generateAdjustmentPDF } from '@/utils/pdfGenerator';
import { User, Package, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { DataTable, Column } from '@/components/DataTable';

// Interfaces for grouped adjustments
interface GroupedAdjustment {
    id: string; // Composite ID
    code: string; // Extracted from reason or generated
    date: Date;
    type: InventoryMovementType; // Should be Adjustment or Loss or Return?
    reason: string;
    userId: string;
    userName?: string;
    items: InventoryMovementItem[];
    totalItems: number;
}

interface GroupedAdjustmentRow extends GroupedAdjustment {
    resolvedUserName: string;
}

export default function AdjustmentList() {
    const { user } = useAuthStore();
    const { data: stores } = useStores();
    const { data: users } = useUsers();

    // Fetch all movements for the current store? Or broad filter?
    // We want to see history.
    const { data: movements, isLoading } = useInventoryMovements({
        // Optional filters if supported by endpoint, otherwise client side filter
    });



    const getUserName = (id: string, nameFromLog?: string) => {
        if (nameFromLog) return nameFromLog;
        const u = users?.find(u => u.id === id);
        return u ? `${u.firstName} ${u.lastName}` : 'Usuario Desconocido';
    };

    // Grouping Logic
    const groupedAdjustments = useMemo(() => {
        if (!movements) return [];

        const groups = new Map<string, GroupedAdjustment>();

        // Filter for only Adjustment-like movements
        const relevantMovements = movements.filter(m =>
            // Match backend Spanish strings
            m.movementType === 'Ajuste' ||
            m.movementType === 'Pérdida/Merma' ||
            // Handle numeric values just in case
            (m.movementType as any) === 3 ||
            (m.movementType as any) === 6 ||
            // Include "Entrada" (Initial Load) only if it looks like an adjustment (starts with Lote or mentions Carga Inicial)
            (m.movementType === 'Entrada' && (m.reason.startsWith('Lote:') || m.reason.includes('Carga Inicial')))
        );

        relevantMovements.forEach(m => {
            // Create a key based on Date (minute precision), User, and Reason
            const dateObj = new Date(m.movementDate);
            // Round to nearest minute to group batch items
            const timeKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()} ${dateObj.getHours()}:${dateObj.getMinutes()}`;
            const key = `${timeKey}-${m.userId}-${m.reason}`;

            if (!groups.has(key)) {
                // Extract code from reason: "Lote: Reason (ADJ-...) - Type"
                const codeMatch = m.reason.match(/\((ADJ-[A-Z0-9-]+)\)/);
                const extractedCode = codeMatch ? codeMatch[1] : 'AJUSTE';

                groups.set(key, {
                    id: key,
                    code: extractedCode,
                    date: dateObj,
                    type: m.movementType as unknown as InventoryMovementType,
                    reason: m.reason,
                    userId: m.userId,
                    userName: m.userName,
                    items: [],
                    totalItems: 0
                });
            }

            const group = groups.get(key)!;
            group.items.push(m);
            group.totalItems++;
        });

        // Convert to array and sort by date desc
        return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [movements]);

    // Prepare data for table with resolved user names for searching
    const tableData = useMemo(() => {
        return groupedAdjustments.map(group => ({
            ...group,
            resolvedUserName: getUserName(group.userId, group.userName)
        }));
    }, [groupedAdjustments, users]);

    const handlePrint = (group: GroupedAdjustment) => {
        try {
            const items = group.items.map(m => ({
                productName: m.productName,
                productCode: m.productCode,
                barcode: m.barcode, // Pass barcode from movement history
                quantity: Math.abs(m.quantity),
                isPositive: m.quantity > 0,
                uom: m.uomCode || 'Unidades' // Use uomCode if available
            }));

            // Extract Type label from reason or movement type
            // Usually reason is "Merma: ... " or just the text
            // Let's fallback to movement type name

            generateAdjustmentPDF({
                code: group.code,
                date: group.date,
                type: 'Reporte de Ajuste', // Use a generic title or try to infer
                reason: group.reason,
                items: items
            });
        } catch {
            toast.error('Error al generar PDF');
        }
    };

    const columns: Column<GroupedAdjustmentRow>[] = [
        {
            key: 'date',
            header: 'Fecha',
            sortable: true,
            render: (group) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                        {group.date.toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {group.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )
        },
        {
            key: 'reason',
            header: 'Detalle / Motivo',
            sortable: true,
            render: (group) => (
                <div className="flex flex-col max-w-[300px] xl:max-w-[400px]">
                    <span className="text-sm text-foreground truncate" title={group.reason}>
                        {group.reason}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        {group.code !== 'AJUSTE' ? group.code : ''}
                    </span>
                </div>
            )
        },
        {
            key: 'userId', // Use ID for sorting, render name
            header: 'Usuario',
            sortable: true,
            render: (group) => (
                <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                        {getUserName(group.userId, group.userName)}
                    </span>
                </div>
            )
        },
        {
            key: 'totalItems',
            header: 'Productos',
            sortable: true,
            render: (group) => (
                <div className="flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                        {group.totalItems} {group.totalItems === 1 ? 'item' : 'items'}
                    </span>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Comprobante',
            render: (group) => (
                <button
                    onClick={() => handlePrint(group)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground border border-input rounded-md hover:bg-accent transition-colors"
                >
                    <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                    Imprimir
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Historial de Ajustes
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Registro de mermas, daños, correcciones y otros ajustes.
                    </p>
                </div>
            </div>

            <DataTable
                data={tableData}
                columns={columns}
                keyExtractor={(group) => group.id}
                loading={isLoading}
                emptyMessage="No se encontraron registros de ajustes."
                searchable={true}
                searchPlaceholder="Buscar por motivo o usuario..."
                searchKeys={['reason', 'resolvedUserName', 'code']}
                defaultRowsPerPage={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />
        </div>
    );
}
