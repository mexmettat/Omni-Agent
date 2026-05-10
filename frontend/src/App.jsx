import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Package,
  ShoppingCart,
  Ticket,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Bell,
  Search,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    openTickets: 0,
    lowStock: 0,
  });

  useEffect(() => {
    fetchData();

    // Set up Realtime subscriptions
    const productsSub = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        handleRealtimeUpdate('products', payload);
      })
      .subscribe();

    const ordersSub = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        handleRealtimeUpdate('orders', payload);
      })
      .subscribe();

    const ticketsSub = supabase
      .channel('tickets_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        handleRealtimeUpdate('tickets', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(ticketsSub);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prodData } = await supabase.from('products').select('*').order('name');
      const { data: ordData } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10);
      const { data: tktData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(10);

      if (prodData) setProducts(prodData);
      if (ordData) setOrders(ordData);
      if (tktData) setTickets(tktData);

      updateStats(prodData, ordData, tktData);
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  };

  const updateStats = (p, o, t) => {
    setStats({
      totalOrders: o?.length || 0,
      openTickets: t?.filter(i => i.status === 'açık' || i.status === 'pending').length || 0,
      lowStock: p?.filter(i => i.stock_quantity < 10).length || 0,
    });
  };

  const handleRealtimeUpdate = (type, payload) => {
    if (type === 'products') {
      setProducts(prev => {
        const index = prev.findIndex(i => i.id === payload.new.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = payload.new;
          return updated;
        }
        return [...prev, payload.new];
      });
    } else if (type === 'orders') {
      setOrders(prev => [payload.new, ...prev].slice(0, 10));
    } else if (type === 'tickets') {
      setTickets(prev => [payload.new, ...prev].slice(0, 10));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans selection:bg-indigo-500/30">

      {/* Top Header */}
      <header className="h-20 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white leading-tight">Omni-Agent</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Canlı İzleme Paneli</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-4 py-1.5 text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistem Çevrimiçi
          </div>
          <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/10 shadow-lg cursor-pointer"></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Hoş Geldiniz</h2>
            <p className="text-slate-400 text-sm">İşte mağazanızdaki son durum ve AI asistanınızın aktiviteleri.</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            Verileri Güncelle
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Toplam Sipariş"
            value={stats.totalOrders}
            icon={<ShoppingCart className="text-indigo-400" />}
            trend="+12%"
            color="indigo"
          />
          <StatCard
            title="Açık Talepler"
            value={stats.openTickets}
            icon={<Ticket className="text-rose-400" />}
            trend="-2"
            color="rose"
          />
          <StatCard
            title="Düşük Stok"
            value={stats.lowStock}
            icon={<AlertTriangle className="text-amber-400" />}
            trend="Kritik"
            color="amber"
          />
          <StatCard
            title="AI Verimliliği"
            value="%98"
            icon={<TrendingUp className="text-cyan-400" />}
            trend="Mükemmel"
            color="cyan"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Inventory List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0d1117] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="font-bold text-xl text-white flex items-center gap-3">
                  <Package size={24} className="text-indigo-400" />
                  Stok Durumu
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
                      <th className="px-8 py-5 font-bold">Ürün Adı</th>
                      <th className="px-8 py-5 font-bold">Miktar</th>
                      <th className="px-8 py-5 font-bold">Durum</th>
                      <th className="px-8 py-5 font-bold text-right">Birim Fiyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode='popLayout'>
                      {products.length > 0 ? products.map((product) => (
                        <motion.tr
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={product.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="px-8 py-5 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {product.name}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <span className="text-base font-bold w-8">{product.stock_quantity}</span>
                              <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden flex-shrink-0">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(product.stock_quantity, 100)}%` }}
                                  className={`h-full rounded-full ${product.stock_quantity < 10 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                      product.stock_quantity < 30 ? 'bg-amber-500' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                    }`}
                                ></motion.div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            {product.stock_quantity < 10 ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md uppercase tracking-wider animate-pulse border border-rose-500/20">
                                <AlertTriangle size={10} />
                                Kritik
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">Normal</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right font-mono text-sm text-slate-400">
                            {product.price}₺
                          </td>
                        </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-8 py-20 text-center text-slate-500 italic">
                            Henüz ürün kaydı bulunamadı.
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Live Logs */}
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-white/5 rounded-[2rem] h-full shadow-2xl flex flex-col">
              <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01]">
                <h3 className="font-bold text-xl text-white flex items-center gap-3">
                  <MessageSquare size={24} className="text-cyan-400" />
                  İşlem Akışı
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[600px] scrollbar-hide">
                <AnimatePresence initial={false}>
                  {(orders.length > 0 || tickets.length > 0) ? (
                    <>
                      {orders.map((order) => (
                        <LogItem
                          key={order.id}
                          type="order"
                          title={`Sipariş: ${order.order_number}`}
                          desc={`${order.customer_phone} sipariş verdi.`}
                          time={new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        />
                      ))}
                      {tickets.map((ticket) => (
                        <LogItem
                          key={ticket.id}
                          type="ticket"
                          title="Destek Talebi"
                          desc={ticket.issue_description}
                          time={new Date(ticket.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-600">
                      <p className="text-xs italic">Canlı akış bekleniyor...</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }) {
  const colors = {
    indigo: "from-indigo-500/10 to-transparent border-indigo-500/10 hover:border-indigo-500/30",
    rose: "from-rose-500/10 to-transparent border-rose-500/10 hover:border-rose-500/30",
    amber: "from-amber-500/10 to-transparent border-amber-500/10 hover:border-amber-500/30",
    cyan: "from-cyan-500/10 to-transparent border-cyan-500/10 hover:border-cyan-500/30"
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-[2rem] p-8 shadow-xl group transition-all duration-300`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 ${color === 'rose' ? 'text-rose-400' : 'text-emerald-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-4xl font-black text-white tracking-tighter">{value}</h4>
    </div>
  );
}

function LogItem({ type, title, desc, time }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'order' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
          {type === 'order' ? <ShoppingCart size={20} /> : <Ticket size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h5 className="text-sm font-bold text-white truncate">{title}</h5>
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-1">{time}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-medium">
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
