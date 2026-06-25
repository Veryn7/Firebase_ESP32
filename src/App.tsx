import React, { useState, useEffect, useRef } from "react";
import { 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  ref, 
  onValue, 
  set, 
  push, 
  serverTimestamp, 
  off 
} from "firebase/database";
import { auth, db, getActiveConfig } from "./firebase";
import { 
  SensorState, 
  RelayState, 
  ModeState, 
  DeviceState, 
  SystemLog, 
  ChartDataPoint 
} from "./types/iot";
import { 
  Thermometer, 
  Droplets, 
  Activity, 
  Wifi, 
  LogOut, 
  Menu, 
  X, 
  Settings, 
  RotateCcw, 
  Database, 
  Cpu, 
  History, 
  User as UserIcon, 
  Lock, 
  Mic, 
  MicOff,
  Power,
  Info
} from "lucide-react";

// Web Speech Recognition compatibility layer
let SpeechRecognition: any = null;
if (typeof window !== "undefined") {
  SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Layout states
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Database states
  const [dbConnected, setDbConnected] = useState(false);
  const [sensor, setSensor] = useState<SensorState>({
    temperature: "--",
    humidity: "--",
    lastUpdate: null
  });
  const [relay, setRelay] = useState<RelayState>({
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false
  });
  const [mode, setMode] = useState<ModeState>({
    name: "NORMAL",
    active: false
  });
  const [device, setDevice] = useState<DeviceState>({
    status: "OFFLINE",
    ipAddress: "--",
    lastSeen: null
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Simulation history for the SVG Chart
  const [sensorHistory, setSensorHistory] = useState<ChartDataPoint[]>([]);

  // Speech Recognition states
  const [voiceSupported] = useState<boolean>(() => {
    return typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  });
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Siap menerima perintah");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Demo dynamic simulators controls
  const [simTemp, setSimTemp] = useState<number>(27.5);
  const [simHum, setSimHum] = useState<number>(70);

  // Monitor Authentication State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // Cleanup previous database states when logging out
      if (!currentUser) {
        setSensor({ temperature: "--", humidity: "--", lastUpdate: null });
        setRelay({ relay1: false, relay2: false, relay3: false, relay4: false });
        setMode({ name: "NORMAL", active: false });
        setDevice({ status: "OFFLINE", ipAddress: "--", lastSeen: null });
        setLogs([]);
        setSensorHistory([]);
        setDbConnected(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase Realtime Database Sync listener
  useEffect(() => {
    if (authLoading || !user) return;

    // Determine target path based on user login type (Real or Demo Account)
    const basePath = user.isAnonymous ? `demo/${user.uid}` : "";
    const getPath = (node: string) => basePath ? `${basePath}/${node}` : node;

    // Track overall DB connection status
    const connectedRef = ref(db, ".info/connected");
    const connectionListener = onValue(connectedRef, (snap) => {
      setDbConnected(!!snap.val());
    });

    // Write initial default values if demo user enters first time
    if (user.isAnonymous) {
      const demoSensorRef = ref(db, getPath("sensor"));
      onValue(demoSensorRef, (snapshot) => {
        if (!snapshot.exists()) {
          // Initialize demo data
          set(ref(db, getPath("sensor")), {
            temperature: 27.5,
            humidity: 70,
            lastUpdate: serverTimestamp()
          });
          set(ref(db, getPath("relay")), {
            relay1: false,
            relay2: false,
            relay3: false,
            relay4: false
          });
          set(ref(db, getPath("mode")), {
            name: "NORMAL",
            active: false
          });
          set(ref(db, getPath("device")), {
            status: "demo",
            ipAddress: "--",
            lastSeen: serverTimestamp()
          });
          
          // Seed initial log
          const logsRef = ref(db, getPath("logs"));
          const firstLogRef = push(logsRef);
          set(firstLogRef, {
            message: "Inisialisasi mode demo berhasil",
            source: "system",
            timestamp: serverTimestamp()
          });
        }
      }, { onlyOnce: true });
    }

    // Bind sensor readings database listener
    const sensorDbRef = ref(db, getPath("sensor"));
    const sensorUnsubscribe = onValue(sensorDbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setSensor({
          temperature: typeof val.temperature === "number" ? val.temperature : "--",
          humidity: typeof val.humidity === "number" ? val.humidity : "--",
          lastUpdate: val.lastUpdate || null
        });

        // Set simulation states for matching sliders in demo
        if (user.isAnonymous && typeof val.temperature === "number") {
          setSimTemp(val.temperature);
        }
        if (user.isAnonymous && typeof val.humidity === "number") {
          setSimHum(val.humidity);
        }

        // Add telemetry historical point for live visualization (limit to 15 entries)
        if (typeof val.temperature === "number" && typeof val.humidity === "number") {
          const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setSensorHistory((prev) => {
            const lastPoints = prev.slice(-14);
            // Deduplicate same timestamp updates
            if (lastPoints.length > 0 && lastPoints[lastPoints.length - 1].time === nowStr) {
              return prev;
            }
            return [...lastPoints, {
              time: nowStr,
              temperature: val.temperature,
              humidity: val.humidity
            }];
          });
        }
      } else {
        setSensor({ temperature: "--", humidity: "--", lastUpdate: null });
      }
    });

    // Bind relays database listener
    const relayDbRef = ref(db, getPath("relay"));
    const relayUnsubscribe = onValue(relayDbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setRelay({
          relay1: !!val.relay1,
          relay2: !!val.relay2,
          relay3: !!val.relay3,
          relay4: !!val.relay4
        });
      } else {
        setRelay({ relay1: false, relay2: false, relay3: false, relay4: false });
      }
    });

    // Bind structural modes database listener
    const modeDbRef = ref(db, getPath("mode"));
    const modeUnsubscribe = onValue(modeDbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setMode({
          name: val.name || "NORMAL",
          active: !!val.active
        });
      } else {
        setMode({ name: "NORMAL", active: false });
      }
    });

    // Bind active devices connection details statistics
    const deviceDbRef = ref(db, getPath("device"));
    const deviceUnsubscribe = onValue(deviceDbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setDevice({
          status: val.status || (user.isAnonymous ? "demo" : "OFFLINE"),
          ipAddress: val.ipAddress || "--",
          lastSeen: val.lastSeen || null
        });
      } else {
        setDevice({
          status: user.isAnonymous ? "demo" : "OFFLINE",
          ipAddress: "--",
          lastSeen: null
        });
      }
    });

    // Bind real-time system/device activity logs
    const logsDbRef = ref(db, getPath("logs"));
    const logsUnsubscribe = onValue(logsDbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const sortedLogsList: SystemLog[] = [];
        Object.keys(val).forEach((key) => {
          sortedLogsList.push({
            id: key,
            ...val[key]
          });
        });
        // Sort newest first
        sortedLogsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLogs(sortedLogsList.slice(0, 30)); // Cap live storage display to 30 elements
      } else {
        setLogs([]);
      }
    });

    // Garbage collection on teardown
    return () => {
      connectionListener();
      off(sensorDbRef);
      off(relayDbRef);
      off(modeDbRef);
      off(deviceDbRef);
      off(logsDbRef);
      sensorUnsubscribe();
      relayUnsubscribe();
      modeUnsubscribe();
      deviceUnsubscribe();
      logsUnsubscribe();
    };
  }, [authLoading, user]);

  // Helper function to append log messages directly into the Database
  const createActivityLog = async (message: string, source: "web" | "voice" | "system") => {
    if (!user) return;
    const basePath = user.isAnonymous ? `demo/${user.uid}` : "";
    const logsPath = basePath ? `${basePath}/logs` : "logs";
    
    try {
      const logsRef = ref(db, logsPath);
      const newLogRef = push(logsRef);
      await set(newLogRef, {
        message,
        source,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Gagal mengirim pesan log:", err);
    }
  };

  // 1. Controller function for individual relays
  const updateRelay = async (relayId: "relay1" | "relay2" | "relay3" | "relay4", value: boolean, source: "web" | "voice" = "web") => {
    if (!user) return;
    const basePath = user.isAnonymous ? `demo/${user.uid}` : "";
    const relayPath = basePath ? `${basePath}/relay/${relayId}` : `relay/${relayId}`;
    
    try {
      await set(ref(db, relayPath), value);
      
      const friendlyName = relayId === "relay1" ? "Lampu 1" 
                           : relayId === "relay2" ? "Lampu 2" 
                           : relayId === "relay3" ? "Lampu 3" 
                           : "Lampu 4";
      
      const textAction = value ? "dinyalakan" : "dimatikan";
      await createActivityLog(`${friendlyName} ${textAction}`, source);
    } catch (err: any) {
      console.error("Gagal memperbarui relay status:", err);
      if (err.message && err.message.includes("PERMISSION_DENIED")) {
        alert("Error: PERMISSION_DENIED. Silakan periksa tab 'Pengaturan Firebase' untuk panduan memperbaiki Aturan Keamanan (Database Security Rules)!");
      }
    }
  };

  // 2. Controller function to toggle all relays at once
  const setAllRelays = async (value: boolean, source: "web" | "voice" = "web") => {
    if (!user) return;
    const basePath = user.isAnonymous ? `demo/${user.uid}` : "";
    const relayPath = basePath ? `${basePath}/relay` : `relay`;

    try {
      await set(ref(db, relayPath), {
        relay1: value,
        relay2: value,
        relay3: value,
        relay4: value
      });

      const textAction = value ? "Menyalakan semua lampu" : "Mematikan semua lampu";
      await createActivityLog(textAction, source);
    } catch (err: any) {
      console.error("Gagal melakukan penulisan massal relay:", err);
      if (err.message && err.message.includes("PERMISSION_DENIED")) {
        alert("Error: PERMISSION_DENIED. Silakan periksa tab 'Pengaturan Firebase' untuk panduan memperbaiki Aturan Keamanan (Database Security Rules)!");
      }
    }
  };

  // 3. Controller function to toggle custom lighting patterns
  const setLightMode = async (modeName: "NORMAL" | "KIRI_KANAN" | "STROBO", source: "web" | "voice" = "web") => {
    if (!user) return;
    const basePath = user.isAnonymous ? `demo/${user.uid}` : "";
    const modePath = basePath ? `${basePath}/mode` : `mode`;

    try {
      const isActive = modeName !== "NORMAL";
      await set(ref(db, modePath), {
        name: modeName,
        active: isActive
      });

      let logMessage = "";
      if (modeName === "KIRI_KANAN") {
        logMessage = "Mengaktifkan variasi lampu Kiri-Kanan";
      } else if (modeName === "STROBO") {
        logMessage = "Mengaktifkan variasi lampu Strobo";
      } else {
        logMessage = "Menghentikan variasi lampu, mode normal";
        // As requested: relay1 sampai relay4 boleh diset false when normal/stop
        // Let's reset all relays safely!
        const relayPath = basePath ? `${basePath}/relay` : `relay`;
        await set(ref(db, relayPath), {
          relay1: false,
          relay2: false,
          relay3: false,
          relay4: false
        });
      }

      await createActivityLog(logMessage, source);
    } catch (err) {
      console.error("Gagal menulis status variasi lampu:", err);
    }
  };

  // Reset demo databases records back to default parameters
  const resetDemoData = async () => {
    if (!user || !user.isAnonymous) return;
    const basePath = `demo/${user.uid}`;

    try {
      await set(ref(db, `${basePath}/sensor`), {
        temperature: 27.5,
        humidity: 70,
        lastUpdate: serverTimestamp()
      });
      await set(ref(db, `${basePath}/relay`), {
        relay1: false,
        relay2: false,
        relay3: false,
        relay4: false
      });
      await set(ref(db, `${basePath}/mode`), {
        name: "NORMAL",
        active: false
      });
      await set(ref(db, `${basePath}/device`), {
        status: "demo",
        ipAddress: "--",
        lastSeen: serverTimestamp()
      });
      // Clear logs & seed reset history log
      await set(ref(db, `${basePath}/logs`), null);
      const logsRef = ref(db, `${basePath}/logs`);
      const newLogRef = push(logsRef);
      await set(newLogRef, {
        message: "Data demo berhasil di-reset ke nilai default",
        source: "system",
        timestamp: serverTimestamp()
      });

      setSensorHistory([]);
      setSimTemp(27.5);
      setSimHum(70);
    } catch (err) {
      console.error("Gagal melakukan pemulihan data demo:", err);
    }
  };

  // Write manual simulated slider changes in demo mode
  const handleSimTempChange = (v: number) => {
    setSimTemp(v);
    if (!user || !user.isAnonymous) return;
    set(ref(db, `demo/${user.uid}/sensor/temperature`), v);
    set(ref(db, `demo/${user.uid}/sensor/lastUpdate`), serverTimestamp());
  };

  const handleSimHumChange = (v: number) => {
    setSimHum(v);
    if (!user || !user.isAnonymous) return;
    set(ref(db, `demo/${user.uid}/sensor/humidity`), v);
    set(ref(db, `demo/${user.uid}/sensor/lastUpdate`), serverTimestamp());
  };

  // Process and perform actions based on incoming Speech transcript
  const handleVoiceCommand = (command: string) => {
    const textClean = command
      .toLowerCase()
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // strip punctuation
      .replace(/\s+/g, " "); // replace multiple spaces

    setVoiceTranscript(textClean);

    // Command patterns validation (Indonesian)
    // Relay 1
    if (textClean === "nyalakan lampu satu" || textClean === "nyalakan lampu 1") {
      updateRelay("relay1", true, "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "matikan lampu satu" || textClean === "matikan lampu 1") {
      updateRelay("relay1", false, "voice");
      setVoiceStatus("Perintah berhasil");
    }
    // Relay 2
    else if (textClean === "nyalakan lampu dua" || textClean === "nyalakan lampu 2") {
      updateRelay("relay2", true, "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "matikan lampu dua" || textClean === "matikan lampu 2") {
      updateRelay("relay2", false, "voice");
      setVoiceStatus("Perintah berhasil");
    }
    // Relay 3
    else if (textClean === "nyalakan lampu tiga" || textClean === "nyalakan lampu 3") {
      updateRelay("relay3", true, "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "matikan lampu tiga" || textClean === "matikan lampu 3") {
      updateRelay("relay3", false, "voice");
      setVoiceStatus("Perintah berhasil");
    }
    // Relay 4
    else if (textClean === "nyalakan lampu empat" || textClean === "nyalakan lampu 4") {
      updateRelay("relay4", true, "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "matikan lampu empat" || textClean === "matikan lampu 4") {
      updateRelay("relay4", false, "voice");
      setVoiceStatus("Perintah berhasil");
    }
    // Bulk toggles
    else if (textClean === "nyalakan semua lampu") {
      setAllRelays(true, "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "matikan semua lampu") {
      setAllRelays(false, "voice");
      setVoiceStatus("Perintah berhasil");
    }
    // Lighting Variations Light effects
    else if (textClean === "aktifkan variasi satu" || textClean === "kiri kanan") {
      setLightMode("KIRI_KANAN", "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "aktifkan variasi dua" || textClean === "strobo") {
      setLightMode("STROBO", "voice");
      setVoiceStatus("Perintah berhasil");
    } else if (textClean === "hentikan variasi" || textClean === "mode normal" || textClean === "stop") {
      setLightMode("NORMAL", "voice");
      setVoiceStatus("Perintah berhasil");
    } else {
      setVoiceStatus("Perintah tidak dikenali");
    }
  };

  // Toggle listening mic state (never starts automatically)
  const toggleListening = () => {
    if (!voiceSupported) {
      setVoiceStatus("Browser tidak mendukung pengenalan suara");
      return;
    }

    if (voiceActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setVoiceActive(false);
      setVoiceStatus("Siap menerima perintah");
    } else {
      try {
        const SpeechRecClass = SpeechRecognition;
        const rec = new SpeechRecClass();
        rec.lang = "id-ID";
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => {
          setVoiceActive(true);
          setVoiceStatus("Sedang mendengarkan...");
          setVoiceTranscript("");
        };

        rec.onresult = (event: any) => {
          setVoiceStatus("Memproses perintah...");
          const transcript = event.results[0][0].transcript;
          handleVoiceCommand(transcript);
        };

        rec.onend = () => {
          setVoiceActive(false);
        };

        rec.onerror = (event: any) => {
          setVoiceActive(false);
          if (event.error === "not-allowed") {
            setVoiceStatus("Izin mikrofon ditolak");
          } else {
            setVoiceStatus("Gagal merekam suara: " + event.error);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        setVoiceStatus("Kesalahan mikrofon");
        setVoiceActive(false);
      }
    }
  };

  // Login event handlers
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("Harap masukkan email dan kata sandi.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-email") {
        setLoginError("Format alamat email salah.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setLoginError("Email atau sandi tidak cocok. Silakan coba kembali.");
      } else {
        setLoginError("Login gagal: " + err.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Authenticate demo account anonymously
  const handleAnonymousDemoLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");

    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setLoginError("Gagal masuk ke mode demo: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout auth controller
  const handleLogoutAction = async () => {
    try {
      await signOut(auth);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error("Gagal melakukan logout:", err);
    }
  };

  // Render Loader spinner until auth finished checking credentials
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-cyan-400 font-mono tracking-widest text-sm animate-pulse">MEMUAT SISTEM IOT...</p>
      </div>
    );
  }

  // Render Halaman Login if no active sessions are detected
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-slate-950">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
              <Cpu className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-sans text-white text-center tracking-tight">
              Firebase IoT Service
            </h1>
            <p className="text-slate-400 text-xs text-center mt-1 uppercase tracking-widest leading-relaxed">
              Real-time Control Panel
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
              <span className="font-semibold block mt-0.5">⚠️</span>
              <div>{loginError}</div>
            </div>
          )}

          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 min-h-[17px]">
                Surel / Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-sm text-white placeholder-slate-600 outline-none transition fill-none"
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 min-h-[17px]">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-sm text-white placeholder-slate-600 outline-none transition duration-150"
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-550 active:scale-[0.98] transition text-slate-900 border-none font-bold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-cyan-500/20 flex items-center justify-center min-h-[44px] cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <hr className="border-slate-800" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-slate-900 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Atau
            </span>
          </div>

          <button
            onClick={handleAnonymousDemoLogin}
            disabled={isLoggingIn}
            className="w-full bg-slate-800 hover:bg-slate-700/80 border border-slate-755 hover:text-white transition text-slate-300 font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center min-h-[44px] cursor-pointer"
          >
            Coba Akun Demo
          </button>
        </div>
      </div>
    );
  }

  // Helper formatting for Indonesian dates & times
  const formatTimestamp = (timestampVal: any) => {
    if (!timestampVal) return "--";
    const date = new Date(timestampVal);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }) + " WIB";
  };

  // Render custom premium SVG telemetry chart (React native, highly responsive, zero peer dep crash risks)
  const renderInteractiveChart = () => {
    if (sensorHistory.length === 0) {
      return (
        <div className="h-64 bg-slate-900/50 backdrop-blur rounded-xl border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs flex-col p-4">
          <History className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
          <span className="tracking-widest">MENUNGGU DATA SENSOR</span>
          <span className="text-[10px] text-slate-600 mt-1 uppercase text-center max-w-xs leading-relaxed">
            Nyalakan simulated slider kelembapan/suhu jika dalam mode demo untuk mengirim data pertama.
          </span>
        </div>
      );
    }

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = 600;
    const chartHeight = 220;
    
    const maxTemp = 60;
    const minTemp = 10;
    const maxHum = 100;
    const minHum = 0;

    // Calc helper
    const getX = (idx: number) => {
      const dataLength = sensorHistory.length;
      if (dataLength <= 1) return margin.left;
      return margin.left + (idx / (dataLength - 1)) * (chartWidth - margin.left - margin.right);
    };

    const getTempY = (val: number) => {
      const clamped = Math.max(minTemp, Math.min(maxTemp, val));
      const percentage = (clamped - minTemp) / (maxTemp - minTemp);
      return chartHeight - margin.bottom - percentage * (chartHeight - margin.top - margin.bottom);
    };

    const getHumY = (val: number) => {
      const clamped = Math.max(minHum, Math.min(maxHum, val));
      const percentage = (clamped - minHum) / (maxHum - minHum);
      return chartHeight - margin.bottom - percentage * (chartHeight - margin.top - margin.bottom);
    };

    // Construct SVG Polyline paths
    const tempPoints = sensorHistory.map((pt, i) => `${getX(i)},${getTempY(pt.temperature)}`).join(" ");
    const humPoints = sensorHistory.map((pt, i) => `${getX(i)},${getHumY(pt.humidity)}`).join(" ");

    // Grid vertical reference
    const gridCount = 5;
    const yGridLines = Array.from({ length: gridCount }, (_, i) => {
      const ratio = i / (gridCount - 1);
      const tempVal = minTemp + ratio * (maxTemp - minTemp);
      const humVal = minHum + ratio * (maxHum - minHum);
      const y = chartHeight - margin.bottom - ratio * (chartHeight - margin.top - margin.bottom);
      return { tempVal, humVal, y };
    });

    return (
      <div className="bg-slate-900/50 backdrop-blur rounded-xl border border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
              Grafik Riwayat Telemetri
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 tracking-wider">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              <span>SUHU (°C)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
              <span>KELEMBAPAN (%)</span>
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-auto overflow-visible select-none">
            {/* Grids and Y labels */}
            {yGridLines.map((grid, idx) => (
              <g key={idx} className="opacity-40">
                <line 
                  x1={margin.left} 
                  y1={grid.y} 
                  x2={chartWidth - margin.right} 
                  y2={grid.y} 
                  stroke="#334155" 
                  strokeDasharray="4 4" 
                  strokeWidth={1}
                />
                {/* Temp Y Label (Rose Color) */}
                <text 
                  x={margin.left - 8} 
                  y={grid.y + 3} 
                  textAnchor="end" 
                  fill="#f43f5e" 
                  className="font-mono text-[9px] font-bold"
                >
                  {grid.tempVal.toFixed(0)}°C
                </text>
                {/* Humidity Y Label (Cyan Color) */}
                <text 
                  x={chartWidth - margin.right + 6} 
                  y={grid.y + 3} 
                  textAnchor="start" 
                  fill="#22d3ee" 
                  className="font-mono text-[9px] font-bold"
                >
                  {grid.humVal.toFixed(0)}%
                </text>
              </g>
            ))}

            {/* Render Area Gradients */}
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area Charts path construction */}
            {sensorHistory.length > 1 && (
              <>
                {/* Temp Area */}
                <path
                  d={`M ${getX(0)},${chartHeight - margin.bottom} L ${tempPoints} L ${getX(sensorHistory.length - 1)},${chartHeight - margin.bottom} Z`}
                  fill="url(#tempGrad)"
                />
                {/* Humidity Area */}
                <path
                  d={`M ${getX(0)},${chartHeight - margin.bottom} L ${humPoints} L ${getX(sensorHistory.length - 1)},${chartHeight - margin.bottom} Z`}
                  fill="url(#humGrad)"
                />
              </>
            )}

            {/* Line Plots for Humidity */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={humPoints}
              className="drop-shadow-[0_2px_4px_rgba(6,182,212,0.3)]"
            />

            {/* Line Plots for Temperature */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={tempPoints}
              className="drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)]"
            />

            {/* Plot Circles for each reading */}
            {sensorHistory.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={getX(i)}
                  cy={getTempY(pt.temperature)}
                  r={3.5}
                  fill="#111827"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                />
                <circle
                  cx={getX(i)}
                  cy={getHumY(pt.humidity)}
                  r={3.5}
                  fill="#111827"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                />
              </g>
            ))}

            {/* X Labels (Timestamps) */}
            {sensorHistory.map((pt, i) => {
              // Show max 5 labels to keep things clean
              const interval = Math.max(1, Math.ceil(sensorHistory.length / 5));
              if (i % interval !== 0 && i !== sensorHistory.length - 1) return null;
              
              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fill="#64748b"
                  className="font-mono text-[8px] font-medium"
                >
                  {pt.time}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden relative">
      
      {/* ----------------- MOBILE SIDEBAR DRAWER OVERLAY ----------------- */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          id="mobile-backdrop"
        />
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 bg-slate-900 border-r border-slate-805 flex flex-col z-50 transition-all duration-300
          ${mobileSidebarOpen ? "translate-x-0 w-[290px]" : "-translate-x-full md:translate-x-0"}
          ${sidebarExpanded ? "md:w-64" : "md:w-16"}
        `}
      >
        {/* Header Branding Container */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-900 shadow-md shadow-cyan-500/20 flex-shrink-0">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            
            {/* Show label if expanded OR in mobile drawer */}
            {(sidebarExpanded || mobileSidebarOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate uppercase tracking-tight">
                  Firebase IoT
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest leading-none">
                  CONTROLLER
                </span>
              </div>
            )}
          </div>

          {/* Toggle sidebar button inside desktop layout */}
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="hidden md:flex text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            {sidebarExpanded ? "◀" : "▶"}
          </button>

          {/* Close drawer button inside mobile layout */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            id="close-mobile-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User context badge */}
        {(sidebarExpanded || mobileSidebarOpen) && (
          <div className="p-4 mx-3 my-4 bg-slate-950/50 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-850 flex items-center justify-center text-slate-300 flex-shrink-0 font-bold uppercase text-xs">
                {user.isAnonymous ? "D" : user.email?.slice(0, 2) || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {user.isAnonymous ? "Akun Demo" : user.email}
                </span>
                {user.isAnonymous ? (
                  <span className="text-[9px] font-bold text-amber-400 animate-pulse tracking-wider uppercase mt-0.5">
                    Mode Demo
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase mt-0.5">
                    Mode Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation lists */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {/* Dashboard Trigger */}
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer
              ${activeTab === "dashboard" 
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-850"
              }
            `}
            id="nav-dashboard"
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {(sidebarExpanded || mobileSidebarOpen) && <span>Dashboard Panel</span>}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              setActiveTab("settings");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer
              ${activeTab === "settings" 
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-850"
              }
            `}
            id="nav-settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {(sidebarExpanded || mobileSidebarOpen) && <span>Aturan Firebase</span>}
          </button>
        </nav>

        {/* Footer actions with logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogoutAction}
            className={`w-full flex items-center justify-center gap-3 bg-red-950/40 hover:bg-red-900 border border-red-900/60 transition text-red-200 font-semibold text-sm py-2.5 px-3 rounded-lg cursor-pointer
              ${(!sidebarExpanded && !mobileSidebarOpen) ? "p-1.5 justify-center" : ""}
            `}
            id="nav-logout"
            title="Selesai Sesi / Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(sidebarExpanded || mobileSidebarOpen) && <span>Logout Akun</span>}
          </button>
        </div>
      </aside>

      {/* ----------------- CORE VIEW CONTENT WRAPPER ----------------- */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300
          ${sidebarExpanded ? "md:pl-64" : "md:pl-16"}
        `}
      >
        {/* Topbar Component */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              id="open-mobile-menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight">
              {activeTab === "dashboard" ? "IoT Dashboard Control" : "Firebase Settings"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Active connection light */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                ${dbConnected 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" 
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }
              `}
              title={dbConnected ? "Terhubung ke Firebase RTDB" : "Koneksi Terputus"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? "bg-emerald-400" : "bg-rose-400"} inline-block`}></span>
              <span className="hidden sm:inline">{dbConnected ? "Connected" : "Disconnected"}</span>
            </div>

            {user.isAnonymous && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Demo
              </span>
            )}
          </div>
        </header>

        {/* Main Body View */}
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          
          {/* ----------------- DEMO ACCOUNT STATEMENT BANNER ----------------- */}
          {user.isAnonymous && (
            <div className="bg-amber-950/20 border border-amber-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fade-in" id="demo-banner">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 text-xl">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-505 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[9px]">
                      MODE DEMO
                    </span>
                    <h3 className="text-sm font-bold text-amber-200">
                      Menggunakan Sesi Demo Anonim
                    </h3>
                  </div>
                  <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
                    Anda sedang menggunakan akun demo. Perubahan data sensor, status lampu, variasi kelap-kelip, dan log tidak memengaruhi perangkat IoT fisik asli Anda.
                  </p>
                </div>
              </div>
              <button
                onClick={resetDemoData}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg active:scale-95 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-md shadow-amber-500/15"
                id="reset-demo-button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data Demo
              </button>
            </div>
          )}

          {/* Render Active View Tab */}
          {activeTab === "dashboard" ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="dashboard-view-grid">
              
              {/* PRIMARY FEED COLUMNS (SPAN 2) */}
              <div className="xl:col-span-2 space-y-6 min-w-0" id="primary-feed-col">
                
                {/* GRID FOR TELEMETRY SENSOR CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="telemetry-cards-grid">
                  
                  {/* TEMPERATURE CARD */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md group relative overflow-hidden" id="card-temp">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                        Suhu Udara
                      </span>
                      <Thermometer className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                        {typeof sensor.temperature === "number" ? sensor.temperature.toFixed(1) : "--"}
                      </span>
                      <span className="text-rose-500 font-bold text-lg">°C</span>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate mt-1">
                      Pembaluan terakhir: <span className="font-semibold">{formatTimestamp(sensor.lastUpdate)}</span>
                    </p>
                  </div>

                  {/* HUMIDITY CARD */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md group relative overflow-hidden" id="card-humidity">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                        Kelembapan
                      </span>
                      <Droplets className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                        {typeof sensor.humidity === "number" ? sensor.humidity.toFixed(1) : "--"}
                      </span>
                      <span className="text-cyan-400 font-bold text-lg">%</span>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate mt-1">
                      Pembaruan terakhir: <span className="font-semibold">{formatTimestamp(sensor.lastUpdate)}</span>
                    </p>
                  </div>

                  {/* DEVICE SYSTEM STATUS CARD */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md group relative overflow-hidden animate-none" id="card-device">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                        Status Perangkat
                      </span>
                      <Wifi className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="my-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block
                          ${(device.status?.toLowerCase() === "online" || device.status?.toLowerCase() === "demo") 
                            ? "bg-emerald-400 animate-pulse" 
                            : "bg-rose-500"
                          }
                        `}></span>
                        <span className="text-xl font-black font-mono text-white uppercase tracking-wider">
                          {device.status || "OFFLINE"}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-350">
                        IP: <span className="font-mono text-slate-100 font-semibold">{device.ipAddress || "--"}</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-500 truncate mt-1">
                      Terakhir aktif: <span className="font-semibold">{formatTimestamp(device.lastSeen)}</span>
                    </p>
                  </div>
                </div>

                {/* VISUAL CHART TELEMETRY PLOT */}
                {renderInteractiveChart()}

                {/* 4 RELAYS / LAMPS OVERRIDES AND CONTROLS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="relay-controls-panel">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400">
                        <Power className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                          Kontrol Relay &amp; Lampu Realtime
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Gunakan saklar manual untuk mengubah status output PIN perangkat
                        </p>
                      </div>
                    </div>

                    {/* Master macro controllers */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAllRelays(true, "web")}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-md transition duration-150 cursor-pointer"
                        id="btn-all-on"
                      >
                        Nyalakan Semua
                      </button>
                      <button
                        onClick={() => setAllRelays(false, "web")}
                        className="bg-slate-800 hover:bg-slate-705 border border-slate-700 hover:text-white text-slate-300 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-md transition duration-150 cursor-pointer"
                        id="btn-all-off"
                      >
                        Matikan Semua
                      </button>
                    </div>
                  </div>

                  {/* Individual Sliders Cards Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="relays-grid">
                    {/* RELAY 1 CARD */}
                    <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px]
                      ${relay.relay1 
                        ? "bg-slate-850 border-cyan-500/40 shadow-inner" 
                        : "bg-slate-950/40 border-slate-800"
                      }
                    `} id="relay1-card">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">LAMP #1</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold font-mono mt-0.5">RELAY_1</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
                          ${relay.relay1 ? "bg-cyan-500/20 text-cyan-400 animate-pulse" : "bg-slate-900 text-slate-600"}
                        `}>
                          ON
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${relay.relay1 ? "text-cyan-450" : "text-slate-500"}`}>
                          {relay.relay1 ? "Koneksi Aktif" : "Mati/Idle"}
                        </span>
                        
                        {/* Switch controller */}
                        <button
                          onClick={() => updateRelay("relay1", !relay.relay1, "web")}
                          className={`w-12 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer
                            ${relay.relay1 ? "bg-cyan-500" : "bg-slate-800"}
                          `}
                          id="btn-relay1"
                        >
                          <span className={`w-5 h-5 rounded-full bg-slate-900 block transition-transform duration-200 shadow-md
                            ${relay.relay1 ? "translate-x-6" : "translate-x-0"}
                          `}></span>
                        </button>
                      </div>
                    </div>

                    {/* RELAY 2 CARD */}
                    <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px]
                      ${relay.relay2 
                        ? "bg-slate-850 border-cyan-500/40 shadow-inner" 
                        : "bg-slate-950/40 border-slate-800"
                      }
                    `} id="relay2-card">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">LAMP #2</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold font-mono mt-0.5">RELAY_2</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
                          ${relay.relay2 ? "bg-cyan-500/20 text-cyan-400 animate-pulse" : "bg-slate-900 text-slate-600"}
                        `}>
                          ON
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${relay.relay2 ? "text-cyan-450" : "text-slate-500"}`}>
                          {relay.relay2 ? "Koneksi Aktif" : "Mati/Idle"}
                        </span>
                        
                        {/* Switch controller */}
                        <button
                          onClick={() => updateRelay("relay2", !relay.relay2, "web")}
                          className={`w-12 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer
                            ${relay.relay2 ? "bg-cyan-500" : "bg-slate-800"}
                          `}
                          id="btn-relay2"
                        >
                          <span className={`w-5 h-5 rounded-full bg-slate-900 block transition-transform duration-200 shadow-md
                            ${relay.relay2 ? "translate-x-6" : "translate-x-0"}
                          `}></span>
                        </button>
                      </div>
                    </div>

                    {/* RELAY 3 CARD */}
                    <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px]
                      ${relay.relay3 
                        ? "bg-slate-850 border-cyan-500/40 shadow-inner" 
                        : "bg-slate-950/40 border-slate-800"
                      }
                    `} id="relay3-card">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">LAMP #3</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold font-mono mt-0.5">RELAY_3</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
                          ${relay.relay3 ? "bg-cyan-500/20 text-cyan-400 animate-pulse" : "bg-slate-900 text-slate-600"}
                        `}>
                          ON
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${relay.relay3 ? "text-cyan-450" : "text-slate-500"}`}>
                          {relay.relay3 ? "Koneksi Aktif" : "Mati/Idle"}
                        </span>
                        
                        {/* Switch controller */}
                        <button
                          onClick={() => updateRelay("relay3", !relay.relay3, "web")}
                          className={`w-12 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer
                            ${relay.relay3 ? "bg-cyan-500" : "bg-slate-800"}
                          `}
                          id="btn-relay3"
                        >
                          <span className={`w-5 h-5 rounded-full bg-slate-900 block transition-transform duration-200 shadow-md
                            ${relay.relay3 ? "translate-x-6" : "translate-x-0"}
                          `}></span>
                        </button>
                      </div>
                    </div>

                    {/* RELAY 4 CARD */}
                    <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px]
                      ${relay.relay4 
                        ? "bg-slate-850 border-cyan-500/40 shadow-inner" 
                        : "bg-slate-950/40 border-slate-800"
                      }
                    `} id="relay4-card">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">LAMP #4</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold font-mono mt-0.5">RELAY_4</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
                          ${relay.relay4 ? "bg-cyan-500/20 text-cyan-400 animate-pulse" : "bg-slate-900 text-slate-600"}
                        `}>
                          ON
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${relay.relay4 ? "text-cyan-450" : "text-slate-500"}`}>
                          {relay.relay4 ? "Koneksi Aktif" : "Mati/Idle"}
                        </span>
                        
                        {/* Switch controller */}
                        <button
                          onClick={() => updateRelay("relay4", !relay.relay4, "web")}
                          className={`w-12 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer
                            ${relay.relay4 ? "bg-cyan-500" : "bg-slate-800"}
                          `}
                          id="btn-relay4"
                        >
                          <span className={`w-5 h-5 rounded-full bg-slate-900 block transition-transform duration-200 shadow-md
                            ${relay.relay4 ? "translate-x-6" : "translate-x-0"}
                          `}></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE LAMP VARIATIONS / EFFECT CONTROLLER */}
                <div className="bg-slate-905 border border-slate-800 bg-slate-900 rounded-xl p-5" id="variations-panel">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                        Variasi Kelap Kelip Lampu (Sequencer)
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Pilih mode pemrograman otomatis mikro-kontroler untuk animasi relay sequential
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setLightMode("KIRI_KANAN", "web")}
                      className={`flex-1 min-w-[130px] p-4 rounded-xl border text-left transition-all relative cursor-pointer
                        ${mode.name === "KIRI_KANAN" && mode.active
                          ? "bg-gradient-to-r from-cyan-900/30 to-indigo-900/30 border-cyan-500"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                        }
                      `}
                      id="opt-variation-kiri-kanan"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white">VARIASI 1</span>
                        <span className={`w-2 h-2 rounded-full inline-block
                          ${mode.name === "KIRI_KANAN" && mode.active ? "bg-cyan-400 animate-ping" : "bg-slate-700"}
                        `}></span>
                      </div>
                      <h4 className="text-sm font-black text-cyan-400">KIRI_KANAN</h4>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Lampu berkedip bergantian mengalir dari sisi kiri hingga kanan secara terus-menerus.
                      </p>
                    </button>

                    <button
                      onClick={() => setLightMode("STROBO", "web")}
                      className={`flex-1 min-w-[130px] p-4 rounded-xl border text-left transition-all relative cursor-pointer
                        ${mode.name === "STROBO" && mode.active
                          ? "bg-gradient-to-r from-cyan-900/30 to-rose-900/30 border-rose-500/50"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                        }
                      `}
                      id="opt-variation-strobo"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white">VARIASI 2</span>
                        <span className={`w-2 h-2 rounded-full inline-block
                          ${mode.name === "STROBO" && mode.active ? "bg-rose-455 animate-ping" : "bg-slate-700"}
                        `}></span>
                      </div>
                      <h4 className="text-sm font-black text-rose-400">STROBO FLASH</h4>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Semua lampu berkedip cepat secara serentak bagai kilatan lampu strobo darurat.
                      </p>
                    </button>

                    <button
                      onClick={() => setLightMode("NORMAL", "web")}
                      className={`flex-1 min-w-[130px] p-4 rounded-xl border text-left transition-all relative cursor-pointer
                        ${mode.name === "NORMAL" || !mode.active
                          ? "bg-slate-850 border-slate-600"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-705"
                        }
                      `}
                      id="opt-variation-normal"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white">RESET STATE</span>
                        <span className={`w-2 h-2 rounded-full inline-block
                          ${(!mode.active || mode.name === "NORMAL") ? "bg-slate-400" : "bg-slate-800"}
                        `}></span>
                      </div>
                      <h4 className="text-sm font-black text-slate-300">NORMAL / STOP</h4>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Hentikan pola otomatis, kembalikan ke kontrol manual individu. Mematikan semua lampu.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECONDARY SIDE PANEL FEED CONTROLS (SPAN 1) */}
              <div className="space-y-6" id="secondary-panel-col">
                
                {/* DYNAMIC TELEMETRY SIMULATORS FOR INSTANT CONSOLE FEEDBACK (ONLY FOR DEMO ACCOUNTS) */}
                {user.isAnonymous && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="simulators-panel">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                          Simulasi Sensor Realtime
                        </h3>
                        <p className="text-[10px] text-slate-405">
                          Sesuaikan telemetry sensor untuk melihat pergerakan grafik
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Temperature Slider Simulation */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                          <span className="text-rose-450 uppercase tracking-wider">Suhu simulasi</span>
                          <span className="font-mono text-white text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {simTemp.toFixed(1)} °C
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="55"
                          step="0.5"
                          value={simTemp}
                          onChange={(e) => handleSimTempChange(parseFloat(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg outline-none"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-1">
                          <span>10 °C</span>
                          <span>DINAMIS</span>
                          <span>55 °C</span>
                        </div>
                      </div>

                      {/* Humidity Slider Simulation */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                          <span className="text-cyan-400 uppercase tracking-wider">Kelembapan simulasi</span>
                          <span className="font-mono text-white text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {simHum.toFixed(0)} %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="1"
                          value={simHum}
                          onChange={(e) => handleSimHumChange(parseInt(e.target.value))}
                          className="w-full accent-cyan-455 cursor-pointer h-1.5 bg-slate-950 rounded-lg outline-none"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-1">
                          <span>10 %</span>
                          <span>DINAMIS</span>
                          <span>100 %</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INDONESIAN WEB SPEECH RECOGNITION PANEL */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="voice-controls-panel">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                      <Mic className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                        Perintah Suara Bahasa Indonesia
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Kontrol relay and lampu hands-free dengan ucapan suara
                      </p>
                    </div>
                  </div>

                  {/* Active sound trigger controls */}
                  <div className="flex flex-col items-center justify-center bg-slate-955 bg-slate-950/50 rounded-xl p-4 border border-slate-850">
                    
                    {/* microphone icon button, strictly user initiated */}
                    <button
                      onClick={toggleListening}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 relative cursor-pointer
                        ${voiceActive 
                          ? "bg-indigo-500 text-white ring-8 ring-indigo-500/20 shadow-lg shadow-indigo-500/50" 
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700"
                        }
                      `}
                      id="btn-trigger-mic"
                      disabled={!voiceSupported}
                      title={voiceActive ? "Hentikan Rekam Suara" : "Mulai Rekam Suara"}
                    >
                      {voiceActive ? (
                        <>
                          <Mic className="w-6 h-6 animate-pulse" />
                          <span className="absolute inset-0 rounded-full border-2 border-indigo-400/80 animate-ping"></span>
                        </>
                      ) : (
                        <MicOff className="w-6 h-6" />
                      )}
                    </button>

                    <div className="text-center mt-3 w-full">
                      <p className={`text-xs font-bold uppercase tracking-wider
                        ${voiceActive ? "text-indigo-400 font-black animate-pulse" : "text-slate-400"}
                      `} id="voice-status-text">
                        {voiceStatus}
                      </p>
                      
                      {voiceTranscript && (
                        <div className="mt-3 p-2 bg-slate-950/70 border border-slate-850 rounded-lg text-left">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-0.5">TERDETEKSI:</span>
                          <p className="text-xs font-mono text-cyan-300 italic">
                            &ldquo;{voiceTranscript}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick-reference guidelines of Indonesian words list supported */}
                  <div className="mt-4 bg-slate-950/30 p-3 rounded-lg border border-slate-850/60">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">
                      KOSA KATA PERINTAH AKTIF:
                    </span>
                    <div className="text-[10px] text-slate-400 space-y-1.5 leading-relaxed font-mono">
                      <div className="flex gap-1.5 border-b border-slate-855 pb-1">
                        <span className="text-slate-200 font-bold">&quot;nyalakan lampu [1-4]&quot;</span> 
                        <span className="text-slate-550">→ On</span>
                      </div>
                      <div className="flex gap-1.5 border-b border-slate-855 pb-1">
                        <span className="text-slate-200 font-bold">&quot;matikan lampu [1-4]&quot;</span> 
                        <span className="text-slate-550">→ Off</span>
                      </div>
                      <div className="flex gap-1.5 border-b border-slate-855 pb-1">
                        <span className="text-slate-200 font-bold">&quot;nyalakan semua lampu&quot;</span> 
                        <span className="text-slate-550">→ All On</span>
                      </div>
                      <div className="flex gap-1.5 border-b border-slate-855 pb-1">
                        <span className="text-slate-200 font-bold">&quot;matikan semua lampu&quot;</span> 
                        <span className="text-slate-550">→ All Off</span>
                      </div>
                      <div className="flex gap-1.5 border-b border-slate-855 pb-1">
                        <span className="text-slate-200 font-bold">&quot;kiri kanan&quot; / &quot;strobo&quot;</span> 
                        <span className="text-slate-550">→ Variasi</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-slate-200 font-bold">&quot;stop&quot; / &quot;mode normal&quot;</span> 
                        <span className="text-slate-550">→ Stop</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* REAL-TIME SYSTEM ACTIVITY LOGS MONITOR */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="logs-panel">
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                          Log Aktivitas Sistem
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Catatan interaksi dan update database real-time
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terminal log panel wrapper */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 h-[300px] overflow-y-auto scrollbar-thin">
                    {logs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono tracking-wider flex-col p-4 text-center">
                        <Info className="w-5 h-5 text-slate-750 mb-1.5" />
                        <span>BELUM ADA AKTIVITAS</span>
                      </div>
                    ) : (
                      <div className="space-y-2 font-mono text-[10px]">
                        {logs.map((log) => {
                          const logTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString("id-ID", { hour12: false }) : "--:--:--";
                          return (
                            <div key={log.id} className="flex gap-1.5 items-start leading-relaxed border-b border-slate-900/60 pb-1 text-slate-300">
                              <span className="text-slate-500 select-none">[{logTime}]</span>
                              <span className={`px-1 rounded uppercase tracking-wider font-extrabold flex-shrink-0 text-[8px]
                                ${log.source === "system" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25" : ""}
                                ${log.source === "voice" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25" : ""}
                                ${log.source === "web" ? "bg-orange-500/10 text-orange-400 border border-orange-500/25" : ""}
                              `}>
                                {log.source}
                              </span>
                              <span className="font-medium">{log.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // SETTINGS / INFO PAGE
            <div className="max-w-4xl mx-auto space-y-6" id="settings-view">
              
              {/* HEADER BADGE CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 flex-shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    Firebase Integrasi &amp; Konfigurasi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Informasi detail project, kredensial koneksi, dan status runtime Firebase SDK
                  </p>
                </div>
              </div>

              {/* DETAILS PROPERTIES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="settings-properties-grid">
                
                {/* Firebase Connection Details */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Informasi Kredensial Firebase
                  </h4>
                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Project ID:</span>
                      <span className="text-white font-semibold">{getActiveConfig().projectId}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Database Type:</span>
                      <span className="text-cyan-400 font-semibold font-sans">Firebase Realtime Database</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Auth Methods:</span>
                      <span className="text-white font-semibold">Email/Sandi + Anonymous</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Hosting:</span>
                      <span className="text-emerald-400 font-semibold font-sans">Firebase Hosting (Ready)</span>
                    </div>
                  </div>
                </div>

                {/* Integration Info */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Status Integrasi IoT
                  </h4>
                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Firebase SDK:</span>
                      <span className="text-green-400 font-semibold font-sans">Modular Javascript SDK (v10)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Database Sync:</span>
                      <span className="text-green-400 font-semibold font-sans">onValue Real-time Listener</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Tipe Akun:</span>
                      <span className="text-white font-bold">{user.isAnonymous ? "Demo (IsLimited)" : "Owner / Administrator"}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Status Koneksi:</span>
                      <span className={`font-semibold font-sans px-2 py-0.5 rounded text-[10px] font-bold 
                        ${dbConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}
                      `}>
                        {dbConnected ? "TERHUBUNG (OK)" : "DISCONNECTED"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURITY RULES SECTION FOR PERMISSION_DENIED RESOLUTION */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-widest">
                    Solusi Error PERMISSION_DENIED (Aturan Database)
                  </h4>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jika Anda melihat error <code className="text-rose-400 font-mono">PERMISSION_DENIED</code> pada dashboard saat mengubah relay/lampu, hal ini disebabkan karena Aturan Keamanan (Security Rules) pada Firebase Realtime Database Anda masih dalam keadaan terkunci (locked mode) secara default.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                    Langkah-langkah Memperbaiki Rules:
                  </span>
                  <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside font-medium leading-relaxed pl-1">
                    <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Firebase Console</a> lalu pilih project Anda.</li>
                    <li>Di menu sebelah kiri, klik <strong className="text-slate-200">Build</strong> &gt; <strong className="text-slate-200">Realtime Database</strong>.</li>
                    <li>Pilih tab <strong className="text-slate-200">Rules (Aturan)</strong> di bagian atas halaman.</li>
                    <li>Salin dan gantikan seluruh aturan keamanan Anda dengan kode JSON di bawah ini:</li>
                  </ol>
                </div>

                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-lg border border-slate-850 overflow-x-auto text-[10px] font-mono leading-relaxed text-cyan-300/90 max-h-64 scrollbar-thin select-all">
{`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "demo": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}`}
                  </pre>
                  
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => {
                        const copyText = `{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "demo": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}`;
                        navigator.clipboard.writeText(copyText).then(() => {
                          alert("Aturan keamanan tersalin ke clipboard!");
                        });
                      }}
                      className="bg-slate-800 hover:bg-slate-705 hover:text-white transition text-slate-305 text-[10px] px-2.5 py-1 rounded border border-slate-700 font-mono font-bold cursor-pointer"
                    >
                      Salin Kode Rules
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  *Setelah mengganti aturan di atas, jangan lupa mengklik tombol <strong>Publish (Publikasikan)</strong> pada Firebase Console Anda agar perubahan segera aktif.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
