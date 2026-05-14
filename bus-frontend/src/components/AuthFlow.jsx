import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const roles = [
  {
    id: "parent",
    title: "Parent",
    subtitle: "Suivre votre enfant et recevoir des mises à jour",
    icon: "👨‍👩‍👧",
  },
  {
    id: "admin",
    title: "Administrateur",
    subtitle: "Gérer les bus, les utilisateurs et les trajets",
    icon: "🏫",
  },
  {
    id: "driver",
    title: "Chauffeur",
    subtitle: "Démarrer le suivi et gérer les élèves",
    icon: "🚌",
  },
];

function AuthFlow() {
  const [step, setStep] = useState("welcome");
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const currentRole = useMemo(
    () => roles.find((role) => role.id === selectedRole),
    [selectedRole]
  );

  const handleStart = () => {
    setStep("roles");
  };

  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId);
    setStep("login");
  };

  const handleBackToRoles = () => {
    setStep("roles");
  };

  const handleBackToWelcome = () => {
    setSelectedRole(null);
    setStep("welcome");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Login payload:", {
      role: selectedRole,
      ...form,
    });
  };

  return (
    <div style={styles.page}>
      <SoftBackground />

      <div style={styles.centerWrap}>
        <motion.div
          layout
          transition={spring}
          style={{
            ...styles.shell,
            width:
              step === "welcome"
                ? "min(92vw, 460px)"
                : step === "roles"
                  ? "min(96vw, 980px)"
                  : "min(92vw, 560px)",
            minHeight: step === "login" ? 560 : 360,
          }}
        >
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="welcome"
                layout
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.98 }}
                transition={smooth}
                style={styles.panel}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ ...smooth, delay: 0.08 }}
                  style={styles.heroIcon}
                >
                  📍
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smooth, delay: 0.12 }}
                  style={styles.kicker}
                >
                  Transport Scolaire Intelligent
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smooth, delay: 0.16 }}
                  style={styles.welcomeTitle}
                >
                  Bienvenue
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smooth, delay: 0.2 }}
                  style={styles.welcomeText}
                >
                  Une expérience fluide et sécurisée de suivi de bus scolaire
                  pour les parents, les chauffeurs et le personnel de l'école.
                </motion.p>

                <motion.button
                  whileHover={{
                    y: -2,
                    scale: 1.015,
                    boxShadow: softButtonShadow,
                  }}
                  whileTap={{ scale: 0.985 }}
                  transition={micro}
                  onClick={handleStart}
                  style={styles.primaryButton}
                  className="glow-anim"
                >
                  Commencer
                </motion.button>

                <motion.button
                  whileHover={{ opacity: 1 }}
                  transition={micro}
                  onClick={handleBackToWelcome}
                  style={styles.hiddenGhost}
                >
                  .
                </motion.button>
              </motion.div>
            )}

            {step === "roles" && (
              <motion.div
                key="roles"
                layout
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={smooth}
                style={styles.rolesStage}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={smooth}
                  style={styles.rolesHeader}
                >
                  <p style={styles.kicker}>Choisissez votre accès</p>
                  <h2 style={styles.rolesTitle}>Qui êtes-vous ?</h2>
                  <p style={styles.rolesText}>
                    Sélectionnez votre rôle pour accéder à l'interface
                    adaptée au transport scolaire.
                  </p>
                </motion.div>

                <motion.div layout style={styles.rolesGrid}>
                  {roles.map((role, index) => (
                    <motion.button
                      key={role.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ ...smooth, delay: index * 0.08 }}
                      whileHover={{
                        y: -6,
                        scale: 1.015,
                        boxShadow: strongCardShadow,
                      }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectRole(role.id)}
                      style={styles.roleCard}
                    >
                      <motion.div
                        style={styles.roleIconWrap}
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        {role.icon}
                      </motion.div>
                      <h3 style={styles.roleTitle}>{role.title}</h3>
                      <p style={styles.roleSubtitle}>{role.subtitle}</p>
                    </motion.button>
                  ))}
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  whileHover={{ opacity: 1 }}
                  whileTap={{ scale: 0.99 }}
                  transition={micro}
                  onClick={handleBackToWelcome}
                  style={styles.backLink}
                >
                  ← Retour
                </motion.button>
              </motion.div>
            )}

            {step === "login" && currentRole && (
              <motion.div
                key={`login-${currentRole.id}`}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={smooth}
                style={styles.loginStage}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...smooth, delay: 0.05 }}
                  style={styles.selectedRoleCard}
                >
                  <motion.div
                    style={styles.selectedRoleIcon}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {currentRole.icon}
                  </motion.div>
                  <div>
                    <p style={styles.selectedRoleLabel}>Rôle sélectionné</p>
                    <h2 style={styles.selectedRoleTitle}>{currentRole.title}</h2>
                    <p style={styles.selectedRoleSubtitle}>
                      {currentRole.subtitle}
                    </p>
                  </div>
                </motion.div>

                <motion.form
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smooth, delay: 0.12 }}
                  onSubmit={handleSubmit}
                  style={styles.formCard}
                >
                  <div style={styles.formHeader}>
                    <h3 style={styles.formTitle}>Bienvenue, {currentRole.title}</h3>
                    <p style={styles.formText}>
                      Connectez-vous pour accéder à votre tableau de bord.
                    </p>
                  </div>

                  <motion.div
                    style={styles.fieldGroup}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...smooth, delay: 0.18 }}
                  >
                    <label style={styles.label}>Adresse e-mail</label>
                    <motion.input
                      whileFocus={{ scale: 1.01, borderColor: "#e2bb40" }}
                      transition={micro}
                      type="email"
                      placeholder="Entrez votre adresse e-mail"
                      value={form.email}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </motion.div>

                  <motion.div
                    style={styles.fieldGroup}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...smooth, delay: 0.24 }}
                  >
                    <label style={styles.label}>Mot de passe</label>
                    <motion.input
                      whileFocus={{ scale: 1.01, borderColor: "#e2bb40" }}
                      transition={micro}
                      type="password"
                      placeholder="Entrez votre mot de passe"
                      value={form.password}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </motion.div>

                  <motion.div
                    style={styles.formActions}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...smooth, delay: 0.3 }}
                  >
                    <motion.button
                      type="button"
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.99 }}
                      transition={micro}
                      onClick={handleBackToRoles}
                      style={styles.secondaryButton}
                    >
                      Retour
                    </motion.button>

                    <motion.button
                      type="submit"
                      whileHover={{
                        y: -2,
                        scale: 1.01,
                        boxShadow: softButtonShadow,
                      }}
                      whileTap={{ scale: 0.985 }}
                      transition={micro}
                      style={styles.primaryButtonWide}
                    >
                      Se connecter
                    </motion.button>
                  </motion.div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function SoftBackground() {
  return (
    <>
      <motion.div
        style={styles.bgBlobOne}
        animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={styles.bgBlobTwo}
        animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={styles.bgBlobThree}
        animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

const spring = {
  type: "spring",
  stiffness: 170,
  damping: 20,
};

const smooth = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

const micro = {
  duration: 0.18,
  ease: "easeOut",
};

const strongCardShadow = "0 18px 45px rgba(17, 24, 39, 0.12)";
const softButtonShadow = "0 14px 30px rgba(244, 197, 66, 0.35)";

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #fffdf7 0%, #fffaf0 52%, #fffdf8 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  centerWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    zIndex: 2,
  },

  shell: {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid #f0e7cf",
    borderRadius: "34px",
    boxShadow: "0 20px 60px rgba(17, 24, 39, 0.08)",
    overflow: "hidden",
  },

  panel: {
    minHeight: 360,
    padding: "44px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 14,
  },

  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    background: "linear-gradient(135deg, #fff8d9 0%, #fde68a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
    boxShadow: "0 14px 30px rgba(250, 204, 21, 0.20)",
    marginBottom: 4,
  },

  kicker: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#c59a12",
  },

  welcomeTitle: {
    margin: 0,
    fontSize: "clamp(36px, 5vw, 52px)",
    lineHeight: 1,
    color: "#1f2937",
    fontWeight: 800,
  },

  welcomeText: {
    margin: 0,
    maxWidth: 420,
    color: "#5f6b7a",
    fontSize: 16,
    lineHeight: 1.65,
  },

  primaryButton: {
    marginTop: 10,
    border: "none",
    background: "linear-gradient(135deg, #facc15 0%, #f4c542 100%)",
    color: "#1f2937",
    fontWeight: 800,
    fontSize: 16,
    padding: "15px 28px",
    borderRadius: 999,
    cursor: "pointer",
    minWidth: 150,
  },

  primaryButtonWide: {
    border: "none",
    background: "linear-gradient(135deg, #facc15 0%, #f4c542 100%)",
    color: "#1f2937",
    fontWeight: 800,
    fontSize: 15,
    padding: "14px 22px",
    borderRadius: 16,
    cursor: "pointer",
    minWidth: 150,
  },

  secondaryButton: {
    border: "1px solid #ece7da",
    background: "#ffffff",
    color: "#374151",
    fontWeight: 700,
    fontSize: 15,
    padding: "14px 18px",
    borderRadius: 16,
    cursor: "pointer",
    minWidth: 120,
  },

  hiddenGhost: {
    opacity: 0,
    pointerEvents: "none",
    height: 1,
    width: 1,
    border: "none",
    background: "transparent",
  },

  rolesStage: {
    padding: "34px 26px 26px",
  },

  rolesHeader: {
    textAlign: "center",
    marginBottom: 26,
    paddingInline: 10,
  },

  rolesTitle: {
    margin: "8px 0 10px",
    fontSize: "clamp(30px, 4vw, 44px)",
    color: "#1f2937",
    lineHeight: 1,
  },

  rolesText: {
    margin: 0,
    color: "#6b7280",
    fontSize: 15,
    maxWidth: 560,
    marginInline: "auto",
    lineHeight: 1.6,
  },

  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },

  roleCard: {
    border: "1px solid #f1ead5",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,249,230,0.95) 100%)",
    borderRadius: 28,
    padding: "26px 20px",
    minHeight: 220,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 10px 30px rgba(17, 24, 39, 0.06)",
  },

  roleIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    background: "#fff6cc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    boxShadow: "inset 0 0 0 1px #f6e8a7",
  },

  roleTitle: {
    margin: "18px 0 8px",
    fontSize: 24,
    color: "#1f2937",
  },

  roleSubtitle: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.55,
    fontSize: 14,
  },

  backLink: {
    marginTop: 18,
    border: "none",
    background: "transparent",
    color: "#7c6a2d",
    fontWeight: 700,
    cursor: "pointer",
    padding: "8px 4px",
  },

  loginStage: {
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  selectedRoleCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background:
      "linear-gradient(135deg, rgba(255,248,217,0.95) 0%, rgba(255,255,255,0.95) 100%)",
    border: "1px solid #f2e6b8",
    borderRadius: 26,
    padding: "18px 18px",
    boxShadow: "0 10px 24px rgba(17, 24, 39, 0.05)",
  },

  selectedRoleIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    background: "#fff2b7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    flexShrink: 0,
  },

  selectedRoleLabel: {
    margin: 0,
    color: "#b38700",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  selectedRoleTitle: {
    margin: "6px 0 6px",
    color: "#1f2937",
    fontSize: 28,
    lineHeight: 1,
  },

  selectedRoleSubtitle: {
    margin: 0,
    color: "#667085",
    fontSize: 14,
    lineHeight: 1.55,
  },

  formCard: {
    background: "#ffffff",
    border: "1px solid #f1ead9",
    borderRadius: 28,
    padding: "22px",
    boxShadow: "0 12px 28px rgba(17, 24, 39, 0.05)",
  },

  formHeader: {
    marginBottom: 18,
  },

  formTitle: {
    margin: 0,
    fontSize: 24,
    color: "#1f2937",
  },

  formText: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
  },

  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },

  label: {
    color: "#374151",
    fontWeight: 700,
    fontSize: 14,
  },

  input: {
    height: 52,
    borderRadius: 16,
    border: "1px solid #e9e2ce",
    outline: "none",
    padding: "0 16px",
    fontSize: 15,
    color: "#1f2937",
    background: "#fffefb",
    boxShadow: "inset 0 1px 2px rgba(17,24,39,0.03)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  formActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
    flexWrap: "wrap",
  },

  bgBlobOne: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(250,204,21,0.18), transparent 68%)",
    top: -40,
    left: -60,
    filter: "blur(8px)",
    zIndex: 0,
  },

  bgBlobTwo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(244,197,66,0.14), transparent 70%)",
    bottom: -50,
    right: -40,
    filter: "blur(10px)",
    zIndex: 0,
  },

  bgBlobThree: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(253,230,138,0.18), transparent 72%)",
    top: "24%",
    right: "12%",
    filter: "blur(10px)",
    zIndex: 0,
  },
};

export default AuthFlow;
