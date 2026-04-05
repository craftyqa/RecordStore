import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ItemsPage } from '@/pages/ItemsPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { CreateItemPage } from '@/pages/CreateItemPage'
import { EditItemPage } from '@/pages/EditItemPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-8 py-4">
          <h1 className="text-lg font-semibold text-foreground">Record Store</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/items" replace />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/new" element={<CreateItemPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/items/:id/edit" element={<EditItemPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
