import React, { useState, useRef, useEffect } from 'react';

const UniCoverSimulation = () => {
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [activeTab, setActiveTab] = useState('retail'); // 'retail' or 'institutional'
  const workerRef = useRef(null);

  const [params, setParams] = useState({
    // Channel Distribution
    channelMode: 'both', // 'both', 'b2c_only', 'b2b2c_only'
    b2cPct: 60, // % of users from B2C when mode is 'both'

    // General
    totalUsers: 5000,
    numIterations: 2000,
    avgAppFee: 44, // Real data from DOE and in-house data
    stripeFee: 3.5,
    claimRate: 90,

    // B2C (Retail) Rejection Rates - Real data from DOE
    ultraEliteRejectionRate: 93, // Real data: ultra-elite schools reject 93%
    regularRejectionRate: 27, // Real data: regular schools reject 27%

    // B2B2C (Institutional) Rejection Rates - Same students, same rates
    institutionalUltraEliteRejectionRate: 93, // Same as retail - same students
    institutionalRegularRejectionRate: 27, // Same as retail - same students

    // Institutional Discount Tier Distribution (must add up to 100%)
    pilotPct: 20,      // 15% discount
    smallPct: 30,      // 20% discount
    mediumPct: 30,     // 25% discount
    largePct: 15,      // 30% discount
    enterprisePct: 5,  // 35% discount

    // Customer Acquisition Costs
    b2cCAC: 50,        // Higher CAC for retail (ads, marketing)
    b2b2cCAC: 5,       // Lower CAC for institutional (sales calls, demos)

    // Reimbursement
    ultraEliteReimbursement: 50,
    regularReimbursement: 65,

    // Pricing & Coverage
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
    const [localValue, setLocalValue] = React.useState(value);

    // Update local value when prop changes (e.g., from reset or external update)
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleChange = (e) => {
      const val = e.target.value;
      setLocalValue(val); // Allow any input including empty string
    };

    const handleBlur = () => {
      // Validate and update parent state on blur
      const numVal = parseFloat(localValue);
      if (!isNaN(numVal)) {
        onChange(numVal);
      } else {
        // Reset to last valid value if invalid
        setLocalValue(value);
      }
    };

    const handleKeyDown = (e) => {
      // Update on Enter key
      if (e.key === 'Enter') {
        handleBlur();
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
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
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

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./simulationWorker.js', import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { type, results, completed, total, percentage } = e.data;

      if (type === 'progress') {
        setProgress({ completed, total, percentage });
      } else if (type === 'complete') {
        setSimulationResults(results);
        setIsRunning(false);
        setProgress({ completed: 0, total: 0, percentage: 0 });
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const runSimulation = () => {
    setIsRunning(true);
    setProgress({ completed: 0, total: params.numIterations, percentage: 0 });

    // Send parameters to worker
    workerRef.current.postMessage({
      params,
      progressInterval: Math.max(1, Math.floor(params.numIterations / 100)) // Update progress 100 times
    });
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

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('retail')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'retail'
                ? 'border-b-4 border-orange-500 text-orange-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Retail (B2C)
          </button>
          <button
            onClick={() => setActiveTab('institutional')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'institutional'
                ? 'border-b-4 border-purple-500 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Institutional (B2B2C)
          </button>
        </div>

        {/* Always Visible: Channel Distribution & General Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-300">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Channel Distribution</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Mode
                <Tooltip text="Choose whether to simulate B2C (direct retail), B2B2C (institutional), or both channels together" />
              </label>
              <select
                value={params.channelMode}
                onChange={(e) => updateParam('channelMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="both">Both Channels</option>
                <option value="b2c_only">B2C Only (Retail)</option>
                <option value="b2b2c_only">B2B2C Only (Institutional)</option>
              </select>
            </div>
            {params.channelMode === 'both' && (
              <ParamInput
                label="B2C %"
                value={params.b2cPct}
                onChange={(v) => updateParam('b2cPct', v)}
                tooltip="Percentage of total users from retail channel. Remainder will be institutional."
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            )}
          </div>

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
              tooltip="Real data: average application fee is $44 across all schools (DOE + in-house data)"
              min={30}
              max={100}
              step={1}
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
            <h3 className="font-semibold text-gray-800 mb-3">Customer Acquisition Costs</h3>
            <ParamInput
              label="B2C CAC"
              value={params.b2cCAC}
              onChange={(v) => updateParam('b2cCAC', v)}
              tooltip="Customer Acquisition Cost for retail users (ads, marketing, etc.)"
              min={0}
              max={200}
              step={5}
              suffix="$"
            />
            <ParamInput
              label="B2B2C CAC"
              value={params.b2b2cCAC}
              onChange={(v) => updateParam('b2b2cCAC', v)}
              tooltip="Customer Acquisition Cost per institutional user (sales, demos). Typically much lower."
              min={0}
              max={100}
              step={1}
              suffix="$"
            />
          </div>
        </div>

        {/* Retail (B2C) Tab Content */}
        {activeTab === 'retail' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              tooltip="Real data from DOE: ultra-elite schools (Ivy League, etc.) reject 93% of applicants on average."
              min={50}
              max={100}
              step={1}
              suffix="%"
            />
            <ParamInput
              label="Regular Rejection"
              value={params.regularRejectionRate}
              onChange={(v) => updateParam('regularRejectionRate', v)}
              tooltip="Real data from DOE and in-house: regular schools reject 27% of applicants on average. KEY DRIVER of profitability."
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
        )}

        {/* Institutional (B2B2C) Tab Content */}
        {activeTab === 'institutional' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <h3 className="font-semibold text-gray-800 mb-3">Institutional Rejection Rates</h3>
              <ParamInput
                label="Ultra-Elite Rejection"
                value={params.institutionalUltraEliteRejectionRate}
                onChange={(v) => updateParam('institutionalUltraEliteRejectionRate', v)}
                tooltip="Same students, same rates: 93% rejection rate for ultra-elite schools (real DOE data)"
                min={50}
                max={100}
                step={1}
                suffix="%"
              />
              <ParamInput
                label="Regular Rejection"
                value={params.institutionalRegularRejectionRate}
                onChange={(v) => updateParam('institutionalRegularRejectionRate', v)}
                tooltip="Same students, same rates: 27% rejection rate for regular schools (real DOE data)"
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
              <h3 className="font-semibold text-gray-800 mb-3">
                Discount Tier Distribution
                {Math.abs((params.pilotPct + params.smallPct + params.mediumPct + params.largePct + params.enterprisePct) - 100) > 0.01 && (
                  <span className="ml-2 text-xs font-normal text-red-600">
                    (Total: {(params.pilotPct + params.smallPct + params.mediumPct + params.largePct + params.enterprisePct).toFixed(1)}%)
                  </span>
                )}
              </h3>
              <ParamInput
                label="Pilot (15% off)"
                value={params.pilotPct}
                onChange={(v) => updateParam('pilotPct', v)}
                tooltip="% of institutional users in Pilot tier (25-99 students, 15% discount). All five should add to 100%."
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
              <ParamInput
                label="Small (20% off)"
                value={params.smallPct}
                onChange={(v) => updateParam('smallPct', v)}
                tooltip="% of institutional users in Small tier (100-249 students, 20% discount)"
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
              <ParamInput
                label="Medium (25% off)"
                value={params.mediumPct}
                onChange={(v) => updateParam('mediumPct', v)}
                tooltip="% of institutional users in Medium tier (250-499 students, 25% discount)"
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
              <ParamInput
                label="Large (30% off)"
                value={params.largePct}
                onChange={(v) => updateParam('largePct', v)}
                tooltip="% of institutional users in Large tier (500-999 students, 30% discount)"
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
              <ParamInput
                label="Enterprise (35% off)"
                value={params.enterprisePct}
                onChange={(v) => updateParam('enterprisePct', v)}
                tooltip="% of institutional users in Enterprise tier (1000+ students, 35% discount)"
                min={0}
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
        )}
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

      {isRunning && (
        <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Running simulation: {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} iterations
            </span>
            <span className="text-sm font-medium text-blue-600">
              {progress.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            UI remains responsive - simulation running in background thread
          </p>
        </div>
      )}

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
                  <tr className="bg-orange-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">Customer Acquisition Cost (CAC)</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.mean)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.median)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.p25)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.p75)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.min)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults.aggregate.cac.max)}</td>
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
                    <tr className="bg-orange-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">CAC</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.mean)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.median)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.p25)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.p75)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.min)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(simulationResults[planType].cac.max)}</td>
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

          {/* Channel Comparison Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Channel Comparison: B2C vs B2B2C</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* B2C Results */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-xl font-semibold mb-4 text-blue-900">B2C (Retail) Channel</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-gray-300 px-3 py-2 text-left">Metric</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Mean</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Revenue</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2c.aggregate.revenue.mean)}</td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="border border-gray-300 px-3 py-2 font-medium">Payouts</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2c.aggregate.payouts.mean)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Stripe Fees</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2c.aggregate.stripeFees.mean)}</td>
                      </tr>
                      <tr className="bg-orange-50">
                        <td className="border border-gray-300 px-3 py-2 font-medium">CAC</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2c.aggregate.cac.mean)}</td>
                      </tr>
                      <tr className={simulationResults.b2c.aggregate.netProfit.mean < 0 ? 'bg-red-100 font-semibold' : 'bg-green-100 font-semibold'}>
                        <td className="border border-gray-300 px-3 py-2">Net Profit</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2c.aggregate.netProfit.mean)}</td>
                      </tr>
                      <tr className={simulationResults.b2c.aggregate.profitMargin.mean < 0 ? 'bg-red-200 font-semibold' : 'bg-green-200 font-semibold'}>
                        <td className="border border-gray-300 px-3 py-2">Profit Margin</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatPercent(simulationResults.b2c.aggregate.profitMargin.mean)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* B2B2C Results */}
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <h3 className="text-xl font-semibold mb-4 text-purple-900">B2B2C (Institutional) Channel</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-purple-100">
                        <th className="border border-gray-300 px-3 py-2 text-left">Metric</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Mean</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Revenue</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2b2c.aggregate.revenue.mean)}</td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="border border-gray-300 px-3 py-2 font-medium">Payouts</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2b2c.aggregate.payouts.mean)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Stripe Fees</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2b2c.aggregate.stripeFees.mean)}</td>
                      </tr>
                      <tr className="bg-orange-50">
                        <td className="border border-gray-300 px-3 py-2 font-medium">CAC</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2b2c.aggregate.cac.mean)}</td>
                      </tr>
                      <tr className={simulationResults.b2b2c.aggregate.netProfit.mean < 0 ? 'bg-red-100 font-semibold' : 'bg-green-100 font-semibold'}>
                        <td className="border border-gray-300 px-3 py-2">Net Profit</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(simulationResults.b2b2c.aggregate.netProfit.mean)}</td>
                      </tr>
                      <tr className={simulationResults.b2b2c.aggregate.profitMargin.mean < 0 ? 'bg-red-200 font-semibold' : 'bg-green-200 font-semibold'}>
                        <td className="border border-gray-300 px-3 py-2">Profit Margin</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatPercent(simulationResults.b2b2c.aggregate.profitMargin.mean)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Value Calculator */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Institutional Contract Value Calculator</h2>
            <p className="text-sm text-gray-600 mb-4">
              Based on your current pricing and discount tiers, here are sample institutional contract values:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sample Contract 1 */}
              <div className="bg-white p-4 rounded-lg border border-green-300">
                <h3 className="font-semibold text-lg mb-3 text-green-800">Medium High School (300 students)</h3>
                <div className="text-sm space-y-2">
                  <p className="text-gray-600">Plan Mix: 50 Starter, 200 Standard, 50 Premium</p>
                  <p className="text-gray-600">Tier: Medium (25% discount)</p>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span>Starter (50 × ${(params.starterPrice * 0.75).toFixed(0)}):</span>
                      <span className="font-medium">${(50 * params.starterPrice * 0.75).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard (200 × ${(params.standardPrice * 0.75).toFixed(0)}):</span>
                      <span className="font-medium">${(200 * params.standardPrice * 0.75).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium (50 × ${(params.premiumPrice * 0.75).toFixed(0)}):</span>
                      <span className="font-medium">${(50 * params.premiumPrice * 0.75).toFixed(0)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-green-700">
                      <span>Total Contract:</span>
                      <span>${(50 * params.starterPrice * 0.75 + 200 * params.standardPrice * 0.75 + 50 * params.premiumPrice * 0.75).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Contract 2 */}
              <div className="bg-white p-4 rounded-lg border border-green-300">
                <h3 className="font-semibold text-lg mb-3 text-green-800">Large Network (1,000 students)</h3>
                <div className="text-sm space-y-2">
                  <p className="text-gray-600">Plan Mix: 100 Starter, 700 Standard, 200 Premium</p>
                  <p className="text-gray-600">Tier: Enterprise (35% discount)</p>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span>Starter (100 × ${(params.starterPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(100 * params.starterPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard (700 × ${(params.standardPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(700 * params.standardPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium (200 × ${(params.premiumPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(200 * params.premiumPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-green-700">
                      <span>Total Contract:</span>
                      <span>${(100 * params.starterPrice * 0.65 + 700 * params.standardPrice * 0.65 + 200 * params.premiumPrice * 0.65).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Contract 3 */}
              <div className="bg-white p-4 rounded-lg border border-green-300">
                <h3 className="font-semibold text-lg mb-3 text-green-800">School District (1,500 students)</h3>
                <div className="text-sm space-y-2">
                  <p className="text-gray-600">Plan Mix: 200 Starter, 1000 Standard, 300 Premium</p>
                  <p className="text-gray-600">Tier: Enterprise (35% discount)</p>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span>Starter (200 × ${(params.starterPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(200 * params.starterPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard (1000 × ${(params.standardPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(1000 * params.standardPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium (300 × ${(params.premiumPrice * 0.65).toFixed(0)}):</span>
                      <span className="font-medium">${(300 * params.premiumPrice * 0.65).toFixed(0)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-green-700">
                      <span>Total Contract:</span>
                      <span>${(200 * params.starterPrice * 0.65 + 1000 * params.standardPrice * 0.65 + 300 * params.premiumPrice * 0.65).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-white rounded border border-green-300">
              <h4 className="font-semibold mb-2">Discount Tier Reference</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Pilot:</span>
                  <p className="text-gray-600">25-99 students</p>
                  <p className="text-green-700 font-semibold">15% off</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Small:</span>
                  <p className="text-gray-600">100-249 students</p>
                  <p className="text-green-700 font-semibold">20% off</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Medium:</span>
                  <p className="text-gray-600">250-499 students</p>
                  <p className="text-green-700 font-semibold">25% off</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Large:</span>
                  <p className="text-gray-600">500-999 students</p>
                  <p className="text-green-700 font-semibold">30% off</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Enterprise:</span>
                  <p className="text-gray-600">1000+ students</p>
                  <p className="text-green-700 font-semibold">35% off</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniCoverSimulation;
