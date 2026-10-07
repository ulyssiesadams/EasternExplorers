// ── Mock Data ─────────────────────────────────────────────────────────────────
const ESCALATION_CASES = [
  {
    id: 'ESC-2026-0001',
    timestamp: '2026-10-06T09:14:22Z',
    customer: { name: 'Alex Chen', tier: 'Tier 1', orderId: 'ORD-2026-4471', email: 'alex.chen@email.com' },
    order: {
      product: 'NovaSound Pro Wireless Headphones',
      sku: 'CM-G008',
      price: 249.00,
      purchaseDate: '2026-09-18',
      returnWindowDays: 30,
      category: 'Gadgets'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'FRUSTRATED',
      orchestratorContext: 'Customer reports headphones arrived with visible dents and cracked speaker housing, claiming shipping damage.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['PROOF_OF_DAMAGE_REQUIRED', 'CARRIER_CLAIM_NOT_FILED'],
      returnCategory: 'DAMAGED_TRANSIT',
      escalationReason: 'Claim involves carrier damage but no photo evidence or carrier claim exists; high-value item ($249) requires specialist review before exception.'
    },
    caseNarrative: 'Alex Chen (Tier 1) purchased NovaSound Pro headphones on Sep 18 for $249. The item arrived visibly damaged — dented housing and cracked speaker — consistent with transit damage. The eligibility checker flagged the return ineligible because no photo evidence was uploaded and no carrier claim was initiated. Given the high value and clear shipping damage description, this case was escalated for specialist review.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Alex,\n\nThank you for contacting Cosmic Mart about your NovaSound Pro Wireless Headphones (ORD-2026-4471). After specialist review, we are approving your return exception.\n\nAlthough our automated system required photographic damage evidence, the description of transit damage to a high-value item combined with your Tier 1 loyalty status warrants a full exception. We sincerely apologize for the inconvenience. A prepaid return label and full refund of $249.00 will be processed within 3–5 business days.\n\nThank you for your continued loyalty to Cosmic Mart.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Alex,\n\nThank you for reaching out regarding your NovaSound Pro Wireless Headphones (ORD-2026-4471). After specialist review, we are unable to approve the return exception at this time.\n\nTo process a transit damage claim, our policy requires photographic evidence of the damage and a filed carrier claim. Without these, we cannot confirm the damage occurred during shipping. Please photograph the item and contact returns@cosmicmart.com to re-submit with the required documentation, or contact the carrier directly to file a damage claim.\n\nWe appreciate your understanding.\n\nRespectfully,\nCosmic Mart Returns Team'
  },
  {
    id: 'ESC-2026-0002',
    timestamp: '2026-10-06T10:32:07Z',
    customer: { name: 'Jordan Lee', tier: 'Standard', orderId: 'ORD-2026-2744', email: 'jordan.lee@email.com' },
    order: {
      product: 'OrbitTab X2 Tablet',
      sku: 'CM-G012',
      price: 389.00,
      purchaseDate: '2026-08-25',
      returnWindowDays: 30,
      category: 'Gadgets'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'NEUTRAL',
      orchestratorContext: 'Customer acknowledges item is 41 days old but states it was never used and believes a goodwill exception should apply.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['RETURN_WINDOW_EXPIRED', 'STANDARD_TIER_NO_EXTENSION'],
      returnCategory: 'CHANGED_MIND',
      escalationReason: 'Return window expired by 11 days; customer insists item was unused and is requesting a goodwill exception not covered by automated rules.'
    },
    caseNarrative: 'Jordan Lee (Standard tier) purchased an OrbitTab X2 Tablet on Aug 25 for $389 and is attempting a return 41 days after purchase — 11 days past the 30-day gadgets window. Jordan states the tablet was never used. As a Standard tier customer, no loyalty extension applies. The orchestrator flagged this as a goodwill exception case requiring human judgment on the unused-item claim.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Jordan,\n\nThank you for contacting Cosmic Mart regarding your OrbitTab X2 Tablet (ORD-2026-2744). After specialist review, we are pleased to approve a one-time goodwill return exception.\n\nWhile your return falls 11 days outside our standard 30-day window, your assertion that the item was unused and your history as a valued Cosmic Mart customer has been taken into consideration. A prepaid return label is being emailed to you. Your refund of $389.00 will be processed within 3–5 business days of receipt.\n\nThank you for shopping with us.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Jordan,\n\nThank you for contacting Cosmic Mart about your OrbitTab X2 Tablet (ORD-2026-2744). After specialist review, we regret that we cannot approve the return exception.\n\nYour request falls 11 days outside our 30-day gadgets return window, and our goodwill exception policy requires additional loyalty tier qualification not met at the Standard tier. We recommend our Cosmic Rewards program, which provides a 7-day extended window for future purchases.\n\nWe appreciate your understanding.\n\nRespectfully,\nCosmic Mart Returns Team'
  },
  {
    id: 'ESC-2026-0003',
    timestamp: '2026-10-06T11:05:44Z',
    customer: { name: 'Priya Sharma', tier: 'Standard', orderId: 'ORD-2026-3381', email: 'priya.sharma@email.com' },
    order: {
      product: 'LunaFlow Silk Wrap Dress',
      sku: 'CM-F004',
      price: 89.00,
      purchaseDate: '2026-09-01',
      returnWindowDays: 14,
      category: 'Fashion'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'NEUTRAL',
      orchestratorContext: 'Customer changed their mind about the dress 35 days after purchase, well past the 14-day fashion return window.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['RETURN_WINDOW_EXPIRED', 'CHANGED_MIND_POLICY_NOT_MET'],
      returnCategory: 'CHANGED_MIND',
      escalationReason: 'Fashion return window is 14 days; customer requesting return 35 days post-purchase with changed-mind reason — exception requires specialist approval.'
    },
    caseNarrative: 'Priya Sharma (Standard tier) purchased a LunaFlow Silk Wrap Dress for $89 on Sep 1 and is requesting a return 35 days later, citing a change of mind. The fashion category has a 14-day return window, and Priya\'s Standard tier provides no loyalty extension. Both the return window and policy conditions are unmet. Escalated for specialist review of the changed-mind exception request.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Priya,\n\nThank you for reaching out regarding your LunaFlow Silk Wrap Dress (ORD-2026-3381). We are happy to approve a one-time goodwill exception for your return request.\n\nAlthough fashion items carry a 14-day return window and your request comes at 35 days, we are extending a goodwill accommodation. Please return the item unworn with tags attached using the prepaid label we are emailing to you. Store credit of $89.00 will be applied to your account within 2–3 business days.\n\nThank you for choosing Cosmic Mart.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Priya,\n\nThank you for contacting Cosmic Mart about your LunaFlow Silk Wrap Dress (ORD-2026-3381). After specialist review, we are unable to approve this return exception.\n\nOur fashion category carries a 14-day return window, and your request at 35 days post-purchase with a change-of-mind reason falls outside our exception guidelines. We encourage you to explore our Cosmic Rewards membership, which extends return windows for future purchases.\n\nWe appreciate your understanding.\n\nRespectfully,\nCosmic Mart Returns Team'
  },
  {
    id: 'ESC-2026-0004',
    timestamp: '2026-10-06T12:18:33Z',
    customer: { name: 'Marcus Thompson', tier: 'Standard', orderId: 'ORD-2026-5102', email: 'marcus.thompson@email.com' },
    order: {
      product: 'StellarChef Pro Air Fryer',
      sku: 'CM-H006',
      price: 129.00,
      purchaseDate: '2026-09-25',
      returnWindowDays: 21,
      category: 'Home & Lifestyle'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'DISTRESSED',
      orchestratorContext: 'Customer received a completely different product — an unrelated kitchen timer — instead of the air fryer ordered, and is very upset.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['PHOTO_EVIDENCE_REQUIRED', 'WRONG_ITEM_CLAIM_UNVERIFIED'],
      returnCategory: 'WRONG_ITEM',
      escalationReason: 'Customer received wrong item and is distressed; eligibility check failed due to missing photo evidence of the incorrect item received — urgent review needed.'
    },
    caseNarrative: 'Marcus Thompson (Standard tier) ordered a StellarChef Pro Air Fryer on Sep 25 for $129 and received a completely unrelated kitchen timer. He is clearly distressed and repeatedly emphasized the fulfillment error. The eligibility checker flagged the return ineligible because no photo of the wrong item was uploaded — required for WRONG_ITEM claims. Given the customer\'s distress level and clear fulfillment error, this case requires urgent specialist attention.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Marcus,\n\nThank you for contacting Cosmic Mart, and we sincerely apologize for this fulfillment error regarding your StellarChef Pro Air Fryer (ORD-2026-5102).\n\nReceiving the wrong item is an unacceptable experience, and we are approving your return exception immediately. No additional documentation is required — the error is on our fulfillment team. A prepaid return label for the incorrect item is being sent to your email now, and a replacement StellarChef Pro Air Fryer will be expedited to you within 2 business days. If you prefer a full refund of $129.00 instead, please reply to this message.\n\nWe are truly sorry for the inconvenience.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Marcus,\n\nThank you for contacting Cosmic Mart about your order ORD-2026-5102. We understand your frustration, and we take wrong-item claims very seriously.\n\nAt this time, our returns system requires photographic evidence of the incorrect item received before we can process an exception. Please photograph the item you received and email it to returns@cosmicmart.com with your order number in the subject line. Once we receive the image, a specialist will process your exception within 24 hours.\n\nWe appreciate your patience.\n\nRespectfully,\nCosmic Mart Returns Team'
  },
  {
    id: 'ESC-2026-0005',
    timestamp: '2026-10-06T13:45:19Z',
    customer: { name: 'Sam Rivera', tier: 'Tier 2', orderId: 'ORD-2026-6073', email: 'sam.rivera@email.com' },
    order: {
      product: 'NexusStrike Pro Gaming Mouse',
      sku: 'CM-G019',
      price: 179.00,
      purchaseDate: '2026-08-07',
      returnWindowDays: 30,
      category: 'Gadgets'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'FRUSTRATED',
      orchestratorContext: 'Tier 2 customer reporting defective-on-arrival gaming mouse 60 days post-purchase, exceeding even the loyalty-extended window.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['RETURN_WINDOW_EXPIRED', 'LOYALTY_EXTENSION_INSUFFICIENT'],
      returnCategory: 'DEFECTIVE',
      escalationReason: 'Defective-on-arrival claim from Tier 2 customer; 60 days post-purchase exceeds the loyalty-extended 37-day window — high-value exception requires specialist review.'
    },
    caseNarrative: 'Sam Rivera (Tier 2) purchased a NexusStrike Pro Gaming Mouse for $179 on Aug 7 and reports the scroll wheel was defective from day one but did not initiate a return immediately. The gadget return window is 30 days (+7 for Tier 2 = 37 days), but the claim arrives 60 days post-purchase — 23 days past the extended deadline. Given Sam\'s Tier 2 status and the defective-on-arrival nature of the claim, specialist review is warranted.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Sam,\n\nThank you for reaching out to Cosmic Mart regarding your NexusStrike Pro Gaming Mouse (ORD-2026-6073). As a valued Tier 2 member, your satisfaction is our priority.\n\nAlthough your return falls outside the extended return window, we are approving an exception given the defective-on-arrival nature of the claim and your loyalty status. A prepaid return label is being sent to your email. Upon receipt, we will ship a replacement NexusStrike Pro Gaming Mouse via priority delivery, or issue a full refund of $179.00 — whichever you prefer. Please reply to indicate your preference.\n\nThank you for your loyalty to Cosmic Mart.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Sam,\n\nThank you for contacting Cosmic Mart about your NexusStrike Pro Gaming Mouse (ORD-2026-6073). We value your Tier 2 membership and understand your frustration.\n\nUnfortunately, your return request falls 23 days past the Tier 2 extended return window of 37 days. While we acknowledge the defective-on-arrival claim, our specialist review policy cannot accommodate exceptions beyond 30 days past the extended deadline. We recommend contacting the manufacturer directly for a warranty claim, as most gaming peripherals carry a 12-month manufacturer warranty that may cover your issue.\n\nWe appreciate your continued loyalty.\n\nRespectfully,\nCosmic Mart Returns Team'
  },
  {
    id: 'ESC-2026-0006',
    timestamp: '2026-10-06T14:52:08Z',
    customer: { name: 'Casey Wu', tier: 'Tier 1', orderId: 'ORD-2026-7214', email: 'casey.wu@email.com' },
    order: {
      product: 'OrbitalTime X Smart Watch',
      sku: 'CM-G003',
      price: 319.00,
      purchaseDate: '2026-09-29',
      returnWindowDays: 30,
      category: 'Gadgets'
    },
    agentOutputs: {
      intent: 'RETURN',
      sentiment: 'NEUTRAL',
      orchestratorContext: 'Customer claims wrong item received, but order records confirm the exact SKU was fulfilled and delivered; agent flagged a potential misuse pattern.',
      eligibilityDecision: 'INELIGIBLE',
      eligibilityFailedRules: ['WRONG_ITEM_CLAIM_CONTRADICTS_ORDER_RECORD', 'POTENTIAL_MISUSE_FLAG'],
      returnCategory: 'WRONG_ITEM',
      escalationReason: 'Order records confirm correct item was delivered but customer insists wrong item received — agent flagged potential return misuse pattern based on account history.'
    },
    caseNarrative: 'Casey Wu (Tier 1) purchased an OrbitalTime X Smart Watch on Sep 29 for $319 and claims a wrong item was received, 8 days after purchase. However, the order management system confirms the correct SKU (CM-G003) was fulfilled and delivered. The orchestrator flagged a potential misuse pattern based on account history. Given the high item value ($319) and conflicting signals, this case requires careful specialist review before any exception is approved.',
    status: 'PENDING',
    isLoading: false,
    generatedLetter: null,
    hardcodedAccept: 'Dear Casey,\n\nThank you for contacting Cosmic Mart about your OrbitalTime X Smart Watch (ORD-2026-7214). After specialist review, we are approving your return request.\n\nWe understand there has been confusion about the item received. We are issuing a return authorization and prepaid return label. Upon receipt and inspection, a full refund of $319.00 will be processed within 3–5 business days. We appreciate your patience during this review.\n\nWarm regards,\nCosmic Mart Returns Team',
    hardcodedDeny: 'Dear Casey,\n\nThank you for reaching out about your OrbitalTime X Smart Watch (ORD-2026-7214). After careful specialist review, we are unable to approve the return exception at this time.\n\nOur order records confirm that the OrbitalTime X Smart Watch (SKU: CM-G003) was the item ordered, fulfilled, and delivered to your address. The wrong-item claim cannot be verified against these records. If you believe there has been a genuine error, please photograph the item received and email returns@cosmicmart.com with your order number for expedited review by a senior specialist.\n\nRespectfully,\nCosmic Mart Returns Team'
  }
];

