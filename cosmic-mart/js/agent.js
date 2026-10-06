async function callClaude(systemPrompt, userMessage, maxTokensOverride, history) {
  var prior = (history && history.length) ? history.slice(-8) : [];
  var messages = prior.concat([{ role: 'user', content: userMessage }]);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: messages,
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

async function runIntentClassifier(customerMessage, history) {
  const systemPrompt = `You are an intent classifier for Cosmic Mart's returns portal. Classify the customer message into exactly one intent.

Intents:
- FAQ: a general question about returns (policy, timeline, required info, how it works, eligibility)
- RETURN_INITIATION: customer describes a specific product problem or clearly states they want to return something
- NEEDS_CLARIFICATION: message is too vague — no specific issue or product problem is described

Output ONLY valid JSON, no other text:
{"intent": "FAQ" | "RETURN_INITIATION" | "NEEDS_CLARIFICATION", "clarifying_question": "string or null"}

For NEEDS_CLARIFICATION: write a short specific follow-up question. For others: null.`;

  const raw = await callClaude(systemPrompt, 'Customer message: "' + customerMessage + '"', 256, history);
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function runFAQAgent(question, history) {
  const systemPrompt = `You are Nova, Cosmic Mart's returns assistant. Answer the customer's question clearly and concisely. Use prior conversation context if relevant.

Return policy facts:
- Gadgets: 30-day return window | Fashion: 14-day | Home & Lifestyle: 21-day
- Cosmic Rewards Tier 1 & 2 members get +7 extra days on all windows
- Refunds: 3–5 business days to original payment method
- Replacements: ship within 2 business days (priority for Tier 2 members)
- Prepaid return label is emailed immediately on approval
- No documents needed — orders in the system are auto-verified
- To start a return: just describe what happened with your product in the chat

Output ONLY valid JSON, no other text:
{"text": "2–3 sentence answer", "quickReplies": ["follow-up 1", "follow-up 2", "Contact Support"]}

"Contact Support" must always be the last quickReply.`;

  const raw = await callClaude(systemPrompt, 'Customer question: "' + question + '"', 512, history);
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function runManualEscalation(orderData) {
  const caseRef = 'CM-' + new Date().getFullYear() + '-' + orderData.order_id.split('-').pop();
  const systemPrompt = `You are the Escalation Agent for Cosmic Mart. Connect the customer to a specialist in a warm, reassuring message.

Include: acknowledgment that a specialist is being assigned, confirmation they have full order details, the case reference as Case ` + caseRef + `, and a 4-hour expected response time.

Tone: Warm and reassuring. Length: 60–80 words. Plain text only.`;

  const userMessage = 'Customer: ' + orderData.customer_name + '\nProduct: ' + orderData.product_name + '\nOrder: ' + orderData.order_id;
  const reply = await callClaude(systemPrompt, userMessage, 512);
  return { message: reply, caseRef: caseRef };
}

async function runSentimentAnalyzer(customerMessage) {
  const systemPrompt = `You are a sentiment analyzer for Cosmic Mart's returns portal. Detect customer frustration signals.

Look for: repeated issues ("again", "third time"), strong language ("unacceptable", "terrible", "furious"), review threats ("leaving a review", "social media"), urgency ("need this now", "asap"), emotional distress.

Output ONLY valid JSON, no other text:
{"frustrated": boolean, "priority": "high" | "standard", "signals": ["signal description"] or []}

Only mark "high" for clear, unmistakable frustration. Be conservative.`;

  try {
    const raw = await callClaude(systemPrompt, 'Customer message: "' + customerMessage + '"', 128);
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return { frustrated: false, priority: 'standard', signals: [] };
  }
}

async function runRetentionAgent(context, resolution) {
  var storeCreditAmount = Math.round(resolution.amount * 1.15);
  const systemPrompt = `You are the Retention Agent for Cosmic Mart. The customer is returning an item because they changed their mind. Offer them Cosmic Mart store credit as an enticing alternative to a cash refund.

The offer: $${storeCreditAmount} store credit (15% more than their $${resolution.amount} refund). Store credit never expires and works on any item.

Write a short, warm 2-sentence offer. Be specific about both dollar amounts. End with a gentle question asking if they'd like to accept.

Output ONLY valid JSON:
{"offer_text": "string", "store_credit_amount": ${storeCreditAmount}, "refund_amount": ${resolution.amount}}`;

  try {
    const raw = await callClaude(systemPrompt, 'Product: ' + context.product + ' | Refund amount: $' + resolution.amount, 256);
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      offer_text: 'Before we finalize your return, we can offer you $' + storeCreditAmount + ' in Cosmic Mart store credit — that\'s 15% more than your $' + resolution.amount + ' refund, and it never expires. Would you like to accept the store credit instead?',
      store_credit_amount: storeCreditAmount,
      refund_amount: resolution.amount
    };
  }
}

async function runOrchestrator(customerMessage, orderData) {
  const systemPrompt = `You are the Returns Orchestrator for Cosmic Mart. Extract the relevant context from the provided order data and customer message.

Output ONLY valid JSON with this exact structure, no other text:
{
  "customer_id": string,
  "customer_name": string,
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

customer_name: copy exactly from the order data's customer_name field.
issue_description: extract from the customer's natural language message, under 20 words.`;

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

If ALL 4 checks pass, eligible is true. If any fail, eligible is false and reason explains the primary failure.

IMPORTANT: Keep each "detail" value to one short phrase, 8 words max. Example: "18 of 37 days (Tier 1 extended)" not a full sentence.`;

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

async function runCommunicationAgent(context, classification, resolution, sentimentData) {
  var priorityNote = (sentimentData && sentimentData.frustrated)
    ? '\n\nPRIORITY: Customer is frustrated. Lead with extra empathy — make them feel heard before anything else.'
    : '';

  const systemPrompt = `You are the Communication Agent for Cosmic Mart. Write a warm, punchy resolution message.

Rules:
- Address the customer by their first name (provided below — use it exactly, never write "[Customer Name]")
- ONE sentence of genuine empathy (no clichés like "we apologize for the inconvenience")
- ONE sentence stating what was approved and why
- ONE sentence on what happens next (timeline, no action needed, etc.)
- Do NOT include the case reference number — it is shown separately
- Do NOT mention the refund dollar amount more than once
- Do NOT use markdown, headers, or bullet points
- Do NOT add a sign-off or closing sentence

Tone: Warm and direct. Like a real person, not a script.
Format: 2 short paragraphs max.
Length: 50-70 words MAXIMUM. Shorter is better.` + priorityNote;

  var firstName = (context.customer_name || 'there').split(' ')[0];
  const userMessage = `Customer first name: ${firstName}
Product: ${context.product}
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

  const userMessage = `Customer: ${context.customer_name || 'Customer'}
Product: ${context.product}
Days since purchase: ${context.days_since_purchase}
Failed check: ${failedCheck ? failedCheck.check + ' - ' + failedCheck.detail : eligibility.reason}
Case reference to use: ${caseRef}`;

  const reply = await callClaude(systemPrompt, userMessage);
  return { message: reply, caseRef: caseRef };
}

async function runReturnsAgent(customerMessage, orderData, progressCallback) {
  var cb = function(id, state, data) { if (progressCallback) progressCallback(id, state, data); };
  var pause = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

  // ── Sentiment ──
  cb('sub-sentiment', 'active');
  var [sentiment] = await Promise.all([runSentimentAnalyzer(customerMessage), pause(1400)]);
  cb('sub-sentiment', 'done');
  await pause(350);

  // ── Orchestrator ──
  cb('orchestrator', 'active');
  cb('sub-context', 'active');
  var [context] = await Promise.all([runOrchestrator(customerMessage, orderData), pause(2000)]);
  cb('sub-context', 'done');
  cb('orchestrator', 'done');

  // Emit customer profile + issue data now that we have both sentiment and context
  cb('case:customer', null, {
    name: context.customer_name || orderData.customer_name || 'Customer',
    tier: context.customer_tier,
    market: context.market,
    order_id: context.order_id,
    product: context.product,
    category: context.product_category,
    price: context.purchase_price,
    days: context.days_since_purchase
  });
  await pause(200);
  cb('case:issue', null, {
    description: context.issue_description || customerMessage.slice(0, 80),
    priority: sentiment.priority,
    frustrated: sentiment.frustrated,
    signals: sentiment.signals || []
  });
  await pause(400);

  // ── Eligibility ──
  cb('eligibility', 'active');
  cb('sub-window', 'active');
  var [eligibility] = await Promise.all([runEligibilityChecker(context), pause(1800)]);
  cb('sub-window', 'done');
  await pause(550);
  cb('sub-tier', 'active');
  await pause(900);
  cb('sub-tier', 'done');
  cb('eligibility', 'done');
  cb('case:eligibility', null, eligibility);
  await pause(350);

  if (!eligibility.eligible) {
    cb('escalation', 'active');
    const escalation = await runEscalationAgent(context, eligibility);
    cb('escalation', 'done');
    cb('case:escalation', null, { caseRef: escalation.caseRef, reason: eligibility.reason });
    return { type: 'escalation', message: escalation.message, caseRef: escalation.caseRef, sentiment: sentiment, trace: { context: context, eligibility: eligibility } };
  }

  // ── Classifier ──
  cb('classifier', 'active');
  var [classification] = await Promise.all([runReturnClassifier(context, customerMessage), pause(1600)]);
  cb('classifier', 'done');
  cb('case:classification', null, classification);
  await pause(350);

  // ── Resolution ──
  cb('resolution', 'active');
  cb('sub-restype', 'active');
  var [resolution] = await Promise.all([runResolutionGenerator(context, classification), pause(2000)]);
  cb('sub-restype', 'done');
  await pause(600);
  cb('sub-caseref', 'active');
  await pause(800);
  cb('sub-caseref', 'done');
  cb('resolution', 'done');
  cb('case:resolution', null, resolution);
  await pause(350);

  // ── Retention offer (CHANGED_MIND only) ──
  var retention = null;
  if (classification.return_category === 'CHANGED_MIND') {
    retention = await runRetentionAgent(context, resolution);
  }

  // ── Communication ──
  cb('communication', 'active');
  const message = await runCommunicationAgent(context, classification, resolution, sentiment);
  cb('communication', 'done');

  return {
    type: 'resolution',
    message: message,
    resolution: resolution,
    caseRef: resolution.case_ref,
    sentiment: sentiment,
    retention: retention,
    trace: { context: context, eligibility: eligibility, classification: classification, resolution: resolution }
  };
}
