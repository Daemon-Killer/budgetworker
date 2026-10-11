import styles from "./PricingIntro.module.css";

const benefits = [
  "Verified Worker Profiles",
  "Clear Duties Before Joining",
  "Replacement Protection",
  "Transparent Subscription Pricing",
  "No Hidden Agency Charges",
  "No Worker-Side Commission",
];
const plans = [
  { title: "8–11 Hour Workers", price: "₹1,999", description: "Housekeeping • Babycare • Japacare • All-Rounder" },
  { title: "24-Hour Live-in Workers", price: "₹4,999", description: "Verified live-in workers with replacement protection." },
  { title: "Japa Care", price: "₹3,999", description: "Specialized newborn and mother-care support." },
];
const comparisons = [
  ["High placement charges", "Budget-friendly fixed plans"],
  ["Pricing may vary", "Upfront transparent pricing"],
  ["Duties may be unclear", "Duty Card before joining"],
  ["Replacement terms can be unclear", "Clearly defined replacement protection"],
  ["Multiple hidden costs possible", "Know your service fee before booking"],
];

export function PricingIntro() {
  return (
    <section className={styles.section} aria-labelledby="pricing-intro-heading">
      <header className={styles.intro}>
        <h2 id="pricing-intro-heading">Better Help. Lower Service Fees.</h2>
        <p>Why pay heavy agency charges when you can get trusted home help with transparent subscription plans?</p>
      </header>
      <div className={styles.benefits}>
        <h3>BudgetWorker gives you:</h3>
        <ul>
          {benefits.map((benefit) => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}
        </ul>
      </div>
      <section className={styles.plans} aria-labelledby="subscription-plans-heading">
        <h3 id="subscription-plans-heading">Plans Starting From ₹1,999 <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></h3>
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article key={plan.title} className={styles.plan} aria-label={plan.title}>
              <h4>{plan.title}</h4>
              <p className={styles.price}>Starting at <strong>{plan.price} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></strong></p>
              <p>{plan.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.comparison} aria-labelledby="why-budgetworker-heading">
        <h3 id="why-budgetworker-heading">Why BudgetWorker?</h3>
        <div className={styles.tableWrap}>
          <table>
            <caption className={styles.srOnly}>Traditional hiring compared with BudgetWorker</caption>
            <thead><tr><th scope="col">Traditional Hiring</th><th scope="col">BudgetWorker</th></tr></thead>
            <tbody>{comparisons.map(([traditional, budgetworker]) => <tr key={traditional}><td>{traditional}</td><td>{budgetworker}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <p className={styles.closing}>Quality Home Help Without Heavy Agency Fees.</p>
    </section>
  );
}
