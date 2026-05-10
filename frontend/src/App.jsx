import { useState, useEffect } from 'react'

function App() {
  // Mock veri durumları - İleride WebSocket veya API ile beslenecek
  const [stats, setStats] = useState({
    activeOrders: 12,
    openTickets: 3,
    totalMessages: 128
  });

  const [recentActivities, setRecentActivities] = useState([
    { id: 1, type: 'order', message: 'Yeni sipariş durumu sorgusu: +905551234567', time: '2 dk önce', status: 'success' },
    { id: 2, type: 'ticket', message: 'Yeni destek talebi açıldı: #T-9823', time: '15 dk önce', status: 'warning' },
    { id: 3, type: 'inventory', message: 'Stok sorgusu yapıldı: "Kablosuz Kulaklık"', time: '1 saat önce', status: 'info' },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                O
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Omni-Agent
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Sistem Aktif</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Genel Bakış</h2>
          <p className="text-slate-500 dark:text-slate-400">Yapay zeka asistanınızın günlük performansı.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Aktif Sipariş İşlemleri</h3>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.activeOrders}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Açık Destek Talepleri</h3>
            <p className="text-4xl font-bold text-rose-600 dark:text-rose-400">{stats.openTickets}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Toplam AI Yanıtı</h3>
            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalMessages}</p>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Canlı İşlem Akışı</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Tümünü Gör</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  activity.status === 'success' ? 'bg-emerald-500' :
                  activity.status === 'warning' ? 'bg-rose-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

export default App
