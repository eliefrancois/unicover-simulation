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

const getInstitutionalDiscount = (params) => {
  // Discount tiers: Pilot 15%, Small 20%, Medium 25%, Large 30%, Enterprise 35%
  const rand = Math.random() * 100;
  let cumulative = 0;

  cumulative += params.pilotPct;
  if (rand < cumulative) return 0.15;

  cumulative += params.smallPct;
  if (rand < cumulative) return 0.20;

  cumulative += params.mediumPct;
  if (rand < cumulative) return 0.25;

  cumulative += params.largePct;
  if (rand < cumulative) return 0.30;

  return 0.35; // Enterprise
};

const simulateUser = (planType, params, plans, channel) => {
  const plan = plans[planType];
  const ultraEliteCount = getUltraEliteCount(planType, plan.ultraEliteMax);
  const regularCount = plan.schools - ultraEliteCount;

  let rejections = 0;
  let ultraEliteRejections = 0;
  let regularRejections = 0;

  // Use different rejection rates based on channel
  const ultraEliteRejRate = channel === 'b2c'
    ? params.ultraEliteRejectionRate / 100
    : params.institutionalUltraEliteRejectionRate / 100;
  const regularRejRate = channel === 'b2c'
    ? params.regularRejectionRate / 100
    : params.institutionalRegularRejectionRate / 100;

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

  // Calculate revenue based on channel
  let revenue = plan.price;
  if (channel === 'b2b2c') {
    const discount = getInstitutionalDiscount(params);
    revenue = plan.price * (1 - discount);
  }

  // Add CAC cost
  const cac = channel === 'b2c' ? params.b2cCAC : params.b2b2cCAC;

  return {
    planType,
    channel,
    revenue,
    cac,
    rejections,
    ultraEliteRejections,
    regularRejections,
    submitsClaim,
    payout: actualPayout
  };
};

