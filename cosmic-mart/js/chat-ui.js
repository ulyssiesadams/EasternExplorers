(function () {
  let currentOrder = null;
  let chatActive = false;

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

  // Each stage drives two things at once: a row in the sidebar "Return
  // Progress" card and the matching step in the in-chat strip.
  const STAGES = {
    order:      { row: 'cmProgOrder',      step: 'cmStepFind' },
    issue:      { row: 'cmProgIssue',      step: 'cmStepDescribe' },
    resolution: { row: 'cmProgResolution', step: 'cmStepResolve' }
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

    const step = getEl(pair.step);
    if (step) {
      step.classList.remove('cm-step-active', 'cm-step-done');
      if (state === 'done') step.classList.add('cm-step-done');
      else if (state) step.classList.add('cm-step-active');
      setStepNum(step, state === 'done');
    }
  }

  function resetStages() {
    setStage('order', 'active', 'Order not found', 'Enter your order ID to begin');
    setStage('issue', null, 'Issue not selected', 'Tell us what happened');
    setStage('resolution', null, 'Resolution pending', 'Get your refund, replacement, or credit');
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

  function showProgress() {
    const messages = getEl('cmReturnsMessages');
    if (!messages) return;

    const progressDiv = document.createElement('div');
    progressDiv.id = 'cmAgentProgress';
    progressDiv.className = 'cm-bubble-system';
    progressDiv.style.cssText = 'max-width:100%;display:flex;flex-direction:column;gap:6px;padding:16px 20px;';
    progressDiv.innerHTML = '<div style="font-weight:600;color:#c084fc;margin-bottom:8px;font-size:13px;">🤖 Nova is working on your request...</div>';

    agentSteps.forEach(function (step) {
      const row = document.createElement('div');
      row.id = 'step-' + step.id;
      row.style.cssText = 'display:flex;align-items:center;gap:10px;font-size:12px;color:#94a3b8;padding:3px 0;';
      row.innerHTML = '<div style="width:14px;height:14px;border-radius:50%;background:rgba(147,51,234,0.15);border:1px solid rgba(147,51,234,0.3);flex-shrink:0;"></div><span>' + step.label + '</span>';
      progressDiv.appendChild(row);
    });

    messages.appendChild(progressDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function updateProgress(stepId, state) {
    const row = getEl('step-' + stepId);
    if (!row) return;

    const indicator = row.querySelector('div');
    const label = row.querySelector('span');

    if (state === 'active') {
      indicator.style.background = '#9333ea';
      indicator.style.border = '1px solid #9333ea';
      indicator.style.animation = 'step-pulse 1s infinite';
      row.style.color = '#c084fc';
    } else if (state === 'done') {
      indicator.style.background = '#10b981';
      indicator.style.border = '1px solid #10b981';
      indicator.style.animation = 'none';
      indicator.textContent = '✓';
      indicator.style.color = 'white';
      indicator.style.fontSize = '9px';
      indicator.style.display = 'flex';
      indicator.style.alignItems = 'center';
      indicator.style.justifyContent = 'center';
      row.style.color = '#10b981';
    }

    const messages = getEl('cmReturnsMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function removeProgress() {
    const p = getEl('cmAgentProgress');
    if (p) p.remove();
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
      addMessage('Order loaded: ' + order.product_name + ' (' + order.order_id + '). Hello ' + order.customer_name + '! I\'m Nova, your AI returns assistant. Please describe your issue and I\'ll help resolve it right away.', 'agent');
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

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    addMessage(text, 'user');
    showProgress();

    setStage('issue', 'done', 'Issue described', text.length > 48 ? text.slice(0, 48) + '…' : text);
    setStage('resolution', 'working', 'Working on it…', 'Nova is processing your return');

    try {
      const result = await runReturnsAgent(text, currentOrder, function (stepId, state) {
        updateProgress(stepId, state);
      });

      removeProgress();
      addMessage(result.message, 'agent');

      const caseRef = result && result.resolution && result.resolution.case_ref;
      setStage(
        'resolution',
        'done',
        result && result.type === 'escalation' ? 'Escalated to a specialist' : 'Resolution ready',
        caseRef ? 'Case #' + caseRef : 'See Nova\'s message above'
      );

    } catch (err) {
      removeProgress();
      console.error('Agent error:', err);
      addMessage('Something went wrong while processing your request. Please try again or contact our support team directly.', 'system');
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
