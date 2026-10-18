// Member details sent to PayPal with a "Pay Now" button payment. The option
// names (on0…on5) are what appear on the payment in PayPal, so keep them in
// step with the club's PayPal button; the labels can say anything.
const MEMBER_FIELDS = [
  { option: "First Name", label: "First name", autoComplete: "given-name" },
  { option: "Last Name", label: "Last name", autoComplete: "family-name" },
  { option: "E-mail", label: "Email", type: "email", autoComplete: "email" },
  { option: "Phone #", label: "Phone", type: "tel", autoComplete: "tel" },
  { option: "AMA #", label: "AMA number", inputMode: "numeric" as const },
  { option: "Address", label: "Mailing address", autoComplete: "street-address", wide: true },
];

/** Posts straight to PayPal (opens in a new tab); nothing is stored on this site. */
export function PayPalMemberForm({ buttonId }: { buttonId: string }) {
  return (
    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank" className="mt-5">
      <input type="hidden" name="cmd" value="_s-xclick" />
      <input type="hidden" name="hosted_button_id" value={buttonId} />
      <div className="grid gap-4 sm:grid-cols-2">
        {MEMBER_FIELDS.map((f, i) => (
          <label key={f.option} className={`block ${f.wide ? "sm:col-span-2" : ""}`}>
            <input type="hidden" name={`on${i}`} value={f.option} />
            <span className="label">{f.label}</span>
            <input
              className="input"
              name={`os${i}`}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              maxLength={200}
              required
            />
          </label>
        ))}
      </div>
      <button type="submit" className="btn heading mt-6 w-full bg-[#ffc439] py-3 text-base text-slate-900 hover:bg-[#f2b72f] sm:w-auto sm:px-8">
        Continue to PayPal
      </button>
      <p className="mt-3 text-xs text-slate-500">
        You&apos;ll finish paying on PayPal&apos;s secure site. Your details go to the club treasurer with your payment.
      </p>
    </form>
  );
}
