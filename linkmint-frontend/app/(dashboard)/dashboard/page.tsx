'use client';

import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { DollarSign, MousePointerClick, ShoppingCart, TrendingUp, Package, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Hardcoded sample data based on CSV - realistic small creator earnings
const SAMPLE_DATA = {
  creator_id: "creator_101",
  total_earnings: 19.86,
  total_clicks: 545,
  total_orders: 22,
  total_shipped: 21,
  total_returns: 1,
  conversion_rate: 4.04,
  last_updated: "2025-10-05T00:00:00Z",
  daily_earnings: [
    { date: "2025-10-01", earnings: 3.86, clicks: 120, orders: 8 },
    { date: "2025-10-02", earnings: 2.40, clicks: 90, orders: 5 },
    { date: "2025-10-03", earnings: 8.00, clicks: 30, orders: 2 },
    { date: "2025-10-04", earnings: 0, clicks: 230, orders: 0 },
    { date: "2025-10-05", earnings: 5.60, clicks: 75, orders: 7 },
  ],
  top_products: [
    {
      product_title: "Logitech MX Master 3S Mouse",
      asin: "B0B4X6G6TJ",
      clicks: 30,
      orders: 2,
      revenue: 199.98,
      earnings: 8.00,
      conversion_rate: 6.67
    },
    {
      product_title: "The Subtle Art of Not Giving a F*ck",
      asin: "B01IAIWX8W",
      clicks: 120,
      orders: 8,
      revenue: 96.53,
      earnings: 3.86,
      conversion_rate: 6.67
    },
    {
      product_title: "Atomic Habits",
      asin: "B07D23CFGR",
      clicks: 200,
      orders: 0,
      revenue: 0,
      earnings: 0,
      conversion_rate: 0
    },
    {
      product_title: "Sapiens: A Brief History of Humankind",
      asin: "B00ICN066A",
      clicks: 90,
      orders: 5,
      revenue: 59.96,
      earnings: 2.40,
      conversion_rate: 5.56
    },
    {
      product_title: "Anker Power Bank 20000mAh",
      asin: "B07QXV6N1B",
      clicks: 105,
      orders: 7,
      revenue: 149.93,
      earnings: 5.60,
      conversion_rate: 6.67
    },
  ]
};

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = SAMPLE_DATA;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.username}!</p>
          <p className="text-xs text-gray-400 mt-1">Creator ID: {user?.creator_id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm font-medium text-gray-700">Oct 5, 2025</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
              <p className="text-3xl font-bold text-gray-900">
                ${stats.total_earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 mt-2">↑ $2.45 from last week</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_clicks.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-green-600 mt-2">↑ 45 from last week</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <MousePointerClick className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_orders.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-green-600 mt-2">↑ 3 orders from last week</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.conversion_rate.toFixed(2)}%
              </p>
              <p className="text-xs text-green-600 mt-2">↑ 0.8% from last week</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Shipped Orders</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_shipped.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-gray-500 mt-2">{((stats.total_shipped / stats.total_orders) * 100).toFixed(1)}% of total orders</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Returns</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_returns.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-gray-500 mt-2">{((stats.total_returns / stats.total_orders) * 100).toFixed(1)}% return rate</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Earnings Over Time (Oct 1-5, 2025)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={stats.daily_earnings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="#666"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <Line type="monotone" dataKey="earnings" stroke="#00b894" strokeWidth={3} dot={{ fill: '#00b894', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performing Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ASIN</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Clicks</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Orders</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Conv. Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Your Earnings</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_products.map((product, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-4 px-4 text-sm text-gray-900 font-medium max-w-xs">
                    {product.product_title}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500 font-mono">{product.asin}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-right">{product.clicks.toLocaleString('en-US')}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-right">{product.orders.toLocaleString('en-US')}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-right">{product.conversion_rate.toFixed(2)}%</td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-right">${product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-4 px-4 text-sm font-semibold text-primary text-right">${product.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