// ── Incentive config ───────────────────────────────────────────────────────────
var INCENTIVES = [
  { label: '+ 10% off next order',    clause: 'As a gesture of goodwill, please use code CARE10 at checkout for 10% off your next order.' },
  { label: '+ Free shipping',         clause: 'Your next order will ship free — code SHIPFREE will be auto-applied at checkout.' },
  { label: '+ Priority support',      clause: "We've flagged your account for priority support on your next contact with us." },
  { label: '+ Extended return window', clause: 'As a one-time courtesy, your next purchase will carry a 45-day return window.' }
];

// ── State ─────────────────────────────────────────────────────────────────────
var selectedCaseId = ESCALATION_CASES[0].id;
var activeIncentives = {}; // caseId -> Set of incentive indices currently toggled on

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPendingCount() {
  return ESCALATION_CASES.filter(function (c) { return c.status === 'PENDING'; }).length;
}

function updatePendingBadge() {
  var badge = document.getElementById('escPendingBadge');
  if (!badge) return;
  var count = getPendingCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function formatTimestamp(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function tierClass(tier) {
  if (tier === 'Tier 1') return 'esc-tier-1';
  if (tier === 'Tier 2') return 'esc-tier-2';
  return 'esc-tier-std';
}

function statusPillClass(status) {
  if (status === 'ACCEPTED') return 'esc-pill-accepted';
  if (status === 'DENIED')   return 'esc-pill-denied';
  return 'esc-pill-pending';
}

function sentimentClass(sentiment) {
  if (sentiment === 'DISTRESSED') return 'esc-sentiment-distressed';
  if (sentiment === 'FRUSTRATED') return 'esc-sentiment-frustrated';
  return 'esc-sentiment-neutral';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Light markdown pass: **bold** + newlines → HTML (safe to call after escHtml)
function markdownToHtml(text) {
  var escaped = escHtml(text);
  // Strip letterhead lines before "Dear …"
  var lines = escaped.split('\n');
  var dearIdx = -1;
  for (var i = 0; i < lines.length; i++) {
    if (/^Dear\b/i.test(lines[i].trim())) { dearIdx = i; break; }
  }
  if (dearIdx > 0) { escaped = lines.slice(dearIdx).join('\n'); }

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="esc-letter-para">')
    .replace(/\n/g, '<br>');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var toast = document.getElementById('escToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'escToast';
    toast.className = 'esc-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.classList.remove('is-visible'); }, 3500);
}

// ── Queue ─────────────────────────────────────────────────────────────────────
function renderQueue() {
  var el = document.getElementById('escQueue');
  if (!el) return;
  el.innerHTML = ESCALATION_CASES.map(function (c) {
    var short = c.agentOutputs.escalationReason.length > 82
      ? c.agentOutputs.escalationReason.slice(0, 82) + '…'
      : c.agentOutputs.escalationReason;
    return '<div class="esc-queue-card' +
        (c.id === selectedCaseId ? ' is-selected' : '') +
        (c.status !== 'PENDING' ? ' is-resolved' : '') + '"' +
        ' data-id="' + escHtml(c.id) + '" role="button" tabindex="0">' +
      '<div class="esc-queue-card-top">' +
        '<span class="esc-case-id">' + escHtml(c.id) + '</span>' +
        '<span class="esc-status-pill ' + statusPillClass(c.status) + '">' + escHtml(c.status) + '</span>' +
      '</div>' +
      '<div class="esc-queue-customer">' +
        '<strong>' + escHtml(c.customer.name) + '</strong>' +
        '<span class="esc-tier-badge ' + tierClass(c.customer.tier) + '">' + escHtml(c.customer.tier) + '</span>' +
      '</div>' +
      '<div class="esc-queue-product">' + escHtml(c.order.product) + '</div>' +
      '<div class="esc-queue-reason">' + escHtml(short) + '</div>' +
      '<div class="esc-queue-time">' + escHtml(formatTimestamp(c.timestamp)) + '</div>' +
    '</div>';
  }).join('');

  el.querySelectorAll('.esc-queue-card').forEach(function (card) {
    card.addEventListener('click', function () { selectCase(card.dataset.id); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCase(card.dataset.id); }
    });
  });
}

function selectCase(id) {
  selectedCaseId = id;
  renderQueue();
  renderDetail();
}

// ── Letter block ──────────────────────────────────────────────────────────────
function renderLetterBlock(c) {
  if (c.isLoading) {
    return '<p class="esc-letter-loading"><span class="esc-spinner"></span>Drafting response via AI…</p>';
  }
  if (!c.generatedLetter) return '';

  var rendered = markdownToHtml(c.generatedLetter);

  return '<div class="esc-letter-meta-row">' +
      '<span class="esc-ai-chip">✶ AI-drafted</span>' +
    '</div>' +
    '<blockquote class="esc-letter-body"><p class="esc-letter-para">' + rendered + '</p></blockquote>' +
    '<div class="esc-letter-actions">' +
      '<button class="esc-copy-btn" id="escCopyBtn-' + escHtml(c.id) + '">Copy to clipboard</button>' +
      '<button class="esc-edit-btn" id="escEditBtn-' + escHtml(c.id) + '">✎ Edit &amp; Send</button>' +
    '</div>';
}

function bindLetterButtons(c) {
  var copyBtn = document.getElementById('escCopyBtn-' + c.id);
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(c.generatedLetter || '').catch(function () {});
      showToast('Letter copied to clipboard');
    });
  }
  var editBtn = document.getElementById('escEditBtn-' + c.id);
  if (editBtn) {
    editBtn.addEventListener('click', function () { enterEditMode(c.id); });
  }
}

