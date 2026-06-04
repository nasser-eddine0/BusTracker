import { useState, useRef, useEffect, useMemo } from "react";
import { FiMessageSquare, FiX, FiSend, FiRefreshCw, FiCpu, FiShield } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { sendChatMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";

const starterPrompts = [
  "Résume les actions prioritaires pour aujourd'hui.",
  "Explique comment suivre le trajet d'un élève.",
  "Rédige un message pour rassurer un parent.",
];

export default function FloatingChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour. Je suis votre assistant BusTracker. Comment puis-je vous aider aujourd'hui ?",
    },
  ]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .slice(-8),
    [messages],
  );

  const submitMessage = async (content) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const data = await sendChatMessage({
        message: trimmed,
        messages: conversationHistory,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || "Je n'ai pas reçu de réponse exploitable.",
        },
      ]);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || "Le service xAI est indisponible.";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Désolé, une erreur est survenue lors de la communication avec le serveur.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitMessage(draft);
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Bonjour. Je suis votre assistant BusTracker. Comment puis-je vous aider aujourd'hui ?",
      },
    ]);
    setDraft("");
  };

  if (!user) return null; // Only show floating widget for authenticated users!

  return (
    <>
      {/* Floating Sparkle/Chat Circle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-[linear-gradient(135deg,#ffd15c_0%,#f4c542_100%)] text-slate-950 shadow-[0_8px_30px_rgba(244,197,66,0.45)] hover:shadow-[0_12px_40px_rgba(244,197,66,0.6)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-[#e0b233]"
        aria-label="Ouvrir l'assistant AI"
      >
        {isOpen ? (
          <FiX className="text-2xl" />
        ) : (
          <div className="relative">
            <FiMessageSquare className="text-2xl" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border border-white"></span>
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Drawer/Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-white rounded-[32px] shadow-[0_24px_70px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col z-[9998] overflow-hidden"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-[linear-gradient(180deg,#10234f_0%,#18377d_100%)] p-5 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,191,31,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(77,155,255,0.2),transparent_40%)]" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <FiMessageSquare className="text-lg text-[#ffd15c]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-none">Assistant BusTracker</h3>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      xAI Grok active
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                    title="Réinitialiser"
                  >
                    <FiRefreshCw className="text-xs" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                  >
                    <FiX className="text-sm" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-3.5">
              {messages.map((message, index) => {
                const assistant = message.role === "assistant";
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${assistant ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                        assistant
                          ? "border border-slate-100 bg-white text-slate-700"
                          : "bg-[linear-gradient(135deg,#ffd15c_0%,#f4c542_100%)] text-slate-950 font-medium"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-[20px] border border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-400 shadow-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starters Panel */}
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitMessage(prompt)}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-[#f4c542]/50 hover:bg-amber-50/50 hover:text-slate-900"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={loading}
                className="flex-1 h-10 px-4 text-xs bg-slate-50 border border-slate-200 rounded-full outline-none focus:border-[#f4c542] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !draft.trim()}
                className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#ffd15c_0%,#f4c542_100%)] text-slate-950 flex items-center justify-center shadow-md active:scale-95 disabled:opacity-60 transition-transform"
              >
                <FiSend className="text-sm" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
