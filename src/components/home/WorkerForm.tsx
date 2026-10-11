"use client";

import { useRef, useState, type FormEvent } from "react";
import { ARRANGEMENTS, LANGUAGES, WORK_TYPES, workerLeadSchema } from "@/lib/worker-lead-input";
import styles from "./WorkerForms.module.css";

const HINDI: Record<string, string> = {
  "Register for Work": "काम के लिए पंजीकरण",
  "Refer a Worker": "कर्मचारी का रेफरेंस दें",
  "Alternate mobile number (optional)": "दूसरा मोबाइल नंबर (वैकल्पिक)",
  "Your details": "आपकी जानकारी",
  "Worker details": "कर्मचारी की जानकारी",
  "Your name": "आपका नाम",
  "Your mobile number": "आपका मोबाइल नंबर",
  "Relationship with the worker": "कर्मचारी से आपका संबंध",
  "Select relationship": "संबंध चुनें",
  "Worker's full name": "कर्मचारी का पूरा नाम",
  "Full name": "पूरा नाम",
  "Worker's mobile number": "कर्मचारी का मोबाइल नंबर",
  "Mobile number": "मोबाइल नंबर",
  "Age": "उम्र",
  "Gender": "लिंग",
  "Select gender": "लिंग चुनें",
  "Current city": "वर्तमान शहर",
  "Area / locality": "क्षेत्र / इलाका",
  "Work preferences & experience": "काम की पसंद और अनुभव",
  "Type of work (select all that apply)": "काम का प्रकार (एक से अधिक चुन सकते हैं)",
  "Preferred work arrangement": "किस तरह का काम चाहिए",
  "Years of experience": "कितने साल का अनुभव है",
  "Available hours per day (Part-time)": "रोज़ कितने घंटे काम कर सकते हैं (पार्ट-टाइम)",
  "Expected monthly salary (₹)": "अपेक्षित मासिक वेतन (₹)",
  "When can work start?": "काम कब शुरू कर सकते हैं?",
  "Languages spoken (select all that apply)": "कौन-सी भाषाएँ बोलते हैं (एक से अधिक चुन सकते हैं)",
  "Skills or other details (optional)": "हुनर या अन्य जानकारी (वैकल्पिक)",
  "Work with BudgetWorker": "BudgetWorker के साथ काम करें",
  "Register your skills or refer someone looking for work.": "अपना पंजीकरण करें या काम ढूँढ रहे किसी कर्मचारी का रेफरेंस दें।",
  "Domestic Help": "घरेलू काम",
  "Babycare": "बच्चों की देखभाल",
  "All-round home help": "खाना बनाना और घरेलू काम",
  "Japa Care": "जच्चा-बच्चा की देखभाल",
  "Part-time": "पार्ट-टाइम",
  "24-hour Live-in": "24 घंटे घर में रहकर काम",
  "Hindi": "हिन्दी",
  "English": "अंग्रेज़ी",
  "Marathi": "मराठी",
  "Bengali": "बंगाली",
  "Tamil": "तमिल",
  "Telugu": "तेलुगु",
  "Family": "परिवार",
  "Friend": "दोस्त",
  "Neighbour": "पड़ोसी",
  "Former employer": "पूर्व नियोक्ता",
  "Other": "अन्य",
  "Female": "महिला",
  "Male": "पुरुष",
  "Immediately": "तुरंत",
  "Within 1 week": "1 सप्ताह में",
  "Within 2 weeks": "2 सप्ताह में",
  "Within 1 month": "1 महीने में",
  "Thank you for referring a worker": "कर्मचारी का रेफरेंस देने के लिए धन्यवाद",
  "Your registration has been received": "आपका पंजीकरण प्राप्त हो गया है",
  "Submit another form": "एक और फॉर्म भरें",
  "Submitting…": "फॉर्म भेजा जा रहा है…",
  "Submit referral": "रेफरेंस भेजें",
  "Register for work": "पंजीकरण करें",
  "Know someone looking for domestic work? Share their details with their permission.": "क्या कोई घरेलू काम ढूँढ रहा है? उनकी अनुमति लेकर जानकारी साझा करें।",
  "Looking for work? Tell us about your skills, experience and preferred work arrangement.": "काम ढूँढ रहे हैं? अपने हुनर, अनुभव और काम की पसंद के बारे में बताएँ।",
  "Details will be reviewed by the team. Submitting this form does not guarantee a job.": "हमारी टीम जानकारी की जाँच करेगी। फॉर्म भरने से नौकरी मिलने की गारंटी नहीं है।",
  "I have the worker's permission to share their details and agree that BudgetWorker may contact us about work opportunities.": "मुझे कर्मचारी की जानकारी साझा करने की अनुमति है। BudgetWorker काम के अवसरों के लिए हमसे संपर्क कर सकता है।",
  "I agree that BudgetWorker may contact me about my registration and work opportunities.": "BudgetWorker मेरे पंजीकरण और काम के अवसरों के लिए मुझसे संपर्क कर सकता है।"
};
function bilingual(text: string) { return `${text} / ${HINDI[text] ?? text}`; }

