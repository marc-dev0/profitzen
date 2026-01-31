# 🔄 Guía de Migración a DataTable

Esta guía te ayudará a migrar páginas existentes al nuevo componente `DataTable` de forma rápida y efectiva.

## 📋 Checklist de Migración

- [ ] Identificar la tabla actual
- [ ] Definir las columnas
- [ ] Configurar búsqueda (si aplica)
- [ ] Configurar ordenamiento
- [ ] Migrar acciones
- [ ] Agregar stats cards (opcional)
- [ ] Reemplazar navbar
- [ ] Probar funcionalidad
- [ ] Eliminar código antiguo

---

## 🎯 Paso a Paso

### Paso 1: Analizar la Página Actual

Identifica:
- ✅ Qué datos muestra la tabla
- ✅ Qué columnas tiene
- ✅ Qué acciones existen (editar, eliminar, etc.)
- ✅ Si tiene búsqueda o filtros
- ✅ Si tiene paginación

### Paso 2: Importar Dependencias

```typescript
// Antes
import { SortableTable } from '@/components/SortableTable';
import Link from 'next/link';

// Después
import { DataTable, Column } from '@/components/DataTable';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, /* otros iconos */ } from 'lucide-react';
```

### Paso 3: Definir las Columnas

#### Ejemplo de Migración

**Antes (SortableTable):**
```typescript
<SortableTable
  data={products}
  columns={[
    { key: 'code', label: 'Código', render: (p) => p.code },
    { key: 'name', label: 'Nombre', render: (p) => p.name },
    { key: 'price', label: 'Precio', render: (p) => `S/ ${p.price}` }
  ]}
/>
```

**Después (DataTable):**
```typescript
const columns: Column<Product>[] = [
  {
    key: 'code',
    header: 'Código',
    sortable: true,
    render: (product) => (
      <span className="font-mono text-sm font-medium text-slate-900">
        {product.code}
      </span>
    )
  },
  {
    key: 'name',
    header: 'Nombre',
    sortable: true,
    render: (product) => (
      <span className="text-sm font-medium text-slate-900">
        {product.name}
      </span>
    )
  },
  {
    key: 'price',
    header: 'Precio',
    sortable: true,
    render: (product) => (
      <span className="text-sm font-semibold text-slate-900">
        S/ {product.price.toFixed(2)}
      </span>
    )
  }
];

<DataTable
  data={products}
  columns={columns}
  keyExtractor={(product) => product.id}
  searchable={true}
  searchPlaceholder="Buscar producto..."
  searchKeys={['code', 'name']}
/>
```

### Paso 4: Migrar Acciones

**Antes:**
```typescript
<button onClick={() => handleEdit(item)}>Editar</button>
<button onClick={() => handleDelete(item)}>Eliminar</button>
```

**Después:**
```typescript
{
  key: 'actions',
  header: 'Acciones',
  render: (item) => (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(item);
        }}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(item.id);
        }}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### Paso 5: Reemplazar Navbar

**Antes:**
```typescript
<nav className="bg-white shadow-sm">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex justify-between h-16">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/products">Productos</Link>
      {/* ... más links */}
    </div>
  </div>
</nav>
```

**Después:**
```typescript
import Navbar from '@/components/Navbar';

<Navbar />
```

### Paso 6: Agregar Stats Cards (Opcional)

```typescript
const getTotalItems = () => items?.length || 0;
const getActiveItems = () => items?.filter(i => i.isActive).length || 0;

<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">Total</p>
        <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
      </div>
      <Package className="w-8 h-8 text-blue-600" />
    </div>
  </div>
  {/* Más cards... */}
</div>
```

### Paso 7: Actualizar Handlers

**Antes:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('¿Seguro?')) return;
  try {
    await deleteItem(id);
    alert('Eliminado correctamente');
  } catch (err) {
    alert('Error al eliminar');
  }
};
```

