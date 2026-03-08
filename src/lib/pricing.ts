/**
 * Pricing Calculator Logic
 *
 * Calculates optimal price tiers based on cost structure, target margin,
 * market positioning, and competitor pricing.
 */

export interface PricingInputs {
  fixedCosts: number;          // Monthly fixed costs (rent, salaries, etc.)
  variableCostPerUnit: number; // Cost to produce one unit
  targetProfitMargin: number;  // Desired profit margin as percentage (e.g., 20 for 20%)
  marketPositioning: 'low' | 'mid' | 'high'; // Market strategy
  competitorPrices?: number[]; // Array of competitor prices for reference
}

export interface PriceTier {
  name: string;
  price: number;
  costPerUnit: number;
  profitPerUnit: number;
  profitMargin: number;
  justification: string;
  suggestedFeatures: string[];
}

export interface PricingResult {
  tiers: PriceTier[];
  recommendedTier: string;
  summary: string;
  breakEvenUnits: number;
  monthlyRevenue: number;
  monthlyProfit: number;
}

/**
 * Volume multipliers for different tiers
 * Basic (highest volume) gets lowest cost, Premium (lowest volume) gets highest cost
 */
const VOLUME_MULTIPLIERS = {
  high: { units: 2000, multiplier: 0.70 },   // Basic: high volume, low per-unit cost
  mid: { units: 500, multiplier: 0.85 },     // Standard: medium volume
  low: { units: 100, multiplier: 1.0 },      // Premium: low volume, high per-unit cost
};

/**
 * Market positioning adjustments
 * These affect the overall pricing strategy and feature allocation
 */
const POSITIONING_STRATEGIES = {
  low: {
    tierCount: 3,
    marginAdjustment: 0.9,    // More aggressive pricing (lower margins)
    valueProposition: 'budget-conscious customers',
    priceBandRatio: 1.3,      // Closer price points
  },
  mid: {
    tierCount: 3,
    marginAdjustment: 1.0,    // Standard margins
    valueProposition: 'value-seeking mainstream',
    priceBandRatio: 1.8,      // Moderate spacing
  },
  high: {
    tierCount: 3,
    marginAdjustment: 1.15,   // Premium margins
    valueProposition: 'premium/enterprise customers',
    priceBandRatio: 2.5,      // Wider spacing for premium tiers
  },
};

/**
 * Feature sets for each tier by positioning
 */
const TIER_FEATURES: Record<string, Record<string, string[]>> = {
  low: {
    Basic: ['Core functionality', 'Basic support', 'Limited features'],
    Standard: ['All Basic features', 'Priority support', 'Additional integrations', 'Advanced reporting'],
    Premium: ['All Standard features', 'Dedicated account manager', 'Custom integrations', 'White-glove onboarding'],
  },
  mid: {
    Starter: ['Essential features', 'Email support', '1 user'],
    Professional: ['All Starter features', '5 users', 'API access', 'Advanced analytics'],
    Business: ['All Professional features', 'Unlimited users', 'Custom solutions', '24/7 phone support'],
  },
  high: {
    Essentials: ['Core platform access', 'Standard support', 'Basic dashboard'],
    Enterprise: ['Advanced features', 'SLA guarantee', 'Dedicated support', 'Custom development'],
    Ultimate: ['All features', 'Unlimited everything', 'Executive onboarding', 'Annual business review'],
  },
};

/**
 * Calculate the effective variable cost based on volume tier
 */
function calculateEffectiveVariableCost(
  baseVariableCost: number,
  volumeMultiplier: number
): number {
  return baseVariableCost * volumeMultiplier;
}

/**
 * Calculate base price using cost-plus methodology
 */
