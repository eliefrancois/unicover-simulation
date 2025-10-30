# Unicover Institutional Onboarding: Technical Architecture

## The Core Question
When an institution purchases 100 licenses, how do students activate their coverage?

**Two Approaches:**
1. Stripe promo codes (100% discount)
2. In-house activation codes (bypass Stripe entirely)

---

## Approach 1: Stripe Promo Codes

### How It Works:
1. Institution purchases 100 licenses via Stripe
2. We generate 100 Stripe promotion codes (100% discount)
3. Institution distributes codes to students
4. Students go to checkout page, enter promo code
5. Stripe processes $0 transaction
6. Student account provisioned via webhook

### Pros:
- ✅ Reuses existing checkout flow
- ✅ Stripe handles code validation
- ✅ Less custom code to build
- ✅ Stripe dashboard shows all "transactions"

### Cons:
- ❌ Students go through "checkout" experience for free product (confusing UX)
- ❌ Vulnerable to Stripe account issues (your current problem)
- ❌ Promo code management in Stripe is clunky at scale
- ❌ Still need payment method upfront (even though paying $0)
- ❌ Stripe limitations on promo code features
- ❌ Harder to track institutional vs. retail usage
- ❌ Can't customize experience per institution
- ❌ Students might abandon at "checkout" page

### Technical Flow:
```
Institution Purchase ($35,700 for 300 codes)
    ↓
Generate 300 Stripe Promo Codes (100% off)
    ↓
Student visits checkout → enters promo code → "pays" $0
    ↓
Stripe webhook → provision account
    ↓
Student adds payout method later (when filing claim)
```

---

## Approach 2: In-House Activation Codes ⭐ RECOMMENDED

### How It Works:
1. Institution purchases license (via Stripe or wire/PO)
2. We generate unique activation codes in OUR database
3. Institution distributes codes to students
4. Students visit `/activate` page (not checkout)
5. Enter code → create account → instantly provisioned
6. Payment method added only when filing first claim

### Pros:
- ✅ Clean, professional UX (no fake checkout)
- ✅ Completely decoupled from Stripe (resilient to Stripe issues)
- ✅ Full control over code generation, expiration, tracking
- ✅ Can customize per institution (branding, messaging)
- ✅ Better tracking: which codes used, when, by whom
- ✅ No payment method required upfront (better conversion)
- ✅ Students understand they're activating a benefit, not buying
- ✅ Easier to implement complex features (rollovers, tiered plans)
- ✅ Can batch-generate codes for large institutions
- ✅ Dashboard for institutions to track code usage in real-time

### Cons:
- ⚠️ Need to build code generation system (minor effort)
- ⚠️ Need to track code usage ourselves (database table)
- ⚠️ One more system to maintain

### Technical Flow:
```
Institution Purchase ($35,700 for 300 codes)
    ↓
Generate 300 activation codes in database
    ↓
Student visits /activate → enters code → creates account
    ↓
Account instantly provisioned with Standard plan
    ↓
Student applies to colleges normally
    ↓
Gets rejection → files claim → THEN adds payout method
```

---

## Why In-House is the Clear Winner

