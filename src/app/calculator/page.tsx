'use client';

import { useState, useCallback } from 'react';
import { calculatePricing, PricingInputs, PricingResult, formatCurrency } from '@/lib/pricing';

export default function PricingCalculatorPage() {
  const [inputs, setInputs] = useState<PricingInputs>({
    fixedCosts: 10000,
    variableCostPerUnit: 25,
    targetProfitMargin: 30,
    marketPositioning: 'mid',
    competitorPrices: [],
  });

  const [result, setResult] = useState<PricingResult | null>(null);
  const [competitorInput, setCompetitorInput] = useState<string>('');

  const handleInputChange = useCallback((field: keyof PricingInputs, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: field === 'marketPositioning' ? value : Number(value) || 0,
    }));
  }, []);

  const handleCompetitorSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const prices = competitorInput
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
    setInputs(prev => ({ ...prev, competitorPrices: prices }));
  }, [competitorInput]);

  const calculate = useCallback(() => {
    const pricingResult = calculatePricing(inputs);
    setResult(pricingResult);
  }, [inputs]);

  const tiers = result?.tiers || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Product Pricing Calculator
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Calculate optimal price tiers based on your cost structure, target margins, and market positioning.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Input Parameters
            </h2>

            <form onSubmit={e => e.preventDefault()} className="space-y-6">
              {/* Fixed Costs */}
              <div>
                <label htmlFor="fixedCosts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Fixed Costs
                  <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(rent, salaries, utilities)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="fixedCosts"
                    min="0"
                    step="100"
                    value={inputs.fixedCosts}
                    onChange={(e) => handleInputChange('fixedCosts', e.target.value)}
                    className="block w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-describedby="fixed-costs-help"
                  />
                </div>
                <p id="fixed-costs-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Total monthly overhead costs
                </p>
              </div>

              {/* Variable Cost per Unit */}
              <div>
                <label htmlFor="variableCostPerUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Variable Cost Per Unit
                  <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(materials, production, shipping)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="variableCostPerUnit"
                    min="0"
                    step="0.01"
                    value={inputs.variableCostPerUnit}
                    onChange={(e) => handleInputChange('variableCostPerUnit', e.target.value)}
                    className="block w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Target Profit Margin */}
              <div>
                <label htmlFor="targetProfitMargin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Profit Margin
                  <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(as percentage of revenue)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="targetProfitMargin"
                    min="1"
                    max="100"
                    value={inputs.targetProfitMargin}
                    onChange={(e) => handleInputChange('targetProfitMargin', e.target.value)}
                    className="block w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Desired profit as percentage of selling price
                </p>
              </div>

              {/* Market Positioning */}
              <div>
                <label htmlFor="marketPositioning" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Positioning
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'mid', 'high'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => handleInputChange('marketPositioning', pos)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        inputs.marketPositioning === pos
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pos === 'low' ? 'Budget' : pos === 'mid' ? 'Mid-Market' : 'Premium'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {inputs.marketPositioning === 'low' && 'Price-sensitive customers, competitive pricing.'}
                  {inputs.marketPositioning === 'mid' && 'Balanced value proposition for mainstream market.'}
                  {inputs.marketPositioning === 'high' && 'Premium positioning with higher margins.'}
                </p>
              </div>

              {/* Competitor Prices */}
              <div>
                <label htmlFor="competitorPrices" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Competitor Prices (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="competitorPrices"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    placeholder="e.g., 29, 49, 99"
                    className="flex-1 block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleCompetitorSubmit}
                    className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                {inputs.competitorPrices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inputs.competitorPrices.map((price, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      >
                        ${price.toFixed(0)}
                        <button
                          type="button"
                          onClick={() => {
                            const newPrices = [...inputs.competitorPrices];
                            newPrices.splice(idx, 1);
                            setInputs(prev => ({ ...prev, competitorPrices: newPrices }));
                            if (competitorInput === price.toString()) setCompetitorInput('');
                          }}
                          className="ml-2 hover:text-blue-600"
                          aria-label={`Remove ${price}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Comma-separated competitor prices for market reference
                </p>
              </div>

              {/* Calculate Button */}
              <button
                type="button"
                onClick={calculate}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Calculate Pricing
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Summary Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Pricing Results
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Break-even Point</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {result.breakEvenUnits === Infinity ? 'N/A' : `${result.breakEvenUnits.toLocaleString()} units`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Recommended Tier</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {result.recommendedTier}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue (Est.)</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(result.monthlyRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Profit (Est.)</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(result.monthlyProfit)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Strategy Summary
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {result.summary}
                    </p>
                  </div>
                </div>

                {/* Price Tier Cards */}
                <div className="space-y-4">
                  {tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl p-6 transition-all ${
                        tier.name === result.recommendedTier
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-2xl scale-[1.02]'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`text-xl font-bold ${tier.name === result.recommendedTier ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {tier.name}
                            </h3>
                            {tier.name === result.recommendedTier && (
                              <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-3xl font-bold ${tier.name === result.recommendedTier ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {formatCurrency(tier.price)}
                            </span>
                            <span className={`text-sm ${tier.name === result.recommendedTier ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              per unit
                            </span>
                          </div>

                          <p className={`mt-2 text-sm ${tier.name === result.recommendedTier ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {tier.justification}
                          </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:ml-6 text-left sm:text-right">
                          <div className={`space-y-1 text-sm ${tier.name === result.recommendedTier ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            <p>Cost: {formatCurrency(tier.costPerUnit)}</p>
                            <p>Profit: {formatCurrency(tier.profitPerUnit)}</p>
                            <p>Margin: {tier.profitMargin.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Suggested Features */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className={`text-sm font-medium mb-2 ${tier.name === result.recommendedTier ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          Suggested Features:
                        </p>
                        <ul className={`space-y-1 ${tier.name === result.recommendedTier ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                          {tier.suggestedFeatures.map((feature, fidx) => (
                            <li key={fidx} className="text-sm flex items-start">
                              <span className="mr-2">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No Results Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Enter your cost data and market positioning on the left, then click Calculate Pricing to see recommended price tiers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}