function calculateBasePrice(
  fixedCosts: number,
  variableCost: number,
  monthlyUnits: number,
  targetMarginPercent: number
): number {
  // Fixed cost per unit at this volume
  const fixedCostPerUnit = fixedCosts / monthlyUnits;
  const totalCostPerUnit = fixedCostPerUnit + variableCost;

  // Apply target profit margin
  const targetMargin = targetMarginPercent / 100;
  const price = totalCostPerUnit / (1 - targetMargin);

  return Math.max(price, variableCost * 1.1); // Ensure price covers variable costs
}

/**
 * Calculate competitor-based price adjustment
 */
function getCompetitorAdjustment(
  competitorPrices: number[] | undefined,
  ourPrice: number,
  positioning: 'low' | 'mid' | 'high'
): number {
  if (!competitorPrices || competitorPrices.length === 0) {
    return 1.0;
  }

  const avgCompetitor = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
  const competitorPercent = (ourPrice - avgCompetitor) / avgCompetitor;

  // Different positioning strategies relative to competition
  switch (positioning) {
    case 'low':
      return competitorPercent < -0.1 ? 1.0 : 0.95; // Price match or undercut
    case 'mid':
      return ourPrice > avgCompetitor ? 1.0 : 1.05; // Slight premium for mid-market
    case 'high':
      return Math.max(1.2, ourPrice / avgCompetitor); // Premium positioning: 20%+ above
  }
}

/**
 * Main pricing calculation function
 */
export function calculatePricing(inputs: PricingInputs): PricingResult {
  const strategy = POSITIONING_STRATEGIES[inputs.marketPositioning];
  // Order: Basic (high volume), Standard (mid), Premium (low volume)
  const tierConfigs = [
    { key: 'high', multiplier: VOLUME_MULTIPLIERS.high },
    { key: 'mid', multiplier: VOLUME_MULTIPLIERS.mid },
    { key: 'low', multiplier: VOLUME_MULTIPLIERS.low },
  ];

  const tiers: PriceTier[] = [];
  let totalMonthlyProfit = 0;
  let totalMonthlyRevenue = 0;

  tierConfigs.forEach((config, index) => {
    const tierNames = Object.keys(TIER_FEATURES[inputs.marketPositioning]);
    const tierName = tierNames[index] || `Tier ${index + 1}`;

    // Calculate effective variable cost for this volume tier
    const effectiveVariableCost = calculateEffectiveVariableCost(
      inputs.variableCostPerUnit,
      config.multiplier.multiplier
    );

    // Calculate base price
    const basePrice = calculateBasePrice(
      inputs.fixedCosts,
      effectiveVariableCost,
      config.multiplier.units,
      inputs.targetProfitMargin
    );

    // Apply market positioning margin adjustment
    const strategyAdjustedPrice = basePrice * strategy.marginAdjustment;

    // Apply competitor adjustment
    const competitorAdjustedPrice = strategyAdjustedPrice * getCompetitorAdjustment(
      inputs.competitorPrices,
      strategyAdjustedPrice,
      inputs.marketPositioning
    );

    // Round to nearest dollar (or appropriate currency unit)
    const finalPrice = Math.round(competitorAdjustedPrice);

    // Recalculate actual margin and profit
    const fixedCostPerUnit = inputs.fixedCosts / config.multiplier.units;
    const totalCostPerUnit = fixedCostPerUnit + effectiveVariableCost;
    const profitPerUnit = finalPrice - totalCostPerUnit;
    const actualMargin = (profitPerUnit / finalPrice) * 100;

    // Generate justification
    const justification = generateJustification(
      tierName,
      inputs,
      config,
      finalPrice,
      actualMargin,
      effectiveVariableCost
    );

    tiers.push({
      name: tierName,
      price: finalPrice,
      costPerUnit: totalCostPerUnit,
      profitPerUnit,
      profitMargin: actualMargin,
      justification,
      suggestedFeatures: TIER_FEATURES[inputs.marketPositioning][tierName] || [],
    });

    totalMonthlyRevenue += finalPrice * config.multiplier.units;
    totalMonthlyProfit += profitPerUnit * config.multiplier.units;
  });

  // Determine recommended tier (usually the middle or highest based on positioning)
  const recommendedIndex = inputs.marketPositioning === 'low' ? 1 : 2;
  const recommendedTier = tiers[recommendedIndex]?.name || tiers[0]?.name || 'Standard';

  // Calculate break-even at recommended tier
  const recommendedTierPrice = tiers[recommendedIndex]?.price || tiers[0]?.price || 0;
  const contributionMargin = recommendedTierPrice - inputs.variableCostPerUnit;
  const breakEvenUnits = contributionMargin > 0
    ? Math.ceil(inputs.fixedCosts / contributionMargin)
    : Infinity;

  // Generate summary
  const summary = generateSummary(inputs, tiers, totalMonthlyProfit, totalMonthlyRevenue);

  return {
    tiers,
    recommendedTier,
    summary,
    breakEvenUnits,
    monthlyRevenue: totalMonthlyRevenue,
    monthlyProfit: totalMonthlyProfit,
  };
}

