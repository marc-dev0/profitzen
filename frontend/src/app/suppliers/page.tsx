'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import type { Supplier, CreateSupplierRequest } from '@/types/inventory';
import { toast } from 'sonner';
import { Building2, UserPlus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';

export default function SuppliersPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
  });

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.id, data: formData });
        toast.success('Proveedor actualizado correctamente');
      } else {
        await createSupplier.mutateAsync(formData);
        toast.success('Proveedor creado correctamente');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar el proveedor');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) return;

    try {
      await deleteSupplier.mutateAsync(id);
      toast.success('Proveedor eliminado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar el proveedor');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      taxId: '',
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  const getTotalSuppliers = () => suppliers?.length || 0;
  const getActiveSuppliers = () => suppliers?.filter(s => s.isActive).length || 0;
  const getInactiveSuppliers = () => suppliers?.filter(s => !s.isActive).length || 0;

  // Define columns for DataTable
  const supplierColumns: Column<Supplier>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (supplier) => (
        <span className="font-mono text-sm font-medium text-foreground">
          {supplier.code}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (supplier) => (
        <div>
          <p className="text-sm font-medium text-foreground">{supplier.name}</p>
          {supplier.taxId && (
            <p className="text-xs text-muted-foreground">RUC: {supplier.taxId}</p>
          )}
        </div>
      )
    },
    {
      key: 'contactName',
      header: 'Contacto',
      sortable: true,
      render: (supplier) => (
        <div>
          {supplier.contactName && (
            <p className="text-sm text-foreground">{supplier.contactName}</p>
          )}
          {supplier.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {supplier.phone}
            </p>
          )}
          {supplier.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {supplier.email}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'address',
      header: 'Dirección',
      render: (supplier) => (
        supplier.address ? (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {supplier.address}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
      )
    },
    {
      key: 'isActive',
      header: 'Estado',
      sortable: true,
      render: (supplier) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${supplier.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {supplier.isActive ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (supplier) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(supplier);
            }}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(supplier.id);
            }}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Gestión de Proveedores</h1>
                <p className="text-muted-foreground mt-1">Administra tu red de proveedores</p>
              </div>
              <button
                onClick={() => showForm ? resetForm() : setShowForm(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg flex items-center gap-2"
              >
                {showForm ? (
                  <>Cancelar</>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Nuevo Proveedor
                  </>
                )}
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Proveedores</p>
                    <p className="text-2xl font-bold text-foreground">{getTotalSuppliers()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Activos</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getActiveSuppliers()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactivos</p>
                    <p className="text-2xl font-bold text-destructive">{getInactiveSuppliers()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-destructive" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      RUC
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="RUC del proveedor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="Teléfono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createSupplier.isPending || updateSupplier.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {createSupplier.isPending || updateSupplier.isPending
                      ? 'Guardando...'
                      : editingSupplier ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Suppliers Table with DataTable Component */}
          <DataTable
            data={suppliers || []}
            columns={supplierColumns}
            keyExtractor={(supplier) => supplier.id}
            loading={isLoading}
            emptyMessage="No hay proveedores registrados"
            searchable={true}
            searchPlaceholder="Buscar por nombre, RUC, contacto..."
            searchKeys={['name', 'code', 'taxId', 'contactName', 'email', 'phone']}
            defaultRowsPerPage={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>
    </AppLayout>
  );
}
