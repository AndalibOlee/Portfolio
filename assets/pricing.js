// Pricing page: plan cards, monthly/yearly switch, cost calculator and contact form.
(function () {
  const cfg = window.SITE_CONFIG;
  const money = window.formatMoney;
  const promoFactor = 1 - cfg.promo.percentOff / 100;
  const yearlyPct = Math.round(cfg.yearlyDiscount * 100);
  let billing = "monthly";

  const setText = (sel, text) => document.querySelectorAll(sel).forEach((el) => (el.textContent = text));
  setText("[data-promo-months]", cfg.promo.months);
  setText("[data-promo-pct]", cfg.promo.percentOff);
  setText("[data-yearly-pct]", yearlyPct);
  document.getElementById("save-pill").textContent = `Save ${yearlyPct}%`;

  // Per-user monthly rate for the chosen billing period
  function rate(plan, period) {
    return period === "yearly" ? plan.perUserMonthly * (1 - cfg.yearlyDiscount) : plan.perUserMonthly;
  }

  function planForEmployees(n) {
    return cfg.plans.find((p) => n >= p.minEmployees && n <= p.maxEmployees) || cfg.plans[cfg.plans.length - 1];
  }

  // ---------- Plan cards ----------
  const plansEl = document.getElementById("plans");

  function renderPlans() {
    plansEl.innerHTML = cfg.plans
      .map((p) => {
        const regular = rate(p, billing);
        const intro = regular * promoFactor;
        const dec = Number.isInteger(intro) && Number.isInteger(regular) ? 0 : 2;
        return `
        <div class="card plan${p.popular ? " popular" : ""}">
          ${p.popular ? '<span class="ribbon">Most popular</span>' : ""}
          <h3>${p.name}</h3>
          <div class="plan-size">${p.employees}</div>
          <div class="price-old">${money(regular, dec)}</div>
          <div class="price">${money(intro, dec)} <small>/ user / month</small></div>
          <div class="price-note">${cfg.promo.percentOff}% off for the first ${cfg.promo.months} months</div>
          <div class="price-after">Then ${money(regular, dec)} / user / month${billing === "yearly" ? ", billed yearly" : ""}</div>
          <div class="setup">One-time setup fee: <strong>${money(p.setupFee)}</strong></div>
          <ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
          <button class="btn ${p.popular ? "btn-primary" : "btn-outline"} btn-block" type="button" data-choose="${p.id}">Choose ${p.name}</button>
        </div>`;
      })
      .join("");
  }

  document.querySelectorAll("[data-billing]").forEach((btn) =>
    btn.addEventListener("click", () => {
      billing = btn.dataset.billing;
      document.querySelectorAll("[data-billing]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      calcBilling.value = billing;
      renderPlans();
      renderCalc();
    })
  );

  // ---------- Calculator ----------
  const calcEmployees = document.getElementById("calc-employees");
  const calcUsers = document.getElementById("calc-users");
  const calcBilling = document.getElementById("calc-billing");
  const calcSummary = document.getElementById("calc-summary");
  let usersTouched = false;

  function renderCalc() {
    const employees = Math.max(1, parseInt(calcEmployees.value, 10) || 1);
    const users = Math.max(1, parseInt(calcUsers.value, 10) || 1);
    const period = calcBilling.value;
    const plan = planForEmployees(employees);
    const regularMonthly = rate(plan, period) * users;
    const introMonthly = regularMonthly * promoFactor;
    const promoMonths = Math.min(cfg.promo.months, 12);
    const firstYearUsage = introMonthly * promoMonths + regularMonthly * (12 - promoMonths);
    const row = (label, value, cls = "") => `<div class="summary-row ${cls}"><span>${label}</span><span>${value}</span></div>`;

    calcSummary.innerHTML =
      row("Your plan", `${plan.name} (${plan.employees})`) +
      row("One-time setup fee", money(plan.setupFee)) +
      row(`Per month, first ${cfg.promo.months} months`, money(introMonthly, 2)) +
      row("Per month after that", money(regularMonthly, 2)) +
      (period === "yearly" ? row("Billed once a year (first year)", money(firstYearUsage, 2)) : "") +
      row("Total for the first year", money(plan.setupFee + firstYearUsage, 2), "total") +
      `<button class="btn btn-primary btn-block" style="margin-top:16px" type="button" data-choose="${plan.id}">Get started with ${plan.name}</button>`;
  }

  calcEmployees.addEventListener("input", () => {
    if (!usersTouched) calcUsers.value = calcEmployees.value;
    renderCalc();
  });
  calcUsers.addEventListener("input", () => {
    usersTouched = true;
    renderCalc();
  });
  calcBilling.addEventListener("change", () => {
    const btn = document.querySelector(`[data-billing="${calcBilling.value}"]`);
    btn.click();
  });

  // ---------- Contact form ----------
  const modal = document.getElementById("contact-modal");
  const form = document.getElementById("contact-form");
  const success = document.getElementById("form-success");
  const planSelect = document.getElementById("f-plan");
  planSelect.innerHTML = cfg.plans.map((p) => `<option value="${p.id}">${p.name} (${p.employees})</option>`).join("");

  function openModal(planId) {
    form.hidden = false;
    success.hidden = true;
    planSelect.value = planId;
    document.getElementById("f-billing").value = billing === "yearly" ? "Yearly" : "Monthly";
    document.getElementById("f-users").value = calcUsers.value;
    modal.classList.add("open");
    document.getElementById("f-name").focus();
  }
  function closeModal() {
    modal.classList.remove("open");
  }

  document.addEventListener("click", (e) => {
    const choose = e.target.closest("[data-choose]");
    if (choose) openModal(choose.dataset.choose);
    if (e.target.closest("[data-close]") || e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.plan = cfg.plans.find((p) => p.id === data.plan).name;

    if (cfg.formEndpoint) {
      try {
        const res = await fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
      } catch {
        alert("Sorry, something went wrong. Please try again or email us at " + cfg.contactEmail);
        return;
      }
      document.getElementById("success-text").textContent = "We've received your request and will be in touch soon.";
    } else {
      // No form service set up: open the visitor's email app with everything filled in.
      const subject = `New plan request: ${data.plan} (${data.billing})`;
      const body = [
        `Name: ${data.name}`,
        `Company: ${data.company}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone || "-"}`,
        `Plan: ${data.plan}`,
        `Billing: ${data.billing}`,
        `Estimated active users: ${data.users || "-"}`,
        "",
        data.message || "",
      ].join("\n");
      window.location.href = `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.getElementById("success-text").textContent =
        "Your email app should now open with your request filled in. Just press Send.";
    }
    form.reset();
    form.hidden = true;
    success.hidden = false;
  });

  renderPlans();
  renderCalc();
})();
