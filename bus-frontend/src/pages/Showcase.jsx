import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  HiBell,
  HiChartBar,
  HiChevronRight,
  HiCreditCard,
  HiDocumentText,
  HiHome,
  HiLocationMarker,
  HiShieldCheck,
  HiTruck,
  HiUser,
  HiUsers,
} from "react-icons/hi";
import {
  HiBolt,
  HiClock,
  HiCog6Tooth,
  HiPhone,
  HiWallet,
  HiXCircle,
} from "react-icons/hi2";
import { FiCheckCircle, FiSearch, FiSkipForward } from "react-icons/fi";

const page = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function ShowcaseShell({ title, subtitle, sidebar, topbar, children }) {
  return (
    <div className="showcase-shell">
      <div className="showcase-glow" />
      <div className="showcase-layout">
        <aside className="showcase-sidebar">
          <div className="showcase-brand">
            <div className="showcase-brand-icon">
              <HiTruck />
            </div>
            <div>
              <p>BusTracker</p>
              <h1>Dashboard</h1>
            </div>
          </div>

          <div className="showcase-sidebar-body">{sidebar}</div>
        </aside>

        <main className="showcase-main">
          <div className="showcase-topbar-wrap">{topbar}</div>
          <div className="showcase-page-head">
            <p>Pages / {title}</p>
            <h2>{subtitle}</h2>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function ShowcaseSidebarSection({ title, children }) {
  return (
    <div className="showcase-sidebar-section">
      <p>{title}</p>
      {children}
    </div>
  );
}

function ShowcaseSidebarItem({ icon: Icon, label, active }) {
  const DisplayIcon = Icon;

  return (
    <button className={active ? "showcase-sidebar-item active" : "showcase-sidebar-item"}>
      <span className="showcase-sidebar-item-icon">
        <DisplayIcon />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ShowcaseTopbar() {
  return (
    <div className="showcase-topbar">
      <div />
      <div className="showcase-topbar-actions">
        <label className="showcase-search">
          <FiSearch />
          <input placeholder="Type here..." />
        </label>

        <div className="showcase-user-actions">
          <div className="showcase-user-link">
            <HiUser />
            <span>Sign In</span>
          </div>
          <button aria-label="Settings">
            <HiCog6Tooth />
          </button>
          <button aria-label="Notifications">
            <HiBell />
          </button>
        </div>
      </div>
    </div>
  );
}

function ShowcaseStatCard({ icon: Icon, title, value, delta, positive = true }) {
  const DisplayIcon = Icon;

  return (
    <Motion.article variants={page} className="showcase-stat-card">
      <div>
        <p>{title}</p>
        <div className="showcase-stat-row">
          <h3>{value}</h3>
          <span className={positive ? "positive" : "negative"}>{delta}</span>
        </div>
      </div>
      <div className="showcase-stat-icon">
        <DisplayIcon />
      </div>
    </Motion.article>
  );
}

function ShowcaseFeatureCard({ title, description, children, large = false, image = false }) {
  return (
    <Motion.article
      variants={page}
      className={`showcase-panel showcase-feature-card ${large ? "large" : ""} ${image ? "image" : ""}`}
    >
      <div className="showcase-feature-copy">
        <p>{title}</p>
        <h3>{description}</h3>
      </div>
      {children}
    </Motion.article>
  );
}

function MiniMetric({ label, value, accent = "" }) {
  return (
    <div className={`showcase-mini-metric ${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function ChartMock({ bars = false }) {
  if (bars) {
    return (
      <div className="showcase-chart showcase-chart-bars">
        {[58, 42, 20, 52, 88, 60, 46, 22, 72].map((height) => (
          <span key={height} style={{ height: `${height}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="showcase-chart showcase-chart-lines">
      <svg viewBox="0 0 800 320" preserveAspectRatio="none">
        <path
          d="M0,260 C80,260 90,250 130,180 C175,100 250,280 340,140 C420,20 470,260 560,170 C650,90 700,300 800,80"
          fill="none"
          stroke="#71d9cd"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M0,270 C80,240 130,310 200,250 C280,180 330,120 430,180 C530,240 580,100 680,180 C730,220 760,250 800,140"
          fill="none"
          stroke="#41506f"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function MapCard() {
  return (
    <div className="showcase-map-card">
      <div className="showcase-map-pin live" />
      <div className="showcase-map-badge">Bus 04 · 42 km/h</div>
      <div className="showcase-map-pin alert" />
      <div className="showcase-map-footer">Live fleet view</div>
    </div>
  );
}

function AdminPreview() {
  return (
    <ShowcaseShell
      title="Dashboard"
      subtitle="Dashboard"
      sidebar={
        <>
          <ShowcaseSidebarSection title="Main">
            <ShowcaseSidebarItem icon={HiHome} label="Dashboard" active />
            <ShowcaseSidebarItem icon={HiChartBar} label="Tables" />
            <ShowcaseSidebarItem icon={HiCreditCard} label="Billing" />
            <ShowcaseSidebarItem icon={HiTruck} label="Assignments" />
          </ShowcaseSidebarSection>

          <ShowcaseSidebarSection title="Account Pages">
            <ShowcaseSidebarItem icon={HiUser} label="Profile" />
            <ShowcaseSidebarItem icon={HiUsers} label="Sign In" />
            <ShowcaseSidebarItem icon={HiTruck} label="Fleet" />
          </ShowcaseSidebarSection>

          <div className="showcase-help-card">
            <div className="showcase-help-icon">
              <HiShieldCheck />
            </div>
            <h3>Need help?</h3>
            <p>Design system block for your BusTracker admin app.</p>
            <button>Documentation</button>
          </div>
        </>
      }
      topbar={<ShowcaseTopbar />}
    >
      <Motion.div initial="hidden" animate="show" variants={stagger} className="showcase-stack">
        <div className="showcase-grid showcase-grid-stats">
          <ShowcaseStatCard icon={HiWallet} title="Today's Trips" value="53" delta="+12%" />
          <ShowcaseStatCard icon={HiUsers} title="Active Parents" value="2300" delta="+5%" />
          <ShowcaseStatCard
            icon={HiDocumentText}
            title="Absence Requests"
            value="302"
            delta="-14%"
            positive={false}
          />
          <ShowcaseStatCard icon={HiTruck} title="Fleet Online" value="18" delta="+8%" />
        </div>

        <div className="showcase-grid showcase-grid-hero">
          <ShowcaseFeatureCard
            title="Built for school transport operations"
            description="From live bus telemetry and attendance actions to parent alerts and fleet visibility, this dashboard gives your admin a clean and modern control center."
            large
          >
            <div className="showcase-hero-card-layout">
              <button className="showcase-link-button">
                Read more <HiChevronRight />
              </button>
              <div className="showcase-accent-block">chakra</div>
            </div>
          </ShowcaseFeatureCard>

          <ShowcaseFeatureCard
            title="Route workspace"
            description="Clean visibility of buses, parents, and pickup flow. Everything important stays readable and calm."
            image
          >
            <button className="showcase-link-button">
              Read more <HiChevronRight />
            </button>
          </ShowcaseFeatureCard>
        </div>

        <div className="showcase-grid showcase-grid-charts">
          <Motion.article variants={page} className="showcase-panel">
            <ChartMock bars />
            <div className="showcase-chart-copy">
              <h3>Active Users</h3>
              <p>
                <span>+23%</span> than last week
              </p>
            </div>
            <div className="showcase-mini-grid">
              <MiniMetric label="Users" value="1.2k" />
              <MiniMetric label="Clicks" value="8.4k" accent="sky" />
              <MiniMetric label="Sales" value="542" accent="amber" />
              <MiniMetric label="Items" value="18" accent="mint" />
            </div>
          </Motion.article>

          <Motion.article variants={page} className="showcase-panel">
            <div className="showcase-chart-head">
              <div>
                <h3>Transport Overview</h3>
                <p>
                  <span>5% more</span> this week
                </p>
              </div>
              <div className="showcase-settings-chip">
                <HiCog6Tooth />
              </div>
            </div>
            <ChartMock />
          </Motion.article>
        </div>
      </Motion.div>
    </ShowcaseShell>
  );
}

function DriverPreview() {
  return (
    <div className="showcase-mobile-page">
      <Motion.div initial="hidden" animate="show" variants={stagger} className="showcase-stack showcase-width">
        <Motion.section variants={page} className="showcase-panel showcase-driver-banner">
          <div>
            <p>Active Drive Mode</p>
            <h1>Morning Route · Bus 04</h1>
            <span>
              Clean single-focus interface for the driver. Only the current student, quick
              status actions, and route essentials stay visible.
            </span>
          </div>
          <div className="showcase-driver-banner-actions">
            <div className="showcase-status-chip success">GPS tracking active</div>
            <button>End Trip</button>
          </div>
        </Motion.section>

        <div className="showcase-grid showcase-grid-driver">
          <Motion.section variants={page} className="showcase-panel showcase-driver-main">
            <div className="showcase-status-chip danger">No absence declared for this stop</div>
            <p>Next student</p>
            <h2>Youssef El Amrani</h2>

            <div className="showcase-mini-grid two">
              <MiniMetric label="Pickup point" value="Rue Atlas, Bloc C" />
              <MiniMetric label="ETA" value="2 min" />
            </div>

            <div className="showcase-action-grid">
              <button className="showcase-action-card success">
                <FiCheckCircle />
                <span>Mounted</span>
              </button>
              <button className="showcase-action-card danger">
                <HiXCircle />
                <span>Absent</span>
              </button>
              <button className="showcase-action-card warning">
                <FiSkipForward />
                <span>Skip</span>
              </button>
            </div>
          </Motion.section>

          <div className="showcase-stack">
            <Motion.section variants={page} className="showcase-panel">
              <div className="showcase-small-head">
                <h3>Route Snapshot</h3>
                <HiLocationMarker />
              </div>
              <MapCard />
            </Motion.section>

            <div className="showcase-grid showcase-grid-double">
              <Motion.section variants={page} className="showcase-panel showcase-count-card">
                <p>Students on board</p>
                <h3>12/30</h3>
              </Motion.section>
              <Motion.section variants={page} className="showcase-panel showcase-count-card">
                <p>Current speed</p>
                <h3>42</h3>
                <span>km/h</span>
              </Motion.section>
            </div>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}

function ParentPreview() {
  return (
    <div className="showcase-mobile-page">
      <Motion.div initial="hidden" animate="show" variants={stagger} className="showcase-stack showcase-width">
        <Motion.section variants={page} className="showcase-panel showcase-parent-hero">
          <div className="showcase-parent-layout">
            <div>
              <div className="showcase-status-chip warning">Bus is on the way</div>
              <h1>Follow your child&apos;s bus with calm and clarity.</h1>
              <p>
                One clear card for status, one private map for the assigned bus, and one action
                center for urgent parent decisions.
              </p>

              <div className="showcase-mini-grid three">
                <MiniMetric label="Student" value="Salma Benali" />
                <MiniMetric label="ETA" value="5 minutes" />
                <MiniMetric label="Distance" value="1.1 km" />
              </div>
            </div>

            <div className="showcase-parent-state">
              <div className="showcase-small-head">
                <div>
                  <p>Today&apos;s state</p>
                  <h3>Bus is on the way</h3>
                </div>
                <HiClock />
              </div>

              <div className="showcase-stack">
                <button className="showcase-parent-action danger">
                  <HiXCircle />
                  Not Coming Today
                </button>
                <button className="showcase-parent-action soft">
                  <HiPhone />
                  Emergency Contact
                </button>
              </div>
            </div>
          </div>
        </Motion.section>

        <div className="showcase-grid showcase-grid-parent">
          <Motion.section variants={page} className="showcase-panel">
            <div className="showcase-small-head">
              <div>
                <h3>Private Live Map</h3>
                <p>Only the assigned bus appears here for safety.</p>
              </div>
              <HiShieldCheck />
            </div>
            <MapCard />
          </Motion.section>

          <Motion.section variants={page} className="showcase-panel">
            <h3>Smart Notifications</h3>
            <div className="showcase-stack showcase-notification-list">
              {[
                [HiClock, "Get ready, the bus is 5 minutes away.", "Scheduled proximity alert"],
                [HiLocationMarker, "The bus is outside. Please open the door.", "Arrival trigger"],
                [FiCheckCircle, "Your child boarded safely at 07:30.", "Safety confirmation"],
                [HiBolt, "Route delayed by traffic near the main avenue.", "Live traffic event"],
              ].map(([NotificationIcon, title, helper]) => {
                const DisplayIcon = NotificationIcon;

                return (
                  <div key={title} className="showcase-notification-card">
                    <div className="showcase-notification-icon">
                      <DisplayIcon />
                    </div>
                    <div>
                      <strong>{title}</strong>
                      <p>{helper}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Motion.section>
        </div>
      </Motion.div>
    </div>
  );
}

export default function Showcase() {
  const [tab, setTab] = useState("admin");
  const tabs = useMemo(
    () => [
      ["admin", "Admin"],
      ["driver", "Driver"],
      ["parent", "Parent"],
    ],
    []
  );

  return (
    <div className="showcase-page">
      <div className="showcase-tab-switcher">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? "active" : ""}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "admin" && <AdminPreview />}
      {tab === "driver" && <DriverPreview />}
      {tab === "parent" && <ParentPreview />}
    </div>
  );
}
