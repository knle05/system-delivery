import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Tracking from "./pages/Tracking"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AdminLogin from "./pages/AdminLogin"
import MerchantDashboard from "./pages/MerchantDashboard"
import CreateShipment from "./pages/CreateShipment"
import AdminUsers from "./pages/AdminUsers"
import ProtectedRoute from "./components/ProtectedRoute"
import Estimate from "./pages/Estimate"
import AuthChoice from "./pages/AuthChoice"
import AboutUs from "./pages/AboutUs"

export default function App() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 8 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/estimate" element={<Estimate />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/auth" element={<AuthChoice />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={["admin","merchant"]}>
              <MerchantDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/create" element={
            <ProtectedRoute requiredRoles={["admin","merchant"]}>
              <CreateShipment />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </>
  )
}


