(function () {
  let currentOrder = null;
  let chatActive = false;
  let clarificationCount = 0;
  let currentCaseRef = null;
  let currentResult = null;
  let chatHistory = [];

  const SUBSTEP_MAP = {
    'sub-sentiment': 'cmSubSentiment',
    'sub-context':   'cmSubContext',
    'sub-window':    'cmSubWindow',
    'sub-tier':      'cmSubTier',
    'sub-restype':   'cmSubResType',
    'sub-caseref':   'cmSubCaseRef',
  };

  const agentSteps = [
    { id: 'orchestrator', label: 'Loading your order details...' },
    { id: 'eligibility',  label: 'Validating return eligibility...' },
    { id: 'classifier',   label: 'Classifying return reason...' },
    { id: 'resolution',   label: 'Generating resolution...' },
    { id: 'communication',label: 'Preparing your resolution message...' },
    { id: 'escalation',   label: 'Connecting you to a specialist...' }
  ];

  function getEl(id) { return document.getElementById(id); }

  const WELCOME = 'Welcome to the Cosmic Mart Returns Center. To get started, enter your Order ID above and click "Look Up Order". I\'ll guide you through the rest.';

  // Each stage drives a sidebar row + optionally an in-chat strip step.
  const STAGES = {
    order:       { row: 'cmProgOrder',      step: 'cmStepFind' },
    issue:       { row: 'cmProgIssue',      step: 'cmStepDescribe' },
    eligibility: { row: 'cmProgElig',       step: null },
    resolution:  { row: 'cmProgResolution', step: 'cmStepResolve' }
  };

  function setStepNum(el, done) {
    const num = el && el.querySelector('.cm-step-num');
    if (!num) return;
    if (!num.dataset.num) num.dataset.num = num.textContent;
    num.textContent = done ? '✓' : num.dataset.num;
  }

  function setStage(name, state, title, detail) {
    const pair = STAGES[name];
    if (!pair) return;

    const row = getEl(pair.row);
    if (row) {
      row.classList.remove('is-active', 'is-done', 'is-working');
      if (state === 'working') row.classList.add('is-active', 'is-working');
      else if (state) row.classList.add('is-' + state);

      const strong = row.querySelector('strong');
      const small = row.querySelector('small');
      if (strong && title) strong.textContent = title;
      if (small && detail) small.textContent = detail;
      setStepNum(row, state === 'done');
    }

    if (pair.step) {
      const step = getEl(pair.step);
      if (step) {
        step.classList.remove('cm-step-active', 'cm-step-done');
        if (state === 'done') step.classList.add('cm-step-done');
        else if (state) step.classList.add('cm-step-active');
        setStepNum(step, state === 'done');
      }
    }
  }

  function setSubstep(id, state) {
    var el = getEl(id);
    if (!el) return;
    el.classList.remove('is-active', 'is-done');
    if (state === 'active') el.classList.add('is-active');
    else if (state === 'done') el.classList.add('is-done');
    var num = el.querySelector('.cm-substep-num');
    if (num) num.textContent = (state === 'done') ? '✓' : '';
  }

  function resetStages() {
    setStage('order', 'active', 'Order not found', 'Enter your order ID to begin');
    setStage('issue', null, 'Issue not selected', 'Tell us what happened');
    setStage('eligibility', null, 'Eligibility pending', 'Return window & tier check');
    setStage('resolution', null, 'Resolution pending', 'Get your refund, replacement, or credit');
    ['cmSubCustomer','cmSubOrderLoad','cmSubSentiment','cmSubContext',
     'cmSubWindow','cmSubTier','cmSubResType','cmSubCaseRef'].forEach(function(id) {
      setSubstep(id, null);
    });
  }

  function addMessage(text, type) {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;

    const div = document.createElement('div');
    if (type === 'user') div.className = 'cm-bubble-user';
    else if (type === 'agent') div.className = 'cm-bubble-agent';
    else div.className = 'cm-bubble-system';

    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showTyping() {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;
    const t = document.createElement('div');
    t.className = 'cm-typing';
    t.id = 'cmReturnsTyping';
    t.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const t = getEl('cmReturnsTyping');
    if (t) t.remove();
  }

  // ── Live case draft panel (replaces static progress overlay) ──

  function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function addThinkingMessage(text) {
    var messages = getEl('cmReturnsMessages');
    if (!messages) return;
    var div = document.createElement('div');
    div.className = 'cm-bubble-thinking';
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function createCaseDraftPanel() {
    var messages = getEl('cmReturnsMessages');
    if (!messages) return;
    var panel = document.createElement('div');
    panel.className = 'cm-case-draft';
    panel.id = 'cmCaseDraft';
    panel.innerHTML =
      '<div class="cm-case-draft-header">' +
        '<span class="cm-case-draft-icon">📋</span>' +
        '<span class="cm-case-draft-title" id="cmCaseDraftTitle">Nova is building your case file...</span>' +
        '<span class="cm-case-draft-spinner" id="cmCaseDraftSpinner"></span>' +
      '</div>' +
      '<div class="cm-case-draft-body" id="cmCaseDraftBody"></div>';
    messages.appendChild(panel);
    messages.scrollTop = messages.scrollHeight;
  }

  function caseDraftSectionHeader(label) {
    var body = getEl('cmCaseDraftBody');
    if (!body) return;
    var el = document.createElement('div');
    el.className = 'cm-case-section-hdr';
    el.textContent = '▸ ' + label;
    body.appendChild(el);
    var msgs = getEl('cmReturnsMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function caseDraftLine(label, value, variant) {
    var body = getEl('cmCaseDraftBody');
    if (!body) return;
    var row = document.createElement('div');
    row.className = 'cm-case-line' + (variant ? ' cm-case-line--' + variant : '');
    var lEl = document.createElement('span');
    lEl.className = 'cm-case-line-label';
    lEl.textContent = label;
    var vEl = document.createElement('span');
    vEl.className = 'cm-case-line-value';
    row.appendChild(lEl);
    row.appendChild(vEl);
    body.appendChild(row);
    var str = String(value || '—');
    var i = 0;
    function tick() {
      if (i < str.length) {
        vEl.textContent = str.slice(0, ++i);
        var msgs = getEl('cmReturnsMessages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        setTimeout(tick, 14);
      }
    }
    setTimeout(tick, 40);
  }

  // Stagger each line 150ms apart so the report visibly fills in row by row.
  // Each entry is [label, value] or [label, value, variant].
  function staggerLines(lines) {
    lines.forEach(function(args, i) {
      setTimeout(function() {
        caseDraftLine(args[0], args[1], args[2]);
      }, i * 150);
    });
  }

  function handleCaseData(section, data) {
    if (!data) return;

    if (section === 'customer') {
      addThinkingMessage('Found it — ' + (data.product || 'your item') + ', $' + (data.price || '—') + '. Purchased ' + (data.days || '—') + ' days ago.');
      caseDraftSectionHeader('CUSTOMER & ORDER');
      staggerLines([
        ['Name',               data.name],
        ['Loyalty tier',       data.tier],
        ['Market',             data.market],
        ['Order ID',           data.order_id],
        ['Product',            data.product],
        ['Category',           data.category],
        ['Price',              '$' + (data.price || '—')],
        ['Days since purchase', (data.days || '—') + ' days']
      ]);

    } else if (section === 'issue') {
      var issueThought = data.frustrated
        ? '⚡ I can tell you\'re frustrated with this. I\'m flagging your case for elevated care.'
        : 'Got it — I\'ve mapped your issue. ' + (data.priority === 'high' ? 'This is a high priority case.' : 'Processing now.');
      addThinkingMessage(issueThought);
      caseDraftSectionHeader('ISSUE ANALYSIS');
      var issueLines = [
        ['Description', data.description],
        ['Priority',    (data.priority || 'standard').toUpperCase()],
        ['Frustrated',  data.frustrated ? '⚡ Yes — elevated care' : 'No']
      ];
      if (data.signals && data.signals.length) issueLines.push(['Signals', data.signals.join(', ')]);
      staggerLines(issueLines);

    } else if (section === 'eligibility') {
      var checks = data.checks_passed || [];
      var passed = checks.filter(function(c) { return c.passed; }).length;
      var eligThought = data.eligible
        ? 'Good news — all ' + passed + ' eligibility checks passed. You\'re within your return window.'
        : 'Hmm — ' + (checks.length - passed) + ' check(s) failed. I\'ll need to escalate this.';
      addThinkingMessage(eligThought);
      caseDraftSectionHeader('ELIGIBILITY');
      var eligLines = checks.map(function(c) {
        return [(c.passed ? '✓ ' : '✗ ') + c.check.replace(/_/g, ' '), c.detail || '', c.passed ? 'pass' : 'fail'];
      });
      eligLines.push(['Status', data.eligible ? '✓ ELIGIBLE' : '✗ INELIGIBLE', data.eligible ? 'pass' : 'fail']);
      staggerLines(eligLines);

    } else if (section === 'classification') {
      addThinkingMessage('This looks like a ' + (data.return_category || 'standard') + ' case — ' + (data.confidence || 'medium') + ' confidence. ' + (data.operational_flag && data.operational_flag !== 'none' ? 'Flagging: ' + data.operational_flag + '.' : ''));
      caseDraftSectionHeader('CLASSIFICATION');
      staggerLines([
        ['Category',         data.return_category || '—'],
        ['Confidence',       (data.confidence || '—').toUpperCase()],
        ['Operational flag', data.operational_flag || '—']
      ]);

    } else if (section === 'resolution') {
      addThinkingMessage('Resolution determined: ' + (data.resolution_type || 'refund') + ' approved — $' + (data.amount || '—') + ' ' + (data.currency || 'USD') + '. ' + (data.timeline || '') + '.');
      caseDraftSectionHeader('RESOLUTION');
      var resLines = [
        ['Type',          data.resolution_type || '—'],
        ['Amount',        '$' + (data.amount || '—') + ' ' + (data.currency || 'USD')],
        ['Timeline',      data.timeline || '—'],
        ['Return label',  data.label_provided ? 'Prepaid label emailed' : 'Not required'],
        ['Tier upgrade',  data.tier_upgrade_applied ? '⭐ Applied' : 'None'],
        ['Case reference', data.case_ref || '—', 'highlight']
      ];
      staggerLines(resLines);
      setTimeout(function() {
        var titleEl = getEl('cmCaseDraftTitle');
        if (titleEl) titleEl.textContent = 'Case file — ' + (data.case_ref || '');
        var spinner = getEl('cmCaseDraftSpinner');
        if (spinner) spinner.style.display = 'none';
        caseDraftSectionHeader('STATUS');
        caseDraftLine('Resolution', '✓ CASE COMPLETE', 'pass');
      }, resLines.length * 150 + 1200);

    } else if (section === 'escalation') {
      addThinkingMessage('This case needs specialist review. Escalating now — I\'ll make sure your details are passed along.');
      caseDraftSectionHeader('ESCALATION');
      staggerLines([
        ['Case reference', data.caseRef || '—', 'highlight'],
        ['Reason',         data.reason || 'Specialist review required', 'fail']
      ]);
      setTimeout(function() {
        var titleEl = getEl('cmCaseDraftTitle');
        if (titleEl) titleEl.textContent = 'Case file — ' + (data.caseRef || 'escalated');
        var spinner = getEl('cmCaseDraftSpinner');
        if (spinner) spinner.style.display = 'none';
        caseDraftSectionHeader('STATUS');
        caseDraftLine('Resolution', '→ ESCALATED TO SPECIALIST', 'highlight');
      }, 800);
    }
  }

  function typeMessage(text, type) {
    return new Promise(function(resolve) {
      var messages = getEl('cmReturnsMessages');
      if (!messages) { resolve(null); return; }
      var div = document.createElement('div');
      div.className = type === 'user' ? 'cm-bubble-user' : 'cm-bubble-agent';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      var i = 0;
      var chunkSize = 6;
      var delay = 28;
      function tick() {
        if (i < text.length) {
          i = Math.min(i + chunkSize, text.length);
          div.textContent = text.slice(0, i);
          messages.scrollTop = messages.scrollHeight;
          setTimeout(tick, delay);
        } else {
          resolve(div);
        }
      }
      setTimeout(tick, 80);
    });
  }

  function addWhatNextStrip(trace) {
    var messages = getEl('cmReturnsMessages');
    if (!messages || !trace) return;

    var cat = trace.classification && trace.classification.return_category;
    var steps = [];

    if (cat === 'DAMAGED_TRANSIT') {
      steps = [
        { icon: '📋', label: 'Carrier Claim Filed', sub: 'Done automatically' },
        { icon: '💳', label: 'Refund Initiated', sub: 'Within 24 hours' },
        { icon: '✅', label: 'Money Back', sub: '3–5 business days' }
      ];
    } else if (cat === 'DEFECTIVE') {
      steps = [
        { icon: '✅', label: 'Return Approved', sub: 'Done' },
        { icon: '📧', label: 'Label Emailed', sub: 'Check your inbox' },
        { icon: '💳', label: 'Refund or Replacement', sub: '2–5 business days' }
      ];
    } else if (cat === 'WRONG_ITEM') {
      steps = [
        { icon: '✅', label: 'Return Approved', sub: 'Done' },
        { icon: '📧', label: 'Label Emailed', sub: 'Check your inbox' },
        { icon: '💳', label: 'Refund Processed', sub: '3–5 business days' }
      ];
    } else {
      steps = [
        { icon: '✅', label: 'Return Approved', sub: 'Done' },
        { icon: '📧', label: 'Label Emailed', sub: 'Check your inbox' },
        { icon: '💳', label: 'Refund Processed', sub: '3–5 business days' }
      ];
    }

    var strip = document.createElement('div');
    strip.className = 'cm-whats-next';

    var header = document.createElement('div');
    header.className = 'cm-whats-next-title';
    header.textContent = 'What happens next';
    strip.appendChild(header);

    var steps_el = document.createElement('div');
    steps_el.className = 'cm-whats-next-steps';

    steps.forEach(function(step, idx) {
      var item = document.createElement('div');
      item.className = 'cm-whats-next-step';
      item.innerHTML =
        '<div class="cm-wn-icon">' + step.icon + '</div>' +
        '<div class="cm-wn-label">' + step.label + '</div>' +
        '<div class="cm-wn-sub">' + step.sub + '</div>';
      steps_el.appendChild(item);

      if (idx < steps.length - 1) {
        var sep = document.createElement('div');
        sep.className = 'cm-wn-arrow';
        sep.textContent = '→';
        steps_el.appendChild(sep);
      }
    });

    strip.appendChild(steps_el);
    messages.appendChild(strip);
    messages.scrollTop = messages.scrollHeight;
  }

  function getContextualChips(trace, resultType) {
    if (resultType === 'escalation') return ['Contact Support'];
    if (!trace || !trace.classification) return ['Contact Support'];
    var cat = trace.classification.return_category;
    var prodCat = trace.context && trace.context.product_category;
    if (cat === 'DAMAGED_TRANSIT' || cat === 'DEFECTIVE') {
      var shopLabel = prodCat === 'gadgets' ? 'Browse Gadgets →' : prodCat === 'fashion' ? 'Browse Fashion →' : 'Keep Shopping →';
      return [shopLabel, 'Contact Support'];
    }
    if (cat === 'WRONG_ITEM') return ['Keep Shopping →', 'Contact Support'];
    return ['Contact Support'];
  }

  function addRetentionOffer(retention) {
    var messages = getEl('cmReturnsMessages');
    if (!messages || !retention) return;

    var bubble = document.createElement('div');
    bubble.className = 'cm-bubble-agent cm-retention-offer';

    var header = document.createElement('div');
    header.className = 'cm-retention-header';
    header.innerHTML = '<span class="cm-retention-icon">💡</span><strong>Before we finalize your return…</strong>';
    bubble.appendChild(header);

    var text = document.createElement('p');
    text.className = 'cm-retention-text';
    text.textContent = retention.offer_text;
    bubble.appendChild(text);

    var amounts = document.createElement('div');
    amounts.className = 'cm-retention-amounts';
    amounts.innerHTML =
      '<div class="cm-retention-amount highlight"><span>Store Credit</span><strong>$' + retention.store_credit_amount + '</strong><small>+15% more value</small></div>' +
      '<div class="cm-retention-divider">vs</div>' +
      '<div class="cm-retention-amount"><span>Cash Refund</span><strong>$' + retention.refund_amount + '</strong><small>3–5 business days</small></div>';
    bubble.appendChild(amounts);

    var chips = document.createElement('div');
    chips.className = 'cm-retention-chips';

    var acceptBtn = document.createElement('button');
    acceptBtn.className = 'cm-retention-btn accept';
    acceptBtn.textContent = 'Accept $' + retention.store_credit_amount + ' Store Credit';
    acceptBtn.addEventListener('click', function() {
      bubble.remove();
      addMessage('I\'ll take the store credit!', 'user');
      addMessage('Done! $' + retention.store_credit_amount + ' in Cosmic Mart store credit has been applied to your account. It never expires and works on everything. Your return has been closed — no need to ship anything back. Enjoy shopping!', 'agent');
      addQuickReplies(['Contact Support']);
    });

    var declineBtn = document.createElement('button');
    declineBtn.className = 'cm-retention-btn decline';
    declineBtn.textContent = 'No thanks, proceed with refund';
    declineBtn.addEventListener('click', function() {
      bubble.remove();
      addMessage('Proceed with refund', 'user');
      addMessage('Understood! Your $' + retention.refund_amount + ' refund has been approved and will be returned to your original payment method within 3–5 business days. Check your email for the prepaid return label.', 'agent');
      addQuickReplies(['Contact Support']);
    });

    chips.appendChild(acceptBtn);
    chips.appendChild(declineBtn);
    bubble.appendChild(chips);

    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTierBenefitBanner(tier, resolution) {
    var messages = getEl('cmReturnsMessages');
    if (!messages) return;

    var isT2 = tier && tier.indexOf('2') !== -1;
    var benefits = [];
    if (resolution.options && resolution.options.length) {
      benefits.push('Upgraded to: ' + (isT2 ? 'Priority replacement + full refund' : 'Full refund (standard upgrade)'));
    }
    benefits.push(isT2 ? '+7 day return window · Priority shipping on replacement' : '+7 day return window extension');

    var banner = document.createElement('div');
    banner.className = 'cm-tier-banner';
    banner.innerHTML =
      '<div class="cm-tier-banner-header">' +
        '<span class="cm-tier-banner-icon">⭐</span>' +
        '<span class="cm-tier-banner-title">' + (tier || 'Loyalty Member') + ' Benefit Applied</span>' +
      '</div>' +
      '<ul class="cm-tier-banner-list">' +
        benefits.map(function(b) { return '<li>' + b + '</li>'; }).join('') +
      '</ul>';
    messages.appendChild(banner);
    messages.scrollTop = messages.scrollHeight;
  }

  function addDecisionTrace(trace, resultType) {
    var messages = getEl('cmReturnsMessages');
    if (!messages || !trace) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'cm-trace-wrapper';

    var details = document.createElement('details');
    details.className = 'cm-trace-details';
    details.open = true;

    var summary = document.createElement('summary');
    summary.className = 'cm-trace-summary';
    var badge = resultType === 'escalation' ? '<span class="cm-trace-badge escalated">Escalated</span>' : '<span class="cm-trace-badge resolved">Resolved</span>';
    summary.innerHTML = '<span class="cm-trace-label"><span class="cm-trace-icon">🔍</span> AI Decision Trace</span>' + badge;
    details.appendChild(summary);

    var body = document.createElement('div');
    body.className = 'cm-trace-body';

    // Eligibility section
    if (trace.eligibility) {
      var elig = trace.eligibility;
      var checks = elig.checks_passed || [];
      var allPassed = checks.every(function(c) { return c.passed; });
      var eligSec = document.createElement('div');
      eligSec.className = 'cm-trace-section';

      var eligHeader = document.createElement('div');
      eligHeader.className = 'cm-trace-section-header';
      eligHeader.innerHTML = '<span class="cm-trace-agent-name">Eligibility Checker</span>' +
        '<span class="cm-trace-result ' + (allPassed ? 'pass' : 'fail') + '">' + (allPassed ? '✓ Eligible' : '✗ Ineligible') + '</span>';
      eligSec.appendChild(eligHeader);

      var checkList = document.createElement('div');
      checkList.className = 'cm-trace-checks';
      checks.forEach(function(check) {
        var row = document.createElement('div');
        row.className = 'cm-trace-check ' + (check.passed ? 'passed' : 'failed');
        row.innerHTML = '<span class="cm-trace-check-icon">' + (check.passed ? '✓' : '✗') + '</span>' +
          '<span class="cm-trace-check-name">' + check.check.replace(/_/g, ' ') + '</span>' +
          '<span class="cm-trace-check-detail">' + (check.detail || '') + '</span>';
        checkList.appendChild(row);
      });
      eligSec.appendChild(checkList);
      body.appendChild(eligSec);
    }

    // Classification section (resolution only)
    if (trace.classification) {
      var cls = trace.classification;
      var clsSec = document.createElement('div');
      clsSec.className = 'cm-trace-section';
      clsSec.innerHTML = '<div class="cm-trace-section-header">' +
        '<span class="cm-trace-agent-name">Return Classifier</span>' +
        '<span class="cm-trace-result pass">' + cls.return_category + '</span></div>' +
        '<div class="cm-trace-row"><span>Confidence</span><span class="cm-trace-confidence ' + cls.confidence + '">' + cls.confidence.toUpperCase() + '</span></div>' +
        '<div class="cm-trace-row"><span>Operational flag</span><span>' + (cls.operational_flag || '—') + '</span></div>';
      body.appendChild(clsSec);
    }

    // Resolution section
    if (trace.resolution) {
      var res = trace.resolution;
      var resSec = document.createElement('div');
      resSec.className = 'cm-trace-section';
      var tierBadge = res.tier_upgrade_applied ? '<div class="cm-trace-tier-badge">⭐ Loyalty Tier Upgrade Applied</div>' : '';
      resSec.innerHTML = '<div class="cm-trace-section-header">' +
        '<span class="cm-trace-agent-name">Resolution Generator</span>' +
        '<span class="cm-trace-result pass">' + (res.resolution_type || 'Approved') + '</span></div>' +
        tierBadge +
        '<div class="cm-trace-row"><span>Refund amount</span><span>$' + (res.amount || '—') + '</span></div>' +
        '<div class="cm-trace-row"><span>Timeline</span><span>' + (res.timeline || '—') + '</span></div>' +
        '<div class="cm-trace-row"><span>Return label</span><span>' + (res.label_provided ? 'Prepaid label included' : 'Not required') + '</span></div>';
      body.appendChild(resSec);
    }

    details.appendChild(body);
    wrapper.appendChild(details);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function addCaseReportBtn(result, order) {
    var messages = getEl('cmReturnsMessages');
    if (!messages) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'cm-case-btn-wrapper';
    var btn = document.createElement('button');
    btn.className = 'cm-report-open-btn';
    btn.innerHTML = '📄 View Full Case Report';
    btn.addEventListener('click', function() { openReportModal(result, order); });
    wrapper.appendChild(btn);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function openReportModal(result, order) {
    var modal = getEl('cmReportModal');
    var body = getEl('cmReportBody');
    var refEl = getEl('cmReportCaseRef');
    var metaEl = getEl('cmReportMeta');
    var statusEl = getEl('cmReportStatusBadge');
    if (!modal || !body) return;

    var trace = result.trace || {};
    var ctx = trace.context || {};
    var elig = trace.eligibility || {};
    var cls = trace.classification || {};
    var res = trace.resolution || {};
    var sent = result.sentiment || {};
    var caseRef = result.caseRef || (res.case_ref) || 'N/A';
    var now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var isEscalation = result.type === 'escalation';

    if (refEl) refEl.textContent = caseRef;
    if (metaEl) metaEl.textContent = 'Generated: ' + now + '  ·  Processed by Nova AI Returns Agent';
    if (statusEl) {
      statusEl.textContent = isEscalation ? 'Escalated' : 'Resolved';
      statusEl.className = 'cm-report-status-badge ' + (isEscalation ? 'escalated' : 'resolved');
    }

    var html = '';

    // Customer & Order
    html += '<div class="cm-report-section">';
    html += '<div class="cm-report-section-title">Customer &amp; Order</div>';
    html += '<dl>';
    if (order) {
      html += row('Customer', order.customer_name || ctx.customer_id || '—');
      html += row('Customer ID', order.customer_id || ctx.customer_id || '—');
      html += row('Loyalty Tier', order.customer_tier || ctx.customer_tier || '—');
      html += row('Market', order.market || ctx.market || '—');
      html += row('Order ID', order.order_id || ctx.order_id || '—');
      html += row('Product', order.product_name || ctx.product || '—');
      html += row('Category', order.product_category || ctx.product_category || '—');
      html += row('Purchase Date', order.purchase_date || '—');
      html += row('Days Since Purchase', (ctx.days_since_purchase || order.days_since_purchase || '—') + ' days');
      html += row('Purchase Price', '$' + (order.purchase_price || ctx.purchase_price || '—'));
    } else {
      html += row('Customer', ctx.customer_id || '—');
      html += row('Order ID', ctx.order_id || '—');
      html += row('Product', ctx.product || '—');
      html += row('Days Since Purchase', (ctx.days_since_purchase || '—') + ' days');
    }
    html += '</dl></div>';

    // Issue
    html += '<div class="cm-report-section">';
    html += '<div class="cm-report-section-title">Issue Summary</div>';
    html += '<dl>';
    html += row('Reported Issue', ctx.issue_description || '—');
    html += row('Priority Level', sent.priority ? sent.priority.toUpperCase() : 'STANDARD');
    html += row('Frustrated', sent.frustrated ? '⚡ Yes — elevated care applied' : 'No');
    if (sent.signals && sent.signals.length) {
      html += row('Signals Detected', sent.signals.join(', '));
    }
    html += '</dl></div>';

    // Eligibility
    if (elig.checks_passed) {
      html += '<div class="cm-report-section">';
      html += '<div class="cm-report-section-title">Eligibility Assessment</div>';
      elig.checks_passed.forEach(function(c) {
        html += '<div class="cm-report-check ' + (c.passed ? 'pass' : 'fail') + '">' +
          '<span class="cm-report-check-icon">' + (c.passed ? '✓' : '✗') + '</span>' +
          '<span class="cm-report-check-name">' + c.check.replace(/_/g, ' ') + '</span>' +
          '<span class="cm-report-check-detail">' + (c.detail || '') + '</span>' +
          '</div>';
      });
      html += '</div>';
    }

    // Classification
    if (cls.return_category) {
      html += '<div class="cm-report-section">';
      html += '<div class="cm-report-section-title">Return Classification</div>';
      html += '<dl>';
      html += row('Category', '<span class="cm-report-pill accent">' + cls.return_category + '</span>');
      html += row('Confidence', '<span class="cm-report-pill ' + (cls.confidence === 'high' ? 'success' : 'warn') + '">' + (cls.confidence || '—').toUpperCase() + '</span>');
      html += row('Operational Flag', cls.operational_flag || '—');
      if (cls.reasoning) html += row('Reasoning', cls.reasoning);
      html += '</dl></div>';
    }

    // Resolution
    if (res.resolution_type) {
      html += '<div class="cm-report-section">';
      html += '<div class="cm-report-section-title">Resolution Details</div>';
      html += '<dl>';
      html += row('Resolution Type', res.resolution_type || '—');
      html += row('Refund Amount', res.amount ? '$' + res.amount + ' ' + (res.currency || 'USD') : '—');
      html += row('Timeline', res.timeline || '—');
      html += row('Return Label', res.label_provided ? 'Prepaid label provided' : 'Not required');
      html += row('Return Required', res.requires_return ? 'Yes' : 'No');
      html += row('Tier Upgrade', res.tier_upgrade_applied ? '⭐ Yes — loyalty benefit applied' : 'No');
      if (res.additional_action) html += row('Additional Action', res.additional_action);
      html += row('Case Reference', '<strong>' + caseRef + '</strong>');
      html += '</dl></div>';
    }

    // Resolution message
    if (result.message) {
      html += '<div class="cm-report-section">';
      html += '<div class="cm-report-section-title">Resolution Message Sent to Customer</div>';
      html += '<div class="cm-report-message-box">' + escHtml(result.message) + '</div>';
      html += '</div>';
    }

    body.innerHTML = html;
    modal.hidden = false;
  }

  function row(label, value) {
    return '<div class="cm-report-row"><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function addQuickReplies(replies) {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;
    var container = document.createElement('div');
    container.className = 'cm-nova-quick-replies';
    replies.forEach(function (reply) {
      var btn = document.createElement('button');
      btn.className = 'cm-nova-quick-reply-btn';
      btn.textContent = reply;
      btn.addEventListener('click', function () { handleQuickReply(reply); });
      container.appendChild(btn);
    });
    messages.appendChild(container);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeQuickReplies() {
    var messages = getEl('cmReturnsMessages');
    if (!messages) return;
    messages.querySelectorAll('.cm-nova-quick-replies').forEach(function (el) { el.remove(); });
  }

  function addCaseButton(caseRef, productName) {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;
    currentCaseRef = caseRef;
    var wrapper = document.createElement('div');
    wrapper.className = 'cm-case-btn-wrapper';
    var btn = document.createElement('button');
    btn.className = 'cm-case-copy-btn';
    btn.innerHTML = '📋 Copy Case Number &nbsp;<span class="cm-case-ref-chip">' + caseRef + '</span>';
    btn.addEventListener('click', function () {
      openCaseModal(caseRef, productName || (currentOrder ? currentOrder.product_name : ''));
    });
    wrapper.appendChild(btn);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function openCaseModal(caseRef, productName) {
    var modal = getEl('cmCaseModal');
    if (!modal) return;
    var numEl = getEl('cmCaseModalNumber');
    var emailBtn = getEl('cmCaseModalEmail');
    var subjectEl = getEl('cmCaseModalSubject');
    var subjectText = 'Return Case ' + caseRef + (productName ? ' — ' + productName : '');
    if (numEl) numEl.textContent = caseRef;
    if (emailBtn) emailBtn.href = 'mailto:cosmomart@support.com?subject=' + encodeURIComponent(subjectText);
    if (subjectEl) subjectEl.textContent = 'Suggested subject: ' + subjectText;
    modal.hidden = false;
  }

  function showPhotoUpload() {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'cm-bubble-agent cm-photo-upload';
    var text = document.createElement('p');
    text.style.margin = '0 0 12px';
    text.textContent = 'Please attach a photo of the item so our team can inspect it. This helps us resolve your case faster.';
    wrapper.appendChild(text);
    var label = document.createElement('label');
    label.className = 'cm-photo-label';
    label.textContent = '📷 Choose Photo';
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    label.appendChild(fileInput);
    wrapper.appendChild(label);
    var filenameEl = document.createElement('span');
    filenameEl.className = 'cm-photo-filename';
    wrapper.appendChild(filenameEl);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;

    fileInput.addEventListener('change', function () {
      if (!fileInput.files || !fileInput.files[0]) return;
      filenameEl.textContent = fileInput.files[0].name + ' selected';
      var sendBtn = document.createElement('button');
      sendBtn.className = 'cm-btn cm-btn-primary cm-btn-sm cm-photo-send';
      sendBtn.textContent = 'Send Photo';
      wrapper.appendChild(sendBtn);
      sendBtn.addEventListener('click', function () {
        wrapper.innerHTML = '<p style="margin:0;color:#c084fc;font-size:13px;">Uploading your photo…</p>';
        setTimeout(function () {
          wrapper.remove();
          var caseRef = currentCaseRef || ('CM-' + new Date().getFullYear() + '-' + (currentOrder ? currentOrder.order_id.split('-').pop() : '0000'));
          currentCaseRef = caseRef;
          addMessage('Your photo has been received and flagged for specialist review. A specialist will follow up within 4 hours at your registered email.', 'agent');
          addCaseButton(caseRef, currentOrder ? currentOrder.product_name : '');
          addQuickReplies(['Contact Support']);
        }, 1800);
      });
    });
  }

  async function handleQuickReply(reply) {
    if (reply === 'Browse Gadgets →') { window.location.href = 'gadgets.html'; return; }
    if (reply === 'Browse Fashion →') { window.location.href = 'fashion.html'; return; }
    if (reply === 'Keep Shopping →') { window.location.href = 'index.html'; return; }
    if (reply === 'Contact Support') {
      var caseRef = currentCaseRef || ('CM-' + new Date().getFullYear() + '-' + (currentOrder ? currentOrder.order_id.split('-').pop() : '0000'));
      openCaseModal(caseRef, currentOrder ? currentOrder.product_name : '');
      return;
    }
    if (reply === 'Send a photo') {
      removeQuickReplies();
      addMessage(reply, 'user');
      showPhotoUpload();
      return;
    }
    if (reply === 'Connect me to a specialist') {
      removeQuickReplies();
      addMessage(reply, 'user');
      showTyping();
      try {
        var result = await runManualEscalation(currentOrder);
        hideTyping();
        addMessage(result.message, 'agent');
        addCaseButton(result.caseRef, currentOrder.product_name);
        addQuickReplies(['Contact Support']);
      } catch (err) {
        hideTyping();
        addMessage('Something went wrong. Please try again or contact support directly.', 'system');
      }
      return;
    }
    // "I'm ready to return this" — Nova already knows the product, skip the classifier
    // and ask directly about the issue with the loaded product
    if (reply === "I'm ready to return this") {
      removeQuickReplies();
      addMessage(reply, 'user');
      var productName = currentOrder ? currentOrder.product_name : 'your item';
      addMessage("What’s the issue with your " + productName + "? Choose below or describe it in your own words.", 'agent');
      addQuickReplies(["It stopped working / it’s defective", "Wrong item received", "I changed my mind", "It arrived damaged"]);
      return;
    }

    // Other quick replies: treat as a typed user message
    removeQuickReplies();
    var input = getEl('cmReturnsInput');
    if (input) {
      input.value = reply;
      await handleSend();
    }
  }

  function loadOrder(orderId) {
    const order = window.mockData && window.mockData.orders[orderId];
    if (!order) {
      const info = getEl('cmOrderInfo');
      if (info) {
        info.className = 'cm-order-info is-error visible';
        info.textContent = 'Order not found. Please check the order ID and try again.';
      }
      setStage('order', 'active', 'Order not found', 'Check the ID and try again');
      return false;
    }

    currentOrder = order;
    setStage('order', 'done', 'Order found', order.product_name);
    setSubstep('cmSubCustomer', 'done');
    setSubstep('cmSubOrderLoad', 'done');
    setStage('issue', 'active', 'Describe your issue', 'Tell Nova what happened');

    const info = getEl('cmOrderInfo');
    if (info) {
      info.className = 'cm-order-info visible';
      info.innerHTML =
        '<div class="cm-return-item">' +
          '<div class="cm-return-item-media">' +
            '<img src="assets/products/' + order.product_id + '.jpg" alt="' + order.product_name + '" loading="lazy">' +
          '</div>' +
          '<div class="cm-return-item-detail">' +
            '<p class="cm-return-item-name">' + order.product_name + '</p>' +
            '<p class="cm-return-item-price">$' + order.purchase_price.toFixed(2) + '</p>' +
            '<p class="cm-return-item-sku">' + order.product_id + '</p>' +
          '</div>' +
        '</div>' +
        '<dl class="cm-return-facts">' +
          '<div><dt>Order</dt><dd>' + order.order_id + '</dd></div>' +
          '<div><dt>Purchased</dt><dd>' + order.purchase_date + ' &middot; ' + order.days_since_purchase + ' days ago</dd></div>' +
          '<div><dt>Status</dt><dd class="cm-return-status">' + order.order_status + '</dd></div>' +
        '</dl>';
    }

    const orderInput = getEl('cmOrderInput');
    if (orderInput) orderInput.value = orderId;

    if (!chatActive) {
      var greeting = 'Order found: ' + order.product_name + ' (' + order.order_id + '). Hi ' + order.customer_name + ', I\'m Nova. How can I help you today?';
      addMessage(greeting, 'agent');
      chatHistory.push({ role: 'assistant', content: greeting });
      addQuickReplies(['How do I start a return?', 'What info do I need?', 'How long does a return take?', 'I\'m ready to return this']);
      chatActive = true;

      const chatInput = getEl('cmReturnsInput');
      const sendBtn = getEl('cmReturnsSend');
      if (chatInput) chatInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }

    return true;
  }

  async function handleSend() {
    const input = getEl('cmReturnsInput');
    const sendBtn = getEl('cmReturnsSend');
    if (!input || !sendBtn) return;

    const text = input.value.trim();
    if (!text) return;

    if (!currentOrder) {
      addMessage('Please look up your order first using the Order ID field above.', 'system');
      return;
    }

    removeQuickReplies();
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    addMessage(text, 'user');
    // Capture history before pushing this message (prior context for agents)
    var historySnapshot = chatHistory.slice();
    chatHistory.push({ role: 'user', content: text });
    showTyping();

    try {
      // Enrich classifier input with order context so chips like
      // "It stopped working" aren't mistaken for vague messages
      var classifierInput = currentOrder
        ? text + ' [Context: returning ' + currentOrder.product_name + ', ' + currentOrder.product_category + ' category, order ' + currentOrder.order_id + ']'
        : text;
      const intentResult = await runIntentClassifier(classifierInput, historySnapshot);
      hideTyping();

      if (intentResult.intent === 'FAQ') {
        showTyping();
        const faqResult = await runFAQAgent(text, historySnapshot);
        hideTyping();
        addMessage(faqResult.text, 'agent');
        chatHistory.push({ role: 'assistant', content: faqResult.text });
        if (faqResult.quickReplies && faqResult.quickReplies.length) {
          addQuickReplies(faqResult.quickReplies);
        }

      } else if (intentResult.intent === 'NEEDS_CLARIFICATION') {
        clarificationCount++;
        var clarifyMsg;
        if (clarificationCount >= 2) {
          clarificationCount = 0;
          clarifyMsg = "I want to make sure I get this right. You can send a photo of the item for our team to inspect, or I can connect you with a specialist right now.";
          addMessage(clarifyMsg, 'agent');
          addQuickReplies(['Send a photo', 'Connect me to a specialist']);
        } else {
          clarifyMsg = intentResult.clarifying_question || "Could you give me a bit more detail about what's happening with the product?";
          addMessage(clarifyMsg, 'agent');
        }
        chatHistory.push({ role: 'assistant', content: clarifyMsg });

      } else {
        // RETURN_INITIATION — run the full pipeline
        clarificationCount = 0;
        createCaseDraftPanel();
        setStage('issue', 'done', 'Issue described', text.length > 48 ? text.slice(0, 48) + '…' : text);
        setStage('resolution', 'working', 'Working on it…', 'Nova is processing your return');

        const result = await runReturnsAgent(text, currentOrder, function (stepId, state, data) {
          if (stepId.startsWith('case:')) {
            handleCaseData(stepId.replace('case:', ''), data);
          } else if (SUBSTEP_MAP[stepId]) {
            setSubstep(SUBSTEP_MAP[stepId], state);
          } else {
            if (stepId === 'eligibility') {
              if (state === 'active') setStage('eligibility', 'working', 'Checking eligibility…', 'Validating return window');
              else if (state === 'done') setStage('eligibility', 'done', 'Eligibility verified', 'All checks passed');
            }
          }
        });

        if (result.sentiment && result.sentiment.frustrated) {
          var priorityBanner = document.createElement('div');
          priorityBanner.className = 'cm-priority-banner';
          priorityBanner.innerHTML = '<span class="cm-priority-icon">⚡</span><span>Priority case detected — Nova is responding with elevated care</span>';
          var msgs = getEl('cmReturnsMessages');
          if (msgs) { msgs.appendChild(priorityBanner); msgs.scrollTop = msgs.scrollHeight; }
        }

        // Let all staggered case draft animations finish before Nova speaks
        await delay(2500);
        await typeMessage(result.message, 'agent');

        if (result.resolution && result.resolution.tier_upgrade_applied && currentOrder) {
          addTierBenefitBanner(currentOrder.customer_tier, result.resolution);
        }

        if (result.retention) {
          addRetentionOffer(result.retention);
        }

        if (!result.retention) {
          addWhatNextStrip(result.trace);
        }

        addDecisionTrace(result.trace, result.type);

        const caseRef = result.caseRef || (result.resolution && result.resolution.case_ref);
        if (caseRef) {
          addCaseButton(caseRef, currentOrder.product_name);
        }

        // Store for report modal and add view report button
        currentResult = result;
        if (result.trace && result.trace.resolution) {
          addCaseReportBtn(result, currentOrder);
        }

        setStage(
          'resolution',
          'done',
          result.type === 'escalation' ? 'Escalated to a specialist' : 'Resolution ready',
          caseRef ? 'Case #' + caseRef : 'See Nova\'s message above'
        );

        if (!result.retention) {
          addQuickReplies(getContextualChips(result.trace, result.type));
        }
      }

    } catch (err) {
      hideTyping();
      console.error('Agent error:', err);
      addMessage('Something went wrong while processing your request. Please try again or contact our support team.', 'system');
      addQuickReplies(['Contact Support']);
      setStage('resolution', 'active', 'Resolution pending', 'Something went wrong — try again');
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Full reset, not just a transcript wipe - the loaded order and the
  // chatActive flag have to go too, or the next lookup silently skips its
  // greeting and the sidebar keeps showing a stale order.
  function clearChat() {
    const messages = getEl('cmReturnsMessages');
    if (messages) messages.innerHTML = '';

    currentOrder = null;
    chatActive = false;
    clarificationCount = 0;
    currentCaseRef = null;
    currentResult = null;
    chatHistory = [];

    const orderInput = getEl('cmOrderInput');
    if (orderInput) orderInput.value = '';

    const info = getEl('cmOrderInfo');
    if (info) {
      info.innerHTML = '';
      info.className = 'cm-order-info';
      info.removeAttribute('style');
    }

    const input = getEl('cmReturnsInput');
    const sendBtn = getEl('cmReturnsSend');
    if (input) { input.value = ''; input.disabled = true; }
    if (sendBtn) sendBtn.disabled = true;

    resetStages();
    addMessage(WELCOME, 'agent');
  }

  function initReturnsChat(preloadOrderId) {
    const sendBtn = getEl('cmReturnsSend');
    const input = getEl('cmReturnsInput');
    const lookupBtn = getEl('cmLookupBtn');
    const orderInput = getEl('cmOrderInput');

    if (sendBtn) {
      sendBtn.addEventListener('click', handleSend);
    }

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSend();
      });
      input.disabled = true;
    }

    if (sendBtn) sendBtn.disabled = true;

    if (lookupBtn && orderInput) {
      lookupBtn.addEventListener('click', function () {
        const id = orderInput.value.trim().toUpperCase();
        if (id) loadOrder(id);
      });

      orderInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const id = orderInput.value.trim().toUpperCase();
          if (id) loadOrder(id);
        }
      });
    }

    const clearBtn = getEl('cmClearChat');
    if (clearBtn) clearBtn.addEventListener('click', clearChat);

    // Report modal
    var reportModal = getEl('cmReportModal');
    var reportClose = getEl('cmReportModalClose');
    var reportClose2 = getEl('cmReportClose2');
    var reportPrint = getEl('cmReportPrint');
    var reportDownload = getEl('cmReportDownload');

    function closeReportModal() { if (reportModal) reportModal.hidden = true; }

    if (reportClose) reportClose.addEventListener('click', closeReportModal);
    if (reportClose2) reportClose2.addEventListener('click', closeReportModal);
    if (reportModal) reportModal.addEventListener('click', function(e) { if (e.target === reportModal) closeReportModal(); });
    if (reportPrint) reportPrint.addEventListener('click', function() { window.print(); });
    if (reportDownload) {
      reportDownload.addEventListener('click', function() {
        if (!currentResult) return;
        var trace = currentResult.trace || {};
        var ctx = trace.context || {};
        var res = trace.resolution || {};
        var cls = trace.classification || {};
        var caseRef = currentResult.caseRef || res.case_ref || 'N/A';
        var txt = [
          'COSMIC MART — RETURN CASE REPORT',
          '================================',
          'Case: ' + caseRef,
          'Generated: ' + new Date().toLocaleString(),
          '',
          'CUSTOMER',
          'Customer: ' + (ctx.customer_id || '—'),
          'Product: ' + (ctx.product || '—'),
          'Order: ' + (ctx.order_id || '—'),
          'Days since purchase: ' + (ctx.days_since_purchase || '—'),
          '',
          'ISSUE',
          'Description: ' + (ctx.issue_description || '—'),
          '',
          'CLASSIFICATION',
          'Category: ' + (cls.return_category || '—'),
          'Confidence: ' + (cls.confidence || '—'),
          '',
          'RESOLUTION',
          'Type: ' + (res.resolution_type || '—'),
          'Amount: $' + (res.amount || '—'),
          'Timeline: ' + (res.timeline || '—'),
          '',
          'MESSAGE TO CUSTOMER',
          currentResult.message || '—'
        ].join('\n');
        var blob = new Blob([txt], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = caseRef + '-report.txt';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    const caseModal = getEl('cmCaseModal');
    const caseModalClose = getEl('cmCaseModalClose');
    const caseModalCopy = getEl('cmCaseModalCopy');

    if (caseModalClose) {
      caseModalClose.addEventListener('click', function () {
        if (caseModal) caseModal.hidden = true;
      });
    }
    if (caseModal) {
      caseModal.addEventListener('click', function (e) {
        if (e.target === caseModal) caseModal.hidden = true;
      });
    }
    if (caseModalCopy) {
      caseModalCopy.addEventListener('click', function () {
        var numEl = getEl('cmCaseModalNumber');
        if (!numEl) return;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(numEl.textContent).then(function () {
            caseModalCopy.textContent = '✓ Copied!';
            setTimeout(function () { caseModalCopy.textContent = 'Copy Case Number'; }, 2000);
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = numEl.textContent;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          caseModalCopy.textContent = '✓ Copied!';
          setTimeout(function () { caseModalCopy.textContent = 'Copy Case Number'; }, 2000);
        }
      });
    }

    resetStages();
    addMessage(WELCOME, 'agent');

    if (preloadOrderId) {
      loadOrder(preloadOrderId);
    }
  }

  window.initReturnsChat = initReturnsChat;

  document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    initReturnsChat(orderId || null);
  });
})();
