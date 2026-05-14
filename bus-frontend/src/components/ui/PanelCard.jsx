import { motion } from "framer-motion";

const MotionSection = motion.section;

function PanelCard({ children, className = "", ...props }) {
  return (
    <MotionSection
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={`app-panel p-5 md:p-6 ${className}`}
      {...props}
    >
      {children}
    </MotionSection>
  );
}

export default PanelCard;
