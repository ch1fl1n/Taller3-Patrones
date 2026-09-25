'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { REGISTER, LOGIN } from '@/graphql/mutations';
import { GET_CURRENT_USER } from '@/graphql/queries';
import { User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { updateAuthToken } from '@/lib/apolloClient';

export function AuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const [register, { loading: registerLoading }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      if (data.register.__typename === 'AuthSuccess') {
        updateAuthToken(data.register.token);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        resetForm();
      } else {
        setError(data.register.message || 'Registration failed');
      }
    },
    onError: (err) => {
      setError(err.message || 'Registration error');
    },
  });

  const [login, { loading: loginLoading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      if (data.login.__typename === 'AuthSuccess') {
        updateAuthToken(data.login.token);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        resetForm();
      } else {
        setError(data.login.message || 'Login failed');
      }
    },
    onError: (err) => {
      setError(err.message || 'Login error');
    },
  });

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('auth_token') 
      : null;
    setIsLoggedIn(!!token);
  }, []);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      await login({
        variables: {
          input: { email },
        },
      });
    } else {
      await register({
        variables: {
          input: { email, fullName, role: 'patient' },
        },
      });
    }
  };

  const handleLogout = () => {
    updateAuthToken(null);
    setIsLoggedIn(false);
  };

  const handleDemoLogin = async () => {
    // Usar token de ejemplo para desarrollo
    const exampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYWNpZW50ZS1kZS1lamVtcGxvLWlkIiwiZW1haWwiOiJwYWNpZW50ZUBlamVtcGxvLmNvbSIsInJvbGUiOiJwYXRpZW50IiwicGF0aWVudElkIjoicGFjaWVudGUtZGUtZWplbXBsby1pZCIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwNjA0Nzk5LCJpc3MiOiJhZmlybWF0aXZlLXBpbGwtYmFja2VuZCIsImF1ZCI6ImFmaXJtYXRpdmUtcGlsbC1mcm9udGVuZCJ9.example-signature';
    updateAuthToken(exampleToken);
    setIsLoggedIn(true);
  };

  return (
    <>
      {/* Botón de autenticación */}
      <div className="relative">
        {isLoggedIn ? (
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-sm">
              <p className="font-medium">Usuario Demo</p>
              <p className="text-secondary-600 text-xs">paciente@ejemplo.com</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden md:inline">Iniciar sesión</span>
            </button>
            
            <button
              onClick={handleDemoLogin}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Usar demo
            </button>
          </div>
        )}
      </div>

      {/* Modal de autenticación */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                </h2>
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    resetForm();
                  }}
                  className="text-secondary-500 hover:text-secondary-700"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input"
                      placeholder="Juan Pérez"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerLoading || loginLoading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {registerLoading || loginLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      {isLogin ? (
                        <>
                          <LogIn className="h-5 w-5" />
                          <span>Iniciar sesión</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5" />
                          <span>Crear cuenta</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-secondary-200">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    resetForm();
                  }}
                  className="w-full text-center text-primary-600 hover:text-primary-800"
                >
                  {isLogin
                    ? '¿No tienes cuenta? Regístrate aquí'
                    : '¿Ya tienes cuenta? Inicia sesión aquí'}
                </button>

                <div className="mt-4">
                  <button
                    onClick={handleDemoLogin}
                    className="w-full text-center text-secondary-600 hover:text-secondary-800 text-sm"
                  >
                    Usar cuenta de demostración
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}