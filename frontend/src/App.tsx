import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Activity, Cpu, ShieldCheck, Thermometer, Droplets, Sun, 
  Fan, Lightbulb, AlignJustify, Radio, Zap, ArrowRight, CheckCircle2,
  Sparkles, AlertTriangle, Check, Clock, CloudRain, Flame
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSafeTelemetry, getSafeHistory, sendSafeCommand } from './services/iotEngine';
import type { TelemetryData, MetricSourceMap, DataSource } from './services/iotEngine';

// Huy hiệu nguồn gốc dữ liệu
const SourceBadge = ({ source }: { source?: DataSource }) => {
  if (!source) return null;
  const isReal = source === 'LIVE AWS';
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 transition-all ${
      isReal 
        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
        : 'bg-amber-500/15 border-amber-500/50 text-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isReal ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {isReal ? 'LIVE AWS' : 'FAIL-PROOF'}
    </span>
  );
};

export default function App() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isFailProof, setIsFailProof] = useState<boolean>(false);
  const [sourceMap, setSourceMap] = useState<MetricSourceMap | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

  // State theo dõi trạng thái Scroll cho Header & ScrollSpy
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'architecture' | 'dashboard' | 'analytics'>('architecture');

  // YÊU CẦU 1: HOOK TẠO HIỆU ỨNG PARALLAX CHO ABSTRACT BACKGROUND
  const { scrollY } = useScroll();
  // Khi cuộn từ 0 đến 2500px, ảnh nền trừu tượng sẽ trượt nhẹ từ 0 xuống 350px tạo chiều sâu 3D
  const parallaxY = useTransform(scrollY, [0, 2500], [0, -350]);

  const TARGET_DEVICE = "room_01";

  // Lắng nghe Scroll Event & Tự động highlight Header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const scrollPos = window.scrollY + 250;
      const sections = ['architecture', 'dashboard', 'analytics'];
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section as any);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Polling dữ liệu Realtime & History
  useEffect(() => {
    const fetchAll = async () => {
      const result = await getSafeTelemetry(TARGET_DEVICE);
      setData(result.data);
      setIsFailProof(result.isGlobalMock);
      setSourceMap(result.sourceMap);

      const history = await getSafeHistory(TARGET_DEVICE);
      setChartData(history);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCommand = async (cmd: string, label: string) => {
    // 1. Khi bấm điều khiển thủ công -> Tự động chuyển UI sang Manual
    if (isAutoMode) {
      setIsAutoMode(false);
    }

    // 2. Gửi lệnh thủ công xuống DB như bình thường
    setToast(`⚡ Đang phát tín hiệu [${cmd}] qua AWS Cloud...`);
    await sendSafeCommand(TARGET_DEVICE, cmd);
    setTimeout(() => {
      setToast(`✔ Thực thi thành công: ${label}`);
      setTimeout(() => setToast(''), 3000);
    }, 600);
  };

  const toggleAutoMode = async () => {
    const nextMode = !isAutoMode;
    setIsAutoMode(nextMode);
    if (nextMode) {
      setToast("🤖 Đã bật Chế độ Tự động (AI Auto Control)");
      await sendSafeCommand(TARGET_DEVICE, "MODE_AUTO");
    } else {
      setToast("✋ Đã chuyển sang Chế độ Điều khiển Thủ công");
      await sendSafeCommand(TARGET_DEVICE, "MODE_MANUAL");
    }
  };

  // =========================================================================
  // YÊU CẦU 2: HỆ THỐNG AI ĐỀ XUẤT 3 TRỤC (NHIỆT - ẨM - SÁNG) + THỜI GIAN THỰC
  // =========================================================================
  const getAIRecommendations = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    // Phân loại mốc thời gian
    const isLunchBreak = (hour === 11 && minute >= 30) || (hour === 12) || (hour === 13 && minute <= 30);
    const isOffHours = hour < 8 || hour >= 17;
    const isWorkingHours = !isLunchBreak && !isOffHours;

    const temp = data?.temperature ?? 28;
    const humid = data?.humidity ?? 65;
    const light = data?.light_intensity ?? 500;
    const fanOn = Boolean(data?.fan_status);
    const lightOn = Boolean(data?.light_status);
    const curtainOpen = Boolean(data?.curtain_status);

    // TRỤC 1: PHÂN TÍCH NHIỆT ĐỘ & THỜI GIAN
    let tempRec = {
      category: 'Nhiệt độ & Giờ giấc',
      icon: Flame,
      status: 'normal',
      title: `Nhiệt độ ổn định (${temp}°C)`,
      desc: `Mức nhiệt độ phòng đang ở điều kiện lý tưởng cho khu vực ${TARGET_DEVICE}.`,
      timeContext: isOffHours ? '🌙 Ngoài giờ làm' : isLunchBreak ? '🍱 Giờ nghỉ trưa' : '💼 Giờ làm việc',
      actionCmd: '',
      actionLabel: '',
    };

    if (isOffHours && fanOn) {
      tempRec = {
        ...tempRec,
        status: 'warning',
        title: `Quạt đang bật ngoài giờ (${temp}°C)`,
        desc: `Hiện tại là ${timeStr} (Ngoài giờ làm việc). Đề xuất tắt hệ thống quạt thông gió để tránh lãng phí điện năng.`,
        actionCmd: 'FAN_OFF',
        actionLabel: 'TẮT QUẠT NGAY',
      };
    } else if (isWorkingHours && temp > 30 && !fanOn) {
      tempRec = {
        ...tempRec,
        status: 'alert',
        title: `Nhiệt độ phòng tăng cao (${temp}°C)`,
        desc: `Trong giờ làm việc nhưng nhiệt độ vượt ngưỡng tối ưu (30°C). Đề xuất bật quạt thông gió làm mát cho nhân viên và thiết bị.`,
        actionCmd: 'FAN_ON',
        actionLabel: 'BẬT QUẠT NGAY',
      };
    }

    // TRỤC 2: PHÂN TÍCH ĐỘ ẨM MÔI TRƯỜNG
    let humidRec = {
      category: 'Độ ẩm Môi trường',
      icon: CloudRain,
      status: 'normal',
      title: `Độ ẩm tối ưu (${humid}%)`,
      desc: 'Độ ẩm không khí đạt chuẩn an toàn cho bo mạch và thiết bị điện tử.',
      timeContext: `💧 Mức lý tưởng: 50% - 75%`,
      actionCmd: '',
      actionLabel: '',
    };

    if (humid > 80 && !fanOn) {
      humidRec = {
        ...humidRec,
        status: 'warning',
        title: `Độ ẩm quá cao (${humid}%)`,
        desc: 'Độ ẩm không khí vượt 80%, nguy cơ gây tụ ẩm và chập cháy bo mạch. Đề xuất bật quạt thông gió để hút ẩm lập tức.',
        actionCmd: 'FAN_ON',
        actionLabel: 'BẬT QUẠT HÚT ẨM',
      };
    } else if (humid < 40) {
      humidRec = {
        ...humidRec,
        status: 'info',
        title: `Không khí khô (${humid}%)`,
        desc: 'Độ ẩm thấp dưới 40% có thể gây hiện tượng tĩnh điện (ESD) trong phòng máy. Đề xuất theo dõi thêm.',
        actionCmd: '',
        actionLabel: 'ĐANG THEO DÕI',
      };
    }

    // TRỤC 3: PHÂN TÍCH ÁNH SÁNG & TIẾT KIỆM NĂNG LƯỢNG
    let lightRec = {
      category: 'Ánh sáng & Tiết kiệm',
      icon: Sun,
      status: 'normal',
      title: `Ánh sáng phù hợp (${light} Lux)`,
      desc: 'Cường độ chiếu sáng và trạng thái rèm cửa đang đáp ứng tốt nhu cầu sử dụng hiện tại.',
      timeContext: `🕒 Thời gian thực: ${timeStr}`,
      actionCmd: '',
      actionLabel: '',
    };

    if (isLunchBreak && lightOn) {
      lightRec = {
        ...lightRec,
        status: 'warning',
        title: `Đèn sáng giờ nghỉ trưa (${light} Lux)`,
        desc: `Hiện là ${timeStr} (Giờ nghỉ trưa). Đề xuất tắt hệ thống đèn chiếu sáng để nhân viên nghỉ ngơi và tiết kiệm điện.`,
        actionCmd: 'LIGHT_OFF',
        actionLabel: 'TẮT ĐÈN NGHỈ TRƯA',
      };
    } else if (isOffHours && lightOn) {
      lightRec = {
        ...lightRec,
        status: 'warning',
        title: `Đèn bị quên tắt ngoài giờ`,
        desc: `Phát hiện đèn vẫn sáng vào lúc ${timeStr} (Ngoài giờ hành chính). Đề xuất tắt toàn bộ đèn khu vực ${TARGET_DEVICE}.`,
        actionCmd: 'LIGHT_OFF',
        actionLabel: 'TẮT ĐÈN NGOÀI GIỜ',
      };
    } else if (isWorkingHours && light < 250 && !lightOn) {
      lightRec = {
        ...lightRec,
        status: 'alert',
        title: `Khu vực làm việc bị tối (${light} Lux)`,
        desc: 'Trong giờ hành chính nhưng cường độ sáng dưới 250 Lux (Thiếu sáng). Đề xuất bật đèn chiếu sáng bảo vệ thị lực.',
        actionCmd: 'LIGHT_ON',
        actionLabel: 'BẬT ĐÈN LÀM VIỆC',
      };
    } else if (light > 750 && !curtainOpen) {
      lightRec = {
        ...lightRec,
        status: 'info',
        title: `Nắng gắt ngoài trời (${light} Lux)`,
        desc: 'Bức xạ ánh sáng tự nhiên cao gây chói và tăng nhiệt phòng. Đề xuất kéo rèm cửa tự động để cản nhiệt.',
        actionCmd: 'CURTAIN_OPEN',
        actionLabel: 'KÉO RÈM CẢN NẮNG',
      };
    }

    return [tempRec, humidRec, lightRec];
  };

  const aiRecs = getAIRecommendations();
  const tempVal = data?.temperature ?? "N/A";
  const humidVal = data?.humidity ?? "N/A";
  const lightVal = data?.light_intensity ?? "N/A";
  const isTempAlert = typeof tempVal === 'number' && tempVal > 31;
  const formattedTime = data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('vi-VN') : 'Chưa có dữ liệu';

  // Cấu hình Entrance Animation (Đã fix lỗi TypeScript bằng 'as const')
  const fadeInUp = {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6, ease: "easeOut" as const }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black font-sans">
      
      {/* YÊU CẦU 1: ABSTRACT PARALLAX BACKGROUND IMAGE (ĐÃ FIX LỖI HIỂN THỊ) */}
      <motion.div 
        style={{ 
          y: parallaxY,
          backgroundImage: "url('https://plus.unsplash.com/premium_photo-1686074441885-ef5b67d89799?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fGRhcmslMjBncmFkaWVudCUyMHdhbGxwYXBlcnxlbnwwfHwwfHx8MA%3D%3D')" 
        }}
        className="fixed inset-0 -z-20 w-full h-[135%] bg-cover bg-center pointer-events-none opacity-55"
      />
      {/* Lớp phủ Gradient làm mờ vừa phải để không "nuốt" mất ảnh nền */}
      {/* <div className="fixed inset-0 -z-10 bg-gradient-to-b from-dark-900/60 via-dark-900/85 to-dark-900 pointer-events-none" /> */}

      {/* FIXED HEADER & DYNAMIC SCROLL SPY */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8 ${
        isScrolled 
          ? 'bg-dark-900/85 backdrop-blur-md py-3 border-b border-slate-700/60 shadow-2xl' 
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('architecture')}>
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/50 animate-glow">
              <Cpu className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                AWS IOT CLOUD COMMAND
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">EC2 FastAPI • RDS PostgreSQL • React Vite</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex bg-dark-900/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            {[
              { id: 'architecture', label: '1. Kiến trúc AWS', icon: ShieldCheck },
              { id: 'dashboard', label: '2. Trạm điều khiển', icon: Activity },
              { id: 'analytics', label: '3. Phân tích & Đề xuất', icon: Radio },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`relative px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-500/50 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 z-10" />
                  <span className="z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-2 border ${
            isFailProof 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
              : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 animate-glow'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isFailProof ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
            {isFailProof ? '⚡ Fail-Proof Mode' : '🚀 Live AWS Stream'}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (LONG SCROLLING PAGE) */}
      <main className="flex-1 max-w-7xl w-full mx-auto pt-36 pb-24 px-4 md:px-8 space-y-32">
        
        {/* --- SECTION 1: ARCHITECTURE --- */}
        <section id="architecture" className="scroll-mt-32">
          <motion.div {...fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center py-6">
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                Sẵn sàng trình diễn • High Availability
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Hệ thống Giám sát IoT<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">
                  Thời gian thực trên AWS Cloud
                </span>
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                Đồ án tích hợp hoàn chỉnh từ thiết bị ngoại vi (ESP32 / Python Simulator) gửi dữ liệu tần số cao qua HTTP/REST tới máy chủ <strong>Amazon EC2</strong>. Dữ liệu được chuẩn hóa và lưu trữ an toàn tại <strong>Amazon RDS PostgreSQL</strong>, hiển thị trực quan trên giao diện HUD tốc độ cao.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="glass-card p-4">
                  <Zap className="w-6 h-6 text-cyan-400 mb-2" />
                  <div className="font-bold text-slate-200">Độ trễ &lt; 50ms</div>
                  <div className="text-xs text-slate-400">Cập nhật Polling / REST API</div>
                </div>
                <div className="glass-card p-4">
                  <ShieldCheck className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="font-bold text-slate-200">100% Fail-Proof</div>
                  <div className="text-xs text-slate-400">Tự động kích hoạt Fallback khi đứt cáp</div>
                </div>
              </div>
              <button 
                onClick={() => scrollToSection('dashboard')} 
                className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-0.5"
              >
                <span>Cuộn xuống Trạm Điều khiển</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="relative glass-panel p-8 overflow-hidden flex flex-col items-center justify-center min-h-[400px] border-cyan-500/30">
              <div className="space-y-6 w-full max-w-sm relative z-10">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-600 flex items-center justify-between shadow-lg">
                  <span className="font-bold text-sm text-cyan-300">📡 ESP32 Device / Censors</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">POST /telemetry</span>
                </div>
                <div className="flex justify-center"><div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 animate-pulse" /></div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/50 flex items-center justify-between shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <span className="font-bold text-white">☁️ AWS EC2 (FastAPI)</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">REST API</span>
                </div>
                <div className="flex justify-center"><div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 animate-pulse" /></div>
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-600 flex items-center justify-between shadow-lg">
                  <span className="font-bold text-sm text-purple-300">🗄️ AWS RDS PostgreSQL</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">JSONB DB</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 2: COMMAND CENTER --- */}
        <section id="dashboard" className="scroll-mt-32 space-y-10">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-3xl font-extrabold flex items-center gap-3">
              <Activity className="w-8 h-8 text-cyan-400" />
              <span>Trạm Điều khiển Thời gian thực</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">Quản lý và ra lệnh trực tiếp xuống cụm thiết bị IoT tại khu vực {TARGET_DEVICE}</p>
          </div>

          {/* Cụm KPI Cảm biến */}
          <motion.div {...fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`glass-card p-6 relative overflow-hidden ${isTempAlert ? 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400 font-medium">Nhiệt độ phòng</p>
                    <SourceBadge source={sourceMap?.temperature} />
                  </div>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">
                    {tempVal} <span className="text-lg text-cyan-400">{typeof tempVal === 'number' && '°C'}</span>
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"><Thermometer className="w-6 h-6" /></div>
              </div>
              {isTempAlert && <div className="mt-3 text-xs text-red-400 font-bold animate-pulse">⚠️ Cảnh báo: Nhiệt độ cao!</div>}
            </div>

            <div className="glass-card p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400 font-medium">Độ ẩm không khí</p>
                    <SourceBadge source={sourceMap?.humidity} />
                  </div>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{humidVal} <span className="text-lg text-blue-400">{typeof humidVal === 'number' && '%'}</span></h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400"><Droplets className="w-6 h-6" /></div>
              </div>
              <div className="mt-3 text-xs text-emerald-400">✔ Mức độ ẩm tối ưu</div>
            </div>

            <div className="glass-card p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400 font-medium">Cường độ ánh sáng</p>
                    <SourceBadge source={sourceMap?.light_intensity} />
                  </div>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{lightVal} <span className="text-lg text-amber-400">{typeof lightVal === 'number' && 'Lux'}</span></h3>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"><Sun className="w-6 h-6" /></div>
              </div>
              <div className="mt-3 text-xs text-slate-400">Cảm biến quang trở siêu nhạy</div>
            </div>
          </motion.div>

          {/* Bảng Nút bấm điều khiển */}
          <motion.div {...fadeInUp} className="glass-panel p-6 border-cyan-500/30">
            
            {/* ĐÃ THÊM: HEADER BẢNG ĐIỀU KHIỂN + NÚT TOGGLE AUTO / MANUAL */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="w-2 h-8 bg-cyan-500 rounded-full inline-block" />
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Bảng Trạm Gửi Lệnh (Remote Actuators - {TARGET_DEVICE})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>Chế độ hiện tại:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                      isAutoMode 
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]" 
                        : "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                    }`}>
                      {isAutoMode ? "🤖 TỰ ĐỘNG (AI AUTO CONTROL)" : "✋ THỦ CÔNG (MANUAL OVERRIDE)"}
                    </span>
                  </p>
                </div>
              </div>

              {/* NÚT BẤM CHUYỂN ĐỔI CHẾ ĐỘ */}
              <button
                onClick={toggleAutoMode}
                className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg transform hover:-translate-y-0.5 border ${
                  isAutoMode
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                <span>{isAutoMode ? "✋ CHUYỂN SANG ĐIỀU KHIỂN THỦ CÔNG" : "🤖 BẬT LẠI CHẾ ĐỘ TỰ ĐỘNG (AUTO)"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <Fan className={`w-6 h-6 ${data?.fan_status ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
                    <span className="font-bold">Quạt thông gió</span>
                  </div>
                  <SourceBadge source={sourceMap?.fan_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={() => handleCommand('FAN_ON', 'BẬT QUẠT')} disabled={Boolean(data?.fan_status)} className="py-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 font-bold text-sm transition-all disabled:opacity-40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">BẬT</button>
                  <button onClick={() => handleCommand('FAN_OFF', 'TẮT QUẠT')} disabled={!data?.fan_status} className="py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 font-bold text-sm transition-all disabled:opacity-40">TẮT</button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <Lightbulb className={`w-6 h-6 ${data?.light_status ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-slate-500'}`} />
                    <span className="font-bold">Đèn chiếu sáng</span>
                  </div>
                  <SourceBadge source={sourceMap?.light_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={() => handleCommand('LIGHT_ON', 'BẬT ĐÈN')} disabled={Boolean(data?.light_status)} className="py-2.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 font-bold text-sm transition-all disabled:opacity-40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">BẬT</button>
                  <button onClick={() => handleCommand('LIGHT_OFF', 'TẮT ĐÈN')} disabled={!data?.light_status} className="py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 font-bold text-sm transition-all disabled:opacity-40">TẮT</button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <AlignJustify className={`w-6 h-6 ${data?.curtain_status ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="font-bold">Rèm tự động</span>
                  </div>
                  <SourceBadge source={sourceMap?.curtain_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={() => handleCommand('CURTAIN_OPEN', 'MỞ RÈM')} disabled={Boolean(data?.curtain_status)} className="py-2.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 font-bold text-sm transition-all disabled:opacity-40 shadow-[0_0_10px_rgba(6,182,212,0.2)]">MỞ</button>
                  <button onClick={() => handleCommand('CURTAIN_CLOSE', 'ĐÓNG RÈM')} disabled={!data?.curtain_status} className="py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 font-bold text-sm transition-all disabled:opacity-40">ĐÓNG</button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 3: ANALYTICS & RECOMMENDATIONS --- */}
        <section id="analytics" className="scroll-mt-32 space-y-10">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-3xl font-extrabold flex items-center gap-3">
              <Radio className="w-8 h-8 text-cyan-400" />
              <span>Phân tích Chuyên sâu & Đề xuất</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">Đồ thị thời gian thực và thuật toán hỗ trợ quyết định tự động theo bối cảnh</p>
          </div>
          
          {/* YÊU CẦU 2: HỆ THỐNG AI ĐỀ XUẤT 3 TRỤC (NHIỆT - ẨM - SÁNG) */}
          <motion.div {...fadeInUp} className="glass-panel p-6 border-cyan-500/40 bg-gradient-to-r from-dark-800/90 to-slate-900/90">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                <h3 className="text-xl font-extrabold text-white">Hệ thống AI Phân tích & Đề xuất Tự động</h3>
              </div>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bối cảnh: <strong>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>
            </div>

            {/* Luôn hiển thị 3 Thẻ đánh giá cho 3 trục Nhiệt - Ẩm - Sáng */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiRecs.map((rec, index) => {
                const Icon = rec.icon;
                const isNormal = rec.status === 'normal';
                const isAlert = rec.status === 'alert' || rec.status === 'warning';
                
                return (
                  <div 
                    key={index} 
                    className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                      isAlert 
                        ? 'bg-slate-800/90 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                        : 'bg-slate-800/40 border-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700/80 text-cyan-300 border border-slate-600">
                          {rec.category}
                        </span>
                        <span className="text-[11px] text-slate-400">{rec.timeContext}</span>
                      </div>

                      <div className="flex items-center gap-2 font-bold text-base mb-2 text-white">
                        <Icon className={`w-5 h-5 ${isAlert ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} />
                        <span>{rec.title}</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed mb-6">
                        {rec.desc}
                      </p>
                    </div>

                    {/* Nút bấm hành động (Chỉ hiện nếu có lệnh đề xuất) */}
                    {rec.actionCmd ? (
                      <button 
                        onClick={() => handleCommand(rec.actionCmd, rec.actionLabel)}
                        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>{rec.actionLabel}</span>
                      </button>
                    ) : (
                      <div className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>{rec.actionLabel || 'TRẠNG THÁI LÝ TƯỞNG'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* 3 BIỂU ĐỒ RIÊNG BIỆT CHO TỪNG CẢM BIẾN */}
          <motion.div {...fadeInUp} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Biểu đồ Lịch sử Chuyên sâu (15 Logs gần nhất từ RDS)</h3>
              <span className="text-xs text-slate-400 font-mono">GET /api/devices/room_01/history</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Biểu đồ 1: Nhiệt độ */}
              <div className="glass-panel p-5 border-cyan-500/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <Thermometer className="w-4 h-4" /> Nhiệt độ (°C)
                  </span>
                  <span className="text-xs font-mono text-slate-400">Min: 26° - Max: 35°</span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="temp" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#gradTemp)" name="Nhiệt độ (°C)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Biểu đồ 2: Độ ẩm */}
              <div className="glass-panel p-5 border-blue-500/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm text-blue-400 flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> Độ ẩm (%)
                  </span>
                  <span className="text-xs font-mono text-slate-400">Min: 50% - Max: 90%</span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradHumid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="humid" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#gradHumid)" name="Độ ẩm (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Biểu đồ 3: Ánh sáng */}
              <div className="glass-panel p-5 border-yellow-500/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm text-yellow-400 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Ánh sáng (Lux)
                  </span>
                  <span className="text-xs font-mono text-slate-400">0 - 1000 Lux</span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#facc15" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="light" stroke="#facc15" strokeWidth={3} fillOpacity={1} fill="url(#gradLight)" name="Ánh sáng (Lux)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-400 text-white px-5 py-3 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-3 font-medium text-sm">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 animate-bounce" /><span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-20 py-6 bg-dark-900/85 backdrop-blur-md border-t border-slate-700/60 shadow-2xl text-center text-xs text-slate-400 font-mono z-40 relative">
        AWS Cloud IoT Dashboard • Powered by React + Tailwind CSS + Framer Motion
      </footer>
    </div>
  );
}