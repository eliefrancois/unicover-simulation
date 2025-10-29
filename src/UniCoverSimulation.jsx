import React, { useState } from 'react';

const UniCoverSimulation = () => {
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const [params, setParams] = useState({
    totalUsers: 5000,
    numIterations: 2000,
    avgAppFee: 70,
    stripeFee: 3.5,
    ultraEliteRejectionRate: 80,
    regularRejectionRate: 30,
    claimRate: 90,
    ultraEliteReimbursement: 50,
    regularReimbursement: 65,
    starterPrice: 99,
    standardPrice: 159,
    premiumPrice: 199,
    starterMaxPayout: 200,
    standardMaxPayout: 300,
    premiumMaxPayout: 375,
    starterPct: 33.33,
    standardPct: 33.33,
    premiumPct: 33.34,
    starterTotalSchools: 4,
    starterUltraEliteMax: 1,
    standardTotalSchools: 6,
    standardUltraEliteMax: 2,
    premiumTotalSchools: 8,
    premiumUltraEliteMax: 3
  });

  const getPlans = () => ({
    starter: {
      name: 'Starter',
      price: params.starterPrice,
      schools: params.starterTotalSchools,
      ultraEliteMax: params.starterUltraEliteMax,
      maxPayout: params.starterMaxPayout
    },
    standard: {
      name: 'Standard',
      price: params.standardPrice,
      schools: params.standardTotalSchools,
      ultraEliteMax: params.standardUltraEliteMax,
      maxPayout: params.standardMaxPayout
    },
    premium: {
      name: 'Premium',
      price: params.premiumPrice,
      schools: params.premiumTotalSchools,
      ultraEliteMax: params.premiumUltraEliteMax,
      maxPayout: params.premiumMaxPayout
    }
  });

  const Tooltip = ({ text }) => (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-blue-500 font-bold">ⓘ</span>
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-24">
        {text}
      </div>
    </div>
  );

  const ParamInput = ({ label, value, onChange, tooltip, min, max, step, suffix }) => {
    const handleChange = (e) => {
      const val = e.target.value;
      if (val === '' || val === '-') {
        return;
      }
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        onChange(numVal);
      }
    };

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step || 1}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {suffix && <span className="text-gray-600">{suffix}</span>}
        </div>
      </div>
    );
  };

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const getUltraEliteCount = (planType, maxAllowed) => {
    if (maxAllowed === 0) return 0;
    if (maxAllowed === 1) return 1;

    const rand = Math.random();
    if (planType === 'standard') {
      return rand < 0.70 ? 1 : maxAllowed;
    }
    if (planType === 'premium') {
      if (rand < 0.40) return 1;
      if (rand < 0.80) return Math.min(2, maxAllowed);
      return maxAllowed;
    }
    return 1;
  };

  const simulateUser = (planType) => {
    const plans = getPlans();
    const plan = plans[planType];
    const ultraEliteCount = getUltraEliteCount(planType, plan.ultraEliteMax);
    const regularCount = plan.schools - ultraEliteCount;

    let rejections = 0;
    let ultraEliteRejections = 0;
    let regularRejections = 0;

    const ultraEliteRejRate = params.ultraEliteRejectionRate / 100;
    const regularRejRate = params.regularRejectionRate / 100;

    for (let i = 0; i < ultraEliteCount; i++) {
      if (Math.random() < ultraEliteRejRate) {
        ultraEliteRejections++;
        rejections++;
      }
    }

    for (let i = 0; i < regularCount; i++) {
      if (Math.random() < regularRejRate) {
        regularRejections++;
        rejections++;
      }
    }

    let potentialPayout = 0;
    if (rejections > 0) {
      const ultraEliteReimbRate = params.ultraEliteReimbursement / 100;
      const regularReimbRate = params.regularReimbursement / 100;

      potentialPayout = (ultraEliteRejections * params.avgAppFee * ultraEliteReimbRate) +
                        (regularRejections * params.avgAppFee * regularReimbRate);
      potentialPayout = Math.min(potentialPayout, plan.maxPayout);
    }

    const claimRateDecimal = params.claimRate / 100;
    const submitsClaim = rejections > 0 && Math.random() < claimRateDecimal;
    const actualPayout = submitsClaim ? potentialPayout : 0;

    return {
      planType,
      revenue: plan.price,
      rejections,
      ultraEliteRejections,
      regularRejections,
      submitsClaim,
      payout: actualPayout
    };
  };

  const runIteration = () => {
    const starterUsers = Math.floor(params.totalUsers * (params.starterPct / 100));
    const standardUsers = Math.floor(params.totalUsers * (params.standardPct / 100));
    const premiumUsers = params.totalUsers - starterUsers - standardUsers;

    const results = {
      starter: [],
      standard: [],
      premium: []
    };

    for (let i = 0; i < starterUsers; i++) {
      results.starter.push(simulateUser('starter'));
    }

    for (let i = 0; i < standardUsers; i++) {
      results.standard.push(simulateUser('standard'));
    }

    for (let i = 0; i < premiumUsers; i++) {
      results.premium.push(simulateUser('premium'));
    }

    return results;
  };

  const calculatePlanMetrics = (userResults) => {
    if (userResults.length === 0) {
      return {
        userCount: 0,
        totalRevenue: 0,
        totalPayouts: 0,
        totalStripeFees: 0,
        netProfit: 0,
        profitMargin: 0,
        usersWithRejections: 0,
        usersWhoSubmittedClaims: 0,
        avgRejectionsPerUser: 0,
        avgPayoutPerUser: 0,
        avgPayoutPerClaimer: 0
      };
    }

    const totalRevenue = userResults.reduce((sum, u) => sum + u.revenue, 0);
    const totalPayouts = userResults.reduce((sum, u) => sum + u.payout, 0);
    const stripeFeeDecimal = params.stripeFee / 100;
    const stripeFeeOnRevenue = totalRevenue * stripeFeeDecimal;
    const stripeFeeOnPayouts = totalPayouts * stripeFeeDecimal;
    const totalStripeFees = stripeFeeOnRevenue + stripeFeeOnPayouts;
    const netProfit = totalRevenue - totalPayouts - totalStripeFees;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const usersWithRejections = userResults.filter(u => u.rejections > 0).length;
    const usersWhoSubmittedClaims = userResults.filter(u => u.submitsClaim).length;

    return {
      userCount: userResults.length,
      totalRevenue,
      totalPayouts,
      totalStripeFees,
      stripeFeeOnRevenue,
      stripeFeeOnPayouts,
      netProfit,
      profitMargin,
      usersWithRejections,
      usersWhoSubmittedClaims,
      avgRejectionsPerUser: userResults.reduce((sum, u) => sum + u.rejections, 0) / userResults.length,
      avgPayoutPerUser: totalPayouts / userResults.length,
      avgPayoutPerClaimer: usersWhoSubmittedClaims > 0 ? totalPayouts / usersWhoSubmittedClaims : 0
    };
  };

  const runSimulation = () => {
    setIsRunning(true);

    setTimeout(() => {
      const iterations = [];

      for (let i = 0; i < params.numIterations; i++) {
        const iterationResults = runIteration();
        const starterMetrics = calculatePlanMetrics(iterationResults.starter);
        const standardMetrics = calculatePlanMetrics(iterationResults.standard);
        const premiumMetrics = calculatePlanMetrics(iterationResults.premium);

        const aggregateMetrics = {
          totalRevenue: starterMetrics.totalRevenue + standardMetrics.totalRevenue + premiumMetrics.totalRevenue,
          totalPayouts: starterMetrics.totalPayouts + standardMetrics.totalPayouts + premiumMetrics.totalPayouts,
          totalStripeFees: starterMetrics.totalStripeFees + standardMetrics.totalStripeFees + premiumMetrics.totalStripeFees,
          netProfit: starterMetrics.netProfit + standardMetrics.netProfit + premiumMetrics.netProfit
        };

        aggregateMetrics.profitMargin = aggregateMetrics.totalRevenue > 0 ? (aggregateMetrics.netProfit / aggregateMetrics.totalRevenue) * 100 : 0;

        iterations.push({
          starter: starterMetrics,
          standard: standardMetrics,
          premium: premiumMetrics,
          aggregate: aggregateMetrics
        });
      }

      const calculateStats = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        return {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p25: sorted[Math.floor(sorted.length * 0.25)],
          p75: sorted[Math.floor(sorted.length * 0.75)]
        };
      };

      const results = {
        starter: {
          revenue: calculateStats(iterations.map(i => i.starter.totalRevenue)),
          payouts: calculateStats(iterations.map(i => i.starter.totalPayouts)),
          stripeFees: calculateStats(iterations.map(i => i.starter.totalStripeFees)),
          netProfit: calculateStats(iterations.map(i => i.starter.netProfit)),
          profitMargin: calculateStats(iterations.map(i => i.starter.profitMargin)),
          usersWithClaims: calculateStats(iterations.map(i => i.starter.usersWhoSubmittedClaims)),
          avgPayoutPerClaimer: calculateStats(iterations.map(i => i.starter.avgPayoutPerClaimer))
        },
        standard: {
          revenue: calculateStats(iterations.map(i => i.standard.totalRevenue)),
          payouts: calculateStats(iterations.map(i => i.standard.totalPayouts)),
          stripeFees: calculateStats(iterations.map(i => i.standard.totalStripeFees)),
          netProfit: calculateStats(iterations.map(i => i.standard.netProfit)),
          profitMargin: calculateStats(iterations.map(i => i.standard.profitMargin)),
          usersWithClaims: calculateStats(iterations.map(i => i.standard.usersWhoSubmittedClaims)),
          avgPayoutPerClaimer: calculateStats(iterations.map(i => i.standard.avgPayoutPerClaimer))
        },
        premium: {
          revenue: calculateStats(iterations.map(i => i.premium.totalRevenue)),
          payouts: calculateStats(iterations.map(i => i.premium.totalPayouts)),
          stripeFees: calculateStats(iterations.map(i => i.premium.totalStripeFees)),
          netProfit: calculateStats(iterations.map(i => i.premium.netProfit)),
          profitMargin: calculateStats(iterations.map(i => i.premium.profitMargin)),
          usersWithClaims: calculateStats(iterations.map(i => i.premium.usersWhoSubmittedClaims)),
          avgPayoutPerClaimer: calculateStats(iterations.map(i => i.premium.avgPayoutPerClaimer))
        },
        aggregate: {
          revenue: calculateStats(iterations.map(i => i.aggregate.totalRevenue)),
          payouts: calculateStats(iterations.map(i => i.aggregate.totalPayouts)),
          stripeFees: calculateStats(iterations.map(i => i.aggregate.totalStripeFees)),
          netProfit: calculateStats(iterations.map(i => i.aggregate.netProfit)),
          profitMargin: calculateStats(iterations.map(i => i.aggregate.profitMargin))
        }
      };

      setSimulationResults(results);
      setIsRunning(false);
    }, 100);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(0);
  };

  const exportToCSV = () => {
    if (!simulationResults) return;

    const csvRows = [];
    csvRows.push(['UniCover Business Model Simulation Results']);
    csvRows.push(['']);
    csvRows.push(['Simulation Parameters']);
    csvRows.push(['Total Users', params.totalUsers]);
    csvRows.push(['Number of Iterations', params.numIterations]);
    csvRows.push(['Avg Application Fee', `$${params.avgAppFee}`]);
    csvRows.push(['Stripe Fee', `${params.stripeFee}%`]);
    csvRows.push(['Ultra-Elite Rejection Rate', `${params.ultraEliteRejectionRate}%`]);
    csvRows.push(['Regular Rejection Rate', `${params.regularRejectionRate}%`]);
    csvRows.push(['Claim Submission Rate', `${params.claimRate}%`]);
    csvRows.push(['Ultra-Elite Reimbursement', `${params.ultraEliteReimbursement}%`]);
    csvRows.push(['Regular Reimbursement', `${params.regularReimbursement}%`]);
    csvRows.push(['Starter Plan Distribution', `${params.starterPct}%`]);
    csvRows.push(['Standard Plan Distribution', `${params.standardPct}%`]);
    csvRows.push(['Premium Plan Distribution', `${params.premiumPct}%`]);
    csvRows.push(['']);
    csvRows.push(['Plan Coverage & Pricing']);
    csvRows.push(['Starter', `${params.starterTotalSchools} schools, ${params.starterUltraEliteMax} ultra-elite, $${params.starterPrice}, max $${params.starterMaxPayout}`]);
    csvRows.push(['Standard', `${params.standardTotalSchools} schools, ${params.standardUltraEliteMax} ultra-elite, $${params.standardPrice}, max $${params.standardMaxPayout}`]);
    csvRows.push(['Premium', `${params.premiumTotalSchools} schools, ${params.premiumUltraEliteMax} ultra-elite, $${params.premiumPrice}, max $${params.premiumMaxPayout}`]);
    csvRows.push(['']);

    csvRows.push(['AGGREGATE RESULTS']);
    csvRows.push(['Metric', 'Mean', 'Median', '25th %', '75th %', 'Min', 'Max']);
    const aggData = [
      ['Total Revenue', ...Object.values(simulationResults.aggregate.revenue).map(v => `$${v.toFixed(0)}`)],
      ['Total Payouts', ...Object.values(simulationResults.aggregate.payouts).map(v => `$${v.toFixed(0)}`)],
      ['Stripe Fees', ...Object.values(simulationResults.aggregate.stripeFees).map(v => `$${v.toFixed(0)}`)],
      ['Net Profit', ...Object.values(simulationResults.aggregate.netProfit).map(v => `$${v.toFixed(0)}`)],
      ['Profit Margin', ...Object.values(simulationResults.aggregate.profitMargin).map(v => `${v.toFixed(1)}%`)]
    ];
    csvRows.push(...aggData);
    csvRows.push(['']);

    ['starter', 'standard', 'premium'].forEach(planType => {
      csvRows.push([`${planType.toUpperCase()} PLAN`]);
      csvRows.push(['Metric', 'Mean', 'Median', '25th %', '75th %', 'Min', 'Max']);
      const planData = [
        ['Total Revenue', ...Object.values(simulationResults[planType].revenue).map(v => `$${v.toFixed(0)}`)],
        ['Total Payouts', ...Object.values(simulationResults[planType].payouts).map(v => `$${v.toFixed(0)}`)],
        ['Stripe Fees', ...Object.values(simulationResults[planType].stripeFees).map(v => `$${v.toFixed(0)}`)],
        ['Net Profit', ...Object.values(simulationResults[planType].netProfit).map(v => `$${v.toFixed(0)}`)],
        ['Profit Margin', ...Object.values(simulationResults[planType].profitMargin).map(v => `${v.toFixed(1)}%`)],
        ['Users Who Submitted Claims', ...Object.values(simulationResults[planType].usersWithClaims).map(v => v.toFixed(0))],
        ['Avg Payout Per Claimer', ...Object.values(simulationResults[planType].avgPayoutPerClaimer).map(v => `$${v.toFixed(0)}`)]
      ];
      csvRows.push(...planData);
      csvRows.push(['']);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `unicover-simulation-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUserCount = (planType) => {
    if (planType === 'starter') return Math.floor(params.totalUsers * (params.starterPct / 100));
    if (planType === 'standard') return Math.floor(params.totalUsers * (params.standardPct / 100));
    const starterUsers = Math.floor(params.totalUsers * (params.starterPct / 100));
    const standardUsers = Math.floor(params.totalUsers * (params.standardPct / 100));
    return params.totalUsers - starterUsers - standardUsers;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Unicover Business Model Simulator</h1>
        <p className="text-gray-600">Test the Balanced Viability scenario with adjustable parameters</p>
      </div>

      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Simulation Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">General Settings</h3>
            <ParamInput
              label="Total Users"
              value={params.totalUsers}
              onChange={(v) => updateParam('totalUsers', v)}
              tooltip="Total customers split across plan tiers based on distribution percentages"
              min={100}
              max={10000}
              step={100}
            />
            <ParamInput
              label="Iterations"
              value={params.numIterations}
              onChange={(v) => updateParam('numIterations', v)}
              tooltip="Number of simulation runs. More iterations = more accurate results but slower."
              min={100}
              max={5000}
              step={100}
            />
            <ParamInput
              label="Avg App Fee"
              value={params.avgAppFee}
              onChange={(v) => updateParam('avgAppFee', v)}
              tooltip="Average application fee across all schools"
              min={30}
              max={100}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Stripe Fee"
              value={params.stripeFee}
              onChange={(v) => updateParam('stripeFee', v)}
              tooltip="Processing fee percentage on both revenue and payouts"
              min={0}
              max={10}
              step={0.1}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">
              Plan Distribution
              {Math.abs((params.starterPct + params.standardPct + params.premiumPct) - 100) > 0.01 && (
                <span className="ml-2 text-xs font-normal text-red-600">
                  (Total: {(params.starterPct + params.standardPct + params.premiumPct).toFixed(1)}%)
                </span>
              )}
            </h3>
            <ParamInput
              label="Starter Plan %"
              value={params.starterPct}
              onChange={(v) => updateParam('starterPct', v)}
              tooltip="Percentage of total users who choose the Starter plan. All three should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
            <ParamInput
              label="Standard Plan %"
              value={params.standardPct}
              onChange={(v) => updateParam('standardPct', v)}
              tooltip="Percentage of total users who choose the Standard plan. All three should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
            <ParamInput
              label="Premium Plan %"
              value={params.premiumPct}
              onChange={(v) => updateParam('premiumPct', v)}
              tooltip="Percentage of total users who choose the Premium plan. All three should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Rejection & Claim Rates</h3>
            <ParamInput
              label="Ultra-Elite Rejection"
              value={params.ultraEliteRejectionRate}
              onChange={(v) => updateParam('ultraEliteRejectionRate', v)}
              tooltip="Rejection rate for ultra-elite schools (Ivy League, etc.). These schools typically reject 85-95% of applicants."
              min={50}
              max={100}
              step={1}
              suffix="%"
            />
            <ParamInput
              label="Regular Rejection"
              value={params.regularRejectionRate}
              onChange={(v) => updateParam('regularRejectionRate', v)}
              tooltip="Rejection rate for regular schools. KEY DRIVER of profitability - varies widely by student quality."
              min={0}
              max={80}
              step={5}
              suffix="%"
            />
            <ParamInput
              label="Claim Rate"
              value={params.claimRate}
              onChange={(v) => updateParam('claimRate', v)}
              tooltip="% of rejected users who actually submit claims. Not everyone follows through even if eligible."
              min={20}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Reimbursement Rates</h3>
            <ParamInput
              label="Ultra-Elite Reimb"
              value={params.ultraEliteReimbursement}
              onChange={(v) => updateParam('ultraEliteReimbursement', v)}
              tooltip="% of application fee reimbursed for ultra-elite rejections. Lower % protects margins."
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
            <ParamInput
              label="Regular Reimb"
              value={params.regularReimbursement}
              onChange={(v) => updateParam('regularReimbursement', v)}
              tooltip="% of application fee reimbursed for regular school rejections. Can be higher since rejection probability is lower."
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Starter Plan</h3>
            <ParamInput
              label="Schools"
              value={params.starterTotalSchools}
              onChange={(v) => updateParam('starterTotalSchools', v)}
              tooltip="Total schools covered by Starter plan"
              min={1}
              max={15}
              step={1}
            />
            <ParamInput
              label="Ultra-Elite Max"
              value={params.starterUltraEliteMax}
              onChange={(v) => updateParam('starterUltraEliteMax', v)}
              tooltip="Max ultra-elite schools allowed. Lower = less risk."
              min={0}
              max={params.starterTotalSchools}
              step={1}
            />
            <ParamInput
              label="Price"
              value={params.starterPrice}
              onChange={(v) => updateParam('starterPrice', v)}
              tooltip="Plan price. Higher = more revenue but may reduce conversions."
              min={39}
              max={200}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Max Payout"
              value={params.starterMaxPayout}
              onChange={(v) => updateParam('starterMaxPayout', v)}
              tooltip="Maximum reimbursement cap. Protects from worst-case scenarios."
              min={100}
              max={500}
              step={25}
              suffix="$"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Standard Plan</h3>
            <ParamInput
              label="Schools"
              value={params.standardTotalSchools}
              onChange={(v) => updateParam('standardTotalSchools', v)}
              tooltip="Total schools covered by Standard plan"
              min={1}
              max={15}
              step={1}
            />
            <ParamInput
              label="Ultra-Elite Max"
              value={params.standardUltraEliteMax}
              onChange={(v) => updateParam('standardUltraEliteMax', v)}
              tooltip="Max ultra-elite schools allowed"
              min={0}
              max={params.standardTotalSchools}
              step={1}
            />
            <ParamInput
              label="Price"
              value={params.standardPrice}
              onChange={(v) => updateParam('standardPrice', v)}
              tooltip="Plan price. Typically the most popular tier."
              min={79}
              max={300}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Max Payout"
              value={params.standardMaxPayout}
              onChange={(v) => updateParam('standardMaxPayout', v)}
              tooltip="Maximum reimbursement cap for Standard plan"
              min={150}
              max={700}
              step={25}
              suffix="$"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Premium Plan</h3>
            <ParamInput
              label="Schools"
              value={params.premiumTotalSchools}
              onChange={(v) => updateParam('premiumTotalSchools', v)}
              tooltip="Total schools covered by Premium plan"
              min={1}
              max={15}
              step={1}
            />
            <ParamInput
              label="Ultra-Elite Max"
              value={params.premiumUltraEliteMax}
              onChange={(v) => updateParam('premiumUltraEliteMax', v)}
              tooltip="Max ultra-elite schools allowed. Higher tier = more coverage."
              min={0}
              max={params.premiumTotalSchools}
              step={1}
            />
            <ParamInput
              label="Price"
              value={params.premiumPrice}
              onChange={(v) => updateParam('premiumPrice', v)}
              tooltip="Plan price. Higher coverage but also higher risk exposure."
              min={119}
              max={400}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Max Payout"
              value={params.premiumMaxPayout}
              onChange={(v) => updateParam('premiumMaxPayout', v)}
              tooltip="Maximum reimbursement cap. Critical for risk management."
              min={200}
              max={900}
              step={25}
              suffix="$"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900">How This Simulator Works</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Monte Carlo Simulation:</strong> This tool runs thousands of randomized scenarios to predict the range of possible outcomes for your business.
            Instead of a single estimate, you'll see the full distribution of results including best case, worst case, and everything in between.
          </p>
          <p>
            <strong>What it simulates:</strong> For each iteration, the tool creates a virtual cohort of users split across three plan tiers based on your distribution percentages.
            Each user applies to multiple schools based on their plan, and we simulate rejections using the rejection rates you set.
            Users who get rejected have a chance to submit claims based on your claim rate parameter.
          </p>
          <p>
            <strong>Key assumptions:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ultra-elite schools (Ivy League, etc.) have higher rejection rates than regular schools</li>
            <li>Premium users are more likely to apply to multiple ultra-elite schools</li>
            <li>Not everyone who gets rejected will submit a claim (controlled by "Claim Rate")</li>
            <li>Stripe fees apply to both incoming revenue and outgoing payouts</li>
            <li>Maximum payout caps protect against worst-case scenarios</li>
          </ul>
          <p>
            <strong>How to use it:</strong> Start with the default parameters to see a baseline. Then adjust one variable at a time to understand its impact.
            Pay special attention to the profit margin statistics - the 25th-75th percentile range shows you the realistic expected variance.
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={runSimulation} disabled={isRunning} className="px-8 py-4 bg-orange-500 text-white rounded-lg font-semibold text-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg transform transition hover:scale-105">
          {isRunning ? 'Running...' : `Run ${params.numIterations} Simulations`}
        </button>
        {simulationResults && (
          <button onClick={exportToCSV} className="px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 shadow-lg transform transition hover:scale-105">
            Export CSV
          </button>
        )}
      </div>

      {simulationResults && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Aggregate Results (All {params.totalUsers} Users)</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Mean</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Median</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">25th %</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">75th %</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Min</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-medium">Total Revenue</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.revenue.max)}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">Total Payouts</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.payouts.max)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-medium">Stripe Fees</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.stripeFees.max)}</td>
                  </tr>
                  <tr className={simulationResults.aggregate.netProfit.mean < 0 ? 'bg-red-50 font-semibold' : 'bg-green-50 font-semibold'}>
                    <td className="border border-gray-300 px-4 py-2">Net Profit</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.max)}</td>
                  </tr>
                  <tr className={simulationResults.aggregate.profitMargin.mean < 0 ? 'bg-red-100 font-semibold' : 'bg-green-100 font-semibold'}>
                    <td className="border border-gray-300 px-4 py-2">Profit Margin</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults.aggregate.profitMargin.max)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {['starter', 'standard', 'premium'].map((planType) => (
            <div key={planType}>
              <h2 className="text-2xl font-bold mb-4 capitalize">{planType} Plan ({getUserCount(planType)} Users - {planType === 'starter' ? params.starterPct : planType === 'standard' ? params.standardPct : params.premiumPct}%)</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Mean</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Median</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">25th %</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">75th %</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Min</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Revenue</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.max)}</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">Payouts</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].payouts.max)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Stripe Fees</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].stripeFees.max)}</td>
                    </tr>
                    <tr className={simulationResults[planType].netProfit.mean < 0 ? 'bg-red-50 font-semibold' : 'bg-green-50 font-semibold'}>
                      <td className="border border-gray-300 px-4 py-2">Net Profit</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.max)}</td>
                    </tr>
                    <tr className={simulationResults[planType].profitMargin.mean < 0 ? 'bg-red-100 font-semibold' : 'bg-green-100 font-semibold'}>
                      <td className="border border-gray-300 px-4 py-2">Profit Margin</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.max)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Users w/ Claims</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.max)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Avg Per Claimer</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].avgPayoutPerClaimer.max)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UniCoverSimulation;
