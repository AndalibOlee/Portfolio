/* =========================================================================
   YOUR SETTINGS — this is the only file you normally need to change.
   Change the text between the quotes, or the numbers, then save.
   ========================================================================= */
window.SITE_CONFIG = {
  // Your company / product name (shown in the header and footer)
  companyName: "YourCompany",

  // Email address that receives plan requests from the contact form
  contactEmail: "you@example.com",

  // OPTIONAL: to receive form messages without the visitor's email app opening,
  // create a free form at https://formspree.io and paste its link here, e.g.
  // "https://formspree.io/f/abcdwxyz". Leave it empty ("") to use email instead.
  formEndpoint: "",

  currency: "CAD",

  // Yearly billing discount (0.15 = 15% off the monthly price)
  yearlyDiscount: 0.15,

  // Introductory offer: 50% off for the first 3 months
  promo: { percentOff: 50, months: 3 },

  // Your 3 plans
  plans: [
    {
      id: "starter",
      name: "Starter",
      employees: "1–25 employees",
      minEmployees: 1,
      maxEmployees: 25,
      setupFee: 5000,
      perUserMonthly: 50,
      features: [
        "Full platform access",
        "Standard onboarding & setup",
        "Email support",
        "Monthly usage reports",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      employees: "26–50 employees",
      minEmployees: 26,
      maxEmployees: 50,
      setupFee: 10000,
      perUserMonthly: 75,
      popular: true,
      features: [
        "Everything in Starter",
        "Guided onboarding & data import",
        "Priority email & chat support",
        "Custom roles & permissions",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      employees: "50+ employees",
      minEmployees: 51,
      maxEmployees: Infinity,
      setupFee: 20000,
      perUserMonthly: 100,
      features: [
        "Everything in Growth",
        "Dedicated account manager",
        "Phone support & SLA",
        "Custom integrations",
      ],
    },
  ],
};
