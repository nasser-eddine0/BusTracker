import { motion } from "framer-motion";

const MotionArticle = motion.article;

function StatCard({ icon: Icon, title, value, delta, positive = true, helper }) {
  return (
    <MotionArticle
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="app-panel flex items-start justify-between gap-4 p-5 md:p-6"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted">{title}</p>
        <div className="flex flex-wrap items-end gap-2">
          <h3 className="text-3xl font-extrabold tracking-tight text-main md:text-[2.4rem]">
            {value}
          </h3>
          {delta && (
            <span
              className={`pb-1 text-base font-bold ${
                positive ? "text-accent" : "text-rose-500"
              }`}
            >
              {delta}
            </span>
          )}
        </div>
        {helper && <p className="text-xs text-muted">{helper}</p>}
      </div>

      <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[22px] bg-accent text-slate-950 shadow-[var(--shadow-accent)] md:h-16 md:w-16">
        <Icon className="text-[1.4rem]" />
      </div>
    </MotionArticle>
  );
}

export default StatCard;
