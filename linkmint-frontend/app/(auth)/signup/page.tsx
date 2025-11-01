'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    upi_id: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.signup(formData);
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-semibold text-gray-900 mb-3">
            <span className="text-primary">Link</span>Mint
          </h1>
          <p className="text-gray-500 text-lg">Create your account</p>
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
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-base"
              placeholder="Password"
              autoComplete="new-password"
            />
          </div>

          <div>
            <input
              type="text"
              required
              value={formData.upi_id}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-base"
              placeholder="UPI ID (e.g., john@paytm)"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium py-3.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-base"
          >
            {loading ? 'Creating Account...' : 'Continue'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
