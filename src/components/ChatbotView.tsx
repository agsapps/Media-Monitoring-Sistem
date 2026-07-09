import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { 
  Send, ShieldCheck, User, Sparkles, AlertCircle, Database, RefreshCw, 
  Trash2, MessageSquare, HelpCircle, ArrowRight, Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const getFormattedTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// Inline formatting helper for bold text (**text**), Markdown links ([text](url)), nested combinations, and raw URLs
const renderInlineStyles = (str: string) => {
  // Regex matches:
  // 1. Bolded markdown links: **[text](url)**
  // 2. Markdown links with bold anchor: [**text**](url)
  // 3. Standard markdown links: [text](url)
  // 4. Standard bold text: **text**
  // 5. Raw HTTP/HTTPS URLs: https?://...
  const regex = /(\*\*\[[^\]]+\]\([^)]+\)\*\*|\[\*\*.*?\*\*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|https?:\/\/[^\s]+)/g;
  const parts = str.split(regex);
  
  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Bolded link: **[text](url)**
    if (part.startsWith('**[') && part.endsWith(')**') && part.includes('](')) {
      const inner = part.slice(2, -2); // [text](url)
      const closeBracketIndex = inner.indexOf('](');
      const anchorText = inner.slice(1, closeBracketIndex);
      const url = inner.slice(closeBracketIndex + 2, -1);
      return (
        <strong key={index} className="font-bold text-slate-950 dark:text-white">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-800 dark:text-blue-400 hover:underline font-bold break-all inline-flex items-center gap-0.5 cursor-pointer"
          >
            {anchorText}
          </a>
        </strong>
      );
    }

    // 2. Link containing bold text: [**text**](url)
    if (part.startsWith('[') && part.endsWith(')') && part.includes('](')) {
      const closeBracketIndex = part.indexOf('](');
      let anchorText: string | React.ReactNode = part.slice(1, closeBracketIndex);
      const url = part.slice(closeBracketIndex + 2, -1);
      
      if (typeof anchorText === 'string' && anchorText.startsWith('**') && anchorText.endsWith('**')) {
        anchorText = (
          <strong className="font-bold text-slate-950 dark:text-white">
            {anchorText.slice(2, -2)}
          </strong>
        );
      }
      
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-800 dark:text-blue-400 hover:underline font-bold break-all inline-flex items-center gap-0.5 cursor-pointer"
        >
          {anchorText}
        </a>
      );
    }

    // 3. Standard bold: **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      // Fallback in case a link is inside (though handled by case 1)
      if (inner.startsWith('[') && inner.endsWith(')') && inner.includes('](')) {
        const closeBracketIndex = inner.indexOf('](');
        const anchorText = inner.slice(1, closeBracketIndex);
        const url = inner.slice(closeBracketIndex + 2, -1);
        return (
          <strong key={index} className="font-bold text-slate-950 dark:text-white">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-800 dark:text-blue-400 hover:underline font-bold break-all inline-flex items-center gap-0.5 cursor-pointer"
            >
              {anchorText}
            </a>
          </strong>
        );
      }
      return (
        <strong key={index} className="font-bold text-slate-950 dark:text-white">
          {inner}
        </strong>
      );
    }

    // 4. Raw isolated URL: https://...
    if (part.startsWith('http://') || part.startsWith('https://')) {
      let url = part;
      let suffix = '';
      const trailingMatch = part.match(/([.,;:!?)]+)$/);
      if (trailingMatch) {
        suffix = trailingMatch[1];
        url = part.slice(0, -suffix.length);
      }
      return (
        <React.Fragment key={index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-800 dark:text-blue-400 hover:underline font-bold break-all inline-flex items-center gap-0.5 cursor-pointer"
          >
            {url}
          </a>
          {suffix}
        </React.Fragment>
      );
    }

    // 5. Plain text
    return part;
  });
};

