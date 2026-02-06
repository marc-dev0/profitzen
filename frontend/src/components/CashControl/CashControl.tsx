import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCashShift, useOpenShift, useCloseShift, useAddCashMovement } from '@/hooks/useCashShift';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { Lock, Unlock, Banknote, ArrowRightLeft, AlertCircle, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { generateCashShiftTicket } from '@/utils/pdfGenerator';

interface CashControlProps {
    className?: string;
    onShiftStatusChange?: (isOpen: boolean) => void;
}

export function CashControl({ className, onShiftStatusChange }: CashControlProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: shift, isLoading, refetch } = useCashShift(user?.currentStoreId);

    // Modals state
    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    // Form states
    const [startAmount, setStartAmount] = useState(0);
    const [closeAmount, setCloseAmount] = useState(0);
    const [closeNotes, setCloseNotes] = useState('');

    const [movementType, setMovementType] = useState<'IN' | 'OUT'>('OUT');
    const [movementAmount, setMovementAmount] = useState(0);
    const [movementDesc, setMovementDesc] = useState('');

    const openShift = useOpenShift();
    const closeShift = useCloseShift();
    const addMovement = useAddCashMovement();

    const handleOpenShift = async () => {
        if (startAmount < 0) return toast.error('El monto inicial no puede ser negativo');

        try {
            await openShift.mutateAsync({
                storeId: user?.currentStoreId || '',
                startAmount
            });
            toast.success('Caja abierta correctamente');
            setIsOpenModalOpen(false);
            refetch();
            onShiftStatusChange?.(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al abrir caja');
        }
    };

    const handleCloseShift = async () => {
        if (!shift) return;
        if (closeAmount < 0) return toast.error('El monto no puede ser negativo');

        try {
            const closedShift = await closeShift.mutateAsync({
                id: shift.id,
                data: {
                    actualEndAmount: closeAmount,
                    notes: closeNotes
                }
            });

            // Generate ticket automatically
            const currentStore = user?.stores?.find(s => s.id === user.currentStoreId);
            generateCashShiftTicket({
                ...closedShift,
                endTime: closedShift.endTime || new Date().toISOString(),
                storeName: currentStore?.name || 'Almacen Principal'
            });

            toast.success('Caja cerrada correctamente. Descargando ticket...');
            setIsCloseModalOpen(false);
            refetch();
            onShiftStatusChange?.(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al cerrar caja');
        }
    };

    const handleMovement = async () => {
        if (!shift) return;
        if (movementAmount <= 0) return toast.error('El monto debe ser mayor a 0');
        if (!movementDesc) return toast.error('Debe ingresar una descripción');

        try {
            await addMovement.mutateAsync({
                id: shift.id,
                data: {
                    type: movementType,
                    amount: movementAmount,
                    description: movementDesc
                }
            });
            toast.success('Movimiento registrado');
            setIsMovementModalOpen(false);
            setMovementAmount(0);
            setMovementDesc('');
            refetch();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al registrar movimiento');
        }
    };

    const formatCurrency = (val: number) => `S/ ${val.toFixed(2)}`;

    if (isLoading) return <div className="animate-pulse h-10 w-32 bg-muted rounded-xl" />;

    if (!shift) {
        // Closed State
        return (
            <>
                <Button
                    onClick={() => setIsOpenModalOpen(true)}
                    variant="destructive" // Red to indicate it needs attention
                    className={`gap-2 font-bold shadow-sm ${className}`}
                >
                    <Lock className="w-4 h-4" />
                    Caja Cerrada
                </Button>

                <Dialog open={isOpenModalOpen} onOpenChange={setIsOpenModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Apertura de Caja</DialogTitle>
                            <DialogDescription>
                                Ingrese el monto de efectivo inicial en caja para comenzar el turno.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Monto Inicial (S/)</Label>
                                <NumberInput
                                    value={startAmount}
                                    onChange={setStartAmount}
                                    decimals={2}
                                    className="text-2xl font-bold h-14 text-center"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleOpenShift();
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpenModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleOpenShift} disabled={openShift.isPending}>
                                {openShift.isPending ? 'Abriendo...' : 'Abrir Caja'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Open State
    return (
        <>
            <div className={`flex items-center gap-2 ${className}`}>
                <Button
                    variant="outline"
                    className="h-auto py-2 px-4 gap-3 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 shadow-sm transition-all text-left"
                    onClick={() => setIsMovementModalOpen(true)}
                >
                    <div className="p-2 bg-green-200/50 dark:bg-green-800/50 rounded-lg backdrop-blur-sm">
                        <Banknote className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 whitespace-nowrap">
                            Caja Abierta
                        </span>
                        <span className="font-black text-xl tabular-nums tracking-tight whitespace-nowrap">
                            {formatCurrency(shift.expectedCashEndAmount)}
                        </span>
                    </div>
                </Button>

                <Button
                    size="icon"
                    variant="ghost"
                    title="Ver Historial de Caja"
                    onClick={() => router.push('/cash-control')}
                    className="text-muted-foreground hover:text-primary"
                >
                    <History className="w-4 h-4" />
                </Button>

                <Button
                    size="icon"
                    variant="ghost"
                    title="Cerrar Caja"
                    onClick={() => setIsCloseModalOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <Lock className="w-4 h-4" />
                </Button>
            </div>

            {/* Movement Modal */}
            <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Movimiento de Caja</DialogTitle>
                        <DialogDescription>Registra entradas o salidas de efectivo manuales.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex gap-2 p-1 bg-muted rounded-lg">
                            <button
                                onClick={() => setMovementType('IN')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${movementType === 'IN' ? 'bg-green-600 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                            >
                                INGRESO (+)
                            </button>
                            <button
                                onClick={() => setMovementType('OUT')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${movementType === 'OUT' ? 'bg-red-600 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                            >
                                SALIDA (-)
                            </button>
                        </div>

                        <div className="space-y-2">
                            <Label>Monto (S/)</Label>
                            <CurrencyInput
                                value={movementAmount}
                                onChange={setMovementAmount}
                                className="text-2xl font-bold h-14 text-center pl-14"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const descInput = document.getElementById('movement-desc');
                                        descInput?.focus();
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo / Descripción</Label>
                            <Input
                                id="movement-desc"
                                value={movementDesc}
                                onChange={(e) => setMovementDesc(e.target.value)}
                                placeholder={movementType === 'IN' ? "Ej: Sencillo adicional" : "Ej: Pago de taxi, Compra útiles"}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleMovement();
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMovementModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleMovement} disabled={addMovement.isPending}>
                            Registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Shift Modal */}
            <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cierre de Caja</DialogTitle>
                        <DialogDescription>
                            Finaliza el turno actual. Ingresa el dinero contado en caja.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-bold">Ventas Efec.</span>
                                <p className="font-mono font-bold">{formatCurrency(shift.totalSalesCash)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-bold">Cobranzas</span>
                                <p className="font-mono font-bold">{formatCurrency(shift.totalCreditCollections)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-green-600 uppercase font-bold">Ingresos Man.</span>
                                <p className="font-mono font-bold text-green-600">+{formatCurrency(shift.totalCashIn)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-red-600 uppercase font-bold">Salidas Man.</span>
                                <p className="font-mono font-bold text-red-600">-{formatCurrency(shift.totalCashOut)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-red-600 uppercase font-bold">Gastos (Efec)</span>
                                <p className="font-mono font-bold text-red-600">-{formatCurrency(shift.totalExpenses)}</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg">
                                <span className="text-sm font-bold text-primary">Saldo Esperado:</span>
                                <span className="text-xl font-black text-primary">{formatCurrency(shift.expectedCashEndAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                Monto Real (Contado)
                                {closeAmount !== shift.expectedCashEndAmount && (
                                    <span className={`text-xs font-bold ${closeAmount > shift.expectedCashEndAmount ? 'text-green-600' : 'text-red-600'}`}>
                                        Diferencia: {formatCurrency(closeAmount - shift.expectedCashEndAmount)}
                                    </span>
                                )}
                            </Label>
                            <NumberInput
                                value={closeAmount}
                                onChange={setCloseAmount}
                                decimals={2}
                                className="text-2xl font-bold h-14 text-center ring-2 ring-offset-2 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // Move focus to notes
                                        const notesInput = document.getElementById('close-notes');
                                        notesInput?.focus();
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notas de Cierre</Label>
                            <Input
                                id="close-notes"
                                value={closeNotes}
                                onChange={(e) => setCloseNotes(e.target.value)}
                                placeholder="Observaciones del turno..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCloseShift();
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleCloseShift}
                            disabled={closeShift.isPending}
                            variant={Math.abs(closeAmount - shift.expectedCashEndAmount) > 0.1 ? "destructive" : "default"}
                        >
                            {closeShift.isPending ? 'Cerrando...' : 'Confirmar Cierre'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
