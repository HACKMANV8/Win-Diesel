'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="text-primary text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 px-4">
      <div className="max-w-4xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6">
            <span className="text-primary">Link</span>Mint
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform your content into revenue with AI-powered affiliate link generation
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-white text-primary border-2 border-primary rounded-xl font-semibold text-lg hover:bg-primary/5 transition-all shadow-md hover:shadow-lg"
          >
            Login
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered</h3>
            <p className="text-gray-600">
              Automatically extract products from your content and generate affiliate links
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">
              Track earnings, clicks, conversions, and top-performing products
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Payouts</h3>
            <p className="text-gray-600">
              Get paid directly to your UPI with transparent earnings tracking
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
