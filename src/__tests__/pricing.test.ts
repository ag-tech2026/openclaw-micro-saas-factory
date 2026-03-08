import {
  calculatePricing,
  PricingInputs,
  formatCurrency,
  quickPriceEstimate,
} from '../lib/pricing';

describe('Pricing Calculator', () => {
  const defaultInputs: PricingInputs = {
    fixedCosts: 10000,
    variableCostPerUnit: 25,
    targetProfitMargin: 30,
    marketPositioning: 'mid',
    competitorPrices: [50, 60, 75],
  };

  describe('calculatePricing', () => {
    it('should calculate all three tiers', () => {
      const result = calculatePricing(defaultInputs);
      expect(result.tiers).toHaveLength(3);
    });

    it('should return price tiers with required properties', () => {
      const result = calculatePricing(defaultInputs);
      result.tiers.forEach(tier => {
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        expect(tier).toHaveProperty('costPerUnit');
        expect(tier).toHaveProperty('profitPerUnit');
        expect(tier).toHaveProperty('profitMargin');
        expect(tier).toHaveProperty('justification');
        expect(tier).toHaveProperty('suggestedFeatures');
        expect(tier.price).toBeGreaterThan(0);
        expect(tier.profitPerUnit).toBeGreaterThan(0);
      });
    });

    it('should price basic tier lowest and premium tier highest', () => {
      const result = calculatePricing(defaultInputs);
      expect(result.tiers[0].price).toBeLessThan(result.tiers[1].price);
      expect(result.tiers[1].price).toBeLessThan(result.tiers[2].price);
    });

    it('should calculate positive profit for all tiers', () => {
      const result = calculatePricing(defaultInputs);
      result.tiers.forEach(tier => {
        expect(tier.profitPerUnit).toBeGreaterThanOrEqual(0);
        expect(tier.profitMargin).toBeGreaterThanOrEqual(0);
      });
    });

    it('should report correct monthly profit and revenue', () => {
      const result = calculatePricing(defaultInputs);
      const totalRevenue = result.tiers.reduce((sum, tier) => {
        const units = getVolumeForTier(tier.name);
        return sum + tier.price * units;
      }, 0);
      const totalProfit = result.tiers.reduce((sum, tier) => {
        const units = getVolumeForTier(tier.name);
        return sum + tier.profitPerUnit * units;
      }, 0);

      expect(result.monthlyRevenue).toBeCloseTo(totalRevenue, 0);
      expect(result.monthlyProfit).toBeCloseTo(totalProfit, 0);
    });

    it('should handle zero fixed costs', () => {
      const inputs = { ...defaultInputs, fixedCosts: 0 };
      const result = calculatePricing(inputs);
      expect(result.tiers).toHaveLength(3);
      result.tiers.forEach(tier => {
        expect(tier.costPerUnit).toBeGreaterThan(0);
        expect(tier.price).toBeGreaterThan(tier.costPerUnit);
      });
    });

    it('should handle high variable costs', () => {
      const inputs = { ...defaultInputs, variableCostPerUnit: 100, targetProfitMargin: 20 };
      const result = calculatePricing(inputs);
      result.tiers.forEach(tier => {
        expect(tier.price).toBeGreaterThan(tier.costPerUnit);
        // Check margin is roughly 20% (within reasonable tolerance)
        expect(tier.profitMargin).toBeGreaterThanOrEqual(15);
        expect(tier.profitMargin).toBeLessThanOrEqual(25);
      });
    });

    it('should respect low market positioning with lower margins', () => {
      const lowResult = calculatePricing({ ...defaultInputs, marketPositioning: 'low' });
      const midResult = calculatePricing({ ...defaultInputs, marketPositioning: 'mid' });
      const highResult = calculatePricing({ ...defaultInputs, marketPositioning: 'high' });

      // Compare average margins
      const lowAvgMargin = lowResult.tiers.reduce((sum, t) => sum + t.profitMargin, 0) / 3;
      const midAvgMargin = midResult.tiers.reduce((sum, t) => sum + t.profitMargin, 0) / 3;
      const highAvgMargin = highResult.tiers.reduce((sum, t) => sum + t.profitMargin, 0) / 3;

      expect(lowAvgMargin).toBeLessThan(midAvgMargin);
      expect(midAvgMargin).toBeLessThan(highAvgMargin);
    });

    it('should incorporate competitor prices when provided', () => {
      const withComp = calculatePricing(defaultInputs);
      const withoutComp = calculatePricing({ ...defaultInputs, competitorPrices: [] });

      // Prices shouldn&apos;t be identical when competitors are present
      const hasDifferences = withComp.tiers.some((tier, i) => {
        return Math.abs(tier.price - withoutComp.tiers[i].price) > 0.01;
      });
      expect(hasDifferences).toBe(true);
    });

    it('should recommend a tier', () => {
      const result = calculatePricing(defaultInputs);
      expect(result.recommendedTier).toBeTruthy();
      const recommendedTier = result.tiers.find(t => t.name === result.recommendedTier);
      expect(recommendedTier).toBeDefined();
    });

    it('should generate meaningful justifications', () => {
      const result = calculatePricing(defaultInputs);
      result.tiers.forEach(tier => {
        expect(tier.justification.length).toBeGreaterThan(20);
        expect(tier.justification.toLowerCase()).toContain(tier.name.toLowerCase());
      });
    });

    it('should assign appropriate features to each tier', () => {
      const result = calculatePricing(defaultInputs);
      result.tiers.forEach(tier => {
        expect(tier.suggestedFeatures.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty competitor prices', () => {
      const result = calculatePricing({ ...defaultInputs, competitorPrices: [] });
      expect(result.tiers).toHaveLength(3);
      result.tiers.forEach(tier => {
        expect(tier.price).toBeGreaterThan(0);
      });
    });

    it('should calculate break-even units', () => {
      const result = calculatePricing(defaultInputs);
      const recommended = result.tiers.find(t => t.name === result.recommendedTier);
      if (recommended) {
        const contributionMargin = recommended.price - defaultInputs.variableCostPerUnit;
        const expectedBreakEven = Math.ceil(defaultInputs.fixedCosts / contributionMargin);
        expect(result.breakEvenUnits).toBe(expectedBreakEven);
      }
    });

    it('should generate summary with key metrics', () => {
      const result = calculatePricing(defaultInputs);
      expect(result.summary).toContain('Pricing strategy');
      expect(result.summary).toContain('Price range');
      expect(result.summary).toContain('monthly revenue');
      expect(result.summary).toContain('monthly profit');
      expect(result.summary).toContain('profit margin');
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(1234.56)).toBe('$1,235');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('should support custom currencies', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000');
    });
  });

  describe('quickPriceEstimate', () => {
    it('should calculate correct price for 20% margin', () => {
      const price = quickPriceEstimate(25, 20);
      // If cost is $25 and margin is 20%, price = 25 / (1 - 0.2) = 25 / 0.8 = 31.25 -> 31
      expect(price).toBe(31);
    });

    it('should return higher price for higher margins', () => {
      const lowerMargin = quickPriceEstimate(25, 20);
      const higherMargin = quickPriceEstimate(25, 40);
      expect(higherMargin).toBeGreaterThan(lowerMargin);
    });

    it('should return correct cost-plus price', () => {
      const price = quickPriceEstimate(1000, 5);
      // 1000 / (1 - 0.05) = 1000 / 0.95 = 1052.63 -> 1053
      expect(price).toBe(1053);
    });
  });

  // Helper to get volume for a tier name (matches internal constants)
  function getVolumeForTier(tierName: string): number {
    const tiers = {
      // After reordering: Basic (high volume), Standard (mid), Premium (low)
      Basic: 2000,
      Standard: 500,
      Premium: 100,
      Starter: 2000,
      Professional: 500,
      Business: 100,
      Essentials: 2000,
      Enterprise: 500,
      Ultimate: 100,
    };
    return tiers[tierName as keyof typeof tiers] || 100;
  }

  describe('Edge Cases', () => {
    it('should handle very high fixed costs', () => {
      const inputs = { ...defaultInputs, fixedCosts: 1000000 };
      const result = calculatePricing(inputs);
      result.tiers.forEach(tier => {
        expect(tier.price).toBeGreaterThan(tier.costPerUnit);
      });
    });

    it('should handle very low target margin', () => {
      const inputs = { ...defaultInputs, targetProfitMargin: 5 };
      const result = calculatePricing(inputs);
      result.tiers.forEach(tier => {
        expect(tier.profitMargin).toBeGreaterThanOrEqual(0);
        expect(tier.profitMargin).toBeLessThanOrEqual(11); // Allow slight rounding above 10
      });
    });

    it('should handle large competitor price variations', () => {
      const inputs = { ...defaultInputs, competitorPrices: [10, 100, 500] };
      const result = calculatePricing(inputs);
      result.tiers.forEach(tier => {
        expect(tier.price).toBeGreaterThan(0);
      });
    });

    it('should return consistent results for same inputs', () => {
      const result1 = calculatePricing(defaultInputs);
      const result2 = calculatePricing(defaultInputs);
      expect(result1.tiers.map(t => t.price)).toEqual(result2.tiers.map(t => t.price));
    });
  });
});