### 1. Better User Experience
**Stripe Promo Code Flow:**
- Student clicks "Get Coverage"
- Lands on checkout page (scary for free product)
- Enters code, sees $159 crossed out to $0 (confusing)
- Asked for payment method (why if it's free?)
- Clicks "Complete Purchase" (weird language)
- Confirmation email says "You paid $0.00" (janky)

**In-House Code Flow:**
- Student clicks "Activate Your Coverage"  
- Lands on clean activation page with school logo
- Enters code from school
- Creates account (email + password)
- "Coverage activated! You have Standard plan (6 schools, $300 max reimbursement)"
- Done. Clean. Professional.

### 2. Stripe Risk Mitigation
- Your Stripe is currently flagged
- If Stripe closes your account, ALL institutional students can't activate
- With in-house codes, only the initial purchase uses Stripe
- Student activation completely independent of Stripe
- Even if Stripe issues arise, students can still activate

### 3. Operational Flexibility
**What you can do with in-house codes:**
- Generate batch of 1000 codes instantly for large district
- Set different expiration dates per institution
- Track exactly which codes are used vs. unused
- Deactivate specific codes if needed
- Extend expiration for specific institutions
- Generate reports: "Lincoln HS used 87 of 100 codes"
- Allow institutions to view usage in real-time dashboard

**What's hard with Stripe promo codes:**
- Stripe API limitations on bulk generation
- Limited metadata per promo code
- Harder to track which codes belong to which institution
- Can't easily extend expirations
- Clunky reporting

### 4. Institutional Dashboard Features
With in-house codes, you can build a portal for institutions:
- See all their codes and usage status
- Download CSV of codes for distribution
- Real-time utilization metrics
- See which students activated (with privacy controls)
- Request additional codes mid-year
- View aggregate outcomes

This would be much harder with Stripe promo codes.

### 5. Professional B2B2C Standard
Most B2B2C SaaS products use activation codes/license keys:
- Microsoft Office 365 (license keys)
- GitHub Enterprise (seat licenses)
- Zoom (license provisioning)
- Canva for Education (activation codes)

Nobody uses "checkout with 100% promo codes" - it's a hack, not a pattern.

---

## Recommended Technical Implementation

### Database Schema:

```sql
-- Institutional Contracts
CREATE TABLE institutional_contracts (
  id UUID PRIMARY KEY,
  institution_name VARCHAR,
  institution_type VARCHAR, -- 'high_school', 'nonprofit', 'district'
  contact_email VARCHAR,
  contact_name VARCHAR,
  contract_value DECIMAL,
  payment_status VARCHAR, -- 'paid', 'pending', 'partial'
  plan_type VARCHAR, -- 'starter', 'standard', 'premium'
  total_licenses INTEGER,
  start_date DATE,
  end_date DATE,
  discount_tier VARCHAR, -- 'pilot', 'small', 'medium', 'large', 'enterprise'
  created_at TIMESTAMP,
  stripe_payment_intent_id VARCHAR, -- if paid via Stripe
  notes TEXT
);

-- Activation Codes
CREATE TABLE activation_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(12) UNIQUE, -- e.g., "KIPP-X7Y9-M2N4"
  contract_id UUID REFERENCES institutional_contracts(id),
  plan_type VARCHAR, -- 'starter', 'standard', 'premium'
  status VARCHAR, -- 'available', 'activated', 'expired', 'revoked'
  activated_by_user_id UUID REFERENCES users(id),
  activated_at TIMESTAMP,
  expires_at DATE,
  created_at TIMESTAMP,
  metadata JSONB -- flexible field for institution-specific data
);

-- Add to Users table
ALTER TABLE users ADD COLUMN activation_code_id UUID REFERENCES activation_codes(id);
ALTER TABLE users ADD COLUMN acquisition_channel VARCHAR; -- 'retail', 'institutional'
ALTER TABLE users ADD COLUMN institution_id UUID REFERENCES institutional_contracts(id);
```

### Code Generation Logic:

```javascript
// Generate activation codes for a contract
async function generateActivationCodes(contractId, count, planType, expirationDate) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = generateUniqueCode(); // e.g., "UC-X7Y9-M2N4"
    
    await db.activationCodes.create({
      code: code,
      contract_id: contractId,
      plan_type: planType,
      status: 'available',
      expires_at: expirationDate,
      created_at: new Date()
    });
    
    codes.push(code);
  }
  
  return codes;
}

// Generate cryptographically secure code
function generateUniqueCode() {
  // Format: UC-XXXX-XXXX (12 chars total)
  // UC = Unicover prefix
  // Use base32 encoding (no confusing chars: 0/O, 1/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'UC-';
  
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return code;
}
```

### Student Activation Flow:

```javascript
// /activate page
async function activateCode(code, userEmail, password) {
  // 1. Validate code exists and is available
  const activationCode = await db.activationCodes.findOne({
    where: { code: code }
  });
  
  if (!activationCode) {
    throw new Error('Invalid activation code');
  }
  
  if (activationCode.status !== 'available') {
    throw new Error('This code has already been used');
  }
  
  if (new Date() > activationCode.expires_at) {
    throw new Error('This code has expired');
  }
  
  // 2. Create user account
  const user = await createUser({
    email: userEmail,
    password: password,
    plan_type: activationCode.plan_type,
    acquisition_channel: 'institutional',
    activation_code_id: activationCode.id,
    institution_id: activationCode.contract_id
  });
  
  // 3. Mark code as activated
  await db.activationCodes.update(activationCode.id, {
    status: 'activated',
    activated_by_user_id: user.id,
    activated_at: new Date()
  });
  
  // 4. Send welcome email (customized for institutional)
  await sendInstitutionalWelcomeEmail(user, activationCode);
  
  return user;
}
```

### Admin Dashboard for Institutions:

```
Institution Dashboard - Lincoln High School
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contract Details
├─ Plan: Standard (6 schools, $300 max reimbursement)
├─ Total Licenses: 200
├─ Price per License: $119
├─ Total Contract Value: $23,800
├─ Contract Period: Aug 1, 2024 - Jul 31, 2025
└─ Status: Active

Utilization Metrics
├─ Codes Activated: 164 / 200 (82%)
├─ Remaining Codes: 36
├─ Students Applying: 142 (86.6% of activated)
└─ Average Applications per Student: 6.4

Quick Actions
[Download Unused Codes CSV]
[Request Additional Licenses]
[View Student Outcomes Report]
[Extend Contract]

Recent Activations
├─ Oct 15, 2024 - Student activated code UC-X7Y9-M2N4
├─ Oct 15, 2024 - Student activated code UC-P3R8-K5L2
└─ Oct 14, 2024 - Student activated code UC-B6T4-W9Q1
```

---

## Claims Process: Same for Everyone

**Good news:** Claims processing is identical for retail and institutional students.

### Claim Submission Flow:
1. Student gets rejection letter
2. Goes to dashboard → "File a Claim"
3. Uploads rejection letter + proof of application fee
4. System reviews (AI-assisted + manual)
5. Claim approved → student needs payout method

### Payment Method Collection:
**THIS is when institutional students add payment info:**

```
Your claim for $75 has been approved!

To receive your reimbursement, please add a payout method:
○ Bank Account (ACH) - recommended
○ PayPal
○ Venmo
○ Debit Card

[Add Payout Method]
```

**Why this works:**
- Only students with actual claims need to provide payment info
- No payment method required during activation (better conversion)
- Clear reason for asking (you're getting money)
- Reduces friction during onboarding

### Elevated SLAs for Institutional:

| Metric | Retail | Institutional |
|--------|--------|---------------|
| Claim Review Time | 48 hours | 24 hours |
| Support Response | 24 hours | 12 hours |
| Account Manager | No | Yes (500+ students) |
| Priority Queue | No | Yes |
| Custom Reporting | No | Quarterly |

Implementation:
```javascript
async function getClaimPriority(userId) {
  const user = await db.users.findOne(userId);
  
  if (user.acquisition_channel === 'institutional') {
    return 'high'; // 24-hour SLA
  }
  return 'normal'; // 48-hour SLA
}
```

---

## Complete Onboarding Flow Comparison

### Stripe Promo Code Approach:
```
Institution → Pays $23,800 via Stripe
     ↓
Admin → Generates 200 Stripe promo codes
     ↓
Institution → Distributes codes to students
     ↓
Student → Visits checkout page (scary)
     ↓
Student → Enters promo code, sees $0 (confusing)
     ↓
Student → Adds payment method (why?)
     ↓
Student → Clicks "Purchase" (weird for free thing)
     ↓
Stripe → Processes $0 transaction
     ↓
Webhook → Provisions account
     ↓
Done (but janky experience)
```

### In-House Code Approach (Recommended):
```
Institution → Pays $23,800 (Stripe, wire, or PO)
     ↓
Admin → Clicks "Generate Codes" → 200 codes instantly created
     ↓
Institution → Gets email with codes + CSV download
     ↓
Institution → Distributes codes (email, LMS, posters, etc.)
     ↓
Student → Visits unicover.app/activate
     ↓
Student → Enters code UC-X7Y9-M2N4
     ↓
System → Validates code, shows plan details
     ↓
Student → Creates account (email + password)
     ↓
System → Provisions account with Standard plan
     ↓
Student → Sees dashboard: "You're covered for 6 schools!"
     ↓
Done (clean, professional, fast)
```

**Later, when student gets rejected:**
```
Student → Files claim with rejection letter
     ↓
Admin → Reviews claim (24-hour SLA for institutional)
     ↓
System → Approves claim for $75
     ↓
Student → NOW adds payout method (first time)
     ↓
System → Sends payment via Stripe Payouts
```

---

## Migration Path: From Where You Are Now

### Current State (Assumed):
- Stripe checkout for retail customers
- No institutional customers yet

### Phase 1: Build Activation System (1-2 weeks)
- [ ] Create database tables (contracts, activation_codes)
- [ ] Build code generation function
- [ ] Create `/activate` page with code input
- [ ] Build activation logic (validate code → create user)
- [ ] Create admin panel to generate codes
- [ ] Test with dummy codes

### Phase 2: Institutional Dashboard (1-2 weeks)
- [ ] Build institution portal to view contract
- [ ] Show code usage statistics
- [ ] CSV export of unused codes
- [ ] Real-time utilization metrics

### Phase 3: First Pilot Deal (Week 4-5)
- [ ] Sign first institutional contract
- [ ] Generate codes for pilot institution
- [ ] Monitor activation rates
- [ ] Collect feedback
- [ ] Iterate on UX

### Phase 4: Scale (Week 6+)
- [ ] Add custom branding per institution
- [ ] Build quarterly reporting automation
- [ ] Implement elevated SLAs
- [ ] Add advanced analytics

---

## Technical Recommendations Summary

### DO THIS (In-House Codes):
✅ Generate activation codes in your database
✅ Build `/activate` page separate from checkout
✅ Let students create accounts with codes (no payment needed)
✅ Collect payout method only when claim is approved
✅ Track institutional vs. retail users separately
✅ Build institution portal for code management
✅ Implement elevated SLAs for institutional claims

### DON'T DO THIS (Stripe Promo Codes):
❌ Use Stripe promo codes for free institutional access
❌ Force students through checkout for free product
❌ Require payment method upfront for institutional students
❌ Treat institutional and retail flows the same

---

## Bonus: Code Distribution Ideas for Institutions

Once codes are generated, institutions can distribute via:

1. **Email Blast:**
   - "Your Unicover activation code: UC-X7Y9-M2N4"
   - Include instructions and deadline

2. **Learning Management System (LMS):**
   - Upload codes to Canvas, Google Classroom, Schoology
   - Students retrieve their unique code

3. **Physical Cards:**
   - Print scratch-off cards with codes
   - Distribute at college counseling sessions

4. **Posters in School:**
   - "Apply to college with confidence! Activate your free Unicover coverage: unicover.app/activate"
   - Generic activation page, students enter their school-provided code

5. **Counselor Distribution:**
   - Counselors give codes during 1-on-1 meetings
   - Can track which counselor gave which codes

6. **Senior Class Assembly:**
   - Project activation page on screen
   - Students activate in real-time during presentation

---

## Final Recommendation

**Go with in-house activation codes. Not even close.**

**Why I'm so confident:**
1. ✅ Better UX (professional, not hacky)
2. ✅ Stripe risk mitigation (your current pain point)
3. ✅ Industry standard for B2B2C (this is how pros do it)
4. ✅ More flexible (tracking, reporting, management)
5. ✅ Cleaner architecture (separation of concerns)
6. ✅ Enables institutional portal features
7. ✅ No payment method required upfront (better conversion)
8. ✅ Scales better (batch generation, usage tracking)

**Effort to build:** 2-3 days for MVP (database + activation page + admin panel)
**Long-term value:** Massive. This is core infrastructure.

**Next steps:**
1. Create the database schema
2. Build simple code generation function
3. Create `/activate` page
4. Test with a few dummy codes
5. Use for first institutional pilot

---

## Questions to Consider

- [ ] Do codes expire after X months if unused?
- [ ] Can students see which institution their code is from?
- [ ] Do institutions get branded activation pages (lincoln.unicover.app)?
- [ ] Should codes be revocable (if student withdraws from school)?
- [ ] How do you handle lost/forgotten codes?
- [ ] Can institutions request code extensions for late applicants?

These are all easy to implement with in-house system, much harder with Stripe promo codes.

---

**Bottom Line:** In-house activation codes are the professional, scalable, resilient way to handle institutional distribution. Stripe promo codes are a hacky workaround that will cause problems. Build it right from the start.