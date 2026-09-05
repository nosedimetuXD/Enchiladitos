import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Products from './pages/Products'
import Sales from './pages/Sales'
import SalesHistory from './pages/SalesHistory'
import Customers from './pages/Customers'
import Accounting from './pages/Accounting'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Punto de Venta es la pagina principal */}
        <Route index element={<Sales />} />
        <Route path="sales/history" element={<SalesHistory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="stats" element={<Stats />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Pagina 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}