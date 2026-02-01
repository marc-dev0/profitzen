'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, MapPin, Phone, Mail, Power, PowerOff, Edit } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { useAccess } from '@/hooks/useAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useStores,
  useCreateStore,
  useUpdateStore,
  useActivateStore,
  useDeactivateStore,
} from '@/hooks/useStores';
import { CreateStoreRequest, UpdateStoreRequest, Store } from '@/types/store';

export default function StoresPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { canAccess } = useAccess();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const { data: stores, isLoading } = useStores();

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const activateStore = useActivateStore();
  const deactivateStore = useDeactivateStore();

  const [formData, setFormData] = useState<CreateStoreRequest>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    } else if (_hasHydrated && !canAccess('stores')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, _hasHydrated, canAccess, router]);

  if (!_hasHydrated || !isAuthenticated || !canAccess('stores')) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Nombre y dirección son obligatorios');
      return;
    }

    try {
      if (editingStore) {
        await updateStore.mutateAsync({
          id: editingStore.id,
          data: formData as UpdateStoreRequest,
        });
        toast.success('Sucursal actualizada correctamente');
        setIsEditDialogOpen(false);
      } else {
        await createStore.mutateAsync(formData);
        toast.success('Sucursal creada correctamente');
        setIsCreateDialogOpen(false);
      }

      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
      });
      setEditingStore(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar sucursal');
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      email: store.email || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleActive = async (store: Store) => {
    try {
      if (store.isActive) {
        await deactivateStore.mutateAsync(store.id);
        toast.success('Sucursal desactivada');
      } else {
        await activateStore.mutateAsync(store.id);
        toast.success('Sucursal activada');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setEditingStore(null);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">Cargando sucursales...</div>
        </div>
      </div>
    );
  }

  return (

    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sucursales</h1>
              <p className="text-muted-foreground">
                Gestiona las sucursales de tu empresa
              </p>
            </div>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Sucursal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Sucursal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Sucursal Principal"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Dirección *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Av. Principal 123"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="999 999 999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="sucursal@empresa.com"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createStore.isPending}>
                      {createStore.isPending ? 'Creando...' : 'Crear Sucursal'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <DataTable
          data={stores || []}
          columns={[
            {
              key: 'name',
              header: 'Nombre',
              sortable: true,
              render: (store: Store) => (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{store.name}</span>
                </div>
              )
            },
            {
              key: 'address',
              header: 'Dirección',
              sortable: true,
              render: (store: Store) => (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {store.address}
                </div>
              )
            },
            {
              key: 'phone',
              header: 'Teléfono',
              render: (store: Store) => store.phone ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {store.phone}
                </div>
              ) : <span className="text-muted-foreground">-</span>
            },
            {
              key: 'email',
              header: 'Email',
              render: (store: Store) => store.email ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {store.email}
                </div>
              ) : <span className="text-muted-foreground">-</span>
            },
            {
              key: 'isActive',
              header: 'Estado',
              sortable: true,
              render: (store: Store) => (
                <Badge variant={store.isActive ? 'default' : 'secondary'}>
                  {store.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              )
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (store: Store) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(store)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(store)}
                    title={store.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {store.isActive ? (
                      <PowerOff className="h-4 w-4 text-red-600" />
                    ) : (
                      <Power className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                </div>
              )
            }
          ]}
          keyExtractor={(store) => store.id}
          loading={isLoading}
          emptyMessage="No hay sucursales registradas"
          searchable={true}
          searchPlaceholder="Buscar sucursal..."
          searchKeys={['name', 'address', 'phone', 'email']}
          defaultRowsPerPage={10}
          rowsPerPageOptions={[10, 25, 50]}
        />

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Sucursal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Sucursal Principal"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-address">Dirección *</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Av. Principal 123"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="999 999 999"
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="sucursal@empresa.com"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateStore.isPending}>
                  {updateStore.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
