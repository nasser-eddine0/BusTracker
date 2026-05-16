import { motion } from "framer-motion";
import { HiExclamationCircle } from "react-icons/hi";

const MotionDiv = motion.div;

export default function AbsenceConfirmModal({ t, studentName, savingAbsence, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={savingAbsence ? undefined : onCancel} />
      <MotionDiv
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-[28px] border border-line bg-white p-6 shadow-[var(--shadow-panel)]"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
          <HiExclamationCircle className="text-3xl" />
        </div>
        <h2 className="mt-4 text-center text-xl font-extrabold text-main">{t("declareAbsent")}</h2>
        <p className="mt-2 text-center text-sm text-muted">
          {t("confirmAbsence")}
        </p>
        {studentName ? (
          <p className="mt-3 text-center text-sm font-bold text-main">{studentName}</p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={savingAbsence}
            className="h-12 rounded-[16px] border border-line bg-white text-sm font-extrabold text-main transition hover:bg-card-soft disabled:opacity-60"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={savingAbsence}
            className="h-12 rounded-[16px] bg-rose-500 text-sm font-extrabold text-white transition hover:bg-rose-600 disabled:opacity-60"
          >
            {savingAbsence ? t("loading") : t("confirm")}
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}
