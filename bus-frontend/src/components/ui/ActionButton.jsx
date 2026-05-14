import { motion } from "framer-motion";

const MotionButton = motion.button;

const variants = {
  primary:
    "bg-accent text-slate-950 shadow-[var(--shadow-accent)] hover:bg-accent-strong",
  secondary:
    "bg-white text-main border border-line hover:bg-accent-soft",
  soft: "bg-card-soft text-main border border-line hover:bg-card-muted",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
};

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-6 text-base",
};

function ActionButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}) {
  return (
    <MotionButton
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </MotionButton>
  );
}

export default ActionButton;
