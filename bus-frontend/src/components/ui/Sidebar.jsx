import { NavLink, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi2";
import { useLanguage } from "../../i18n";

function getPathname(to) {
  return to.split("#")[0].split("?")[0];
}

function Sidebar({ items, title, subtitle }) {
  const location = useLocation();
  const { t } = useLanguage();
  const resolvedTitle = title || t("busTracker");
  const resolvedSubtitle = subtitle || t("menu");

  return (
    <aside className="relative z-30 bg-sidebar/95 lg:w-[96px] lg:shrink-0 lg:border-r lg:border-line">
      <div className="app-scrollbar group/sidebar bg-sidebar/95 px-4 py-7 backdrop-blur-xl lg:sticky lg:left-0 lg:top-0 lg:h-screen lg:w-[96px] lg:overflow-x-hidden lg:overflow-y-auto lg:transition-[width,box-shadow] lg:duration-300 lg:ease-out lg:hover:w-[300px] lg:hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-3 px-1">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
            <img src="/logo.png" alt="BusTracker logo" className="h-9 w-9 object-contain" />
          </div>
          <div className="hidden overflow-hidden transition-all duration-300 ease-out lg:block lg:w-0 lg:opacity-0 lg:group-hover/sidebar:w-[170px] lg:group-hover/sidebar:opacity-100">
            <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
              {resolvedTitle}
            </p>
            <h2 className="whitespace-nowrap text-[1.8rem] font-extrabold leading-none text-main">{resolvedSubtitle}</h2>
          </div>
        </div>

        <div className="mt-9 space-y-7">
          {items.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="hidden overflow-hidden px-4 text-xs font-bold uppercase tracking-[0.18em] text-muted transition-all duration-300 ease-out lg:block lg:h-0 lg:opacity-0 lg:group-hover/sidebar:h-4 lg:group-hover/sidebar:opacity-100">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemPathname = getPathname(item.to);
                  const isSectionActive =
                    location.pathname === itemPathname ||
                    location.pathname.startsWith(`${itemPathname}/`);

                  return (
                    <div
                      key={item.to}
                      className={`group/item rounded-[22px] transition ${
                        isSectionActive
                          ? "bg-accent-soft text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                          : "text-muted hover:bg-card-soft hover:text-main"
                      }`}
                    >
                      <NavLink
                        to={item.to}
                        className="flex items-center rounded-[22px] transition lg:min-h-[68px] lg:justify-center lg:px-0 lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-4"
                      >
                        <div
                          className={`mx-auto grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition lg:mx-0 ${
                            isSectionActive
                              ? "bg-accent text-slate-950"
                              : "bg-accent-soft text-accent group-hover/item:bg-accent-light"
                          }`}
                        >
                          <Icon className="text-[18px]" />
                        </div>
                        <div className="hidden min-w-0 overflow-hidden transition-all duration-300 ease-out lg:block lg:w-0 lg:opacity-0 lg:group-hover/sidebar:ml-4 lg:group-hover/sidebar:w-[170px] lg:group-hover/sidebar:opacity-100">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[1.02rem] font-semibold">{item.label}</p>
                              {item.helper && (
                                <p className="truncate text-xs text-muted">{item.helper}</p>
                              )}
                            </div>
                            {item.children?.length > 0 && (
                              <HiChevronDown className="shrink-0 text-sm opacity-70 transition group-hover/item:rotate-180" />
                            )}
                          </div>
                        </div>
                      </NavLink>

                      {item.children?.length > 0 && (
                        <div className="hidden overflow-hidden px-3 pb-0 transition-all duration-300 ease-out lg:block lg:max-h-0 lg:opacity-0 lg:group-hover/item:max-h-64 lg:group-hover/item:pb-3 lg:group-hover/item:opacity-100 lg:group-hover/sidebar:px-4">
                          <div className="ml-[3.4rem] space-y-1 border-l border-accent/30 pl-3">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                className={({ isActive }) =>
                                  `block rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                                    isActive && location.hash === child.to.slice(child.to.indexOf("#"))
                                      ? "bg-white text-main shadow-[var(--shadow-soft)]"
                                      : "text-muted hover:bg-white hover:text-main"
                                  }`
                                }
                              >
                                <span className="block truncate">{child.label}</span>
                                {child.helper && (
                                  <span className="block truncate text-[11px] font-medium text-muted">
                                    {child.helper}
                                  </span>
                                )}
                              </NavLink>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