type Kind = "REGISTER" | "REFER";

export function WorkerForm({ kind }: { kind: Kind }) {
  const formRef = useRef<HTMLFormElement>(null);
  const attempt = useRef({ signature: "", requestId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [partTime, setPartTime] = useState(true);
  const referral = kind === "REFER";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const values = { requestId: "00000000-0000-4000-8000-000000000000", kind,
      name: String(data.get("name") ?? ""), phone: String(data.get("phone") ?? ""), age: data.get("age"), gender: data.get("gender"), city: String(data.get("city") ?? ""), area: String(data.get("area") ?? ""),
      ...(!referral && String(data.get("alternatePhone") ?? "").trim() ? { alternatePhone: String(data.get("alternatePhone")) } : {}),
      workTypes: data.getAll("workTypes"), arrangements: data.getAll("arrangements"), experience: data.get("experience"), languages: data.getAll("languages"),
      dailyHours: data.get("dailyHours") ?? 8, monthlySalary: data.get("monthlySalary"), availability: data.get("availability"), notes: String(data.get("notes") ?? ""),
      referrerName: String(data.get("referrerName") ?? ""), referrerPhone: String(data.get("referrerPhone") ?? ""), relationship: String(data.get("relationship") ?? ""), consent: data.get("consent") === "on", website: String(data.get("website") ?? ""),
    };
    const parsed = workerLeadSchema.safeParse(values);
    if (!parsed.success) { setError(`${parsed.error.issues[0]?.message ?? "Please check your details."} / कृपया फॉर्म की जानकारी जाँचें और सही विकल्प चुनें।`); return; }
    const signature = JSON.stringify(parsed.data);
    if (attempt.current.signature !== signature) attempt.current = { signature, requestId: crypto.randomUUID() };
    setLoading(true);
    try {
      const response = await fetch("/api/worker-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, requestId: attempt.current.requestId }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not submit the form");
      setReference(result.reference);
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : "Could not submit the form"} / फॉर्म जमा नहीं हो पाया। कृपया जानकारी जाँचकर फिर कोशिश करें।`); }
    finally { setLoading(false); }
  }
  const field = (name: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label className={styles.field} htmlFor={`${kind}-${name}`}><span>{bilingual(label)}</span><input id={`${kind}-${name}`} name={name} required {...extra} /></label>;
  if (reference) return <div role="status" className={styles.success}><h3>{bilingual(referral ? "Thank you for referring a worker" : "Your registration has been received")}</h3><p>Our team will contact {referral ? "you and the worker" : "you"} to review the details and discuss suitable work. / हमारी टीम जानकारी की जाँच और काम के अवसरों पर चर्चा के लिए {referral ? "आपसे और कर्मचारी से" : "आपसे"} संपर्क करेगी।</p><p>Reference / आवेदन संख्या: {reference}</p><button type="button" className="bw-button secondary" onClick={() => { setReference(""); attempt.current = { signature: "", requestId: "" }; setPartTime(true); }}>{bilingual("Submit another form")}</button></div>;
  return <form ref={formRef} className={styles.form} onSubmit={submit}>
    <p className={styles.intro}>{bilingual(referral ? "Know someone looking for domestic work? Share their details with their permission." : "Looking for work? Tell us about your skills, experience and preferred work arrangement.")}</p>
    <fieldset disabled={loading} className={styles.body}>
      {referral && <fieldset className={styles.group}><legend>{bilingual("Your details")}</legend><div className={styles.fields}>
        {field("referrerName", "Your name", { minLength: 2, maxLength: 100, autoComplete: "name" })}
        {field("referrerPhone", "Your mobile number", { type: "tel", inputMode: "tel", maxLength: 25, autoComplete: "tel" })}
        <label className={styles.field} htmlFor={`${kind}-relationship`}><span>{bilingual("Relationship with the worker")}</span><select id={`${kind}-relationship`} name="relationship" required defaultValue=""><option value="" disabled>{bilingual("Select relationship")}</option>{["Family", "Friend", "Neighbour", "Former employer", "Other"].map(value => <option key={value} value={value}>{bilingual(value)}</option>)}</select></label>
      </div></fieldset>}
      <fieldset className={styles.group}><legend>{bilingual(referral ? "Worker details" : "Your details")}</legend><div className={styles.fields}>
        {field("name", referral ? "Worker's full name" : "Full name", { minLength: 2, maxLength: 100, autoComplete: referral ? "off" : "name" })}
        {field("phone", referral ? "Worker's mobile number" : "Mobile number", { type: "tel", inputMode: "tel", maxLength: 25, autoComplete: referral ? "off" : "tel" })}
        {!referral && field("alternatePhone", "Alternate mobile number (optional)", { required: false, type: "tel", inputMode: "tel", maxLength: 25, autoComplete: "off" })}
        {field("age", "Age", { type: "number", min: 18, max: 75 })}
        <label className={styles.field} htmlFor={`${kind}-gender`}><span>{bilingual("Gender")}</span><select id={`${kind}-gender`} name="gender" required defaultValue=""><option value="" disabled>{bilingual("Select gender")}</option>{["Female", "Male", "Other"].map(value => <option key={value} value={value}>{bilingual(value)}</option>)}</select></label>
        {field("city", "Current city", { minLength: 2, maxLength: 80, autoComplete: "address-level2" })}
        {field("area", "Area / locality", { minLength: 2, maxLength: 100 })}
      </div></fieldset>
      <fieldset className={styles.group}><legend>{bilingual("Work preferences & experience")}</legend>
        <fieldset className={styles.choices}><legend>{bilingual("Type of work (select all that apply)")}</legend>{WORK_TYPES.map(value => <label key={value}><input type="checkbox" name="workTypes" value={value} />{bilingual(value)}</label>)}</fieldset>
        <fieldset className={styles.choices}><legend>{bilingual("Preferred work arrangement")}</legend>{ARRANGEMENTS.map(value => <label key={value}><input type="checkbox" name="arrangements" value={value} defaultChecked={value === "Part-time"} onChange={value === "Part-time" ? event => setPartTime(event.target.checked) : undefined} />{bilingual(value)}</label>)}</fieldset>
        <div className={styles.fields}>
          {field("experience", "Years of experience", { type: "number", min: 0, max: 50, defaultValue: 0 })}
          {partTime && <label className={styles.field} htmlFor={`${kind}-dailyHours`}><span>{bilingual("Available hours per day (Part-time)")}</span><select id={`${kind}-dailyHours`} name="dailyHours" defaultValue="8">{[2,3,4,5,6,7,8,9,10,11].map(hours => <option key={hours} value={hours}>{hours} hours / {hours} घंटे</option>)}</select></label>}
          {field("monthlySalary", "Expected monthly salary (₹)", { type: "number", min: 1000, max: 200000, step: 1 })}
          <label className={styles.field} htmlFor={`${kind}-availability`}><span>{bilingual("When can work start?")}</span><select id={`${kind}-availability`} name="availability">{["Immediately", "Within 1 week", "Within 2 weeks", "Within 1 month"].map(value => <option key={value} value={value}>{bilingual(value)}</option>)}</select></label>
        </div>
        <fieldset className={styles.choices}><legend>{bilingual("Languages spoken (select all that apply)")}</legend>{LANGUAGES.map(value => <label key={value}><input type="checkbox" name="languages" value={value} />{bilingual(value)}</label>)}</fieldset>
        <label className={styles.field} htmlFor={`${kind}-notes`}><span>{bilingual("Skills or other details (optional)")}</span><textarea id={`${kind}-notes`} name="notes" maxLength={1000} rows={3} placeholder="For example: newborn care experience, cooking skills or preferred locations / जच्चा-बच्चा की देखभाल का अनुभव, खाना बनाने का हुनर या पसंदीदा क्षेत्र" /></label>
      </fieldset>
      <div className={styles.trap} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className={styles.consent}><input type="checkbox" name="consent" required />{bilingual(referral ? "I have the worker's permission to share their details and agree that BudgetWorker may contact us about work opportunities." : "I agree that BudgetWorker may contact me about my registration and work opportunities.")}</label>
      <p className={styles.note}>{bilingual("Details will be reviewed by the team. Submitting this form does not guarantee a job.")}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className="bw-button" type="submit">{bilingual(loading ? "Submitting…" : referral ? "Submit referral" : "Register for work")}</button>
    </fieldset>
  </form>;
}

