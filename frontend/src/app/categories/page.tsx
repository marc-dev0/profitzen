'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useMasterDataValues, useCreateMasterDataValue, useUpdateMasterDataValue } from '@/hooks/useMasterData';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import type { MasterDataValue } from '@/types/masterdata';
import { toast } from 'sonner';
import { FolderOpen, Plus, Edit, Power, PowerOff, Tag } from 'lucide-react';

export default function CategoriesPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { data: categories, isLoading } = useMasterDataValues('CATEGORY');
  const createCategory = useCreateMasterDataValue();
  const updateCategory = useUpdateMasterDataValue();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MasterDataValue | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const handleEdit = (category: MasterDataValue) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          request: {
            name: formData.name,
            description: formData.description,
            displayOrder: editingCategory.displayOrder,
            isActive: editingCategory.isActive
          }
        });
        toast.success('Categoría actualizada correctamente');
      } else {
        await createCategory.mutateAsync({
          typeCode: 'CATEGORY',
          code: '',
          name: formData.name,
          description: formData.description,
          displayOrder: 0
        });
        toast.success('Categoría creada correctamente');
      }
      setFormData({ name: '', description: '' });
      setEditingCategory(null);
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (category: MasterDataValue) => {
    if (!confirm(`¿Está seguro de ${category.isActive ? 'desactivar' : 'activar'} esta categoría?`)) {
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: category.id,
        request: {
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
          isActive: !category.isActive
        }
      });
      toast.success(`Categoría ${category.isActive ? 'desactivada' : 'activada'} correctamente`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar la categoría');
    }
  };

  const getTotalCategories = () => categories?.length || 0;
  const getActiveCategories = () => categories?.filter(c => c.isActive).length || 0;
  const getInactiveCategories = () => categories?.filter(c => !c.isActive).length || 0;

  // Define columns for DataTable
  const categoryColumns: Column<MasterDataValue>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (category) => (
        <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-foreground">
          {category.code}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (category) => (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{category.name}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (category) => (
        <span className="text-sm text-muted-foreground">{category.description || '-'}</span>
      )
    },
    {
      key: 'isActive',
      header: 'Estado',
      sortable: true,
      render: (category) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${category.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {category.isActive ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (category) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(category);
            }}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(category);
            }}
            className={`p-2 rounded-lg transition-colors ${category.isActive ? 'text-destructive hover:bg-destructive/10' : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'}`}
            title={category.isActive ? 'Desactivar' : 'Activar'}
          >
            {category.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
        </div>
      )
    }
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Categorías</h1>
            <p className="text-muted-foreground mt-1">Organiza tus productos por categorías</p>
          </div>
          <button
            onClick={() => {
              if (showForm && !editingCategory) {
                setShowForm(false);
              } else if (showForm && editingCategory) {
                handleCancelEdit();
              } else {
                setShowForm(true);
              }
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg flex items-center gap-2"
          >
            {showForm ? (
              <>Cancelar</>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Nueva Categoría
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Categorías</p>
                <p className="text-2xl font-bold text-foreground">{getTotalCategories()}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getActiveCategories()}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivas</p>
                <p className="text-2xl font-bold text-destructive">{getInactiveCategories()}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingCategory ? `Editar Categoría (${editingCategory.code})` : 'Nueva Categoría'}
          </h3>
          {!editingCategory && (
            <p className="text-sm text-muted-foreground mb-4">
              El código se generará automáticamente basándose en el nombre
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                  placeholder="Ej: Bebidas, Snacks, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  placeholder="Descripción de la categoría (opcional)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table with DataTable Component */}
      <DataTable
        data={categories || []}
        columns={categoryColumns}
        keyExtractor={(category) => category.id}
        loading={isLoading}
        emptyMessage="No hay categorías registradas"
        searchable={true}
        searchPlaceholder="Buscar por código o nombre..."
        searchKeys={['code', 'name', 'description']}
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </AppLayout>
  );
}