**Después:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('¿Está seguro de eliminar este elemento?')) return;
  
  try {
    await deleteItem(id);
    toast.success('Elemento eliminado correctamente');
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Error al eliminar');
  }
};
```

---

## 🎨 Template Completo

Usa este template como punto de partida:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { DataTable, Column } from '@/components/DataTable';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

// 1. Define tu interface
interface Item {
  id: string;
  name: string;
  // ... otros campos
}

export default function ItemsPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  
  // 2. Hooks de datos
  const { data: items, isLoading } = useItems();
  
  // 3. Estados locales
  const [showForm, setShowForm] = useState(false);
  
  // 4. Auth check
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  // 5. Handlers
  const handleEdit = (item: Item) => {
    // Tu lógica
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro?')) return;
    try {
      await deleteItem(id);
      toast.success('Eliminado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  // 6. Stats
  const getTotalItems = () => items?.length || 0;

  // 7. Definir columnas
  const columns: Column<Item>[] = [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (item) => (
        <span className="text-sm font-medium text-slate-900">
          {item.name}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // 8. Render
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Título</h1>
                <p className="text-slate-600 mt-1">Descripción</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* DataTable */}
          <DataTable
            data={items || []}
            columns={columns}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyMessage="No hay elementos registrados"
            searchable={true}
            searchPlaceholder="Buscar..."
            searchKeys={['name']}
            defaultRowsPerPage={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>
    </>
  );
}
```

---

## 📊 Comparación Antes/Después

### Líneas de Código

| Componente | Antes | Después | Reducción |
|------------|-------|---------|-----------|
| Ventas | 914 | 750 | -18% |
| Productos | 409 | 250 | -39% |
| Inventario | 882 | 700 | -21% |
| Suppliers | 350 | 280 | -20% |
| Categories | 303 | 250 | -17% |

### Funcionalidades Ganadas

- ✅ Búsqueda integrada
- ✅ Ordenamiento visual
- ✅ Paginación inteligente
- ✅ Diseño consistente
- ✅ Stats cards
- ✅ Navbar unificado

---

## ⚠️ Errores Comunes

### 1. Olvidar stopPropagation

```typescript
// ❌ Malo - Click en botón también hace click en fila
<button onClick={() => handleAction()}>

// ✅ Bueno
<button onClick={(e) => {
  e.stopPropagation();
  handleAction();
}}>
```

### 2. searchKeys incorrectos

```typescript
// ❌ Malo - Campos que no existen
searchKeys={['nombre', 'codigo']}

// ✅ Bueno - Campos que existen en el objeto
searchKeys={['name', 'code']}
```

### 3. No usar keyExtractor

```typescript
// ❌ Malo
<DataTable data={items} columns={columns} />

// ✅ Bueno
<DataTable 
  data={items} 
  columns={columns}
  keyExtractor={(item) => item.id}
/>
```

### 4. Renderizado sin return

```typescript
// ❌ Malo
render: (item) => {
  const value = formatValue(item.value);
  <span>{value}</span>  // Falta return!
}

// ✅ Bueno
render: (item) => {
  const value = formatValue(item.value);
  return <span>{value}</span>;
}

// ✅ Mejor
render: (item) => (
  <span>{formatValue(item.value)}</span>
)
```

---

## 🎯 Páginas Migradas

- ✅ Ventas (`/sales`)
- ✅ Clientes (`/customers`)
- ✅ Productos (`/products`)
- ✅ Inventario (`/inventario`)
- ✅ Proveedores (`/suppliers`)
- ✅ Categorías (`/categories`)

## 📝 Páginas Pendientes

- ⏳ Compras (`/purchases`)
- ⏳ Usuarios (`/users`)
- ⏳ Tiendas (`/stores`)

---

## 💡 Tips

1. **Empieza simple**: Migra primero sin stats ni búsqueda, luego agrega features
2. **Prueba incremental**: Prueba cada columna antes de agregar la siguiente
3. **Reutiliza código**: Si tienes funciones de formateo, úsalas en múltiples columnas
4. **Documenta**: Agrega comentarios si la lógica es compleja
5. **Consistencia**: Usa los mismos patrones en todas las páginas

---

## 🚀 Siguiente Paso

Una vez migrada tu página:
1. ✅ Prueba todas las funcionalidades
2. ✅ Verifica que la búsqueda funcione
3. ✅ Verifica que el ordenamiento funcione
4. ✅ Verifica que las acciones funcionen
5. ✅ Elimina el código antiguo
6. ✅ Actualiza esta guía si encontraste algo nuevo

---

¡Buena suerte con tu migración! 🎉
