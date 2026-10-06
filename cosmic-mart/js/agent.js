async function callClaude(systemPrompt, userMessage, maxTokensOverride) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: maxTokensOverride || MAX_TOKENS
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(function () { return {}; });
    throw new Error('API error: ' + (err.error || response.statusText));
  }

  const data = await response.json();
  return data.text;
}

async function runOrchestrator(customerMessage, orderData) {
  const systemPrompt = `You are the Returns Orchestrator for Cosmic Mart. Your job is to classify a customer's message as a return request and extract the relevant context from the provided order data.

Output ONLY valid JSON with this exact structure, no other text:
{
  "customer_id": string,
  "order_id": string,
  "product": string,
  "issue_description": string,
  "days_since_purchase": number,
  "customer_tier": string,
  "market": string,
  "product_category": string,
  "purchase_price": number,
  "is_return_request": boolean
}

Extract issue_description from the customer's natural language message. Keep it short (under 20 words).`;

  const userMessage = `Customer message: "${customerMessage}"

Order data: ${JSON.stringify(orderData, null, 2)}`;

  const raw = await callClaude(systemPrompt, userMessage);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function runEligibilityChecker(context) {
  const systemPrompt = `You are the Eligibility Checker for Cosmic Mart's returns system. Run exactly 4 checks and output ONLY valid JSON, no other text.

Return windows: Gadgets = 30 days, Fashion = 14 days, Home & Lifestyle = 21 days.
Loyalty tier extended windows: Cosmic Rewards Tier 1 or Tier 2 members get +7 days on their window.

Output this exact JSON structure:
{
  "eligible": boolean,
  "reason": string,
  "checks_passed": [
    {"check": "return_window", "passed": boolean, "detail": string},
    {"check": "proof_of_purchase", "passed": boolean, "detail": string},
    {"check": "category_returnable", "passed": boolean, "detail": string},
    {"check": "market_exception", "passed": boolean, "detail": string}
  ]
}

Check 1 - Return window: Compare days_since_purchase to the category window (apply tier extension if applicable).
Check 2 - Proof of purchase: Always true for orders in the system.
Check 3 - Category returnable: Almost all products are returnable. Only opened software/digital products are not.
Check 4 - Market exception: Brazil has the same policy as US. UK follows EU rules (slightly extended). No exceptions for this order set.

If ALL 4 checks pass, eligible is true. If any fail, eligible is false and reason explains the primary failure.`;

  const userMessage = `Context: ${JSON.stringify(context, null, 2)}`;

  const raw = await callClaude(systemPrompt, userMessage);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function runReturnClassifier(context, customerMessage) {
  const systemPrompt = `You are the Return Classifier for Cosmic Mart. Analyze the customer's message and classify the return reason.

Valid categories:
- DEFECTIVE: product stopped working, broken, malfunctioning
- WRONG_ITEM: received different product than ordered
- CHANGED_MIND: no longer wants it, doesn't need it, never used it
- SIZING: wrong size or fit (fashion only)
- DAMAGED_TRANSIT: arrived broken or damaged
- DESCRIPTION_MISMATCH: product not as described on website

Output ONLY valid JSON, no other text:
{
  "return_category": string,
  "operational_flag": string,
  "confidence": "high" | "medium" | "low",
  "reasoning": string
}

operational_flag should be one of: STANDARD, INVESTIGATE, PRIORITY_REPLACEMENT, CARRIER_CLAIM`;

  const userMessage = `Customer message: "${customerMessage}"
Context: ${JSON.stringify({ product: context.product, product_category: context.product_category, issue_description: context.issue_description }, null, 2)}`;

  const raw = await callClaude(systemPrompt, userMessage);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function runResolutionGenerator(context, classification) {
  const systemPrompt = `You are the Resolution Generator for Cosmic Mart's returns system. Determine the correct resolution based on the return category and customer context.

Resolution logic:
- DEFECTIVE: Full refund OR free replacement (customer's choice) + prepaid return label
- WRONG_ITEM: Full refund + prepaid return label
- CHANGED_MIND (unopened): Full refund if within return window
- CHANGED_MIND (opened): Store credit at full value
- DAMAGED_TRANSIT: Full refund + carrier claim filed, no return label needed
- DESCRIPTION_MISMATCH: Full refund + flag to content team, prepaid label

Loyalty tier modifier:
- Cosmic Rewards Tier 1: upgraded resolution (CHANGED_MIND opened → full refund instead of store credit)
- Cosmic Rewards Tier 2: same upgrade as Tier 1 + priority shipping on replacements

Generate a unique case reference: CM-${new Date().getFullYear()}-XXXX where XXXX is derived from the order ID.

Output ONLY valid JSON, no other text:
{
  "resolution_type": string,
  "amount": number,
  "currency": "USD",
  "timeline": string,
  "requires_return": boolean,
  "label_provided": boolean,
  "options": ["option1", "option2"] or null,
  "case_ref": string,
  "tier_upgrade_applied": boolean,
  "additional_action": string or null
}`;

  const userMessage = `Context: ${JSON.stringify(context, null, 2)}
Classification: ${JSON.stringify(classification, null, 2)}`;

  const raw = await callClaude(systemPrompt, userMessage);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function runCommunicationAgent(context, classification, resolution) {
  const systemPrompt = `You are the Communication Agent for Cosmic Mart. Write a warm, clear, complete customer-facing message about their return resolution.

Every message MUST include:
1. Empathy/acknowledgment of the issue
2. The decision (what was approved)
3. Why it was approved (brief)
4. What the customer needs to do next (specific next steps)
5. The case reference number (formatted boldly as: Case #[ref])
6. Timeline for refund/replacement

Tone: Warm, professional, reassuring. Like a great customer service rep who actually wants to help.
Format: Plain text, 3-4 short paragraphs. Do not use markdown headers. Do not use bullet points.
Length: 100-180 words.`;

  const userMessage = `Product: ${context.product}
Customer tier: ${context.customer_tier}
Return category: ${classification.return_category}
Resolution: ${JSON.stringify(resolution, null, 2)}
Purchase price: $${context.purchase_price}`;

  const reply = await callClaude(systemPrompt, userMessage, 2048);
  return reply;
}

async function runEscalationAgent(context, eligibility) {
  const systemPrompt = `You are the Escalation Agent for Cosmic Mart. The customer's return does not qualify for automatic resolution. Write a warm, professional message for the customer explaining why their case is being escalated to a specialist.

The message should:
1. Thank the customer for reaching out
2. Explain the specific reason this case needs specialist review (e.g. outside return window)
3. Assure them a specialist has ALL their order details
4. Provide the case reference number as: Case #[ref]
5. Give a realistic expected response timeframe (4 hours for standard, 24 hours for complex)

Tone: Empathetic, not dismissive. The customer should feel like a human is going to genuinely help them.
Length: 80-120 words. Plain text.`;

  const failedCheck = eligibility.checks_passed ? eligibility.checks_passed.find(c => !c.passed) : null;
  const caseRef = 'CM-' + new Date().getFullYear() + '-' + context.order_id.split('-').pop();

  const userMessage = `Customer: ${context.customer_name}
Product: ${context.product}
Days since purchase: ${context.days_since_purchase}
Failed check: ${failedCheck ? failedCheck.check + ' - ' + failedCheck.detail : eligibility.reason}
Case reference to use: ${caseRef}`;

  const reply = await callClaude(systemPrompt, userMessage);
  return reply;
}

async function runReturnsAgent(customerMessage, orderData, progressCallback) {
  if (progressCallback) progressCallback('orchestrator', 'active');
  const context = await runOrchestrator(customerMessage, orderData);
  if (progressCallback) progressCallback('orchestrator', 'done');

  if (progressCallback) progressCallback('eligibility', 'active');
  const eligibility = await runEligibilityChecker(context);
  if (progressCallback) progressCallback('eligibility', 'done');

  if (!eligibility.eligible) {
    if (progressCallback) progressCallback('escalation', 'active');
    const escalationMessage = await runEscalationAgent(context, eligibility);
    if (progressCallback) progressCallback('escalation', 'done');
    return { type: 'escalation', message: escalationMessage };
  }

  if (progressCallback) progressCallback('classifier', 'active');
  const classification = await runReturnClassifier(context, customerMessage);
  if (progressCallback) progressCallback('classifier', 'done');

  if (progressCallback) progressCallback('resolution', 'active');
  const resolution = await runResolutionGenerator(context, classification);
  if (progressCallback) progressCallback('resolution', 'done');

  if (progressCallback) progressCallback('communication', 'active');
  const message = await runCommunicationAgent(context, classification, resolution);
  if (progressCallback) progressCallback('communication', 'done');

  return { type: 'resolution', message: message, resolution: resolution };
}
