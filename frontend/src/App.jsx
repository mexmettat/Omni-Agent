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
  LayoutDashboard,
  Plus,
  X,
  Lock,
  LogOut
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock_quantity: '' });
  const [isAdding, setIsAdding] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('admin_auth') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

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

  const handleUpdateStock = (product) => {
    setUpdatingProduct(product);
    setNewStockValue(product.stock_quantity.toString());
    setIsUpdateModalOpen(true);
  };

  const handleUpdateStockSubmit = async (e) => {
    e.preventDefault();
    if (!updatingProduct || newStockValue === "" || isNaN(newStockValue)) return;

    setIsUpdatingStock(true);
    try {
      const response = await fetch(`http://localhost:8080/api/admin/products/${updatingProduct.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: parseInt(newStockValue) })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProducts(prev => prev.map(p => p.id === updatingProduct.id ? { ...p, stock_quantity: parseInt(newStockValue) } : p));
        setIsUpdateModalOpen(false);
        setUpdatingProduct(null);
      } else {
        alert("Hata: " + result.message);
      }
    } catch (error) {
      console.error("Update stock error:", error);
      alert("Sunucuya bağlanılamadı.");
    }
    setIsUpdatingStock(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.stock_quantity) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`http://localhost:8080/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          stock_quantity: parseInt(newProduct.stock_quantity)
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setIsAddModalOpen(false);
        setNewProduct({ name: '', price: '', stock_quantity: '' });
      } else {
        alert("Hata: " + result.message);
      }
    } catch (error) {
      console.error("Add product error:", error);
      alert("Sunucuya bağlanılamadı.");
    }
    setIsAdding(false);
  };

  const handleResolveTicket = async (id) => {
    if (!window.confirm("Bu talebi çözüldü olarak işaretlemek ve müşteriye bildirim göndermek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`http://localhost:8080/api/admin/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'çözüldü' })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'çözüldü' } : t));
        alert("Talep çözüldü ve müşteriye WhatsApp bildirimi gönderildi! ✅");
      } else {
        alert("Hata: " + result.message);
      }
    } catch (error) {
      console.error("Resolve ticket error:", error);
    }
  };

  const handleUpdateOrderStatus = async (id, newStatus) => {
    if (!window.confirm(`Sipariş durumunu "${newStatus.toUpperCase()}" olarak güncellemek istiyor musunuz?`)) return;

    try {
      const response = await fetch(`http://localhost:8080/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        alert(`Sipariş durumu güncellendi ve müşteriye bildirim gönderildi! 📦`);
      } else {
        alert("Hata: " + result.message);
      }
    } catch (error) {
      console.error("Update order status error:", error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === import.meta.env.VITE_ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4 selection:bg-indigo-500/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-indigo-500/20">
              <Lock className="text-indigo-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Admin Girişi</h2>
            <p className="text-slate-400 text-xs mt-1 text-center">Omni-Agent kontrol paneline erişmek için şifrenizi girin.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Parola"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`w-full bg-white/5 border ${loginError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500'} rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-center tracking-widest`}
                required
              />
              {loginError && <p className="text-rose-400 text-[10px] font-bold text-center mt-2 animate-pulse">Hatalı şifre, lütfen tekrar deneyin.</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Giriş Yap
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

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
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors relative" title="Çıkış Yap">
            <LogOut size={20} />
          </button>
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
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus size={16} />
                  Yeni Ekle
                </button>
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
                            <div className="flex items-center justify-end gap-3">
                              <span>{product.price}₺</span>
                              <button
                                onClick={() => handleUpdateStock(product)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
                                title="Stok Güncelle"
                              >
                                <RefreshCw size={14} />
                              </button>
                            </div>
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
                          desc={order.cargo_tracking || `${order.customer_phone} sipariş verdi.`}
                          phone={order.customer_phone}
                          status={order.status}
                          onAction={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                          time={new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        />
                      ))}
                      {tickets.map((ticket) => (
                        <LogItem
                          key={ticket.id}
                          type="ticket"
                          title={`Destek Talebi: ${ticket.status}`}
                          desc={ticket.issue_description}
                          phone={ticket.customer_phone}
                          status={ticket.status}
                          urgency_level={ticket.urgency_level}
                          onAction={() => handleResolveTicket(ticket.id)}
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

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold text-xl text-white flex items-center gap-3">
                  <Package className="text-indigo-400" />
                  Yeni Ürün Ekle
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-8 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ürün Adı</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Örn: Domates"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Birim Fiyat (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stok Miktarı</label>
                    <input
                      type="number"
                      value={newProduct.stock_quantity}
                      onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 mt-4"
                >
                  {isAdding ? 'Ekleniyor...' : 'Ürünü Kaydet'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Stock Modal */}
      <AnimatePresence>
        {isUpdateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsUpdateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold text-xl text-white flex items-center gap-3">
                  <RefreshCw className="text-indigo-400" />
                  Stok Güncelle
                </h3>
                <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateStockSubmit} className="p-8 space-y-5">
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    <span className="font-bold text-white">{updatingProduct?.name}</span> ürünü için stok miktarını güncelleyin.
                  </p>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yeni Stok Miktarı</label>
                  <input
                    type="number"
                    value={newStockValue}
                    onChange={e => setNewStockValue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStock}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    {isUpdatingStock ? 'Güncelleniyor...' : 'Stoku Güncelle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

function LogItem({ type, title, desc, time, phone, status, urgency_level, onAction }) {
  const isUrgent = urgency_level === 'Kritik' || urgency_level === 'Yüksek';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white/[0.02] border ${isUrgent ? 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-white/5'} rounded-2xl p-5 hover:bg-white/[0.04] transition-colors group ${status === 'çözüldü' || status === 'teslim edildi' ? 'opacity-50' : ''}`}
    >
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'order' ? 'bg-indigo-500/10 text-indigo-400' : (isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-500/10 text-rose-400')
          }`}>
          {type === 'order' ? <ShoppingCart size={20} /> : <Ticket size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h5 className="text-sm font-bold text-white truncate flex items-center gap-2">
                {title}
                {isUrgent && <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">{urgency_level}</span>}
                {type === 'order' && status && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${(status === 'hazırlanıyor' || status === 'pending') ? 'bg-amber-500/20 text-amber-500' :
                      status === 'kargoda' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-emerald-500/20 text-emerald-500'
                    }`}>
                    {status}
                  </span>
                )}
              </h5>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">{phone}</p>
            </div>
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-1">{time}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-medium">
            {desc}
          </p>
          {type === 'ticket' && status !== 'çözüldü' && (
            <button
              onClick={onAction}
              className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20 hover:bg-emerald-400/20 transition-all"
            >
              Çözüldü İşaretle & Bildir
            </button>
          )}

          {type === 'order' && status !== 'teslim edildi' && (
            <div className="flex gap-2 mt-3">
              {(status === 'hazırlanıyor' || status === 'pending') && (
                <button
                  onClick={() => onAction('kargoda')}
                  className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20 hover:bg-blue-400/20 transition-all"
                >
                  Kargoya Ver
                </button>
              )}
              {(status === 'hazırlanıyor' || status === 'kargoda' || status === 'pending') && (
                <button
                  onClick={() => onAction('teslim edildi')}
                  className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20 hover:bg-emerald-400/20 transition-all"
                >
                  Teslim Edildi
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default App;
