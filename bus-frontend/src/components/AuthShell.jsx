import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideLeft = {
  initial: { opacity: 0, x: -30 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideRight = {
  initial: { opacity: 0, x: 30 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
};

function AuthShell({ badge, title, description, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-background-shape auth-shape-one"></div>
      <div className="auth-background-shape auth-shape-two"></div>

      <motion.section
        className="auth-shell"
        initial="initial"
        animate="animate"
      >
        <motion.aside className="auth-brand-panel" variants={slideLeft}>
          <motion.div className="auth-brand-top" variants={fadeUp}>
            <div className="auth-logo">
              <span className="auth-logo-bus">BUS</span>
            </div>

            <div>
              <p className="auth-product-name">School Bus Tracker</p>
              <h1>Safe school transport for every family.</h1>
            </div>
          </motion.div>

          <motion.p className="auth-brand-copy" variants={fadeUp}>
            A calm and reliable platform for parents, drivers, and school
            teams to manage student transport with confidence.
          </motion.p>

          <motion.div
            className="auth-feature-list"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            <motion.div className="auth-feature-card" variants={fadeUp}>
              <strong>Live route visibility</strong>
              <p>Track buses, routes, and arrival progress in one place.</p>
            </motion.div>

            <motion.div className="auth-feature-card" variants={fadeUp}>
              <strong>Trusted role access</strong>
              <p>Separate experiences for parents, drivers, and admins.</p>
            </motion.div>

            <motion.div className="auth-feature-card" variants={fadeUp}>
              <strong>Ready for real backend</strong>
              <p>Easy to connect later to Firebase Authentication or Laravel.</p>
            </motion.div>
          </motion.div>

          <motion.div className="auth-preview-links" variants={fadeUp}>
            <Link to="/admin">Admin demo</Link>
            <Link to="/driver">Driver demo</Link>
            <Link to="/parent">Parent demo</Link>
          </motion.div>
        </motion.aside>

        <motion.main className="auth-card" variants={slideRight}>
          <motion.div className="auth-card-head" variants={fadeUp}>
            <span className="auth-badge">{badge}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </motion.div>

          {children}

          {footer && <motion.div className="auth-card-footer" variants={fadeUp}>{footer}</motion.div>}
        </motion.main>
      </motion.section>
    </div>
  );
}

export default AuthShell;
