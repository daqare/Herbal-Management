import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle } from '../lib/firebase';
import { Leaf } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-zinc-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-lg shadow-emerald-100">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Herbal Client Manager</h1>
          <p className="text-zinc-500 mt-2 text-center text-sm">
            Manage health records, appointments, and payments for your Nairobi clinic.
          </p>
        </div>

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-zinc-400 text-xs mt-8">
          Secure consultant login. Dedicated to health excellence.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
