'use client';

import { useState } from 'react';
import { Plus, User as UserIcon, Mail, Phone as PhoneIcon, Building2, Shield, Power, PowerOff, Edit, Trash2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useActivateUser,
  useDeactivateUser,
  useDeleteUser,
} from '@/hooks/useUsers';
import { useStores } from '@/hooks/useStores';
import { CreateUserRequest, UpdateUserRequest, User, UserRole, getRoleLabel } from '@/types/user';
import { PermissionsDialog } from './PermissionsDialog';

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  const { data: users, isLoading } = useUsers();
  const { data: stores } = useStores();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const deleteUser = useDeleteUser();

  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: UserRole.Cashier,
    storeIds: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Email, nombre y apellido son obligatorios');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      toast.error('La contraseña es obligatoria');
      return;
    }

    if (formData.storeIds.length === 0) {
      toast.error('Debe seleccionar al menos una sucursal');
      return;
    }

    try {
      if (editingUser) {
        const updateData: UpdateUserRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: formData.role,
          storeIds: formData.storeIds,
        };

        await updateUser.mutateAsync({
          id: editingUser.id,
          data: updateData,
        });
        toast.success('Usuario actualizado correctamente');
        setIsEditDialogOpen(false);
      } else {
        await createUser.mutateAsync(formData);
        toast.success('Usuario creado correctamente');
        setIsCreateDialogOpen(false);
      }

      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const toggleRole = (role: number) => {
    setFormData(prev => ({
      ...prev,
      role: prev.role ^ role
    }));
  };

  const toggleStore = (storeId: string) => {
    setFormData(prev => {
      const ids = prev.storeIds.includes(storeId)
        ? prev.storeIds.filter(id => id !== storeId)
        : [...prev.storeIds, storeId];
      return { ...prev, storeIds: ids };
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      storeIds: user.storeIds,
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(user.id);
        toast.success('Usuario desactivado');
      } else {
        await activateUser.mutateAsync(user.id);
        toast.success('Usuario activado');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast.success('Usuario eliminado correctamente');
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: UserRole.Cashier,
      storeIds: stores && stores.length > 0 ? [stores[0].id] : [],
    });
    setEditingUser(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Cargando usuarios...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* ... existing content ... */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Usuarios</h1>
              <p className="text-muted-foreground">
                Gestiona los usuarios y sus roles
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Permisos
              </Button>
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
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nuevo Usuario</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-foreground font-semibold">Nombre *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          placeholder="Juan"
                          required
                          className="mt-1"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                          Nombre real del empleado.
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-foreground font-semibold">Apellido *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          placeholder="Pérez"
                          required
                          className="mt-1"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                          Apellido real del empleado.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-foreground font-semibold">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="juan@empresa.com"
                        required
                        className="mt-1"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                        Correo electrónico corporativo para acceso.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-foreground font-semibold">Contraseña *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder="••••••••"
                        required
                        className="mt-1"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                        Mínimo 6 caracteres.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-foreground font-semibold">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="999 999 999"
                        className="mt-1"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                        Número de contacto directo.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-foreground font-semibold">Roles Asignados *</Label>
                        <p className="text-[11px] text-muted-foreground -mt-2 mb-2 ml-1">
                          Seleccione los roles que tendrá el usuario.
                        </p>
                        <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                          {[UserRole.Admin, UserRole.Manager, UserRole.Cashier, UserRole.Logistics].map((role) => (
                            <div key={role} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`role-${role}`}
                                checked={(formData.role & role) === role}
                                onChange={() => toggleRole(role)}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`role-${role}`} className="cursor-pointer font-normal text-foreground">
                                {getRoleLabel(role)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-foreground font-semibold">Sucursales Autorizadas *</Label>
                        <p className="text-[11px] text-muted-foreground -mt-2 mb-2 ml-1">
                          Tiendas donde puede operar el usuario.
                        </p>
                        <div className="space-y-2 border rounded-md p-3 h-48 overflow-y-auto bg-muted/20">
                          {stores?.filter(s => s.isActive).map((store) => (
                            <div key={store.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`store-${store.id}`}
                                checked={formData.storeIds.includes(store.id)}
                                onChange={() => toggleStore(store.id)}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`store-${store.id}`} className="cursor-pointer font-normal text-foreground">
                                {store.name}
                              </Label>
                            </div>
                          ))}
                          {(!stores || stores.length === 0) && (
                            <p className="text-sm text-muted-foreground">No hay sucursales activas.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
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
                      <Button type="submit" disabled={createUser.isPending}>
                        {createUser.isPending ? 'Creando...' : 'Crear Usuario'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{`${user.firstName} ${user.lastName}`}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PhoneIcon className="h-4 w-4" />
                          {user.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{user.roleName}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {user.storeNames.join(', ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${user.isActive ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName" className="text-foreground font-semibold">Nombre *</Label>
                  <Input
                    id="edit-firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Juan"
                    required
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                    Nombre real del empleado.
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-lastName" className="text-foreground font-semibold">Apellido *</Label>
                  <Input
                    id="edit-lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Pérez"
                    required
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                    Apellido real del empleado.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-foreground font-semibold">Email</Label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-muted text-muted-foreground border-input mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                  El email no se puede modificar.
                </p>
              </div>

              <div>
                <Label htmlFor="edit-phone" className="text-foreground font-semibold">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="999 999 999"
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
                  Número de contacto directo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-foreground font-semibold">Roles Asignados *</Label>
                  <p className="text-[11px] text-muted-foreground -mt-2 mb-2 ml-1">
                    Seleccione los roles que tendrá el usuario.
                  </p>
                  <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                    {[UserRole.Admin, UserRole.Manager, UserRole.Cashier, UserRole.Logistics].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-role-${role}`}
                          checked={(formData.role & role) === role}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                        />
                        <Label htmlFor={`edit-role-${role}`} className="cursor-pointer font-normal text-foreground">
                          {getRoleLabel(role)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-foreground font-semibold">Sucursales Autorizadas *</Label>
                  <p className="text-[11px] text-muted-foreground -mt-2 mb-2 ml-1">
                    Tiendas donde puede operar el usuario.
                  </p>
                  <div className="space-y-2 border rounded-md p-3 h-48 overflow-y-auto bg-muted/20">
                    {stores?.filter(s => s.isActive).map((store) => (
                      <div key={store.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-store-${store.id}`}
                          checked={formData.storeIds.includes(store.id)}
                          onChange={() => toggleStore(store.id)}
                          className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                        />
                        <Label htmlFor={`edit-store-${store.id}`} className="cursor-pointer font-normal text-foreground">
                          {store.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
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
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El usuario {userToDelete?.firstName} {userToDelete?.lastName} será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <PermissionsDialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen} />
    </AppLayout>
  );
}
