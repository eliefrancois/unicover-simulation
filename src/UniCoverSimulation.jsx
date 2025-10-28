import React, { useState } from 'react';

const UniCoverSimulation = () => {
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Adjustable parameters with default values
  const [params, setParams] = useState({
    totalUsers: 1000,
    numIterations: 1000,
    avgAppFee: 60,
    stripeFee: 3.5,
    ultraEliteRejectionRate: 90,
    regularRejectionRate: 30,
    claimRate: 80,
    ultraEliteReimbursement: 50,
    regularReimbursement: 80,
    starterPrice: 79,
    standardPrice: 129,
    premiumPrice: 169,
    starterMaxPayout: 250,
    standardMaxPayout: 350,
    premiumMaxPayout: 450,
    starterPct: 33.33,
    standardPct: 33.33,
    premiumPct: 33.34
  });

  // Plan configurations that use adjustable parameters
  const getPlans = () => ({
    starter: {
      name: 'Starter',
      price: params.starterPrice,
      schools: 5,
      ultraEliteMax: 1,
      maxPayout: params.starterMaxPayout
    },
    standard: {
      name: 'Standard',
      price: params.standardPrice,
      schools: 8,
      ultraEliteMax: 2,
      maxPayout: params.standardMaxPayout
    },
    premium: {
      name: 'Premium',
      price: params.premiumPrice,
      schools: 10,
      ultraEliteMax: 3,
      maxPayout: params.premiumMaxPayout
    }
  });

  // Tooltip component
  const Tooltip = ({ text }) => (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-blue-500 font-bold">ⓘ</span>
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-24">
        {text}
      </div>
    </div>
  );

  // Parameter input component
  const ParamInput = ({ label, value, onChange, tooltip, min, max, step, suffix }) => {
    const handleChange = (e) => {
      const val = e.target.value;
      if (val === '' || val === '-') {
        // Allow empty string or just minus sign while typing
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
          <Tooltip text={tooltip} />
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

  // Helper function to determine number of ultra-elite schools for a user
  const getUltraEliteCount = (planType) => {
    const rand = Math.random();
    if (planType === 'starter') return 1;
    if (planType === 'standard') {
      return rand < 0.70 ? 1 : 2;
    }
    if (planType === 'premium') {
      if (rand < 0.40) return 1;
      if (rand < 0.80) return 2;
      return 3;
    }
  };

  // Simulate a single user
  const simulateUser = (planType) => {
    const plans = getPlans();
    const plan = plans[planType];
    const ultraEliteCount = getUltraEliteCount(planType);
    const regularCount = plan.schools - ultraEliteCount;

    // Simulate rejections based on current parameters
    let rejections = 0;
    let ultraEliteRejections = 0;
    let regularRejections = 0;

    // Convert percentages to decimals for calculation
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

    // Calculate potential payout using current reimbursement rates
    let potentialPayout = 0;
    if (rejections > 0) {
      const ultraEliteReimbRate = params.ultraEliteReimbursement / 100;
      const regularReimbRate = params.regularReimbursement / 100;
      
      potentialPayout = (ultraEliteRejections * params.avgAppFee * ultraEliteReimbRate) +
                        (regularRejections * params.avgAppFee * regularReimbRate);
      potentialPayout = Math.min(potentialPayout, plan.maxPayout);
    }

    // Determine if user submits claim based on current claim rate
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

  // Run single iteration of simulation
  const runIteration = () => {
    const starterUsers = Math.floor(params.totalUsers * (params.starterPct / 100));
    const standardUsers = Math.floor(params.totalUsers * (params.standardPct / 100));
    const premiumUsers = params.totalUsers - starterUsers - standardUsers; // Use remainder for premium to ensure total is exact

    const results = {
      starter: [],
      standard: [],
      premium: []
    };

    // Simulate starter users
    for (let i = 0; i < starterUsers; i++) {
      results.starter.push(simulateUser('starter'));
    }

    // Simulate standard users
    for (let i = 0; i < standardUsers; i++) {
      results.standard.push(simulateUser('standard'));
    }

    // Simulate premium users
    for (let i = 0; i < premiumUsers; i++) {
      results.premium.push(simulateUser('premium'));
    }

    return results;
  };

  // Calculate metrics for a plan
  const calculatePlanMetrics = (userResults) => {
    const totalRevenue = userResults.reduce((sum, u) => sum + u.revenue, 0);
    const totalPayouts = userResults.reduce((sum, u) => sum + u.payout, 0);
    const stripeFeeDecimal = params.stripeFee / 100;
    const stripeFeeOnRevenue = totalRevenue * stripeFeeDecimal;
    const stripeFeeOnPayouts = totalPayouts * stripeFeeDecimal;
    const totalStripeFees = stripeFeeOnRevenue + stripeFeeOnPayouts;
    const netProfit = totalRevenue - totalPayouts - totalStripeFees;
    const profitMargin = (netProfit / totalRevenue) * 100;
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

  // Run full Monte Carlo simulation
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
        
        aggregateMetrics.profitMargin = (aggregateMetrics.netProfit / aggregateMetrics.totalRevenue) * 100;
        
        iterations.push({
          starter: starterMetrics,
          standard: standardMetrics,
          premium: premiumMetrics,
          aggregate: aggregateMetrics
        });
      }
      
      // Calculate summary statistics
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
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    return value.toFixed(0);
  };

  const exportToCSV = () => {
    if (!simulationResults) return;

    const csvRows = [];

    // Header
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

    // Aggregate Results
    csvRows.push(['AGGREGATE RESULTS (All Users)']);
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

    // Plan Results
    ['starter', 'standard', 'premium'].forEach(planType => {
      csvRows.push([`${planType.toUpperCase()} PLAN RESULTS`]);
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

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    // Create download link
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

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Unicover Business Model Simulator</h1>
        <p className="text-gray-600">Adjust parameters below and run simulations to test profitability</p>
      </div>

      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Simulation Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">General Settings</h3>
            <ParamInput
              label="Total Users"
              value={params.totalUsers}
              onChange={(v) => updateParam('totalUsers', v)}
              tooltip="The total number of customers in each simulation run. These will be split across the three plan tiers (Starter, Standard, Premium) based on the Plan Distribution percentages you set."
              min={100}
              max={10000}
              step={100}
            />
            <ParamInput
              label="Number of Iterations"
              value={params.numIterations}
              onChange={(v) => updateParam('numIterations', v)}
              tooltip="How many times to run the simulation. More iterations give more accurate results but take longer. 1000 iterations is usually sufficient to see the range of likely outcomes."
              min={100}
              max={5000}
              step={100}
            />
            <ParamInput
              label="Avg Application Fee"
              value={params.avgAppFee}
              onChange={(v) => updateParam('avgAppFee', v)}
              tooltip="The average cost of a college application fee. Most schools charge between $50-$90, so $60 is a reasonable middle estimate."
              min={30}
              max={100}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Stripe Fee"
              value={params.stripeFee}
              onChange={(v) => updateParam('stripeFee', v)}
              tooltip="Stripe charges this percentage on both incoming payments (when users buy plans) and outgoing payouts (when you reimburse users). Standard rate is 2.9% + $0.30, but we're using 3.5% to account for the flat fee."
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
              tooltip="Percentage of total users who choose the Starter plan. All three plan percentages should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
            <ParamInput
              label="Standard Plan %"
              value={params.standardPct}
              onChange={(v) => updateParam('standardPct', v)}
              tooltip="Percentage of total users who choose the Standard plan. All three plan percentages should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
            <ParamInput
              label="Premium Plan %"
              value={params.premiumPct}
              onChange={(v) => updateParam('premiumPct', v)}
              tooltip="Percentage of total users who choose the Premium plan. All three plan percentages should add up to 100%."
              min={0}
              max={100}
              step={0.01}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Rejection & Claim Rates</h3>
            <ParamInput
              label="Ultra-Elite Rejection Rate"
              value={params.ultraEliteRejectionRate}
              onChange={(v) => updateParam('ultraEliteRejectionRate', v)}
              tooltip="Percentage of applicants rejected by ultra-elite schools (those with <10% acceptance rates like Ivy League schools). These schools typically reject 85-95% of applicants."
              min={50}
              max={100}
              step={1}
              suffix="%"
            />
            <ParamInput
              label="Regular School Rejection Rate"
              value={params.regularRejectionRate}
              onChange={(v) => updateParam('regularRejectionRate', v)}
              tooltip="Percentage of applicants rejected by regular schools (acceptance rate >10%). This varies widely, but 20-40% is typical for moderately selective state schools and private colleges."
              min={0}
              max={80}
              step={5}
              suffix="%"
            />
            <ParamInput
              label="Claim Submission Rate"
              value={params.claimRate}
              onChange={(v) => updateParam('claimRate', v)}
              tooltip="Of users who get rejected from at least one school, what percentage actually submit a claim? Not everyone follows through even if eligible. Consider factors like: did they get into their top choice? How motivated are they to collect $100-300?"
              min={20}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Reimbursement Rates</h3>
            <ParamInput
              label="Ultra-Elite Reimbursement"
              value={params.ultraEliteReimbursement}
              onChange={(v) => updateParam('ultraEliteReimbursement', v)}
              tooltip="What percentage of the application fee you reimburse for ultra-elite school rejections. Lower percentage here protects your margins since these schools have very high rejection rates."
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
            <ParamInput
              label="Regular School Reimbursement"
              value={params.regularReimbursement}
              onChange={(v) => updateParam('regularReimbursement', v)}
              tooltip="What percentage of the application fee you reimburse for regular school rejections. Can be higher than ultra-elite rate since rejection probability is lower."
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Plan Pricing</h3>
            <ParamInput
              label="Starter Price"
              value={params.starterPrice}
              onChange={(v) => updateParam('starterPrice', v)}
              tooltip="What you charge for the Starter plan (covers 5 schools, max 1 ultra-elite, $250 max payout). Higher price = more revenue but may reduce conversions."
              min={39}
              max={200}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Standard Price"
              value={params.standardPrice}
              onChange={(v) => updateParam('standardPrice', v)}
              tooltip="What you charge for the Standard plan (covers 8 schools, max 2 ultra-elite, $350 max payout). This is typically your most popular plan."
              min={79}
              max={300}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="Premium Price"
              value={params.premiumPrice}
              onChange={(v) => updateParam('premiumPrice', v)}
              tooltip="What you charge for the Premium plan (covers 10 schools, max 3 ultra-elite, $450 max payout). Higher coverage but also higher risk exposure."
              min={119}
              max={400}
              step={5}
              suffix="$"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Maximum Payouts</h3>
            <ParamInput
              label="Starter Max Payout"
              value={params.starterMaxPayout}
              onChange={(v) => updateParam('starterMaxPayout', v)}
              tooltip="The absolute maximum you'll pay out to any Starter plan user, regardless of how many schools reject them. This cap protects you from worst-case scenarios. Should be 2-4x the plan price."
              min={100}
              max={500}
              step={25}
              suffix="$"
            />
            <ParamInput
              label="Standard Max Payout"
              value={params.standardMaxPayout}
              onChange={(v) => updateParam('standardMaxPayout', v)}
              tooltip="The absolute maximum you'll pay out to any Standard plan user. Should be 2-4x the plan price to ensure profitability even in high-rejection scenarios."
              min={150}
              max={700}
              step={25}
              suffix="$"
            />
            <ParamInput
              label="Premium Max Payout"
              value={params.premiumMaxPayout}
              onChange={(v) => updateParam('premiumMaxPayout', v)}
              tooltip="The absolute maximum you'll pay out to any Premium plan user. Since Premium users apply to more schools (including 3 ultra-elites), this cap is especially important for risk management."
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
            <strong>Monte Carlo Simulation:</strong> This tool runs thousands of randomized scenarios to predict the range of possible outcomes for your Unicover.
            Instead of a single estimate, you'll see the full distribution of results including best case, worst case, and everything in between.
          </p>
          <p>
            <strong>What it simulates:</strong> For each iteration, the tool creates a virtual cohort of users split evenly across three plan tiers (Starter, Standard, Premium).
            Each user applies to multiple schools based on their plan, and we simulate rejections using the rejection rates you set.
            Users who get rejected have a chance to submit claims based on your claim rate parameter.
          </p>
          <p>
            <strong>Key assumptions:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ultra-elite schools (Ivy League, etc.) have higher rejection rates than regular schools</li>
            <li>Premium users are more likely to apply to multiple ultra-elite schools</li>
            <li>Not everyone who gets rejected will submit a claim (controlled by "Claim Submission Rate")</li>
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
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className="px-8 py-4 bg-orange-500 text-white rounded-lg font-semibold text-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg transform transition hover:scale-105"
        >
          {isRunning ? 'Running Simulation...' : `Run ${params.numIterations} Simulations`}
        </button>
        {simulationResults && (
          <button
            onClick={exportToCSV}
            className="px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 shadow-lg transform transition hover:scale-105"
          >
            Export Results to CSV
          </button>
        )}
      </div>

      {simulationResults && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
              Aggregate Results (All {params.totalUsers} Users)
              <Tooltip text="This shows the combined performance across all plans. These are the numbers that matter most for your overall business viability. Look at the Mean for expected performance and the 25th-75th percentile range for realistic variance." />
            </h2>
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
                  <tr className={`${simulationResults.aggregate.netProfit.mean < 0 ? 'bg-red-50' : 'bg-green-50'} font-semibold`}>
                    <td className="border border-gray-300 px-4 py-2">Net Profit</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.netProfit.max)}</td>
                  </tr>
                  <tr className={`${simulationResults.aggregate.profitMargin.mean < 0 ? 'bg-red-100' : 'bg-green-100'} font-semibold`}>
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

          {['starter', 'standard', 'premium'].map((planType) => {
            const getUserCount = (plan) => {
              if (plan === 'starter') return Math.floor(params.totalUsers * (params.starterPct / 100));
              if (plan === 'standard') return Math.floor(params.totalUsers * (params.standardPct / 100));
              // Premium gets the remainder
              const starterUsers = Math.floor(params.totalUsers * (params.starterPct / 100));
              const standardUsers = Math.floor(params.totalUsers * (params.standardPct / 100));
              return params.totalUsers - starterUsers - standardUsers;
            };

            return (
            <div key={planType}>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 capitalize flex items-center">
                {planType} Plan Results ({getUserCount(planType)} Users - {planType === 'starter' ? params.starterPct : planType === 'standard' ? params.standardPct : params.premiumPct}%)
                <Tooltip text={`Detailed breakdown for just the ${planType} plan. Compare profit margins across plans to see which tier is most profitable per user.`} />
              </h2>
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
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].revenue.max)}</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">Total Payouts</td>
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
                    <tr className={`${simulationResults[planType].netProfit.mean < 0 ? 'bg-red-50' : 'bg-green-50'} font-semibold`}>
                      <td className="border border-gray-300 px-4 py-2">Net Profit</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].netProfit.max)}</td>
                    </tr>
                    <tr className={`${simulationResults[planType].profitMargin.mean < 0 ? 'bg-red-100' : 'bg-green-100'} font-semibold`}>
                      <td className="border border-gray-300 px-4 py-2">Profit Margin</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatPercent(simulationResults[planType].profitMargin.max)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Users Who Submitted Claims</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatNumber(simulationResults[planType].usersWithClaims.max)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Avg Payout Per Claimer</td>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UniCoverSimulation;