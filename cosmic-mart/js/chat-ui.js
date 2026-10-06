(function () {
  let currentOrder = null;
  let chatActive = false;
  let clarificationCount = 0;
  let currentCaseRef = null;

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
      addMessage('Order found: ' + order.product_name + ' (' + order.order_id + '). Hi ' + order.customer_name + ', I\'m Nova. How can I help you today?', 'agent');
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
    showTyping();

    try {
      const intentResult = await runIntentClassifier(text);
      hideTyping();

      if (intentResult.intent === 'FAQ') {
        showTyping();
        const faqResult = await runFAQAgent(text);
        hideTyping();
        addMessage(faqResult.text, 'agent');
        if (faqResult.quickReplies && faqResult.quickReplies.length) {
          addQuickReplies(faqResult.quickReplies);
        }

      } else if (intentResult.intent === 'NEEDS_CLARIFICATION') {
        clarificationCount++;
        if (clarificationCount >= 2) {
          clarificationCount = 0;
          addMessage("I want to make sure I get this right. You can send a photo of the item for our team to inspect, or I can connect you with a specialist right now.", 'agent');
          addQuickReplies(['Send a photo', 'Connect me to a specialist']);
        } else {
          addMessage(intentResult.clarifying_question || "Could you give me a bit more detail about what's happening with the product?", 'agent');
        }

      } else {
        // RETURN_INITIATION — run the full pipeline
        clarificationCount = 0;
        showProgress();
        setStage('issue', 'done', 'Issue described', text.length > 48 ? text.slice(0, 48) + '…' : text);
        setStage('resolution', 'working', 'Working on it…', 'Nova is processing your return');

        const result = await runReturnsAgent(text, currentOrder, function (stepId, state) {
          updateProgress(stepId, state);
        });

        removeProgress();
        addMessage(result.message, 'agent');

        const caseRef = result.caseRef || (result.resolution && result.resolution.case_ref);
        if (caseRef) {
          addCaseButton(caseRef, currentOrder.product_name);
        }

        setStage(
          'resolution',
          'done',
          result.type === 'escalation' ? 'Escalated to a specialist' : 'Resolution ready',
          caseRef ? 'Case #' + caseRef : 'See Nova\'s message above'
        );

        addQuickReplies(['Contact Support']);
      }

    } catch (err) {
      hideTyping();
      removeProgress();
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
