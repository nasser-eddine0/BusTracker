import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiCheckCircle, HiCreditCard, HiLightningBolt, HiSparkles } from "react-icons/hi";
import { useSearchParams } from "react-router-dom";
import { fetchBillingStatus, openBillingPortal, subscribeBillingPlan } from "../../../api/admin";
import PanelCard from "../../../components/ui/PanelCard";

const planIcons = {
  starter: HiLightningBolt,
  pro: HiSparkles,
  enterprise: HiCreditCard,
};

const planAccents = {
  starter: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pro: "border-amber-200 bg-amber-50 text-amber-700",
  enterprise: "border-slate-200 bg-slate-100 text-slate-700",
};

function SchoolAdminBilling() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const response = await fetchBillingStatus();
      setBilling(response.school);
      setPlans(response.plans || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load billing status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription checkout complete. Your plan will update after Stripe confirms the webhook.");
      setSearchParams({}, { replace: true });
      void loadBilling();
    }

    if (searchParams.get("canceled") === "true") {
      toast.error("Checkout canceled. No subscription changes were made.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const usagePercent = useMemo(() => {
    if (!billing?.max_buses) return 0;
    return Math.min(100, Math.round((billing.active_buses / billing.max_buses) * 100));
  }, [billing]);

  const startCheckout = async (plan) => {
    setCheckoutPlanId(plan.id);
    try {
      const billingUrl = `${window.location.origin}/admin/billing`;
      const response = await subscribeBillingPlan({
        plan_id: plan.id,
        success_url: `${billingUrl}?success=true`,
        cancel_url: `${billingUrl}?canceled=true`,
      });
      window.location.href = response.checkout_url;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to start Stripe Checkout.");
      setCheckoutPlanId(null);
    }
  };

  const manageBilling = async () => {
    setOpeningPortal(true);
    try {
      const response = await openBillingPortal({
        return_url: `${window.location.origin}/admin/billing`,
      });
      window.location.href = response.portal_url;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to open Stripe Customer Portal.");
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      <PanelCard className="overflow-hidden p-0">
        <div className="bg-slate-950 px-6 py-7 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Monthly Subscription</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Billing and Plan</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Choose a recurring monthly plan and manage billing through Stripe.
              </p>
            </div>
            <button
              type="button"
              onClick={manageBilling}
              disabled={openingPortal || !billing?.stripe_customer_id}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <HiCreditCard />
              {openingPortal ? "Opening..." : "Manage Billing"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-main">Current Subscription</h3>
                <p className="mt-1 text-sm text-muted">Active buses compared to your subscribed fleet limit.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-main">
                  {loading ? "--" : `${billing?.active_buses || 0}/${billing?.max_buses || 0}`}
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Buses</p>
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-muted">
              <span>{usagePercent}% used</span>
              <span className="capitalize">{billing?.subscription_status || "inactive"}</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-card-soft p-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">School</p>
            <h3 className="mt-2 text-2xl font-extrabold text-main">{billing?.name || "Your school"}</h3>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-muted">
              <HiCheckCircle className={billing?.is_subscribed ? "text-emerald-500" : "text-slate-400"} />
              {billing?.is_subscribed ? "Subscription active" : "Subscription required"}
            </div>
          </div>
        </div>
      </PanelCard>

      <section className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] || HiCreditCard;
          const active = billing?.stripe_price_id && billing?.max_buses === plan.max_buses;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => startCheckout(plan)}
              disabled={checkoutPlanId !== null}
              className={`group flex min-h-[310px] flex-col rounded-[24px] border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${
                plan.id === "pro" ? "border-amber-300 ring-4 ring-amber-100" : "border-line"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl border ${planAccents[plan.id]}`}>
                  <Icon className="text-xl" />
                </span>
                {plan.id === "pro" ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-6">
                <h3 className="text-2xl font-extrabold text-main">{plan.name}</h3>
                <p className="mt-1 text-sm font-bold text-muted">
                  {plan.max_buses >= 10000 ? "Unlimited buses" : `${plan.max_buses} buses`}
                </p>
                <p className="mt-4 min-h-[72px] text-sm leading-6 text-muted">{plan.description}</p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <div>
                  <p className="text-3xl font-extrabold text-main">{plan.price}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">per month</p>
                </div>
                <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-accent group-hover:text-slate-950">
                  {active ? "Current" : checkoutPlanId === plan.id ? "Redirecting..." : "Subscribe"}
                </span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}

export default SchoolAdminBilling;
