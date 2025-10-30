# UniCover Pricing Profitability Analysis

## Executive Summary

Current stress test pricing ($99/$159/$199) with 90% claim rate provides healthy margins. With realistic claim rates (30-50%), there's significant room to reduce pricing while maintaining profitability.

**Recommended Launch Pricing:** $79-89 / $119-129 / $159-169

---

## Current Simulation Parameters

- **Total Users:** 5,000 per iteration
- **Iterations:** 2,000
- **Average Application Fee:** $70
- **Stripe Fee:** 3.5%
- **Ultra-Elite Rejection Rate:** 80%
- **Regular Rejection Rate:** 30%
- **Ultra-Elite Reimbursement:** 50%
- **Regular Reimbursement:** 65%
- **Claim Rate (Stress Test):** 90%

### Plan Coverage

| Plan | Price | Total Schools | Ultra-Elite Max | Max Payout |
|------|-------|---------------|-----------------|------------|
| Starter | $99 | 4 | 1 | $200 |
| Standard | $159 | 6 | 2 | $300 |
| Premium | $199 | 8 | 3 | $375 |

---

## Cost Structure Analysis

### Expected Costs Per User

#### With 90% Claim Rate (Current Stress Test)

**Starter Plan:**
- Expected ultra-elite rejections: 0.8
- Expected regular rejections: 0.9
- Expected payout: ~$62
- Stripe fees: ~$7
- **Total cost: ~$69**
- **Net profit at $99: ~$30 (30% margin)**

**Standard Plan:**
- Expected ultra-elite rejections: ~1.1
- Expected regular rejections: ~1.35
- Expected payout: ~$90
- Stripe fees: ~$11
- **Total cost: ~$101**
- **Net profit at $159: ~$58 (36% margin)**

**Premium Plan:**
- Expected ultra-elite rejections: ~1.5
- Expected regular rejections: ~1.65
- Expected payout: ~$115
- Stripe fees: ~$14
- **Total cost: ~$129**
- **Net profit at $199: ~$70 (35% margin)**

---

## Realistic Claim Rate Scenarios

### Scenario 1: 30% Claim Rate (Conservative)

| Plan | Price | Expected Payout | Stripe Fees | Net Profit | Margin |
|------|-------|-----------------|-------------|------------|--------|
| Starter | $99 | $21 | $7 | $71 | 72% |
| Standard | $159 | $30 | $11 | $118 | 74% |
| Premium | $199 | $38 | $14 | $147 | 74% |

### Scenario 2: 50% Claim Rate (Moderate)

| Plan | Price | Expected Payout | Stripe Fees | Net Profit | Margin |
|------|-------|-----------------|-------------|------------|--------|
| Starter | $99 | $35 | $7 | $57 | 58% |
| Standard | $159 | $50 | $11 | $98 | 62% |
| Premium | $199 | $64 | $14 | $121 | 61% |

### Scenario 3: 70% Claim Rate (Pessimistic)

| Plan | Price | Expected Payout | Stripe Fees | Net Profit | Margin |
|------|-------|-----------------|-------------|------------|--------|
| Starter | $99 | $49 | $7 | $43 | 43% |
| Standard | $159 | $70 | $11 | $78 | 49% |
| Premium | $199 | $90 | $14 | $95 | 48% |

---

## Minimum Viable Pricing

### Target: 40% Net Margin

#### With 30% Claim Rate:
- **Starter:** $49 (profit: $21, 43% margin)
- **Standard:** $69 (profit: $28, 41% margin)
- **Premium:** $89 (profit: $37, 42% margin)

#### With 50% Claim Rate:
- **Starter:** $69 (profit: $27, 39% margin)
- **Standard:** $99 (profit: $38, 38% margin)
- **Premium:** $129 (profit: $51, 40% margin)

### Target: 60% Net Margin

#### With 30% Claim Rate:
- **Starter:** $69 (profit: $41, 59% margin)
- **Standard:** $89 (profit: $48, 54% margin)
- **Premium:** $109 (profit: $57, 52% margin)

#### With 50% Claim Rate:
- **Starter:** $89 (profit: $47, 53% margin)
- **Standard:** $119 (profit: $58, 49% margin)
- **Premium:** $149 (profit: $71, 48% margin)

---

## Pricing Recommendations

### Launch Pricing (Recommended)

**Conservative but Competitive:**

| Plan | Price Range | Reasoning |
|------|-------------|-----------|
| Starter | $79-89 | Profitable even at 70-80% claim rate |
| Standard | $119-129 | Room for CAC and operational costs |
| Premium | $159-169 | Significantly more accessible than stress test |

**Benefits:**
- ✅ Covered even if claim rate reaches unlikely 70-80%
- ✅ Budget for customer acquisition costs
- ✅ Buffer for fraud/abuse prevention
- ✅ Enables promotional pricing ($69/$99/$139) without losses
- ✅ 20-30% cheaper than stress test pricing

### Growth Pricing (Post-Validation)

**After observing actual claim rates <50%:**

| Plan | Price Range | Target Margin |
|------|-------------|---------------|
| Starter | $59-69 | 50-60% |
| Standard | $89-99 | 50-60% |
| Premium | $119-129 | 50-60% |

---

## Strategic Levers for Lower Pricing

If you need to price more competitively while maintaining profitability:

### 1. Reduce Maximum Payouts

**Current vs. Optimized:**

| Plan | Current Cap | Suggested Cap | Savings/User |
|------|-------------|---------------|--------------|
| Starter | $200 | $150 | $5-8 |
| Standard | $300 | $250 | $8-12 |
| Premium | $375 | $325 | $6-10 |

### 2. Adjust Reimbursement Rates

