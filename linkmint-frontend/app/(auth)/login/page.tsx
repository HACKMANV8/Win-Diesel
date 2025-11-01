'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authAPI.login(formData);
      login(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-semibold text-gray-900 mb-3">
            <span className="text-primary">Link</span>Mint
          </h1>
          <p className="text-gray-500 text-lg">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-base"
              placeholder="Username"
              autoComplete="username"
            />
          </div>

          <div>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-base"
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium py-3.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-base"
          >
            {loading ? 'Signing In...' : 'Continue'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:text-primary/80">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
