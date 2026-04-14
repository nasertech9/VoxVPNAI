import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Zap, 
  Search, 
  Settings, 
  User, 
  Crown, 
  Clock, 
  ArrowDown, 
  ArrowUp, 
  Activity,
  X,
  Check,
  Menu,
  Moon,
  Sun,
  Power,
  Plus,
  MessageSquare,
  Send,
  Bot,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { SERVERS, PRICING_TIERS } from './constants';
import { Server, ConnectionStats, ConnectionStatus, Toast, View, Message } from './types';

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Utilities ---
const generateRandomIP = () => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Components ---

const InputField = ({ label, placeholder, type = "text", required = false, value, onChange }: { label: string, placeholder: string, type?: string, required?: boolean, value?: string, onChange?: (e: ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{label} {required && <span className="text-neon-blue">*</span>}</label>
    <input 
      type={type} 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all placeholder:text-white/20"
    />
  </div>
);

const ViewHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="flex items-center gap-6 mb-10">
    <button onClick={onBack} className="group p-3 rounded-2xl glass hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
      <ArrowUp className="w-5 h-5 -rotate-90 group-hover:text-neon-blue transition-colors" />
    </button>
    <div>
      <h2 className="text-4xl font-black tracking-tighter uppercase italic">{title}</h2>
      <div className="h-1 w-12 bg-neon-blue mt-1 rounded-full" />
    </div>
  </div>
);

const ToastNotification = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          className={`px-4 py-3 rounded-xl glass flex items-center gap-3 min-w-[240px] shadow-2xl ${
            toast.type === 'success' ? 'border-neon-green/30' : 
            toast.type === 'error' ? 'border-red-500/30' : 'border-neon-blue/30'
          }`}
        >
          {toast.type === 'success' && <Check className="w-5 h-5 text-neon-green" />}
          {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-red-500" />}
          {toast.type === 'info' && <Zap className="w-5 h-5 text-neon-blue" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-auto opacity-50 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export default function App() {
  // --- State ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedServer, setSelectedServer] = useState<Server>(() => {
    const saved = localStorage.getItem('last_server');
    return saved ? JSON.parse(saved) : SERVERS[0];
  });
  const [servers, setServers] = useState<Server[]>(SERVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [killSwitch, setKillSwitch] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeProtocol, setActiveProtocol] = useState('WireGuard');
  const [advancedFeatures, setAdvancedFeatures] = useState({
    autoConnect: false,
    splitTunneling: false,
    doubleVpn: false,
    adBlocker: true
  });
  const [stats, setStats] = useState<ConnectionStats>({
    download: 14,
    upload: 12,
    ping: 339.56,
    duration: 13,
    ip: '23.95.74.157'
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [usageData, setUsageData] = useState<{ time: string; value: number }[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Greetings, operative. I am VoxAI, your secure network assistant. How can I assist your connection today?',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setStats(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      statsRef.current = setInterval(() => {
        setStats(prev => ({
          ...prev,
          download: Math.floor(Math.random() * 40) + 10,
          upload: Math.floor(Math.random() * 30) + 5,
          ping: selectedServer.ping + Math.floor(Math.random() * 10) - 5
        }));
        
        setUsageData(prev => {
          const newData = [...prev, { time: new Date().toLocaleTimeString(), value: Math.floor(Math.random() * 50) + 10 }];
          return newData.slice(-10);
        });
      }, 2000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
      setStats(prev => ({ ...prev, download: 0, upload: 0, duration: 0 }));
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
    };
  }, [status, selectedServer]);

  useEffect(() => {
    localStorage.setItem('last_server', JSON.stringify(selectedServer));
  }, [selectedServer]);

  // --- Handlers ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleConnect = () => {
    if (status === 'disconnected') {
      if (selectedServer.isPremium && !isPremium) {
        addToast('This server requires Premium access!', 'error');
        setShowPremiumModal(true);
        return;
      }
      setStatus('connecting');
      addToast(`Connecting to ${selectedServer.name}...`, 'info');
      
      setTimeout(() => {
        setStatus('connected');
        setStats(prev => ({ ...prev, ip: selectedServer.ip }));
        addToast(`Successfully connected to ${selectedServer.name}`, 'success');
      }, 1500);
    } else {
      setStatus('disconnected');
      addToast('VPN Disconnected', 'info');
    }
  };

  const handleServerSelect = (server: Server) => {
    if (server.isPremium && !isPremium) {
      addToast('Premium server selected. Upgrade to connect!', 'info');
      setShowPremiumModal(true);
    }
    setSelectedServer(server);
    if (status === 'connected') {
      setStatus('connecting');
      setTimeout(() => {
        setStatus('connected');
        setStats(prev => ({ ...prev, ip: server.ip }));
        addToast(`Switched to ${server.name}`, 'success');
      }, 1000);
    }
  };

  const handleBuyPremium = () => {
    setShowPremiumModal(false);
    setCurrentView('checkout');
  };

  const handleCheckoutComplete = () => {
    setIsPremium(true);
    setCurrentView('dashboard');
    addToast('Premium Unlocked! All servers are now accessible.', 'success');
  };

  const handleAuth = () => {
    setUser({ email: 'user@voxvpn.ai' });
    setCurrentView('dashboard');
    addToast(`Successfully ${authMode === 'signin' ? 'signed in' : 'signed up'}!`, 'success');
  };

  const handleAddServer = () => {
    const newServer: Server = {
      id: `custom-${Date.now()}`,
      name: 'Custom Server',
      country: 'Unknown',
      flag: '🌐',
      ip: generateRandomIP(),
      ping: Math.floor(Math.random() * 100) + 10,
      isPremium: false
    };
    setServers(prev => [...prev, newServer]);
    setCurrentView('dashboard');
    addToast('New server added successfully', 'success');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: chatInput,
        config: {
          systemInstruction: "You are VoxAI, a futuristic VPN assistant for VoxVPNAI (Protocol v2.0.26). You are helpful, technical, and speak in a slightly cybernetic/futuristic tone. You can help with VPN settings, security advice, and general tech questions. Keep responses concise and professional. If asked about programming, you are an expert in all languages of 2026."
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I apologize, operative. My connection to the neural net was momentarily interrupted.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      addToast("AI Neural link failed. Check connection.", "error");
    } finally {
      setIsTyping(false);
    }
  };

  const addTurkeyServer = () => {
    const turkey = SERVERS.find(s => s.name === 'Turkey');
    if (turkey) {
      const newServer = { ...turkey, id: `turkey-${Date.now()}` };
      setServers(prev => {
        if (prev.some(s => s.name === 'Turkey' && s.country === 'Turkey')) return prev;
        return [...prev, newServer];
      });
      handleServerSelect(turkey);
      addToast('Turkey server selected and optimized', 'success');
    }
  };

  const filteredServers = useMemo(() => {
    return servers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.country.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [servers, searchQuery]);

  return (
    <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${isDarkMode ? 'dark' : 'bg-gray-50 text-gray-900'}`}>
      {/* --- Background Effects --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="scanline" />
      </div>

      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between glass-dark">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <div className="w-10 h-10 bg-neon-blue rounded-xl flex items-center justify-center neon-glow-blue">
            <Shield className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter neon-text-blue">VoxVPNAI</h1>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border-neon-blue/20">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Protocol:</span>
              <span className="text-xs font-bold uppercase text-neon-blue">{activeProtocol}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border-neon-blue/20">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Status:</span>
              <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'connected' ? 'bg-neon-green' : status === 'connecting' ? 'bg-yellow-400' : 'bg-red-500'}`} />
              <span className="text-xs font-bold uppercase">{status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setCurrentView('chat')} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${currentView === 'chat' ? 'text-neon-blue' : ''}`}>
              <MessageSquare className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentView('settings')} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${currentView === 'settings' ? 'text-neon-blue' : ''}`}>
              <Settings className="w-5 h-5" />
            </button>
            <div 
              onClick={() => user ? setCurrentView('profile') : setCurrentView('auth')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple p-[1px] cursor-pointer hover:scale-110 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {user ? <div className="text-xs font-bold text-neon-blue">JD</div> : <User className="w-6 h-6 text-white/50" />}
              </div>
            </div>
          </div>
        </div>

        <button className="md:hidden p-2">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* --- Main Content --- */}
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Stats & Connection */}
              <div className="lg:col-span-8 space-y-8">
                {/* Hero Connection Card */}
                <section className="relative overflow-hidden rounded-3xl glass p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[100px] transition-colors duration-1000 ${status === 'connected' ? 'bg-neon-green/20' : 'bg-neon-blue/10'}`} />
                  <motion.div 
                    initial={false}
                    animate={{ scale: status === 'connecting' ? [1, 1.1, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="relative z-10"
                  >
                    <button 
                      onClick={handleConnect}
                      className={`group relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
                        status === 'connected' 
                          ? 'bg-neon-green/10 border-4 border-neon-green shadow-[0_0_50px_rgba(57,255,20,0.3)]' 
                          : 'bg-white/5 border-4 border-white/10 hover:border-neon-blue/50'
                      }`}
                    >
                      <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${status === 'connected' ? 'opacity-100' : 'opacity-0'} bg-gradient-to-tr from-neon-green/20 to-transparent`} />
                      <Power className={`w-20 h-20 transition-all duration-500 ${status === 'connected' ? 'text-neon-green scale-110' : 'text-white/20 group-hover:text-neon-blue'}`} />
                    </button>
                  </motion.div>

                  <div className="mt-8 space-y-2 relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                        Protocol: <span className="text-neon-blue">{activeProtocol}</span>
                      </span>
                      {advancedFeatures.adBlocker && (
                        <span className="px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-[10px] font-black uppercase tracking-widest text-neon-green">
                          Ad-Block Active
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {status === 'connected' ? 'Protected Now' : status === 'connecting' ? 'Securing Connection...' : 'Disconnected'}
                    </h2>
                    <p className="text-white/60 font-mono text-lg">
                      IP Address: <span className={status === 'connected' ? 'text-neon-green' : 'text-white/40'}>{stats.ip}</span>
                    </p>
                    {status === 'connected' && (
                      <div className="flex items-center justify-center gap-2 text-neon-green font-mono mt-4">
                        <Clock className="w-4 h-4" />
                        <span className="text-xl font-bold">{formatDuration(stats.duration)}</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-4">
                    <div className="glass-dark rounded-2xl p-4 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-neon-blue mb-1">
                        <ArrowDown className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Download</span>
                      </div>
                      <span className="text-xl font-bold font-mono">{stats.download}<span className="text-xs opacity-50 ml-1">M/s</span></span>
                    </div>
                    <div className="glass-dark rounded-2xl p-4 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-neon-purple mb-1">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
                      </div>
                      <span className="text-xl font-bold font-mono">{stats.upload}<span className="text-xs opacity-50 ml-1">M/s</span></span>
                    </div>
                    <div className="glass-dark rounded-2xl p-4 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ping</span>
                      </div>
                      <span className="text-xl font-bold font-mono">{stats.ping}<span className="text-xs opacity-50 ml-1">Ms</span></span>
                    </div>
                  </div>
                </section>

                {/* Usage Graph */}
                <section className="glass rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold">Network Activity</h3>
                      <p className="text-sm text-white/40">Real-time usage statistics</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-neon-blue" />
                      <span className="text-xs font-medium opacity-60">Speed</span>
                    </div>
                  </div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={usageData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                          itemStyle={{ color: '#00f2ff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#00f2ff" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Featured Turkey Server */}
                  <div className="glass rounded-2xl p-6 flex items-center justify-between border-neon-blue/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                        <span className="text-2xl">🇹🇷</span>
                      </div>
                      <div>
                        <h4 className="font-bold">Turkey Server</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Optimized for 2026</p>
                      </div>
                    </div>
                    <button 
                      onClick={addTurkeyServer}
                      className="flex items-center gap-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-xs font-bold rounded-lg hover:bg-neon-blue/20 transition-all"
                    >
                      INTER <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="glass rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <ShieldAlert className="text-red-500 w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Kill Switch</h4>
                        <p className="text-xs text-white/40">Block data if VPN drops</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setKillSwitch(!killSwitch);
                        addToast(`Kill Switch ${!killSwitch ? 'Enabled' : 'Disabled'}`, 'info');
                      }}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${killSwitch ? 'bg-red-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${killSwitch ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="glass rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                        <Crown className="text-neon-purple w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Premium Access</h4>
                        <p className="text-xs text-white/40">{isPremium ? 'Active Subscription' : 'Upgrade for more'}</p>
                      </div>
                    </div>
                    {!isPremium && (
                      <button 
                        onClick={() => setShowPremiumModal(true)}
                        className="px-4 py-2 bg-neon-purple text-white text-xs font-bold rounded-lg hover:neon-glow-purple transition-all"
                      >
                        UPGRADE
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Server List */}
              <div className="lg:col-span-4 space-y-6">
                <section className="glass rounded-3xl p-6 flex flex-col h-full max-h-[800px]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Server List</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentView('add-server')} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-neon-blue">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      type="text" 
                      placeholder="Search location..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
                    {filteredServers.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => handleServerSelect(server)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${
                          selectedServer.id === server.id 
                            ? 'bg-neon-blue/10 border-neon-blue/50' 
                            : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{server.flag}</span>
                          <div className="text-left">
                            <h4 className="font-bold text-sm">{server.name}</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{server.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {server.isPremium && !isPremium && <Crown className="w-4 h-4 text-neon-purple" />}
                          <div className="text-right">
                            <p className={`text-xs font-bold ${server.ping < 30 ? 'text-neon-green' : server.ping < 70 ? 'text-yellow-400' : 'text-red-500'}`}>
                              {server.ping}ms
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <button 
                      onClick={() => {
                        if (isPremium) {
                          addToast('You already have Premium access!', 'info');
                        } else {
                          setCurrentView('checkout');
                        }
                      }}
                      className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl font-bold text-sm tracking-widest hover:scale-[1.02] transition-transform"
                    >
                      {isPremium ? 'PREMIUM ACTIVE' : 'GET ALL SERVER ACCESS'}
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {currentView === 'checkout' && (
            <motion.div 
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <ViewHeader title="Secure Checkout" onBack={() => setCurrentView('dashboard')} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass rounded-3xl p-8 space-y-8 border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <InputField label="Card Number" placeholder="0000 0000 0000 0000" required />
                      </div>
                      <InputField label="Expiration" placeholder="MM/YY" required />
                      <InputField label="CVV" placeholder="123" required />
                      <InputField label="First Name" placeholder="John" required />
                      <InputField label="Last Name" placeholder="Doe" required />
                      <InputField label="Country" placeholder="United States" />
                      <InputField label="City" placeholder="New York" required />
                      <div className="md:col-span-2">
                        <InputField label="Billing Address Line 1" placeholder="123 Main St" required />
                      </div>
                      <div className="md:col-span-2">
                        <InputField label="Billing Address Line 2" placeholder="Apt 4B" />
                      </div>
                    </div>
                    <button 
                      onClick={handleCheckoutComplete}
                      className="w-full py-5 bg-neon-green text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:neon-glow-green transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      COMPLETE PURCHASE - $79.99
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="glass rounded-3xl p-6 border-neon-purple/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-neon-purple" />
                      Order Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="opacity-50">Plan</span>
                        <span className="font-bold">Yearly Premium</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-50">Duration</span>
                        <span className="font-bold">12 Months</span>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="flex justify-between text-xl font-black italic">
                        <span>TOTAL</span>
                        <span className="text-neon-green">$79.99</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-3xl p-6 border-neon-blue/20">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="w-6 h-6 text-neon-blue" />
                      <h4 className="font-bold text-sm">Military-Grade Security</h4>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Your payment is secured with 256-bit SSL encryption. We never store your full card details on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <ViewHeader title="System Settings" onBack={() => setCurrentView('dashboard')} />
              <div className="space-y-6">
                <div className="glass rounded-3xl p-8 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neon-blue mb-6">Connection Protocol</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['WireGuard', 'OpenVPN', 'IKEv2', 'Stealth'].map((protocol) => (
                      <button 
                        key={protocol}
                        onClick={() => {
                          setActiveProtocol(protocol);
                          addToast(`Protocol switched to ${protocol}`, 'success');
                        }}
                        className={`py-4 rounded-2xl border font-bold text-sm transition-all ${
                          protocol === activeProtocol 
                            ? 'bg-neon-blue/10 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,242,255,0.2)]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {protocol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-3xl p-8 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neon-blue mb-2">Advanced Features</h3>
                  {[
                    { id: 'autoConnect', label: 'Auto-Connect', desc: 'Establish connection on system boot', icon: Zap },
                    { id: 'splitTunneling', label: 'Split Tunneling', desc: 'Route specific apps outside VPN', icon: Activity },
                    { id: 'doubleVpn', label: 'Double VPN', desc: 'Multi-hop through two locations', icon: Globe },
                    { id: 'adBlocker', label: 'Ad-Blocker', desc: 'Block trackers and malicious ads', icon: ShieldCheck },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon-blue/10 transition-colors">
                          <item.icon className={`w-5 h-5 transition-all ${advancedFeatures[item.id as keyof typeof advancedFeatures] ? 'text-neon-blue opacity-100' : 'opacity-50'}`} />
                        </div>
                        <div>
                          <h4 className="font-bold">{item.label}</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">{item.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newValue = !advancedFeatures[item.id as keyof typeof advancedFeatures];
                          setAdvancedFeatures(prev => ({ ...prev, [item.id]: newValue }));
                          addToast(`${item.label} ${newValue ? 'Enabled' : 'Disabled'}`, 'info');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${advancedFeatures[item.id as keyof typeof advancedFeatures] ? 'bg-neon-blue' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300 ${advancedFeatures[item.id as keyof typeof advancedFeatures] ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <ViewHeader title="User Profile" onBack={() => setCurrentView('dashboard')} />
              <div className="space-y-6">
                <div className="glass rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue" />
                  
                  <div className="relative mb-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple p-1 animate-spin-slow">
                      <div className="w-full h-full rounded-full bg-black" />
                    </div>
                    <div className="absolute inset-1 rounded-full overflow-hidden bg-black flex items-center justify-center">
                      <User className="w-16 h-16 text-white/20" />
                    </div>
                    {isPremium && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-neon-purple rounded-full flex items-center justify-center border-4 border-black shadow-lg">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-3xl font-black tracking-tighter italic uppercase mb-1">John Doe</h3>
                  <p className="text-neon-blue font-mono text-sm mb-10">{user?.email}</p>
                  
                  <div className="w-full grid grid-cols-3 gap-4 mb-10">
                    <div className="glass-dark p-6 rounded-3xl border-white/5">
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2">Status</p>
                      <p className={`text-lg font-black italic uppercase ${isPremium ? 'text-neon-purple' : 'text-white/60'}`}>{isPremium ? 'Premium' : 'Free'}</p>
                    </div>
                    <div className="glass-dark p-6 rounded-3xl border-white/5">
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2">Data Used</p>
                      <p className="text-lg font-black italic uppercase text-neon-blue">1.2 TB</p>
                    </div>
                    <div className="glass-dark p-6 rounded-3xl border-white/5">
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2">Devices</p>
                      <p className="text-lg font-black italic uppercase text-white">3 / 5</p>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm tracking-widest transition-all">
                      EDIT ACCOUNT DETAILS
                    </button>
                    <button 
                      onClick={() => {
                        setUser(null);
                        setCurrentView('auth');
                        addToast('Signed out successfully', 'info');
                      }}
                      className="w-full py-4 border border-red-500/30 text-red-500 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/10 transition-all"
                    >
                      TERMINATE SESSION
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto pt-10"
            >
              <div className="text-center mb-12">
                <motion.div 
                  initial={{ rotate: -10, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="w-20 h-20 bg-neon-blue rounded-[2rem] flex items-center justify-center mx-auto mb-8 neon-glow-blue rotate-3"
                >
                  <Shield className="text-black w-12 h-12" />
                </motion.div>
                <h2 className="text-4xl font-black tracking-tighter italic uppercase mb-3">
                  {authMode === 'signin' ? 'System Login' : 'Initialize Account'}
                </h2>
                <p className="text-white/40 text-sm uppercase tracking-widest">VoxVPNAI Protocol v2.0.26</p>
              </div>

              <div className="glass rounded-[2.5rem] p-10 space-y-8 border-white/5 shadow-2xl">
                <div className="space-y-6">
                  {authMode === 'signup' && <InputField label="Full Name" placeholder="John Doe" required />}
                  <InputField label="Email Address" placeholder="name@example.com" type="email" required />
                  <InputField label="Access Key" placeholder="••••••••" type="password" required />
                </div>
                
                <button 
                  onClick={handleAuth}
                  className="w-full py-5 bg-neon-blue text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:neon-glow-blue transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {authMode === 'signin' ? 'AUTHORIZE' : 'INITIALIZE'}
                </button>

                <div className="text-center">
                  <button 
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="text-xs font-bold text-white/30 hover:text-neon-blue transition-colors uppercase tracking-widest"
                  >
                    {authMode === 'signin' ? "New operative? Create ID" : "Existing operative? Login"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'add-server' && (
            <motion.div 
              key="add-server"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <ViewHeader title="Provision Server" onBack={() => setCurrentView('dashboard')} />
              <div className="glass rounded-[2.5rem] p-10 space-y-8 border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <InputField label="Node Name" placeholder="e.g. Tokyo-Alpha-01" required />
                  </div>
                  <InputField label="Geographic Region" placeholder="e.g. Japan" required />
                  <InputField label="IP Address" placeholder="0.0.0.0" required />
                  <InputField label="Port Configuration" placeholder="443" required />
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 block">Security Level</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['Standard', 'High', 'Ultra'].map((level) => (
                        <button key={level} className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${level === 'Standard' ? 'bg-neon-blue/10 border-neon-blue text-neon-blue' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="pt-6">
                  <button 
                    onClick={handleAddServer}
                    className="w-full py-5 bg-neon-blue text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:neon-glow-blue transition-all"
                  >
                    PROVISION NODE
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col"
            >
              <ViewHeader title="VoxAI Neural Link" onBack={() => setCurrentView('dashboard')} />
              
              <div className="flex-1 glass rounded-[2.5rem] p-6 mb-6 overflow-hidden flex flex-col border-white/5">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar scroll-smooth">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-neon-blue/10 border border-neon-blue/20 text-white ml-12' 
                          : 'glass-dark border border-white/10 text-white/80 mr-12'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.role === 'assistant' ? <Bot className="w-3 h-3 text-neon-blue" /> : <User className="w-3 h-3 text-white/40" />}
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            {msg.role === 'assistant' ? 'VoxAI' : 'Operative'}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="glass-dark border border-white/10 p-4 rounded-2xl flex gap-1">
                        <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Initialize query..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-sm focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all placeholder:text-white/20"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isTyping}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-neon-blue text-black rounded-xl hover:neon-glow-blue transition-all disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Premium Modal --- */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPremiumModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-4xl glass rounded-[40px] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-12">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-xs font-bold uppercase tracking-widest mb-4">
                    <Crown className="w-4 h-4" />
                    Premium Experience
                  </div>
                  <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
                  <p className="text-white/60 max-w-md mx-auto">Unlock 100+ global locations, ultra-fast speeds, and military-grade encryption.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRICING_TIERS.map((tier) => (
                    <div 
                      key={tier.id}
                      className={`relative p-8 rounded-3xl border transition-all duration-500 flex flex-col ${
                        tier.popular 
                          ? 'bg-neon-purple/10 border-neon-purple shadow-[0_0_30px_rgba(188,19,254,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-purple rounded-full text-[10px] font-bold uppercase tracking-widest">
                          Most Popular
                        </div>
                      )}
                      <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                      <p className="text-xs text-white/40 mb-6">{tier.description}</p>
                      <div className="mb-8">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-sm text-white/40">{tier.period}</span>
                      </div>
                      <ul className="space-y-4 mb-8 flex-1">
                        {['Unlimited Bandwidth', '100+ Locations', '5 Devices', '24/7 Support'].map((feat, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                            <Check className="w-4 h-4 text-neon-green" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={handleBuyPremium}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                          tier.popular ? 'bg-neon-purple hover:neon-glow-purple' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        SELECT PLAN
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Toasts --- */}
      <ToastNotification toasts={toasts} removeToast={removeToast} />

      {/* --- Footer --- */}
      <footer className="px-6 py-8 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-5 h-5" />
            <span className="font-bold tracking-tighter">VoxVPNAI</span>
          </div>
          <p className="text-xs text-white/30">© 2026 VoxVPNAI. All rights reserved. Simulated VPN Environment.</p>
          <div className="flex items-center gap-6 text-xs text-white/40 font-medium">
            <a href="#" className="hover:text-neon-blue transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-neon-blue transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-neon-blue transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* --- Floating Chat Trigger --- */}
      <motion.button
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setCurrentView('chat')}
        className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-neon-blue text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:shadow-[0_0_50px_rgba(0,242,255,0.6)] transition-all group"
      >
        <Sparkles className="w-8 h-8 group-hover:animate-pulse" />
      </motion.button>
    </div>
  );
}
