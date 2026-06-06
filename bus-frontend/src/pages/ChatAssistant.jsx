import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowUp, FiCpu, FiMessageSquare, FiRefreshCw, FiShield } from "react-icons/fi";
import { sendChatMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";

const starterPrompts = [
  "Résume les actions prioritaires pour aujourd'hui.",
  "Explique comment suivre le trajet d'un élève.",
  "Rédige un message simple pour rassurer un parent.",
];

function ChatAssistant({ embedded = false }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour. Je peux vous aider sur BusTracker, les trajets scolaires, la communication parentale et les opérations du jour.",
    },
  ]);
  const formRef = useRef(null);

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
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
    setError("");

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
      const message = requestError?.response?.data?.message || "Le service xAI est indisponible pour le moment.";
      setError(message);
      toast.error(message);
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
        content:
          "Bonjour. Je peux vous aider sur BusTracker, les trajets scolaires, la communication parentale et les opérations du jour.",
      },
    ]);
    setDraft("");
    setError("");
  };

  return (
    <div
      className={`${
        embedded
          ? "w-full"
          : "min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#eef4ff_52%,#e7f0ff_100%)] px-4 py-6 sm:px-6 lg:px-8"
      }`}
    >
      <div className={`${embedded ? "flex w-full flex-col gap-6" : "mx-auto flex w-full max-w-6xl flex-col gap-6"}`}>
        <section className="app-panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1.7fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(180deg,#10234f_0%,#18377d_100%)] px-6 py-8 text-white sm:px-8 lg:px-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,191,31,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(77,155,255,0.25),transparent_36%)]" />
              <div className="relative z-10 space-y-6">
                <span className="app-pill border-white/15 bg-white/10 text-white">
                  Assistant xAI sécurisé
                </span>
                <div className="space-y-3">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Chat BusTracker
                  </h1>
                  <p className="max-w-md text-sm leading-7 text-slate-200 sm:text-base">
                    Posez vos questions opérationnelles sans exposer la clé API dans le navigateur. Les requêtes passent uniquement par Laravel.
                  </p>
                </div>
                <div className="space-y-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3">
                    <FiShield className="text-accent" />
                    <span>Clé xAI stockée côté serveur uniquement</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiCpu className="text-accent" />
                    <span>Modèle configuré via `config/services.php`</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiMessageSquare className="text-accent" />
                    <span>Historique court conservé pour la conversation</span>
                  </div>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    Connecté en tant que
                  </p>
                  <p className="mt-2 text-lg font-bold">{user?.name || "Utilisateur"}</p>
                  <p className="text-sm text-slate-200">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-[640px] flex-col bg-white">
              <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">
                    Laravel proxy
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-main">Conversation protégée</h2>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-main"
                >
                  <FiRefreshCw />
                  <span>Réinitialiser</span>
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_100%)] px-5 py-5 sm:px-6">
                {messages.map((message, index) => {
                  const assistant = message.role === "assistant";

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${assistant ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[26px] px-4 py-3 text-sm leading-7 shadow-sm sm:px-5 ${
                          assistant
                            ? "border border-line bg-white text-slate-700"
                            : "bg-[linear-gradient(135deg,#ffd15c_0%,#f4c542_100%)] text-slate-950"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-[26px] border border-line bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
                      Réponse en cours...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                  </div>
                )}
              </div>

              <div className="border-t border-line bg-white px-5 py-5 sm:px-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitMessage(prompt)}
                      className="rounded-full border border-line bg-card-soft px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-accent/50 hover:bg-card-muted hover:text-main"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
                  <label className="sr-only" htmlFor="chat-message">
                    Message
                  </label>
                  <div className="rounded-[28px] border border-line bg-white p-2 shadow-[var(--shadow-soft)]">
                    <div className="flex items-end gap-3">
                      <textarea
                        id="chat-message"
                        rows={3}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Écrivez votre message ici..."
                        className="min-h-[88px] flex-1 resize-none rounded-[22px] border-0 bg-transparent px-4 py-3 text-sm text-main outline-none placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={loading || !draft.trim()}
                        className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffd15c_0%,#f4c542_100%)] text-slate-950 shadow-[var(--shadow-accent)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Envoyer"
                      >
                        <FiArrowUp className="text-lg" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    La requête part vers Laravel, puis vers xAI. Aucune clé API n&apos;est embarquée côté React.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChatAssistant;