// High-fidelity custom text renderer (handles basic markdown lists, headings, and paragraphs)
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 font-sans">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Advanced nesting/indentation detection for bullet lists (Point & Sub-point layout)
        const listMatch = line.match(/^(\s*)([*•-]\s+)(.*)$/);
        if (listMatch) {
          const indent = listMatch[1].length;
          const content = listMatch[3];
          if (indent >= 2) {
            // It's a nested sub-point
            return (
              <div key={i} className="flex items-start gap-1.5 pl-6 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="text-blue-700/80 select-none font-bold">•</span>
                <span className="leading-relaxed">{renderInlineStyles(content)}</span>
              </div>
            );
          } else {
            // It's a main bullet point
            return (
              <div key={i} className="flex items-start gap-2 pl-2 text-xs text-slate-800 dark:text-slate-200 font-bold mt-1">
                <span className="text-blue-800 dark:text-blue-400 select-none">■</span>
                <span className="leading-relaxed">{renderInlineStyles(content)}</span>
              </div>
            );
          }
        }

        // Numbered list
        if (/^\d+[\.\)]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^\d+[\.\)]\s+/, '');
          return (
            <ol key={i} className="list-decimal pl-5 text-xs text-slate-700 dark:text-slate-300">
              <li className="leading-relaxed">{renderInlineStyles(content)}</li>
            </ol>
          );
        }

        // Headings (e.g. ### or ##)
        if (trimmed.startsWith('#')) {
          const level = (trimmed.match(/^#+/) || ['#'])[0].length;
          const cleanText = trimmed.replace(/^#+\s+/, '');
          const sizeClass = level === 1 ? 'text-base font-extrabold mt-4 mb-2' : level === 2 ? 'text-sm font-extrabold mt-3 mb-1.5' : 'text-xs font-extrabold mt-2 mb-1';
          return (
            <h4 key={i} className={`${sizeClass} text-blue-900 dark:text-blue-400 font-display`}>
              {cleanText}
            </h4>
          );
        }

        // Standard Paragraph
        return (
          <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const ChatbotView: React.FC = () => {
  const { news, socialNews, user, authFetch } = useAppState();
  const currentUsername = user?.username || 'guest';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API Voice Features State
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;
  
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isSpeechSupported) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setErrorMsg(`Gagal merekam suara: ${event.error}`);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue((prev) => {
            const separator = prev ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!isSpeechSupported) {
      alert('Maaf, pengetikan suara (Speech Recognition) tidak didukung oleh browser Anda.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setErrorMsg('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speakText = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text from markdown
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~]/g, '')
      .replace(/<[^>]*>/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    
    // Kecepatan bicara lebih cepat (default 1.0, diatur ke 1.2)
    utterance.rate = 1.2;

    // Mengatur suara laki-laki jika tersedia, atau menurunkan pitch agar bersuara lebih berat/maskulin
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(v => v.lang.toLowerCase().startsWith('id'));
    
    if (idVoices.length > 0) {
      // Cari suara laki-laki Indonesia berdasarkan indikasi nama
      const maleVoice = idVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('pria') || 
        v.name.toLowerCase().includes('cowok') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('wira') ||
        v.name.toLowerCase().includes('budi')
      );
      if (maleVoice) {
        utterance.voice = maleVoice;
      } else {
        utterance.voice = idVoices[0];
      }
    }
    
    // Pitch diturunkan (default 1.0, diatur ke 0.85) untuk memberikan efek suara laki-laki yang lebih berat
    utterance.pitch = 0.85;

    utterance.onend = () => {
      setSpeakingMsgIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgIndex(null);
    };

    setSpeakingMsgIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  // Load chat history when currentUsername changes
  useEffect(() => {
    const cacheKey = `mi_chat_history_${currentUsername}`;
    const storedHistory = localStorage.getItem(cacheKey);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setErrorMsg('');
          return;
        }
      } catch (e) {
        console.error('Error parsing stored history:', e);
      }
    }
    // Set default greeting if no history
    setMessages([
      { 
        role: 'assistant', 
        content: 'Halo! Saya adalah Security Chat assistant Anda. Saya siap membantu Anda dalam memantau situasi keamanan informasi, mencari berita, menganalisis isu hangat, serta meringkas opini dari database internal secara real-time.\n\nSilakan ajukan pertanyaan Anda!',
        timestamp: getFormattedTime()
      }
    ]);
    setErrorMsg('');
  }, [currentUsername]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const cacheKey = `mi_chat_history_${currentUsername}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(messages));
      } catch (e) {
        console.warn('[Storage] Quota exceeded or error saving chat history:', e);
      }
    }
  }, [messages, currentUsername]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    setErrorMsg('');
    const userMessage: Message = { role: 'user', content: textToSend, timestamp: getFormattedTime() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const payloadMessages = [...messages, userMessage];

      const res = await authFetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: payloadMessages })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim pesan ke Chatbot.');
      }

      setMessages(prev => {
        const next = [...prev, { role: 'assistant', content: data.reply, timestamp: getFormattedTime() }];
        if (!isMuted) {
          setTimeout(() => {
            speakText(data.reply, next.length - 1);
          }, 100);
        }
        return next;
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan atau API Key belum diatur.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat percakapan?')) {
      const initialMsg: Message[] = [
        { 
          role: 'assistant', 
          content: 'Halo! Riwayat percakapan telah dibersihkan. Ajukan pertanyaan baru mengenai data media atau pantauan sosmed kita!',
          timestamp: getFormattedTime()
        }
      ];
      setMessages(initialMsg);
      setErrorMsg('');
      const cacheKey = `mi_chat_history_${currentUsername}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(initialMsg));
      } catch (e) {
        console.warn('[Storage] Quota exceeded or error resetting chat history in localStorage:', e);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px] bg-white dark:bg-[#09080d] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all" id="chatbot-view-container">
      
      {/* Top bar header */}
      <div className="px-4 py-3 border-b border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-800/15 border border-blue-700/20 flex items-center justify-center text-blue-800 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-150 tracking-wide font-display">
              Security Chat
            </h3>
            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistem Aktif
            </p>
          </div>
        </div>

        {/* Database statistics indicators */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 rounded-lg text-[9.5px] text-slate-500 dark:text-slate-400 font-bold">
            <Database className="w-3 h-3 text-blue-700" />
            <span>{news.length} Berita</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 rounded-lg text-[9.5px] text-slate-500 dark:text-slate-400 font-bold">
            <MessageSquare className="w-3 h-3 text-amber-500" />
            <span>{socialNews.length} Sosmed</span>
          </div>
          <button 
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="Bersihkan Percakapan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main message feed area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-[#06050a]/30">
        
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Profile Avatar / Indicator */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-[11px] font-bold ${
                isUser 
                  ? 'bg-blue-800 text-white border-blue-900 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
              }`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1 max-w-full">
                <div className={`p-3 rounded-2xl shadow-sm border ${
                  isUser 
                    ? 'bg-blue-800 border-blue-900 text-white rounded-tr-none shadow-blue-700/10' 
                    : 'bg-white dark:bg-[#0f0e15] border-slate-200/60 dark:border-white/5 rounded-tl-none shadow-slate-100 dark:shadow-none'
                }`}>
                  {isUser ? (
                    <p className="text-xs whitespace-pre-wrap leading-relaxed break-words font-medium">
                      {msg.content}
                    </p>
                  ) : (
                    <FormattedText text={msg.content} />
                  )}
                </div>
                
                {/* Timestamp and audio controls below the bubble */}
                <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold ${
                  isUser ? 'justify-end' : 'justify-between'
                }`}>
                  {!isUser ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => speakText(msg.content, index)}
                        className={`text-[10px] flex items-center gap-1 font-bold transition px-2 py-0.5 rounded-md cursor-pointer ${
                          speakingMsgIndex === index
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/5'
                        }`}
                        title="Dengarkan tanggapan ini"
                      >
                        {speakingMsgIndex === index ? (
                          <>
                            <Volume2 className="w-3 h-3 animate-bounce text-blue-700" />
                            <span>Membaca...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Dengarkan</span>
                          </>
                        )}
                      </button>
                      <span className="text-slate-300 dark:text-white/10 select-none">•</span>
                      <span className="text-[9.5px] opacity-80" title="Waktu Analisis Isu">Dianalisis: {msg.timestamp || getFormattedTime()}</span>
                    </div>
                  ) : (
                    <span className="text-[9.5px] opacity-80">{msg.timestamp || getFormattedTime()}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loader/Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 animate-pulse" />
            </div>
            <div className="p-3 bg-white dark:bg-[#0f0e15] border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-800 dark:bg-blue-400 animate-typing-dot" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-800 dark:bg-blue-400 animate-typing-dot" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-800 dark:bg-blue-400 animate-typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Floating/bottom error banners */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1 font-semibold leading-relaxed">
              {errorMsg}
              {errorMsg.includes('API Key') && (
                <span className="block mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Silakan masuk ke menu <strong>Konfigurasi Crawler</strong> (Settings) untuk menyetel API Key Gemini Anda.
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form area */}
      <div className="p-3 bg-white dark:bg-[#09080d] border-t border-slate-150 dark:border-white/5 flex-shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="flex gap-2 items-center"
        >
          {/* Mute/Unmute Toggle Button for TTS */}
          <button
            type="button"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                window.speechSynthesis.cancel();
                setSpeakingMsgIndex(null);
              }
            }}
            className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition shrink-0 ${
              isMuted 
                ? 'bg-slate-50 dark:bg-[#0f0e15] border-slate-200 dark:border-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300' 
                : 'bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-950/30 text-blue-800 dark:text-blue-400 hover:opacity-90'
            }`}
            title={isMuted ? "Aktifkan Suara Jawaban (TTS)" : "Matikan Suara Jawaban (TTS)"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" style={{ animationDuration: '2s' }} />}
          </button>

          {/* Voice Input (Microphone) Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition shrink-0 ${
              isListening 
                ? 'bg-red-500 border-red-600 text-white animate-pulse' 
                : 'bg-slate-50 dark:bg-[#0f0e15] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
            title={isListening ? "Sedang mendengarkan... Klik untuk berhenti" : "Mulai pengetikan suara (Voice Input)"}
          >
            {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? "Mendengarkan suara Anda..." : "Ketik pertanyaan Anda tentang Berita atau Isu Sosmed..."}
            disabled={isTyping}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-[#0f0e15] border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed placeholder-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Kirim Pesan"
          >
            {isTyping ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[9.5px] font-bold text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Jawaban hanya bersumber secara akurat dari Database Berita & Pantauan Sosmed Internal.</span>
        </div>
      </div>

    </div>
  );
};