// ── Edit & Send mode ──────────────────────────────────────────────────────────
function enterEditMode(caseId) {
  var c = ESCALATION_CASES.find(function (x) { return x.id === caseId; });
  if (!c || !c.generatedLetter) return;

  if (!activeIncentives[caseId]) { activeIncentives[caseId] = new Set(); }
  var active = activeIncentives[caseId];

  var pillsHtml = INCENTIVES.map(function (inc, idx) {
    var isActive = active.has(idx);
    return '<button class="esc-incentive-pill' + (isActive ? ' is-active' : '') + '"' +
      ' data-idx="' + idx + '">' + escHtml(inc.label) + '</button>';
  }).join('');

  var card = document.getElementById('escLetterCard-' + caseId);
  if (!card) return;

  card.innerHTML =
    '<div class="esc-letter-meta-row">' +
      '<span class="esc-ai-chip">✶ AI-drafted</span>' +
    '</div>' +
    '<div class="esc-incentive-row">' + pillsHtml + '</div>' +
    '<textarea class="esc-edit-textarea" id="escTextarea-' + escHtml(caseId) + '" rows="10" spellcheck="true">' +
      escHtml(buildEditableText(c, active)) +
    '</textarea>' +
    '<div class="esc-send-row">' +
      '<button class="esc-send-btn" id="escSendBtn-' + escHtml(caseId) + '">Send to ' + escHtml(c.customer.email) + '</button>' +
    '</div>';

  // Incentive pill toggles
  card.querySelectorAll('.esc-incentive-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      var idx = parseInt(pill.dataset.idx, 10);
      if (active.has(idx)) {
        active.delete(idx);
        pill.classList.remove('is-active');
      } else {
        active.add(idx);
        pill.classList.add('is-active');
      }
      var ta = document.getElementById('escTextarea-' + caseId);
      if (ta) { ta.value = buildEditableText(c, active); }
    });
  });

  // Send button
  var sendBtn = document.getElementById('escSendBtn-' + caseId);
  if (sendBtn) {
    sendBtn.addEventListener('click', function () {
      var ta = document.getElementById('escTextarea-' + caseId);
      if (ta) { c.generatedLetter = ta.value; }
      showToast('✓ Email sent to ' + c.customer.email);
    });
  }
}

