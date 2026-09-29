// Shared helpers: fills in the company name and year on every page.
(function () {
  const cfg = window.SITE_CONFIG;
  document.querySelectorAll("[data-company]").forEach((el) => (el.textContent = cfg.companyName));
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  document.title = document.title.replace("YourCompany", cfg.companyName);

  const promoText = `${cfg.promo.percentOff}% off your first ${cfg.promo.months} months`;
  document.querySelectorAll("[data-promo]").forEach((el) => (el.textContent = promoText));
})();

window.formatMoney = function (amount, decimals = 0) {
  const cfg = window.SITE_CONFIG;
  return (
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: cfg.currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  );
};
