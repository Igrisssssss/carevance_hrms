export type PricingBillingCycle = 'monthly' | 'yearly';
export type SignupMode = 'trial' | 'paid';

export interface PricingPlan {
  code: 'starter' | 'growth' | 'enterprise';
  label: string;
  shortDescription: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  features: string[];
  ctaLabel: string;
  badge?: string;
  enterpriseContactOnly: boolean;
  trialAvailable: boolean;
}

export const pricingUi = {
  trialBadge: '14-day free trial',
  noCardCopy: 'No credit card required initially',
  contactEmail: 'sales@carevance.example',
};

export const pricingPlans: PricingPlan[] = [
  {
    code: 'starter',
    label: 'Starter',
    shortDescription: 'For growing teams standardizing attendance, task visibility, and employee onboarding.',
    monthlyPrice: '$29',
    yearlyPrice: '$290',
    features: [
      'Attendance and shift tracking',
      'Employee directory and invite workflows',
      'Core dashboard, projects, and tasks',
      'Basic reporting and approval inbox',
    ],
    ctaLabel: 'Start Free Trial',
    badge: 'Fast setup',
    enterpriseContactOnly: false,
    trialAvailable: true,
  },
  {
    code: 'growth',
    label: 'Growth',
    shortDescription: 'For operations and HR teams that need deeper reporting, permissions, and payroll readiness.',
    monthlyPrice: '$79',
    yearlyPrice: '$790',
    features: [
      'Everything in Starter',
      'Advanced reporting and monitoring views',
      'Role-based invites and onboarding controls',
      'Payroll and billing foundations',
    ],
    ctaLabel: 'Start Free Trial',
    badge: 'Most popular',
    enterpriseContactOnly: false,
    trialAvailable: true,
  },
  {
    code: 'enterprise',
    label: 'Enterprise',
    shortDescription: 'For larger organizations that want custom rollout planning, controls, and guided onboarding.',
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      'Custom rollout and onboarding support',
      'Priority implementation planning',
      'Flexible billing and procurement support',
      'Enterprise contact and expansion workflows',
    ],
    ctaLabel: 'Contact Sales',
    badge: 'Custom rollout',
    enterpriseContactOnly: true,
    trialAvailable: false,
  },
];

export const pricingFaqs = [
  {
    question: 'How does the free trial work?',
    answer: 'Starter and Growth can begin with a 14-day trial. You can create your workspace, invite your team, and configure the product before finalizing billing.',
  },
  {
    question: 'Do invited employees choose their own role?',
    answer: 'No. Roles are assigned by an authorized workspace admin and are enforced by the backend when the invitation is accepted.',
  },
  {
    question: 'What happens if we choose a paid plan before checkout is connected?',
    answer: 'CareVance stores the selected plan and paid intent so your billing setup is ready for a future checkout or sales-assisted activation.',
  },
  {
    question: 'Can we onboard multiple people at once?',
    answer: 'Yes. Admins can invite multiple email addresses at once, generate secure invite links, and use CSV upload scaffolding for batch onboarding.',
  },
  {
    question: 'Can we cancel or change plans later?',
    answer: 'Yes. Billing status, trial end date, and upgrade paths are tracked in workspace settings so future plan changes can be handled cleanly.',
  },
];

export function getPricingPlan(code?: string | null) {
  return pricingPlans.find((plan) => plan.code === code) ?? pricingPlans[0];
}

export function getPlanPrice(plan: PricingPlan, billingCycle: PricingBillingCycle) {
  return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
}

export function buildSignupQuery(planCode: PricingPlan['code'], mode: SignupMode, billingCycle: PricingBillingCycle = 'monthly') {
  return new URLSearchParams({
    plan: planCode,
    mode,
    interval: billingCycle,
  }).toString();
}