function buildEditableText(c, active) {
  var base = c.generatedLetter.trim();
  // Strip any letterhead before "Dear"
  var lines = base.split('\n');
  var dearIdx = -1;
  for (var i = 0; i < lines.length; i++) {
    if (/^Dear\b/i.test(lines[i].trim())) { dearIdx = i; break; }
  }
  if (dearIdx > 0) { base = lines.slice(dearIdx).join('\n'); }

  if (active.size > 0) {
    var clauses = [];
    INCENTIVES.forEach(function (inc, idx) {
      if (active.has(idx)) { clauses.push(inc.clause); }
    });
    base = base + '\n\n' + clauses.join('\n');
  }
  return base;
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function renderDetail() {
  var el = document.getElementById('escDetail');
  if (!el) return;
  var c = ESCALATION_CASES.find(function (x) { return x.id === selectedCaseId; });
  if (!c) { el.innerHTML = ''; return; }

  var isPending  = c.status === 'PENDING';
  var isAccepted = c.status === 'ACCEPTED';

  var failedRulesHtml = c.agentOutputs.eligibilityFailedRules.map(function (r) {
    return '<span class="esc-rule-chip">' + escHtml(r) + '</span>';
  }).join('');

  var outcomeIcon = isAccepted
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  el.innerHTML =
    '<div class="esc-detail-inner">' +

    // Customer & Order
    '<section class="esc-detail-section">' +
      '<h3 class="esc-section-label">Customer &amp; Order</h3>' +
      '<div class="esc-info-grid">' +
        '<div class="esc-info-item"><span class="esc-info-key">Customer</span>' +
          '<span class="esc-info-val">' + escHtml(c.customer.name) +
          ' <span class="esc-tier-badge ' + tierClass(c.customer.tier) + '">' + escHtml(c.customer.tier) + '</span></span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Order ID</span>' +
          '<span class="esc-info-val">' + escHtml(c.customer.orderId) + '</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Product</span>' +
          '<span class="esc-info-val">' + escHtml(c.order.product) + '</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">SKU</span>' +
          '<span class="esc-info-val">' + escHtml(c.order.sku) + '</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Price</span>' +
          '<span class="esc-info-val">$' + escHtml(c.order.price.toFixed(2)) + '</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Purchase Date</span>' +
          '<span class="esc-info-val">' + escHtml(c.order.purchaseDate) + '</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Return Window</span>' +
          '<span class="esc-info-val">' + escHtml(String(c.order.returnWindowDays)) + ' days</span></div>' +
        '<div class="esc-info-item"><span class="esc-info-key">Category</span>' +
          '<span class="esc-info-val">' + escHtml(c.order.category) + '</span></div>' +
      '</div>' +
    '</section>' +

    // Agent Pipeline (collapsible)
    '<section class="esc-detail-section">' +
      '<details class="esc-collapsible" open>' +
        '<summary class="esc-section-label esc-collapsible-summary">Agent Pipeline Outputs' +
          '<svg class="esc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</summary>' +
        '<div class="esc-pipeline-grid">' +
          '<div class="esc-pipeline-item"><span class="esc-info-key">Intent Detected</span>' +
            '<span class="esc-pipeline-tag">' + escHtml(c.agentOutputs.intent) + '</span></div>' +
          '<div class="esc-pipeline-item"><span class="esc-info-key">Sentiment</span>' +
            '<span class="esc-sentiment-badge ' + sentimentClass(c.agentOutputs.sentiment) + '">' + escHtml(c.agentOutputs.sentiment) + '</span></div>' +
          '<div class="esc-pipeline-item esc-pipeline-full"><span class="esc-info-key">Orchestrator Context</span>' +
            '<span class="esc-pipeline-val">' + escHtml(c.agentOutputs.orchestratorContext) + '</span></div>' +
          '<div class="esc-pipeline-item"><span class="esc-info-key">Eligibility Decision</span>' +
            '<span class="esc-eligibility-badge">INELIGIBLE</span></div>' +
          '<div class="esc-pipeline-item esc-pipeline-full"><span class="esc-info-key">Failed Rules</span>' +
            '<div class="esc-failed-rules">' + failedRulesHtml + '</div></div>' +
          '<div class="esc-pipeline-item"><span class="esc-info-key">Return Category</span>' +
            '<span class="esc-pipeline-tag">' + escHtml(c.agentOutputs.returnCategory) + '</span></div>' +
        '</div>' +
      '</details>' +
    '</section>' +

    // Escalation Flag
    '<section class="esc-detail-section">' +
      '<div class="esc-escalation-banner">' +
        '<div class="esc-escalation-banner-head">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
          '<strong>Escalation Required &mdash; Human Review Needed</strong>' +
        '</div>' +
        '<p class="esc-escalation-reason">' + escHtml(c.agentOutputs.escalationReason) + '</p>' +
      '</div>' +
      '<div class="esc-case-narrative">' +
        '<h4 class="esc-narrative-label">Case Narrative</h4>' +
        '<p>' + escHtml(c.caseNarrative) + '</p>' +
      '</div>' +
    '</section>' +

    // Case Actions (PENDING only)
    (isPending
      ? '<section class="esc-detail-section esc-actions-section" id="escActionsSection-' + escHtml(c.id) + '">' +
          '<div class="esc-action-btns">' +
            '<button class="esc-btn-accept" id="escAcceptBtn-' + escHtml(c.id) + '" data-id="' + escHtml(c.id) + '">✓ ACCEPT RETURN</button>' +
            '<button class="esc-btn-deny"   id="escDenyBtn-'   + escHtml(c.id) + '" data-id="' + escHtml(c.id) + '">✗ DENY RETURN</button>' +
          '</div>' +
          '<p class="esc-action-hint">AI will draft a professional response based on this case report.</p>' +
        '</section>'
      : '') +

    // Decision Outcome (non-PENDING)
    (!isPending
      ? '<section class="esc-detail-section">' +
          '<div class="esc-outcome-banner ' + (isAccepted ? 'esc-outcome-accepted' : 'esc-outcome-denied') + '">' +
            outcomeIcon +
            (isAccepted ? 'Return Accepted' : 'Return Denied') +
          '</div>' +
          '<div class="esc-letter-card" id="escLetterCard-' + escHtml(c.id) + '">' +
            renderLetterBlock(c) +
          '</div>' +
        '</section>'
      : '') +

    '</div>';

  // Bind action buttons
  var acceptBtn = document.getElementById('escAcceptBtn-' + c.id);
  if (acceptBtn) { acceptBtn.addEventListener('click', function () { handleDecision(c.id, 'ACCEPTED'); }); }
  var denyBtn = document.getElementById('escDenyBtn-' + c.id);
  if (denyBtn) { denyBtn.addEventListener('click', function () { handleDecision(c.id, 'DENIED'); }); }

  bindLetterButtons(c);
}

// ── AI Decision ───────────────────────────────────────────────────────────────
async function handleDecision(caseId, decision) {
  var c = ESCALATION_CASES.find(function (x) { return x.id === caseId; });
  if (!c || c.status !== 'PENDING') return;

  c.status = decision;
  c.isLoading = true;
  c.generatedLetter = null;

  updatePendingBadge();
  renderQueue();
  renderDetail();

  var systemPrompt = decision === 'ACCEPTED'
    ? 'You are a senior returns specialist at Cosmic Mart. Draft a professional, empathetic 1–2 paragraph acceptance letter for a return escalation. Address the customer by first name. Reference the specific product, the reason for original denial, and explain clearly why the exception is being approved. Close with next steps for the return. Tone: warm but formal. Do not include any letterhead or header — begin directly with "Dear [Name],".'
    : 'You are a senior returns specialist at Cosmic Mart. Draft a professional, empathetic 1–2 paragraph denial letter for a return escalation. Address the customer by first name. Reference the specific product and the failed eligibility rules by name. Explain clearly why the exception cannot be approved. Offer an alternative (store credit, extended warranty claim, or manufacturer contact). Tone: firm but respectful. Do not include any letterhead or header — begin directly with "Dear [Name],".';

  var userMessage = 'Escalation case report: ' + JSON.stringify({
    caseNarrative: c.caseNarrative,
    agentOutputs: c.agentOutputs,
    customer: c.customer,
    order: c.order
  });

  var letter;
  try {
    letter = await callClaude(systemPrompt, userMessage, 512);
  } catch (err) {
    console.error('[escalation] AI draft failed, using fallback:', err.message);
    letter = decision === 'ACCEPTED' ? c.hardcodedAccept : c.hardcodedDeny;
  }

  c.generatedLetter = letter;
  c.isLoading = false;

  var letterCard = document.getElementById('escLetterCard-' + caseId);
  if (letterCard) {
    letterCard.innerHTML = renderLetterBlock(c);
    bindLetterButtons(c);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  renderQueue();
  renderDetail();
  updatePendingBadge();
});
