import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DepartmentMaster from './pages/DepartmentMaster';
import RoleMaster from './pages/RoleMaster';
import UserManagement from './pages/UserManagement';
import Tasks from './pages/Tasks';

function PrivateRoute({ children }) {
  return localStorage.getItem('tm_token') ? children : <Navigate to="/login" replace />;
}

function ModuleRoute({ moduleKey, children }) {
  if (!localStorage.getItem('tm_token')) return <Navigate to="/login" replace />;
  const user = JSON.parse(localStorage.getItem('tm_user') || '{}');
  const perm = user.permissions?.[moduleKey];
  return (perm && perm.view !== 'none') ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"            element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"       element={<Login />} />
      <Route path="/register"    element={<Register />} />
      <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/departments" element={<ModuleRoute moduleKey="department_master"><DepartmentMaster /></ModuleRoute>} />
      <Route path="/roles"       element={<ModuleRoute moduleKey="role_master"><RoleMaster /></ModuleRoute>} />
      <Route path="/users"       element={<ModuleRoute moduleKey="user_management"><UserManagement /></ModuleRoute>} />
      <Route path="/tasks"       element={<ModuleRoute moduleKey="tasks"><Tasks /></ModuleRoute>} />
    </Routes>
  );
}