**Option A: Reduce across the board**
- Ultra-Elite: 50% → 40% (saves ~$7 per rejection)
- Regular: 65% → 60% (saves ~$3.50 per rejection)

**Option B: Tiered reimbursement**
- First 2 rejections: 65%
- Additional rejections: 50%
- Potential savings: $10-20 per heavy user

### 3. Adjust School Coverage

**Reduce total schools per plan:**

| Plan | Current | Suggested | Savings/User |
|------|---------|-----------|--------------|
| Starter | 4 schools | 3 schools | ~$11 |
| Standard | 6 schools | 5 schools | ~$7 |
| Premium | 8 schools | 7 schools | ~$6 |

### 4. Ultra-Elite Limits

**More restrictive ultra-elite coverage:**
- Standard: Max 2 → Max 1 (saves ~$14)
- Premium: Max 3 → Max 2 (saves ~$14)

---

## Critical Risk Factors

### Claim Rate Sensitivity

| Claim Rate | Starter Profit at $89 | Standard Profit at $119 | Premium Profit at $159 |
|------------|----------------------|-------------------------|------------------------|
| 30% | $61 (69%) | $78 (66%) | $107 (67%) |
| 40% | $54 (61%) | $68 (57%) | $93 (58%) |
| 50% | $47 (53%) | $58 (49%) | $79 (50%) |
| 60% | $40 (45%) | $48 (40%) | $65 (41%) |
| 70% | $33 (37%) | $38 (32%) | $51 (32%) |
| 80% | $26 (29%) | $28 (24%) | $37 (23%) |
| 90% | $19 (21%) | $18 (15%) | $23 (14%) |

### Other Risk Considerations

**Adverse Selection:**
- Students with weaker applications more likely to purchase
- Could push rejection rates higher than baseline assumptions
- Mitigation: Application quality screening, GPA minimums

**Fraud/Abuse:**
- Submitting fake rejections
- Applying to schools with no intent to attend
- Mitigation: Verification process, identity checks

**Seasonality:**
- Cash flow timing: collect premiums in fall, pay claims in spring
- Need working capital buffer
- Regular admissions (Nov-Dec) vs Early Decision (Oct-Nov)

**Operational Costs:**
- Customer support
- Claims processing
- Technology infrastructure
- Legal/compliance

---

## Customer Acquisition Cost (CAC) Considerations

### The 3x Rule

**Price should be ≥ 3x expected payout** to cover:
1. Payouts
2. Stripe fees
3. Customer acquisition
4. Operations
5. Profit

### CAC Scenarios at 40% Claim Rate

**Expected Payouts:**
- Starter: $28
- Standard: $40
- Premium: $51

**3x Rule Minimum Prices:**
- Starter: $84+
- Standard: $120+
- Premium: $153+

### Maximum Sustainable CAC

At recommended launch pricing ($89/$119/$159) with 40% claim rate:

| Plan | Price | Costs | Max CAC (20% target margin) |
|------|-------|-------|------------------------------|
| Starter | $89 | $35 | $36 |
| Standard | $119 | $51 | $44 |
| Premium | $159 | $65 | $56 |

**If bootstrapping (low CAC < $20):**
- Can drop pricing by 20-30% and maintain healthy margins
- Target prices: $69/$99/$129

**If scaling with paid ads (CAC $50-100):**
- Current stress test pricing ($99/$159/$199) is appropriate
- Provides buffer for higher acquisition costs

---

## Testing Recommendations

### Phase 1: Launch (Month 1-3)

**Pricing:**
- Starter: $89
- Standard: $129
- Premium: $169

**Goals:**
- Validate actual claim rate
- Measure conversion at different price points
- Track CAC across channels

**Success Metrics:**
- Claim rate <50%
- CAC <$40
- Net margin >40%

### Phase 2: Optimization (Month 4-6)

**A/B Test Lower Pricing:**
- Starter: $79 vs $89
- Standard: $119 vs $129
- Premium: $159 vs $169

**Analyze:**
- Price elasticity of demand
- Impact on customer acquisition
- Maintain >35% net margin

### Phase 3: Scale (Month 7+)

**Based on validated data:**
- Adjust pricing to optimize for volume vs. margin
- Consider tiered reimbursement or coverage adjustments
- Explore dynamic pricing by application strength

---

## Summary Matrix

### Recommended Pricing by Strategy

| Strategy | Starter | Standard | Premium | Expected Margin | Risk Level |
|----------|---------|----------|---------|-----------------|------------|
| **Ultra-Conservative** (90% claim) | $99 | $159 | $199 | 20-35% | Very Low |
| **Launch** (40-50% claim) | $89 | $129 | $169 | 40-50% | Low |
| **Growth** (30-40% claim) | $79 | $119 | $159 | 45-55% | Low-Medium |
| **Aggressive** (30% claim) | $69 | $99 | $129 | 50-60% | Medium |
| **Maximum Accessibility** (30% claim) | $59 | $89 | $109 | 50-60% | Medium-High |

---

## Conclusion

Your current stress test pricing ($99/$159/$199) at 90% claim rate demonstrates the business model is fundamentally sound. With realistic claim rates of 30-50%, you have substantial pricing flexibility.

**Key Takeaways:**

1. **Safe launch pricing:** $79-89 / $119-129 / $159-169
2. **Monitor actual claim rate closely** - this is the biggest variable
3. **Start conservative, reduce prices later** - easier than raising prices
4. **Factor in CAC** - if bootstrapping, you can be much more aggressive
5. **Use stress test (90% claim) as safety check** - if profitable there, you're covered

The model supports pricing as low as $59/$89/$109 with healthy margins if claim rates stay below 40%, but I recommend starting higher ($89/$129/$169) to build safety margin and leave room for optimization.
