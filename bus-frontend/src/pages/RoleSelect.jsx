import { Link } from "react-router-dom";
import { HiChartBar, HiTruck, HiUserGroup } from "react-icons/hi";
import { useLanguage, LangSwitcher } from "../i18n";
import { motion } from "framer-motion";

function RoleSelect() {
  const { t } = useLanguage();

  const roles = [
    { id: "admin", title: t("admin"), subtitle: t("adminDesc"), icon: HiChartBar },
    { id: "driver", title: t("driver"), subtitle: t("driverDesc"), icon: HiTruck },
    { id: "parent", title: t("parent"), subtitle: t("parentDesc"), icon: HiUserGroup },
  ];

  const features = [
    [t("feature1"), t("feature1Desc")],
    [t("feature2"), t("feature2Desc")],
    [t("feature3"), t("feature3Desc")],
  ];

  return (
    <div className="min-h-screen bg-page px-4 py-6 text-main lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[36px] border border-line bg-card shadow-[var(--shadow-panel)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative overflow-hidden bg-[linear-gradient(145deg,#fffbeb_0%,#ffffff_70%,#fffaf0_100%)] p-8 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.12),transparent_26%)]" />
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-accent/12 px-4 py-2 text-sm font-semibold text-accent">{t("platformTitle")}</div>
                <LangSwitcher />
              </div>
              <h1 className="max-w-xl text-5xl font-extrabold tracking-tight text-main md:text-6xl">{t("heroTitle")}</h1>
              <p className="max-w-2xl text-base leading-8 text-muted">{t("heroDesc")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {features.map(([title, text]) => (
                <div key={title} className="rounded-[24px] border border-line bg-white p-5">
                  <h2 className="text-lg font-bold text-main">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center bg-page/60 p-6 lg:p-10">
          <div className="w-full space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">{t("selectRole")}</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-main">{t("enterSpace")}</h2>
            </div>

            <div className="grid gap-4">
              {roles.map((role, index) => {
                const Icon = role.icon;
                return (
                  <motion.div key={role.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.06 }}>
                    <Link to={`/signin?role=${role.id}`} className="group block rounded-[28px] border border-line bg-card-soft p-5 transition hover:-translate-y-1 hover:bg-card-muted">
                      <div className="flex items-start gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-accent text-xl text-slate-950 shadow-[var(--shadow-accent)]"><Icon /></div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-main">{role.title}</h3>
                          <p className="text-sm leading-7 text-muted">{role.subtitle}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelect;

