// Web Worker for running Monte Carlo simulations in background thread

const getPlans = (params) => ({
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

const simulateUser = (planType, params, plans) => {
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

const runIteration = (params, plans) => {
  const starterUsers = Math.floor(params.totalUsers * (params.starterPct / 100));
  const standardUsers = Math.floor(params.totalUsers * (params.standardPct / 100));
  const premiumUsers = params.totalUsers - starterUsers - standardUsers;

  const results = {
    starter: [],
    standard: [],
    premium: []
  };

  for (let i = 0; i < starterUsers; i++) {
    results.starter.push(simulateUser('starter', params, plans));
  }

  for (let i = 0; i < standardUsers; i++) {
    results.standard.push(simulateUser('standard', params, plans));
  }

  for (let i = 0; i < premiumUsers; i++) {
    results.premium.push(simulateUser('premium', params, plans));
  }

  return results;
};

const calculatePlanMetrics = (userResults, params) => {
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

// Listen for messages from main thread
self.addEventListener('message', (e) => {
  const { params, progressInterval = 100 } = e.data;

  const plans = getPlans(params);
  const iterations = [];

  for (let i = 0; i < params.numIterations; i++) {
    const iterationResults = runIteration(params, plans);
    const starterMetrics = calculatePlanMetrics(iterationResults.starter, params);
    const standardMetrics = calculatePlanMetrics(iterationResults.standard, params);
    const premiumMetrics = calculatePlanMetrics(iterationResults.premium, params);

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

    // Send progress update every N iterations
    if ((i + 1) % progressInterval === 0 || i === params.numIterations - 1) {
      self.postMessage({
        type: 'progress',
        completed: i + 1,
        total: params.numIterations,
        percentage: ((i + 1) / params.numIterations) * 100
      });
    }
  }

  // Calculate final statistics
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

  // Send final results
  self.postMessage({
    type: 'complete',
    results
  });
});
