import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RoleRoute from './components/RoleRoute';
import ExplorePage from './pages/ExplorePage';
import ExploreDetailPage from './pages/ExploreDetailPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import UserEditPage from './pages/UserEditPage';
import GroupsScreen from './pages/GroupsScreen';
import GroupEditPage from './pages/GroupEditPage';
import RestaurantsPage from './pages/RestaurantsPage';
import RestaurantEditPage from './pages/RestaurantEditPage';
import AdminRestaurantsPage from "./pages/AdminRestaurantsPage";
import ImportRestaurantsPage from "./pages/ImportRestaurantsPage";
import InstallPage from "./pages/Install";
import InstallCheck from "./components/InstallCheck";
import SessionTimeout from './components/SessionTimeout';

const isAuthenticated = () => !!localStorage.getItem('token');

function IndexRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionTimeout />
      <ErrorBoundary>
        <InstallCheck>
          <Routes>
            {/* instal */}
            <Route path="/install" element={<InstallPage />} />

            {/* Root -> smartredirect  */}
            <Route path="/" element={<IndexRedirect />} />

            {/* public pages */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* main Layout with sidebarn - one ProtectedRoute per route */}
            <Route
              element={
                <RoleRoute allowedRoles={["admin", "restaurant", "user"]} redirectTo="/login">
                  <Sidebar />
                </RoleRoute>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant", "user"]}>
                    <Dashboard />
                  </RoleRoute>
                }
              />

              <Route
                path="/admin/restaurants"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <AdminRestaurantsPage />
                  </RoleRoute>
                }
              />

              {/* Admin-only routes */}
              <Route 
                path="/settings" 
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <SettingsPage />
                  </RoleRoute>
                } 
              />
              <Route 
                path="/import" 
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <ImportRestaurantsPage />
                  </RoleRoute>
                } 
              />

              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/explore/:id" element={<ExploreDetailPage />} />

              <Route 
                path="/users" 
                element={
                  <RoleRoute allowedRoles={["admin", "user"]}>
                    <UsersPage />
                  </RoleRoute>
                } 
              />
              <Route 
                path="/users/:id" 
                element={
                  <RoleRoute allowedRoles={["admin", "user"]}>
                    <UserEditPage />
                  </RoleRoute>
                } 
              />

              <Route
                path="/groups"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant", "user"]}>
                    <GroupsScreen />
                  </RoleRoute>
                }
              />
              <Route
                path="/groups/new"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant", "user"]}>
                    <GroupEditPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/groups/:id"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant", "user"]}>
                    <GroupEditPage />
                  </RoleRoute>
                }
              />

              <Route
                path="/restaurants"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant", "user"]}>
                    <RestaurantsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/restaurants/new"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant"]}>
                    <RestaurantEditPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/restaurants/:id"
                element={
                  <RoleRoute allowedRoles={["admin", "restaurant"]}>
                    <RestaurantEditPage />
                  </RoleRoute>
                }
              />
            </Route>

            {/* fallback 404 - optional */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </InstallCheck>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