const runIteration = (params, plans) => {
  // Determine channel distribution
  let b2cUsers = 0;
  let b2b2cUsers = 0;

  if (params.channelMode === 'b2c_only') {
    b2cUsers = params.totalUsers;
  } else if (params.channelMode === 'b2b2c_only') {
    b2b2cUsers = params.totalUsers;
  } else { // both
    b2cUsers = Math.floor(params.totalUsers * (params.b2cPct / 100));
    b2b2cUsers = params.totalUsers - b2cUsers;
  }

  // Calculate plan distribution for each channel
  const b2cStarter = Math.floor(b2cUsers * (params.starterPct / 100));
  const b2cStandard = Math.floor(b2cUsers * (params.standardPct / 100));
  const b2cPremium = b2cUsers - b2cStarter - b2cStandard;

  const b2b2cStarter = Math.floor(b2b2cUsers * (params.starterPct / 100));
  const b2b2cStandard = Math.floor(b2b2cUsers * (params.standardPct / 100));
  const b2b2cPremium = b2b2cUsers - b2b2cStarter - b2b2cStandard;

  const results = {
    b2c: {
      starter: [],
      standard: [],
      premium: []
    },
    b2b2c: {
      starter: [],
      standard: [],
      premium: []
    }
  };

  // Simulate B2C users
  for (let i = 0; i < b2cStarter; i++) {
    results.b2c.starter.push(simulateUser('starter', params, plans, 'b2c'));
  }
  for (let i = 0; i < b2cStandard; i++) {
    results.b2c.standard.push(simulateUser('standard', params, plans, 'b2c'));
  }
  for (let i = 0; i < b2cPremium; i++) {
    results.b2c.premium.push(simulateUser('premium', params, plans, 'b2c'));
  }

  // Simulate B2B2C users
  for (let i = 0; i < b2b2cStarter; i++) {
    results.b2b2c.starter.push(simulateUser('starter', params, plans, 'b2b2c'));
  }
  for (let i = 0; i < b2b2cStandard; i++) {
    results.b2b2c.standard.push(simulateUser('standard', params, plans, 'b2b2c'));
  }
  for (let i = 0; i < b2b2cPremium; i++) {
    results.b2b2c.premium.push(simulateUser('premium', params, plans, 'b2b2c'));
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
      totalCAC: 0,
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
  const totalCAC = userResults.reduce((sum, u) => sum + u.cac, 0);
  const stripeFeeDecimal = params.stripeFee / 100;
  const stripeFeeOnRevenue = totalRevenue * stripeFeeDecimal;
  const stripeFeeOnPayouts = totalPayouts * stripeFeeDecimal;
  const totalStripeFees = stripeFeeOnRevenue + stripeFeeOnPayouts;
  const netProfit = totalRevenue - totalPayouts - totalStripeFees - totalCAC;
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
    totalCAC,
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

    // Calculate metrics for B2C channel
    const b2cStarterMetrics = calculatePlanMetrics(iterationResults.b2c.starter, params);
    const b2cStandardMetrics = calculatePlanMetrics(iterationResults.b2c.standard, params);
    const b2cPremiumMetrics = calculatePlanMetrics(iterationResults.b2c.premium, params);

    // Calculate metrics for B2B2C channel
    const b2b2cStarterMetrics = calculatePlanMetrics(iterationResults.b2b2c.starter, params);
    const b2b2cStandardMetrics = calculatePlanMetrics(iterationResults.b2b2c.standard, params);
    const b2b2cPremiumMetrics = calculatePlanMetrics(iterationResults.b2b2c.premium, params);

    // Combined metrics by plan (B2C + B2B2C)
    const starterMetrics = {
      totalRevenue: b2cStarterMetrics.totalRevenue + b2b2cStarterMetrics.totalRevenue,
      totalPayouts: b2cStarterMetrics.totalPayouts + b2b2cStarterMetrics.totalPayouts,
      totalStripeFees: b2cStarterMetrics.totalStripeFees + b2b2cStarterMetrics.totalStripeFees,
      totalCAC: b2cStarterMetrics.totalCAC + b2b2cStarterMetrics.totalCAC,
      netProfit: b2cStarterMetrics.netProfit + b2b2cStarterMetrics.netProfit,
      usersWhoSubmittedClaims: b2cStarterMetrics.usersWhoSubmittedClaims + b2b2cStarterMetrics.usersWhoSubmittedClaims,
      userCount: b2cStarterMetrics.userCount + b2b2cStarterMetrics.userCount
    };
    starterMetrics.profitMargin = starterMetrics.totalRevenue > 0 ? (starterMetrics.netProfit / starterMetrics.totalRevenue) * 100 : 0;
    starterMetrics.avgPayoutPerClaimer = starterMetrics.usersWhoSubmittedClaims > 0 ? starterMetrics.totalPayouts / starterMetrics.usersWhoSubmittedClaims : 0;

    const standardMetrics = {
      totalRevenue: b2cStandardMetrics.totalRevenue + b2b2cStandardMetrics.totalRevenue,
      totalPayouts: b2cStandardMetrics.totalPayouts + b2b2cStandardMetrics.totalPayouts,
      totalStripeFees: b2cStandardMetrics.totalStripeFees + b2b2cStandardMetrics.totalStripeFees,
      totalCAC: b2cStandardMetrics.totalCAC + b2b2cStandardMetrics.totalCAC,
      netProfit: b2cStandardMetrics.netProfit + b2b2cStandardMetrics.netProfit,
      usersWhoSubmittedClaims: b2cStandardMetrics.usersWhoSubmittedClaims + b2b2cStandardMetrics.usersWhoSubmittedClaims,
      userCount: b2cStandardMetrics.userCount + b2b2cStandardMetrics.userCount
    };
    standardMetrics.profitMargin = standardMetrics.totalRevenue > 0 ? (standardMetrics.netProfit / standardMetrics.totalRevenue) * 100 : 0;
    standardMetrics.avgPayoutPerClaimer = standardMetrics.usersWhoSubmittedClaims > 0 ? standardMetrics.totalPayouts / standardMetrics.usersWhoSubmittedClaims : 0;

    const premiumMetrics = {
      totalRevenue: b2cPremiumMetrics.totalRevenue + b2b2cPremiumMetrics.totalRevenue,
      totalPayouts: b2cPremiumMetrics.totalPayouts + b2b2cPremiumMetrics.totalPayouts,
      totalStripeFees: b2cPremiumMetrics.totalStripeFees + b2b2cPremiumMetrics.totalStripeFees,
      totalCAC: b2cPremiumMetrics.totalCAC + b2b2cPremiumMetrics.totalCAC,
      netProfit: b2cPremiumMetrics.netProfit + b2b2cPremiumMetrics.netProfit,
      usersWhoSubmittedClaims: b2cPremiumMetrics.usersWhoSubmittedClaims + b2b2cPremiumMetrics.usersWhoSubmittedClaims,
      userCount: b2cPremiumMetrics.userCount + b2b2cPremiumMetrics.userCount
    };
    premiumMetrics.profitMargin = premiumMetrics.totalRevenue > 0 ? (premiumMetrics.netProfit / premiumMetrics.totalRevenue) * 100 : 0;
    premiumMetrics.avgPayoutPerClaimer = premiumMetrics.usersWhoSubmittedClaims > 0 ? premiumMetrics.totalPayouts / premiumMetrics.usersWhoSubmittedClaims : 0;

    // Aggregate across all channels
    const b2cAggregateMetrics = {
      totalRevenue: b2cStarterMetrics.totalRevenue + b2cStandardMetrics.totalRevenue + b2cPremiumMetrics.totalRevenue,
      totalPayouts: b2cStarterMetrics.totalPayouts + b2cStandardMetrics.totalPayouts + b2cPremiumMetrics.totalPayouts,
      totalStripeFees: b2cStarterMetrics.totalStripeFees + b2cStandardMetrics.totalStripeFees + b2cPremiumMetrics.totalStripeFees,
      totalCAC: b2cStarterMetrics.totalCAC + b2cStandardMetrics.totalCAC + b2cPremiumMetrics.totalCAC,
      netProfit: b2cStarterMetrics.netProfit + b2cStandardMetrics.netProfit + b2cPremiumMetrics.netProfit
    };
    b2cAggregateMetrics.profitMargin = b2cAggregateMetrics.totalRevenue > 0 ? (b2cAggregateMetrics.netProfit / b2cAggregateMetrics.totalRevenue) * 100 : 0;

    const b2b2cAggregateMetrics = {
      totalRevenue: b2b2cStarterMetrics.totalRevenue + b2b2cStandardMetrics.totalRevenue + b2b2cPremiumMetrics.totalRevenue,
      totalPayouts: b2b2cStarterMetrics.totalPayouts + b2b2cStandardMetrics.totalPayouts + b2b2cPremiumMetrics.totalPayouts,
      totalStripeFees: b2b2cStarterMetrics.totalStripeFees + b2b2cStandardMetrics.totalStripeFees + b2b2cPremiumMetrics.totalStripeFees,
      totalCAC: b2b2cStarterMetrics.totalCAC + b2b2cStandardMetrics.totalCAC + b2b2cPremiumMetrics.totalCAC,
      netProfit: b2b2cStarterMetrics.netProfit + b2b2cStandardMetrics.netProfit + b2b2cPremiumMetrics.netProfit
    };
    b2b2cAggregateMetrics.profitMargin = b2b2cAggregateMetrics.totalRevenue > 0 ? (b2b2cAggregateMetrics.netProfit / b2b2cAggregateMetrics.totalRevenue) * 100 : 0;

    const aggregateMetrics = {
      totalRevenue: starterMetrics.totalRevenue + standardMetrics.totalRevenue + premiumMetrics.totalRevenue,
      totalPayouts: starterMetrics.totalPayouts + standardMetrics.totalPayouts + premiumMetrics.totalPayouts,
      totalStripeFees: starterMetrics.totalStripeFees + standardMetrics.totalStripeFees + premiumMetrics.totalStripeFees,
      totalCAC: starterMetrics.totalCAC + standardMetrics.totalCAC + premiumMetrics.totalCAC,
      netProfit: starterMetrics.netProfit + standardMetrics.netProfit + premiumMetrics.netProfit
    };
    aggregateMetrics.profitMargin = aggregateMetrics.totalRevenue > 0 ? (aggregateMetrics.netProfit / aggregateMetrics.totalRevenue) * 100 : 0;

    iterations.push({
      starter: starterMetrics,
      standard: standardMetrics,
      premium: premiumMetrics,
      aggregate: aggregateMetrics,
      b2c: {
        starter: b2cStarterMetrics,
        standard: b2cStandardMetrics,
        premium: b2cPremiumMetrics,
        aggregate: b2cAggregateMetrics
      },
      b2b2c: {
        starter: b2b2cStarterMetrics,
        standard: b2b2cStandardMetrics,
        premium: b2b2cPremiumMetrics,
        aggregate: b2b2cAggregateMetrics
      }
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
      cac: calculateStats(iterations.map(i => i.starter.totalCAC)),
      netProfit: calculateStats(iterations.map(i => i.starter.netProfit)),
      profitMargin: calculateStats(iterations.map(i => i.starter.profitMargin)),
      usersWithClaims: calculateStats(iterations.map(i => i.starter.usersWhoSubmittedClaims)),
      avgPayoutPerClaimer: calculateStats(iterations.map(i => i.starter.avgPayoutPerClaimer))
    },
    standard: {
      revenue: calculateStats(iterations.map(i => i.standard.totalRevenue)),
      payouts: calculateStats(iterations.map(i => i.standard.totalPayouts)),
      stripeFees: calculateStats(iterations.map(i => i.standard.totalStripeFees)),
      cac: calculateStats(iterations.map(i => i.standard.totalCAC)),
      netProfit: calculateStats(iterations.map(i => i.standard.netProfit)),
      profitMargin: calculateStats(iterations.map(i => i.standard.profitMargin)),
      usersWithClaims: calculateStats(iterations.map(i => i.standard.usersWhoSubmittedClaims)),
      avgPayoutPerClaimer: calculateStats(iterations.map(i => i.standard.avgPayoutPerClaimer))
    },
    premium: {
      revenue: calculateStats(iterations.map(i => i.premium.totalRevenue)),
      payouts: calculateStats(iterations.map(i => i.premium.totalPayouts)),
      stripeFees: calculateStats(iterations.map(i => i.premium.totalStripeFees)),
      cac: calculateStats(iterations.map(i => i.premium.totalCAC)),
      netProfit: calculateStats(iterations.map(i => i.premium.netProfit)),
      profitMargin: calculateStats(iterations.map(i => i.premium.profitMargin)),
      usersWithClaims: calculateStats(iterations.map(i => i.premium.usersWhoSubmittedClaims)),
      avgPayoutPerClaimer: calculateStats(iterations.map(i => i.premium.avgPayoutPerClaimer))
    },
    aggregate: {
      revenue: calculateStats(iterations.map(i => i.aggregate.totalRevenue)),
      payouts: calculateStats(iterations.map(i => i.aggregate.totalPayouts)),
      stripeFees: calculateStats(iterations.map(i => i.aggregate.totalStripeFees)),
      cac: calculateStats(iterations.map(i => i.aggregate.totalCAC)),
      netProfit: calculateStats(iterations.map(i => i.aggregate.netProfit)),
      profitMargin: calculateStats(iterations.map(i => i.aggregate.profitMargin))
    },
    b2c: {
      starter: {
        revenue: calculateStats(iterations.map(i => i.b2c.starter.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2c.starter.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2c.starter.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2c.starter.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2c.starter.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2c.starter.profitMargin))
      },
      standard: {
        revenue: calculateStats(iterations.map(i => i.b2c.standard.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2c.standard.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2c.standard.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2c.standard.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2c.standard.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2c.standard.profitMargin))
      },
      premium: {
        revenue: calculateStats(iterations.map(i => i.b2c.premium.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2c.premium.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2c.premium.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2c.premium.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2c.premium.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2c.premium.profitMargin))
      },
      aggregate: {
        revenue: calculateStats(iterations.map(i => i.b2c.aggregate.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2c.aggregate.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2c.aggregate.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2c.aggregate.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2c.aggregate.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2c.aggregate.profitMargin))
      }
    },
    b2b2c: {
      starter: {
        revenue: calculateStats(iterations.map(i => i.b2b2c.starter.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2b2c.starter.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2b2c.starter.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2b2c.starter.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2b2c.starter.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2b2c.starter.profitMargin))
      },
      standard: {
        revenue: calculateStats(iterations.map(i => i.b2b2c.standard.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2b2c.standard.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2b2c.standard.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2b2c.standard.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2b2c.standard.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2b2c.standard.profitMargin))
      },
      premium: {
        revenue: calculateStats(iterations.map(i => i.b2b2c.premium.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2b2c.premium.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2b2c.premium.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2b2c.premium.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2b2c.premium.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2b2c.premium.profitMargin))
      },
      aggregate: {
        revenue: calculateStats(iterations.map(i => i.b2b2c.aggregate.totalRevenue)),
        payouts: calculateStats(iterations.map(i => i.b2b2c.aggregate.totalPayouts)),
        stripeFees: calculateStats(iterations.map(i => i.b2b2c.aggregate.totalStripeFees)),
        cac: calculateStats(iterations.map(i => i.b2b2c.aggregate.totalCAC)),
        netProfit: calculateStats(iterations.map(i => i.b2b2c.aggregate.netProfit)),
        profitMargin: calculateStats(iterations.map(i => i.b2b2c.aggregate.profitMargin))
      }
    }
  };

  // Send final results
  self.postMessage({
    type: 'complete',
    results
  });
});
