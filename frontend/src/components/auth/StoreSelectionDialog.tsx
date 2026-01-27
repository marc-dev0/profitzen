'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Store as StoreIcon, Building2, CheckCircle2 } from 'lucide-react';

interface StoreSelectionDialogProps {
    open: boolean;
}

export default function StoreSelectionDialog({ open }: StoreSelectionDialogProps) {
    const { user, setCurrentStore } = useAuthStore();

    if (!user || !user.stores) return null;

    const handleSelectStore = (storeId: string) => {
        setCurrentStore(storeId);
    };

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-md [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">Seleccione una Sucursal</DialogTitle>
                    <DialogDescription className="text-center">
                        Para continuar, seleccione la sucursal en la que desea trabajar.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {user.stores.map((store) => (
                        <button
                            key={store.id}
                            onClick={() => handleSelectStore(store.id)}
                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent hover:border-primary/50 transition-all group group-hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <StoreIcon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{store.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                                        <Building2 className="w-3 h-3" />
                                        <span>Sucursal Disponible</span>
                                    </div>
                                </div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                        </button>
                    ))}
                </div>
                {/* <div className="flex justify-center text-xs text-muted-foreground">
                    Podrá cambiar de sucursal más tarde desde el menú superior.
                </div> */}
            </DialogContent>
        </Dialog>
    );
}
