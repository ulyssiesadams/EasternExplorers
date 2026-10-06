(function () {
  // Sticky nav scroll behavior
  function initNav() {
    const nav = document.querySelector('.cm-nav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  // Mark active nav link
  function markActiveNav() {
    const links = document.querySelectorAll('.cm-nav-links a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  // Global chat widget HTML
  const CHAT_WIDGET_HTML = `
    <button class="cm-global-chat-btn" id="cmChatBtn" aria-label="Open chat assistant">
      <img src="assets/logo.png" alt="Cosmic Mart" style="width:46px;height:46px;">
    </button>

    <div class="cm-global-chat-popup" id="cmChatPopup">
      <!-- Initial options view -->
      <div id="cmChatOptionsView">
        <div class="cm-global-chat-header">
          <div class="cm-global-chat-header-icon">
            <img src="assets/logo.png" alt="Nova" style="width:38px;height:38px;">
          </div>
          <div class="cm-global-chat-header-text">
            <h4>Ask me anything <span class="cm-global-ai-badge">✦ AI</span></h4>
            <p>Hi, I'm Nova, your Cosmic Mart AI assistant! How can I help you today?</p>
          </div>
          <button class="cm-global-close-btn" id="cmChatClose" aria-label="Close">✕</button>
        </div>
        <div class="cm-global-chat-options">
          <button class="cm-global-option-btn" id="cmOptGeneralHelp">
            <span class="cm-global-option-icon">💬</span>
            <div>
              <div style="font-weight:600;">General Help</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Questions about products, orders, and more</div>
            </div>
          </button>
          <button class="cm-global-option-btn" id="cmOptReturns">
            <span class="cm-global-option-icon">📦</span>
            <div>
              <div style="font-weight:600;">Returns</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Start a return or check return status</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Expanded general help chat -->
      <div class="cm-global-chat-expanded" id="cmChatExpandedView">
        <button class="cm-global-back-btn" id="cmChatBack">← Back to options</button>
        <div class="cm-global-messages" id="cmGlobalMessages"></div>
        <div class="cm-global-chat-input-row">
          <input type="text" id="cmGlobalInput" placeholder="Ask Nova anything..." autocomplete="off"/>
          <button id="cmGlobalSend">Send</button>
        </div>
      </div>
    </div>
  `;

  function initGlobalChat() {
    // Skip on returns page
    const path = window.location.pathname;
    if (path.includes('returns')) return;

    const container = document.createElement('div');
    container.innerHTML = CHAT_WIDGET_HTML;
    document.body.appendChild(container);

    const chatBtn = document.getElementById('cmChatBtn');
    const chatPopup = document.getElementById('cmChatPopup');
    const chatClose = document.getElementById('cmChatClose');
    const optGeneralHelp = document.getElementById('cmOptGeneralHelp');
    const optReturns = document.getElementById('cmOptReturns');
    const optionsView = document.getElementById('cmChatOptionsView');
    const expandedView = document.getElementById('cmChatExpandedView');
    const chatBack = document.getElementById('cmChatBack');
    const globalMessages = document.getElementById('cmGlobalMessages');
    const globalInput = document.getElementById('cmGlobalInput');
    const globalSend = document.getElementById('cmGlobalSend');

    let generalChatHistory = [];
    let generalChatOpen = false;

    chatBtn.addEventListener('click', function () {
      chatPopup.classList.toggle('open');
    });

    chatClose.addEventListener('click', function () {
      chatPopup.classList.remove('open');
    });

    optReturns.addEventListener('click', function () {
      window.location.href = 'returns.html';
    });

    optGeneralHelp.addEventListener('click', function () {
      optionsView.style.display = 'none';
      expandedView.classList.add('visible');
      generalChatOpen = true;
      if (generalChatHistory.length === 0) {
        addGlobalAgentMessage("Hi! I'm Nova, Cosmic Mart's AI assistant. I can help you with product questions, order info, store policies, and more. What would you like to know?");
      }
      globalInput.focus();
    });

    chatBack.addEventListener('click', function () {
      expandedView.classList.remove('visible');
      optionsView.style.display = '';
    });

    function addGlobalUserMessage(text) {
      const div = document.createElement('div');
      div.className = 'cm-global-bubble-user';
      div.textContent = text;
      globalMessages.appendChild(div);
      globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    function addGlobalAgentMessage(text) {
      const div = document.createElement('div');
      div.className = 'cm-global-bubble-agent';
      div.textContent = text;
      globalMessages.appendChild(div);
      generalChatHistory.push({ role: 'assistant', content: text });
      globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    function showGlobalTyping() {
      const t = document.createElement('div');
      t.className = 'cm-global-typing';
      t.id = 'cmGlobalTyping';
      t.innerHTML = '<span></span><span></span><span></span>';
      globalMessages.appendChild(t);
      globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    function hideGlobalTyping() {
      const t = document.getElementById('cmGlobalTyping');
      if (t) t.remove();
    }

    async function sendGeneralMessage() {
      const text = globalInput.value.trim();
      if (!text) return;

      globalInput.value = '';
      globalSend.disabled = true;

      addGlobalUserMessage(text);
      generalChatHistory.push({ role: 'user', content: text });

      showGlobalTyping();

      const systemPrompt = 'You are Nova, Cosmic Mart\'s friendly AI assistant. You help customers with general questions about shopping, products, orders, and store information. Keep responses concise and helpful. Cosmic Mart sells Gadgets & Electronics, Fashion & Apparel, and Home & Lifestyle products. Return windows: Gadgets 30 days, Fashion 14 days, Home & Lifestyle 21 days.';

      try {
        const messages = generalChatHistory.slice(0, -1).concat([{ role: 'user', content: text }]);
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: systemPrompt,
            messages: messages,
            maxTokens: MAX_TOKENS
          })
        });
        const data = await response.json();
        hideGlobalTyping();
        const reply = data.text || 'I\'m having trouble connecting right now. Please try again.';
        addGlobalAgentMessage(reply);
      } catch (err) {
        hideGlobalTyping();
        addGlobalAgentMessage('I\'m having trouble connecting right now. Please try again shortly.');
      }

      globalSend.disabled = false;
      globalInput.focus();
    }

    globalSend.addEventListener('click', sendGeneralMessage);
    globalInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendGeneralMessage();
    });
  }

  // Stars helper for product cards
  window.renderStars = function (rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  };

  // Format price
  window.formatPrice = function (price) {
    return '$' + price.toFixed(2);
  };

  // "More" dropdown in the sub-nav (holds Returns, New Arrivals, etc.)
  function initMoreMenu() {
    const btn = document.getElementById('cmMoreBtn');
    const menu = document.getElementById('cmMoreMenu');
    const wrap = document.getElementById('cmNavMore');
    if (!btn || !menu || !wrap) return;

    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && !wrap.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        close();
        btn.focus();
      }
    });
  }

  // Account link lives outside .cm-nav-links, so mark it separately
  function markActiveAccount() {
    const link = document.querySelector('.cm-nav-account');
    if (!link) return;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'account.html') link.classList.add('active');
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    markActiveNav();
    markActiveAccount();
    initMoreMenu();
    initGlobalChat();
  });
})();