/**
 * Generate justification for a specific tier's pricing
 */
function generateJustification(
  tierName: string,
  inputs: PricingInputs,
  config: { key: string; multiplier: { units: number } },
  price: number,
  actualMargin: number,
  effectiveVariableCost: number
): string {
  const volumeMultiplier =
    config.multiplier.units === VOLUME_MULTIPLIERS.low.units ? 'low' :
    config.multiplier.units === VOLUME_MULTIPLIERS.mid.units ? 'medium' : 'high';

  let justification = `${tierName} tier priced at $${price.toFixed(2)}. `;

  if (config.key === 'low') {
    justification += `Based on low volume (${config.multiplier.units} units/month), higher per-unit costs are reflected. `;
  } else if (config.key === 'mid') {
    justification += `Medium volume (${config.multiplier.units} units/month) enables moderate economies of scale. `;
  } else {
    justification += `High volume (${config.multiplier.units} units/month) provides significant cost efficiencies. `;
  }

  justification += `Actual profit margin: ${actualMargin.toFixed(1)}%. `;

  if (inputs.competitorPrices && inputs.competitorPrices.length > 0) {
    const avgComp = inputs.competitorPrices.reduce((a, b) => a + b, 0) / inputs.competitorPrices.length;
    const comparison = price > avgComp ? `${((price - avgComp) / avgComp * 100).toFixed(0)}% above` : `${((avgComp - price) / avgComp * 100).toFixed(0)}% below`;
    justification += `Positioned ${comparison} competitor average. `;
  }

  justification += `Aligned with ${inputs.marketPositioning}-market positioning strategy.`;

  return justification;
}

/**
 * Generate a summary of the pricing strategy
 */
function generateSummary(
  inputs: PricingInputs,
  tiers: PriceTier[],
  totalProfit: number,
  totalRevenue: number
): string {
  const lowest = tiers[0];
  const highest = tiers[tiers.length - 1];

  const overallMargin = (totalProfit / totalRevenue) * 100;

  let summary = `Pricing strategy for ${inputs.marketPositioning}-market positioning:\n\n`;
  summary += `• Price range: $${lowest.price} - $${highest.price}\n`;
  summary += `• Projected monthly revenue: $${totalRevenue.toLocaleString()}\n`;
  summary += `• Projected monthly profit: $${totalProfit.toLocaleString()}\n`;
  summary += `• Overall profit margin: ${overallMargin.toFixed(1)}%\n\n`;
  summary += `Recommended tier: ${tiers.find(t => t.name === 'Standard' || t.name === 'Professional' || t.name === 'Enterprise')?.name || tiers[1]?.name || 'Standard'}`;

  return summary;
}

/**
 * Utility: Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Quick pricing estimate for simple cases
 */
export function quickPriceEstimate(
  costPerUnit: number,
  desiredMarginPercent: number
): number {
  return Math.round(costPerUnit / (1 - desiredMarginPercent / 100));
}