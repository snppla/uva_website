import type { Metadata } from "next";
import { Suspense } from "react";
import { getMembershipPlans, getSettings } from "@/lib/data";
import { Markdown } from "@/lib/markdown";
import { PayPalMemberForm } from "@/components/paypal-form";
import { Container, Empty, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Membership",
  description: "Join or renew your Utah Valley Aeromodelers membership to fly RC at the club field in Saratoga Springs, Utah County.",
};

export default function MembershipPage() {
  return (
    <>
      <PageHeader title="Join or renew" subtitle="Become a member and fly with us." />
      <Container className="max-w-4xl">
        <Suspense fallback={<Loading />}>
          <Membership />
        </Suspense>
      </Container>
    </>
  );
}

async function Membership() {
  const [{ membershipInfo }, plans] = await Promise.all([getSettings(), getMembershipPlans()]);
  return (
    <>
      <Markdown source={membershipInfo} />
      <div className="mt-10">
        {plans.length ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              // Options with a member-details form take the full width.
              <div key={plan.id} className={`card flex flex-col p-6 ${plan.paypalButtonId ? "sm:col-span-2" : ""}`}>
                <h2 className="heading text-2xl text-brand-950">{plan.name}</h2>
                <p className="font-display mt-1 text-4xl font-bold text-accent-600">{plan.price}</p>
                {plan.description && <p className="mt-3 text-sm text-slate-600">{plan.description}</p>}
                {plan.paypalButtonId ? (
                  <PayPalMemberForm buttonId={plan.paypalButtonId} />
                ) : (
                  <a
                    href={plan.paypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn mt-auto bg-[#ffc439] text-slate-900 hover:bg-[#f2b72f]"
                  >
                    Pay with PayPal
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty>Online payment isn&apos;t set up yet. Please contact a club officer to renew.</Empty>
        )}
      </div>
    </>
  );
}
