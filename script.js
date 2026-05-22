document.addEventListener("DOMContentLoaded", function () {

  // === ELEMENT REFERENCES ===
  const hero        = document.getElementById("heroSection");
  const chatWindow  = document.querySelector('.chat-window');
  const sendBtn     = document.getElementById("sendBtn");
  const chatbox     = document.getElementById("userinput");
  const inputBox    = document.getElementById("inputBox");
  const footer      = document.getElementById("footer");
  const plusBtn     = document.getElementById("plusBtn");
  const uploadDropdown = document.getElementById("uploadDropdown");
  const screenshotBtn  = document.getElementById("screenshotBtn");
  const historyList    = document.getElementById("historyList");
  const menuToggle     = document.getElementById("menuToggle");
  const sidebar        = document.getElementById("sidebar");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const sidebarOverlay  = document.getElementById("sidebarOverlay");
  const voiceBtn        = document.querySelector('.voice-icon');



  // === SIDEBAR TOGGLE ===
  menuToggle.addEventListener("click", () => {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
  });

  function closeSidebar() {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
  }

  closeSidebarBtn.addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Close sidebar on ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeSidebar();
  });

  // === EDIT / NEW CHAT BTN ===
  document.getElementById("editLogoBtn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  // === SUGGESTION CHIPS ===
  function fillAndSend(text) {
    chatbox.value = text;
    autoResizeTextarea();
    sendMessage();
  }

  document.getElementById("codeBtn").addEventListener("click", () => fillAndSend("Fix my code error"));
  document.getElementById("websiteBtn").addEventListener("click", () => fillAndSend("Build a website"));
  document.getElementById("writeBtn").addEventListener("click", () => fillAndSend("Write a message"));

  // === AUTO RESIZE TEXTAREA ===
  function autoResizeTextarea() {
    chatbox.style.height = "auto";
    chatbox.style.height = Math.min(chatbox.scrollHeight, 180) + "px";
  }

  chatbox.addEventListener("input", autoResizeTextarea);

  // === VOICE RECOGNITION ===
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      recognition.start();
      isListening = true;
      voiceBtn.classList.add("active");
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatbox.value += (chatbox.value ? ' ' : '') + transcript;
      autoResizeTextarea();
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove("active");
    };

    recognition.onerror = () => {
      isListening = false;
      voiceBtn.classList.remove("active");
    };
  }

  // === LOCAL STORAGE ===
  let conversations = JSON.parse(localStorage.getItem("makenChats")) || [];
  let currentChatId = null;
  let activeChatId  = null;

  // === OUTPUT MEMORY — tracks last built output for iteration ===
  let lastOutput = { type: null, code: "", label: "", intent: null };

  // === FILE HANDLING ===
  let selectedFile = null;
  const previewContainer = document.getElementById("previewContainer");

  document.querySelectorAll("#imageUpload, #fileUpload").forEach(input => {
    input.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      selectedFile = file;
      previewContainer.innerHTML = "";
      previewContainer.style.display = "flex";

      const wrapper = document.createElement("div");
      wrapper.className = "preview-item";

      const type = file.type.split("/")[0];
      let element;

      if (type === "image") {
        element = document.createElement("img");
        element.src = URL.createObjectURL(file);
      } else {
        element = document.createElement("div");
        element.className = "file-preview";
        element.textContent = "📄 " + file.name;
      }

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "✕";
      removeBtn.className = "remove-btn";
      removeBtn.onclick = () => {
        selectedFile = null;
        previewContainer.innerHTML = "";
        previewContainer.style.display = "none";
        input.value = "";
      };

      wrapper.appendChild(element);
      wrapper.appendChild(removeBtn);
      previewContainer.appendChild(wrapper);
    });
  });

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  // === SEND MESSAGE ===
  sendBtn.addEventListener('click', sendMessage);
  chatbox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  async function sendMessage() {
    const userMessage = chatbox.value.trim();
    if (!userMessage && !selectedFile) return;

    if (!currentChatId) {
      startNewConversation(userMessage || "Attachment");
    }

    const fileForAI = selectedFile;

    // Handle file upload display
    if (selectedFile) {
      const base64 = await fileToBase64(selectedFile);
      displayFileMessage(selectedFile);
      saveMessage(
        currentChatId, "user", "",
        base64,
        selectedFile.type.startsWith("image") ? "image" : "file",
        selectedFile.name
      );
      selectedFile = null;
      previewContainer.innerHTML = "";
      previewContainer.style.display = "none";
    }

    // Handle text
    if (userMessage) {
      addMessageToChat(userMessage, false);
      saveMessage(currentChatId, "user", userMessage);
    }

    // Clear input
    chatbox.value = "";
    chatbox.style.height = "auto";
    uploadDropdown.style.display = "none";

    // Transition hero → chat
    transitionToChat();

    // AI loader
    const aiMessage = document.createElement("div");
    aiMessage.classList.add("message", "ai-message", "loading");
    aiMessage.innerHTML = buildLoader();
    chatWindow.appendChild(aiMessage);
    scrollToBottom();

    // Generate response
    setTimeout(async () => {
      const response = await generateAIResponse(userMessage, fileForAI);
      aiMessage.classList.remove("loading");
      aiMessage.innerHTML = "";
      typeText(aiMessage, response);
      saveMessage(currentChatId, "ai", response);
    }, 900);
  }

  function buildLoader() {
    return `
      <div class="gemini-loader">
        <div class="ai-icon-wrapper">
          <svg viewBox="0 0 24 24" class="ai-pulse-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#4f8fff" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M13 6L8 13H12L11 18L16 11H12L13 6Z" fill="#4f8fff"/>
          </svg>
        </div>
        <div class="shimmer-container">
          <div class="shimmer-line medium"></div>
          <div class="shimmer-line"></div>
          <div class="shimmer-line short"></div>
        </div>
      </div>
    `;
  }

  // === TRANSITION HERO → CHAT ===
  function transitionToChat() {
    if (hero.style.display === "none") return;

    hero.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    hero.style.opacity = "0";
    hero.style.transform = "translateY(-10px)";

    setTimeout(() => {
      hero.style.display = "none";
      chatWindow.style.display = "flex";
    }, 280);

    footer.innerHTML = "Fast · No login · Runs locally";
  }

  // === DISPLAY FILE MESSAGE ===
  function displayFileMessage(file) {
    const type = file.type.split("/")[0];
    const messageDiv = document.createElement("div");

    if (type === "image") {
      messageDiv.classList.add("message", "user-image");
      const img = document.createElement("img");
      const imgURL = URL.createObjectURL(file);
      img.src = imgURL;
      img.style.maxWidth = "200px";
      img.style.borderRadius = "12px";
      img.style.cursor = "pointer";
      img.onclick = () => openImageViewer(imgURL);
      messageDiv.appendChild(img);
    } else {
      messageDiv.classList.add("message", "user-message");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.textContent = "📄 " + file.name;
      link.style.color = "inherit";
      link.style.textDecoration = "none";
      messageDiv.appendChild(link);
    }

    chatWindow.appendChild(messageDiv);
    scrollToBottom();
  }

  // === IMAGE VIEWER ===
  function openImageViewer(src) {
    const viewer = document.createElement("div");
    viewer.classList.add("image-viewer");
    viewer.innerHTML = `<span class="close-btn">✕</span><img src="${src}" class="full-image"/>`;
    document.body.appendChild(viewer);

    viewer.querySelector(".close-btn").onclick = () => viewer.remove();
    viewer.onclick = (e) => { if (e.target === viewer) viewer.remove(); };
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".image-viewer")?.remove();
  });

  // === CONVERSATION MANAGEMENT ===
  function startNewConversation(firstMessage) {
    chatWindow.innerHTML = "";
    const chatId = Date.now();
    const title = firstMessage.length > 28 ? firstMessage.slice(0, 28) + "…" : firstMessage;
    conversations.unshift({ id: chatId, title, messages: [] });
    currentChatId = chatId;
    updateHistorySidebar();
    saveToLocal();
  }

  function addMessageToChat(message, isAI = false) {
    const el = document.createElement("div");
    el.classList.add("message", isAI ? "ai-message" : "user-message");
    el.innerHTML = message;
    chatWindow.appendChild(el);
    scrollToBottom();
  }

  function saveMessage(chatId, sender, text, fileData = null, fileType = "text", fileName = "") {
    const chat = conversations.find(c => c.id === chatId);
    if (!chat) return;
    chat.messages.push({ sender, type: fileType, content: fileData, name: fileName, text });
    saveToLocal();
  }

  function updateHistorySidebar() {
    if (!historyList) return;
    historyList.innerHTML = "";

    conversations.forEach(chat => {
      const item = document.createElement("div");
      item.className = "history-item";
      if (chat.id === currentChatId) item.classList.add("active");

      const titleSpan = document.createElement("span");
      titleSpan.textContent = chat.title;
      titleSpan.addEventListener("click", () => {
        activeChatId = chat.id;
        loadConversation(chat.id);
        updateHistorySidebar();
        closeSidebar();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✕";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(chat.id);
      });

      item.appendChild(titleSpan);
      item.appendChild(deleteBtn);
      historyList.appendChild(item);
    });
  }

  function deleteConversation(chatId) {
    if (!confirm("Delete this conversation?")) return;
    conversations = conversations.filter(c => c.id !== chatId);
    saveToLocal();
    updateHistorySidebar();
    if (currentChatId === chatId) {
      currentChatId = null;
      window.location.href = "dashboard.html";
    }
  }

  function loadConversation(chatId) {
    const chat = conversations.find(c => c.id === chatId);
    if (!chat) return;
    currentChatId = chatId;
    chatWindow.innerHTML = "";
    hero.style.display = "none";
    chatWindow.style.display = "flex";
    footer.innerHTML = "Fast · No login · Runs locally";

    chat.messages.forEach(msg => {
      if (msg.type === "image") {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", msg.sender === "ai" ? "ai-message" : "user-image");
        const img = document.createElement("img");
        img.src = msg.content;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "12px";
        img.style.cursor = "pointer";
        img.onclick = () => openImageViewer(msg.content);
        messageDiv.appendChild(img);
        chatWindow.appendChild(messageDiv);
      } else if (msg.type === "file") {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", msg.sender === "ai" ? "ai-message" : "user-message");
        const link = document.createElement("a");
        link.href = msg.content;
        link.download = msg.name;
        link.textContent = "📄 " + msg.name;
        link.style.color = "inherit";
        link.style.textDecoration = "none";
        messageDiv.appendChild(link);
        chatWindow.appendChild(messageDiv);
      } else {
        addMessageToChat(msg.text, msg.sender === "ai");
      }
    });

    scrollToBottom();
    activeChatId = chatId;
    updateHistorySidebar();
  }

  function saveToLocal() {
    localStorage.setItem("makenChats", JSON.stringify(conversations));
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }

  // ============================================================
  //  TYPE EFFECT — streams HTML char by char, smooth
  // ============================================================
  function typeText(element, htmlContent) {
    let i = 0;
    const step = 6;
    function type() {
      i += step;
      element.innerHTML = htmlContent.slice(0, i);
      if (i < htmlContent.length) requestAnimationFrame(type);
      else element.innerHTML = htmlContent;
    }
    requestAnimationFrame(type);
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function codeBlock(lang, code, extra = "") {
    // Store in output memory for iteration
    const isHTML = lang === "html";
    const isPy   = lang === "python";
    const isJS   = lang === "javascript";
    const isCss  = lang === "css";

    lastOutput.code   = code;
    lastOutput.type   = isHTML ? "html" : isPy ? "python" : isJS ? "js" : isCss ? "css" : "text";
    lastOutput.intent = lang;

    // Build extension and filename
    const ext = isHTML ? "html" : isPy ? "py" : isJS ? "js" : isCss ? "css" : "txt";
    const filename = "maken-output." + ext;

    // Download button — creates real file
    const dlBtn = '<button class="mk-btn dlBtn" data-filename="' + filename + '">↓ Download</button>';

    // Preview button — only for HTML
    const previewBtn = isHTML
      ? '<button class="mk-btn previewBtn">▶ Preview</button>'
      : "";

    return `
      <div class="mk-output-block" data-lang="${lang}">
        <div class="mk-output-bar">
          <span class="mk-lang">${lang}</span>
          <div class="mk-bar-actions">
            ${extra}
            ${previewBtn}
            ${dlBtn}
            <button class="copyBtn mk-btn">Copy</button>
          </div>
        </div>
        <pre class="mk-code">${code}</pre>
      </div>`;
  }

  function stepList(steps) {
    return `<div class="mk-steps">${steps.map((s,i)=>`
      <div class="mk-step">
        <div class="mk-step-num">${i+1}</div>
        <div class="mk-step-body">
          <div class="mk-step-title">${s.title}</div>
          <div class="mk-step-desc">${s.desc}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  function tagRow(tags) {
    return `<div class="mk-tags">${tags.map(t=>`<span class="mk-tag">${t}</span>`).join("")}</div>`;
  }

  function nextActions(actions) {
    return `<div class="mk-next-label">Next — tell Maken to:</div>
      <div class="mk-next-actions">${actions.map(a=>`
        <button class="mk-next-btn" onclick="document.getElementById('userinput').value='${a.replace(/'/g,"\\'")}';document.getElementById('userinput').focus();">${a}</button>`
      ).join("")}</div>`;
  }

  // ============================================================
  //  INTENT DETECTION — multi-signal scoring
  // ============================================================
  function detectIntent(msg) {
    const m = msg.toLowerCase();
    const map = {
      python:  ["python","py","pandas","numpy","django","flask","fastapi"],
      js:      ["javascript","js","node","react","vue","typescript","ts","express","next"],
      css:     ["css","style","sass","tailwind","flexbox","grid","animation","responsive"],
      html:    ["html","webpage","landing page","homepage","portfolio","web page"],
      website: ["website","site","build a web","build me a web","create a web","make a web","make a site"],
      fix:     ["fix","debug","error","bug","not working","broken","issue","problem","crash","undefined","null"],
      explain: ["explain","what is","how does","how do","why does","tell me about","what does","difference between"],
      write:   ["write","draft","essay","blog","article","email","letter","message","post","content","copy"],
      plan:    ["plan","roadmap","steps","how to","guide","tutorial","learn","start","begin","checklist"],
      idea:    ["idea","suggest","recommend","brainstorm","inspiration","options","what should","help me choose"],
      math:    ["math","calculate","formula","equation","solve","sum","average","percentage","convert"],
      hello:   ["hi","hello","hey","sup","what's up","hola","namaste","good morning","good evening"]
    };
    let best = "default", maxScore = 0;
    for (const [name, keys] of Object.entries(map)) {
      let score = 0;
      keys.forEach(k => { if (m.includes(k)) score += k.length; });
      if (score > maxScore) { maxScore = score; best = name; }
    }
    return best;
  }

  // ============================================================
  //  ITERATION ENGINE — modifies last output based on user request
  // ============================================================
  function buildIterationResponse(msg, m) {
    let updatedCode = lastOutput.code;
    const type = lastOutput.type;
    let changeLog = [];

    // ── Dark theme ──
    if (m.includes("dark")) {
      updatedCode = updatedCode
        .replace(/#f5f5f3|#ffffff|#fff|#f8f8f8|#fafafa|#eeeeee/gi, "#0b0b0b")
        .replace(/color:\s*#111|color:\s*#000|color:\s*black/gi, "color: #e8eaf0")
        .replace(/background:\s*white|background:\s*#fff/gi, "background: #0b0b0b");
      if (updatedCode === lastOutput.code) {
        // inject dark style if no replacements matched
        updatedCode = updatedCode.replace("</style>",
          "body{background:#0b0b0b!important;color:#e8eaf0!important}</style>");
      }
      changeLog.push("dark background + light text");
    }

    // ── Light theme ──
    if (m.includes("light theme") || m.includes("make it light")) {
      updatedCode = updatedCode
        .replace(/#0b0b0b|#111111|#111/gi, "#f5f5f3")
        .replace(/color:\s*#e8eaf0|color:\s*#eee/gi, "color: #111");
      changeLog.push("light background + dark text");
    }

    // ── Responsive ──
    if (m.includes("responsive")) {
      const responsiveCSS = "\n@media(max-width:600px){body{padding:12px!important}h1{font-size:clamp(1.4rem,6vw,2.5rem)!important}.hero{padding:30px 16px!important}nav{display:none!important}}";
      updatedCode = updatedCode.replace("</style>", responsiveCSS + "</style>");
      changeLog.push("mobile responsive breakpoints");
    }

    // ── Animation ──
    if (m.includes("animation") || m.includes("animate")) {
      const animCSS = "\n@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}body *{animation:fadeUp 0.5s ease both}";
      updatedCode = updatedCode.replace("</style>", animCSS + "</style>");
      changeLog.push("fade-up animations on all elements");
    }

    // ── Font size ──
    if (m.includes("bigger") || m.includes("larger")) {
      updatedCode = updatedCode.replace(/font-size:\s*[\d.]+rem/g, (match) => {
        const val = parseFloat(match.match(/[\d.]+/)[0]);
        return "font-size:" + (val * 1.2).toFixed(2) + "rem";
      });
      changeLog.push("increased font sizes by 20%");
    }

    // ── Center content ──
    if (m.includes("center")) {
      updatedCode = updatedCode.replace("</style>",
        "\nbody{text-align:center!important}.hero,.section{align-items:center!important}</style>");
      changeLog.push("centered all content");
    }

    // ── Remove nav ──
    if (m.includes("remove nav") || m.includes("no nav") || m.includes("remove header")) {
      updatedCode = updatedCode.replace(/<header[\s\S]*?<\/header>/i, "");
      updatedCode = updatedCode.replace(/<nav[\s\S]*?<\/nav>/i, "");
      changeLog.push("removed navigation");
    }

    // ── Color change ──
    const colorMatch = m.match(/(?:color|accent|button|cta)\s+(?:to\s+)?([a-z]+|#[0-9a-f]{3,6})/i);
    if (colorMatch) {
      const newColor = colorMatch[1];
      updatedCode = updatedCode.replace(/--accent:\s*[^;]+;/, "--accent: " + newColor + ";");
      updatedCode = updatedCode.replace(/background:\s*#4f8fff/g, "background:" + newColor);
      changeLog.push("accent color → " + newColor);
    }

    // Save updated to memory
    lastOutput.code = updatedCode;

    const log = changeLog.length > 0
      ? changeLog.map(c => '<div class="mk-step"><div class="mk-step-num">✓</div><div class="mk-step-body"><div class="mk-step-desc">' + c + '</div></div></div>').join("")
      : '<div class="mk-step"><div class="mk-step-num">✓</div><div class="mk-step-body"><div class="mk-step-desc">Applied your changes</div></div></div>';

    return `
      <div class="mk-header">
        <span class="mk-status done">Updated</span>
        <span class="mk-label">${lastOutput.intent} · iteration</span>
      </div>
      <p class="mk-lead">Done — here's what changed:</p>
      <div class="mk-steps">${log}</div>
      ${codeBlock(lastOutput.intent, updatedCode)}
      ${tagRow(["Modified from last output","Ready to use","Download or preview"])}
      ${nextActions(["Make it responsive","Add animations","Change the color to blue","Preview this"])}`;
  }

  // ============================================================
  //  RESPONSE BUILDER — workspace-style, output-first
  // ============================================================
  async function generateAIResponse(userMessage, selectedFile) {
    const msg = (userMessage || "").trim();
    const m   = msg.toLowerCase();
    const intent = detectIntent(m);

    // ── OUTPUT ITERATION — user is modifying last output ──────
    const isIteration = lastOutput.code && (
      m.includes("make it") || m.includes("change it") ||
      m.includes("add ") || m.includes("remove ") ||
      m.includes("update ") || m.includes("modify") ||
      m.includes("dark") || m.includes("light theme") ||
      m.includes("responsive") || m.includes("animation") ||
      m.includes("color") || m.includes("font") ||
      m.includes("bigger") || m.includes("smaller") ||
      m.includes("center") || m.includes("fix it") ||
      m.includes("improve") || m.includes("refactor") ||
      m.includes("rename") || m.includes("translate")
    );

    if (isIteration && lastOutput.code) {
      return buildIterationResponse(msg, m);
    }

    // ── FILE UPLOAD ──────────────────────────────────────────
    if (selectedFile) {
      const isImg  = selectedFile.type.startsWith("image");
      const isCode = selectedFile.name.match(/\.(js|py|ts|html|css|json|txt|md|csv)$/i);
      const icon   = isImg ? "🖼️" : isCode ? "📄" : "📎";
      const size   = (selectedFile.size / 1024).toFixed(1) + " KB";

      return `
        <div class="mk-header">
          <span class="mk-status done">Received</span>
          <span class="mk-label">${icon} ${selectedFile.name}</span>
        </div>
        <div class="mk-file-card">
          <div class="mk-file-row"><span class="mk-file-key">Name</span><span class="mk-file-val">${selectedFile.name}</span></div>
          <div class="mk-file-row"><span class="mk-file-key">Size</span><span class="mk-file-val">${size}</span></div>
          <div class="mk-file-row"><span class="mk-file-key">Type</span><span class="mk-file-val">${selectedFile.type || "unknown"}</span></div>
        </div>
        ${nextActions(
          isImg
            ? ["Describe what's in this image","Extract text from this image","Turn this into a UI component","Suggest improvements"]
            : isCode
            ? ["Review this code for bugs","Add comments to this code","Explain what this code does","Refactor this code"]
            : ["Summarize this file","Extract key points","Convert this to another format","Analyze the content"]
        )}`;
    }

    // ── GREETING ─────────────────────────────────────────────
    if (intent === "hello") {
      return `
        <div class="mk-header">
          <span class="mk-status done">Ready</span>
          <span class="mk-label">Maken — build space</span>
        </div>
        <p class="mk-lead">Hey! I'm Maken — your instant build workspace. I don't just chat, I make things.</p>
        <div class="mk-capability-grid">
          <div class="mk-cap"><span>💻</span><b>Code</b><small>Any language</small></div>
          <div class="mk-cap"><span>🌐</span><b>Websites</b><small>Full HTML/CSS/JS</small></div>
          <div class="mk-cap"><span>✍️</span><b>Writing</b><small>Drafts & content</small></div>
          <div class="mk-cap"><span>🔧</span><b>Debug</b><small>Fix errors fast</small></div>
          <div class="mk-cap"><span>📋</span><b>Plan</b><small>Steps & guides</small></div>
          <div class="mk-cap"><span>💡</span><b>Ideas</b><small>Brainstorm anything</small></div>
        </div>
        ${nextActions(["Build me a landing page","Write a Python script","Fix my code","Help me write an email"])}`;
    }

    // ── PYTHON CODE ───────────────────────────────────────────
    if (intent === "python") {
      const topic = m.includes("sort") ? "sort" : m.includes("class") ? "class" : m.includes("read file") ? "file" : "starter";
      const snippets = {
        "sort": "# Sort a list of items\nitems = [5, 2, 9, 1, 7, 3]\n\n# Ascending\nsorted_items = sorted(items)\nprint('Sorted:', sorted_items)\n\n# Descending\nreverse_sorted = sorted(items, reverse=True)\nprint('Reversed:', reverse_sorted)\n\n# Sort list of dicts by key\npeople = [{'name': 'Alice', 'age': 30}, {'name': 'Bob', 'age': 25}]\nby_age = sorted(people, key=lambda x: x['age'])\nprint('By age:', by_age)",
        "class": "# Python class with properties and methods\nclass Product:\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def apply_discount(self, percent):\n        return self.price * (1 - percent / 100)\n\n    def is_available(self):\n        return self.stock > 0\n\n    def __repr__(self):\n        return f'Product({self.name!r}, {self.price:.2f})'\n\n\n# Usage\nitem = Product('Laptop', 999.99, stock=5)\nprint(item)\nprint('Discounted:', item.apply_discount(10))\nprint('In stock:', item.is_available())",
        "file": "# Read and write files in Python\nimport json\nfrom pathlib import Path\n\ndef read_text(path):\n    return Path(path).read_text(encoding='utf-8')\n\ndef write_text(path, content):\n    Path(path).write_text(content, encoding='utf-8')\n\ndef read_json(path):\n    with open(path, 'r') as f:\n        return json.load(f)\n\ndef write_json(path, data):\n    with open(path, 'w') as f:\n        json.dump(data, f, indent=2)\n\n# Example\ndata = {'name': 'Maken', 'version': 1}\nwrite_json('config.json', data)\nprint(read_json('config.json'))",
        "starter": "# Python starter — clean foundation\nfrom dataclasses import dataclass\nfrom typing import Optional\n\n@dataclass\nclass Config:\n    name: str\n    version: str = '1.0.0'\n    debug: bool = False\n\ndef process(items, limit=None):\n    result = [item for item in items if item]\n    return result[:limit] if limit else result\n\ndef main():\n    cfg = Config(name='MyApp')\n    data = ['alpha', 'beta', '', 'gamma', None, 'delta']\n    output = process(data, limit=3)\n    print(f'[{cfg.name}] Output:', output)\n\nif __name__ == '__main__':\n    main()"
      };
      return `
        <div class="mk-header">
          <span class="mk-status done">Built</span>
          <span class="mk-label">Python · ${topic}</span>
        </div>
        ${codeBlock("python", snippets[topic], `<button class="mk-btn runBtn">▶ Run idea</button>`)}
        ${tagRow(["Python 3.10+","Type hints","Clean structure","Ready to use"])}
        ${nextActions(["Add error handling to this","Convert this to a class","Add unit tests","Explain this step by step"])}`;
    }

    // ── JAVASCRIPT ───────────────────────────────────────────
    if (intent === "js") {
      const isAsync = m.includes("api") || m.includes("fetch") || m.includes("async");
      const isReact = m.includes("react") || m.includes("component");
      const code = isReact
        ? `// React component — clean & functional\nimport { useState, useEffect } from "react";\n\nfunction DataCard({ title, fetchUrl }) {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n\n  useEffect(() => {\n    fetch(fetchUrl)\n      .then(res => res.json())\n      .then(json => setData(json))\n      .catch(err => setError(err.message))\n      .finally(() => setLoading(false));\n  }, [fetchUrl]);\n\n  if (loading) return <p>Loading…</p>;\n  if (error)   return <p>Error: {error}</p>;\n  return (\n    <div className="card">\n      <h2>{title}</h2>\n      <pre>{JSON.stringify(data, null, 2)}</pre>\n    </div>\n  );\n}\n\nexport default DataCard;`
        : isAsync
        ? `// Async fetch with error handling & retries\nasync function fetchData(url, options = {}) {\n  const { retries = 3, timeout = 5000 } = options;\n\n  for (let attempt = 1; attempt <= retries; attempt++) {\n    const controller = new AbortController();\n    const timer = setTimeout(() => controller.abort(), timeout);\n\n    try {\n      const res = await fetch(url, { signal: controller.signal });\n      clearTimeout(timer);\n      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n      return await res.json();\n    } catch (err) {\n      clearTimeout(timer);\n      if (attempt === retries) throw err;\n      await new Promise(r => setTimeout(r, attempt * 500));\n    }\n  }\n}\n\n// Usage\nfetchData("https://api.example.com/data")\n  .then(data => console.log("✓", data))\n  .catch(err => console.error("✗", err.message));`
        : `// Modern JavaScript — utility toolkit\nconst utils = {\n  // Debounce — delay rapid calls\n  debounce(fn, ms = 300) {\n    let timer;\n    return (...args) => {\n      clearTimeout(timer);\n      timer = setTimeout(() => fn(...args), ms);\n    };\n  },\n\n  // Group array by key\n  groupBy(arr, key) {\n    return arr.reduce((acc, item) => {\n      (acc[item[key]] ??= []).push(item);\n      return acc;\n    }, {});\n  },\n\n  // Deep clone without JSON tricks\n  clone(obj) {\n    return structuredClone(obj);\n  },\n\n  // Format date nicely\n  formatDate(date, locale = "en-IN") {\n    return new Intl.DateTimeFormat(locale, {\n      day: "numeric", month: "short", year: "numeric"\n    }).format(new Date(date));\n  }\n};\n\n// Demo\nconst orders = [{id:1,status:"done"},{id:2,status:"pending"},{id:3,status:"done"}];\nconsole.log(utils.groupBy(orders, "status"));`;
      return `
        <div class="mk-header">
          <span class="mk-status done">Built</span>
          <span class="mk-label">JavaScript · ${isReact?"React component":isAsync?"Async/Await":"Utilities"}</span>
        </div>
        ${codeBlock("javascript", code)}
        ${tagRow([isReact?"React":"Vanilla JS", isAsync?"Async/Await":"ES2023", "No dependencies","Copy & use"])}
        ${nextActions(["Add TypeScript types","Add unit tests","Explain this code","Make it handle errors better"])}`;
    }

    // ── WEBSITE / LANDING PAGE ────────────────────────────────
    if (intent === "website" || intent === "html") {
      const isDark = m.includes("dark");
      const isPortfolio = m.includes("portfolio");
      const isSaas = m.includes("saas") || m.includes("startup") || m.includes("product");
      const label = isPortfolio ? "Portfolio" : isSaas ? "SaaS landing" : "Landing page";
      const bgColor    = isDark ? "#0b0b0b" : "#f5f5f3";
      const textColor  = isDark ? "#e8eaf0" : "#111";
      const pageTitle  = isPortfolio ? "My Portfolio" : isSaas ? "Launch — Your Product" : "My Page";
      const h1Text     = isPortfolio ? "I build things for the web" : "The fastest way to ship your idea";
      const pText      = isPortfolio ? "Designer and developer. Open to freelance work." : "No setup. No waiting. Just open and start building.";
      const btnText    = isPortfolio ? "See my work" : "Get started free";
      const themeAttr  = isDark ? "dark" : "light";

      const html = "&lt;!DOCTYPE html&gt;\n" +
"&lt;html lang=\"en\" data-theme=\"" + themeAttr + "\"&gt;\n" +
"&lt;head&gt;\n" +
"  &lt;meta charset=\"UTF-8\"&gt;\n" +
"  &lt;meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"&gt;\n" +
"  &lt;title&gt;" + pageTitle + "&lt;/title&gt;\n" +
"  &lt;style&gt;\n" +
"    * { margin:0; padding:0; box-sizing:border-box; }\n" +
"    :root { --bg:" + bgColor + "; --text:" + textColor + "; --accent:#4f8fff; }\n" +
"    body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; }\n" +
"    header { padding:20px 40px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; }\n" +
"    .logo { font-weight:700; font-size:1.2rem; color:var(--accent); }\n" +
"    nav a { margin-left:24px; color:var(--text); text-decoration:none; opacity:.7; }\n" +
"    nav a:hover { opacity:1; }\n" +
"    .hero { min-height:90vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px 20px; }\n" +
"    .hero h1 { font-size:clamp(2rem,6vw,4rem); font-weight:700; line-height:1.15; max-width:700px; }\n" +
"    .hero p { margin:20px 0; font-size:1.1rem; opacity:.7; max-width:500px; }\n" +
"    .cta { background:var(--accent); color:#fff; border:none; padding:14px 32px; border-radius:99px; font-size:1rem; font-weight:700; cursor:pointer; }\n" +
"    .cta:hover { opacity:.85; }\n" +
"    @media(max-width:600px){ nav { display:none; } }\n" +
"  &lt;/style&gt;\n" +
"&lt;/head&gt;\n" +
"&lt;body&gt;\n" +
"  &lt;header&gt;\n" +
"    &lt;div class=\"logo\"&gt;" + (isPortfolio ? "Portfolio" : "Brand") + "&lt;/div&gt;\n" +
"    &lt;nav&gt;\n" +
"      &lt;a href=\"#\"&gt;Work&lt;/a&gt;\n" +
"      &lt;a href=\"#\"&gt;About&lt;/a&gt;\n" +
"      &lt;a href=\"#\"&gt;Contact&lt;/a&gt;\n" +
"    &lt;/nav&gt;\n" +
"  &lt;/header&gt;\n" +
"  &lt;section class=\"hero\"&gt;\n" +
"    &lt;h1&gt;" + h1Text + "&lt;/h1&gt;\n" +
"    &lt;p&gt;" + pText + "&lt;/p&gt;\n" +
"    &lt;button class=\"cta\"&gt;" + btnText + " &amp;rarr;&lt;/button&gt;\n" +
"  &lt;/section&gt;\n" +
"&lt;/body&gt;\n" +
"&lt;/html&gt;";
      const themeTag = isDark ? "Dark theme" : "Light theme";
      return `
        <div class="mk-header">
          <span class="mk-status done">Built</span>
          <span class="mk-label">HTML · ${label}</span>
        </div>
        ${codeBlock("html", html, '<button class="mk-btn previewBtn">Preview</button>')}
        ${tagRow(["Responsive", "Clean CSS", themeTag, "Copy & open in browser"])}
        ${nextActions(["Add a features section","Make it dark themed","Add smooth scroll animations","Add a contact form"])}`;
    }

    // ── CSS / STYLING ─────────────────────────────────────────
    if (intent === "css") {
      const isAnim = m.includes("anim") || m.includes("transition") || m.includes("hover");
      const code = isAnim
        ? `/* Smooth animations — ready to copy */\n\n/* Fade in on load */\n@keyframes fadeUp {\n  from { opacity: 0; transform: translateY(16px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n.fade-up { animation: fadeUp 0.5s ease both; }\n\n/* Shimmer loading skeleton */\n@keyframes shimmer {\n  from { background-position: 200% 0; }\n  to   { background-position: -200% 0; }\n}\n.skeleton {\n  background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%);\n  background-size: 200% 100%;\n  animation: shimmer 1.4s linear infinite;\n  border-radius: 6px;\n  height: 14px;\n}\n\n/* Button hover lift */\n.btn {\n  transition: transform 0.2s ease, box-shadow 0.2s ease;\n}\n.btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 24px rgba(79,143,255,0.25);\n}`
        : `/* Modern CSS variables system */\n:root {\n  /* Colors */\n  --bg:       #0b0b0b;\n  --surface:  #111;\n  --border:   #1e1e1e;\n  --accent:   #4f8fff;\n  --text:     #e8eaf0;\n  --muted:    #888;\n\n  /* Spacing scale */\n  --space-xs: 4px;\n  --space-sm: 8px;\n  --space-md: 16px;\n  --space-lg: 32px;\n  --space-xl: 64px;\n\n  /* Border radius */\n  --radius-sm: 8px;\n  --radius:    14px;\n  --radius-lg: 24px;\n\n  /* Transitions */\n  --t: 0.22s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n/* Reset */\n*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }\nbody { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }\n\n/* Utility card */\n.card {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  padding: var(--space-md);\n  transition: border-color var(--t);\n}\n.card:hover { border-color: var(--accent); }`;
      return `
        <div class="mk-header">
          <span class="mk-status done">Built</span>
          <span class="mk-label">CSS · ${isAnim?"Animations":"Variable system"}</span>
        </div>
        ${codeBlock("css", code)}
        ${tagRow(["Modern CSS","Copy & paste","No framework needed","Production ready"])}
        ${nextActions(["Add dark/light mode toggle","Add responsive breakpoints","Add more animations","Convert to Tailwind classes"])}`;
    }

    // ── FIX / DEBUG ───────────────────────────────────────────
    if (intent === "fix") {
      const isUndefined = m.includes("undefined") || m.includes("null");
      const isTypeError = m.includes("typeerror") || m.includes("type error");
      return `
        <div class="mk-header">
          <span class="mk-status working">Debugging</span>
          <span class="mk-label">Bug analysis</span>
        </div>
        <p class="mk-lead">Paste your code and I'll locate the issue. Here are the most common causes:</p>
        ${stepList([
          { title: isUndefined ? "Undefined / null access" : isTypeError ? "Type mismatch" : "Logic error", desc: isUndefined ? "A value you're trying to use doesn't exist yet — check your variable declarations and async timing." : isTypeError ? "You're passing the wrong type — check what the function expects vs what you're sending." : "The code runs but gives wrong output — trace values at each step." },
          { title: "Where to look first", desc: "Check the line number in your error console. The issue is usually 1–2 lines above where it crashes." },
          { title: "Quick fix pattern", desc: "Add <code>console.log()</code> before the crash line to see what values you're working with." }
        ])}
        ${codeBlock("javascript", `// Safe access patterns — prevent common errors\n\n// ✗ Unsafe\nconst name = user.profile.name; // crashes if user or profile is null\n\n// ✓ Optional chaining\nconst name = user?.profile?.name ?? "Guest";\n\n// ✓ Guard clause\nif (!data || !Array.isArray(data)) return [];\nreturn data.map(item => item.value);\n\n// ✓ Try/catch for async\ntry {\n  const result = await fetchData();\n  return result;\n} catch (err) {\n  console.error("Failed:", err.message);\n  return null;\n}`)}
        ${nextActions(["Paste your code here","Show me the error message","Fix my async function","Help me add error handling"])}`;
    }

    // ── EXPLAIN ───────────────────────────────────────────────
    if (intent === "explain") {
      const topic = m.replace(/explain|what is|how does|how do|why does|tell me about|what does/gi,"").trim() || "this concept";
      return `
        <div class="mk-header">
          <span class="mk-status done">Explained</span>
          <span class="mk-label">${topic}</span>
        </div>
        <p class="mk-lead">Here's a clear breakdown of <strong>${topic}</strong>:</p>
        ${stepList([
          { title: "What it is", desc: `<strong>${topic}</strong> is a concept/tool/pattern used to solve a specific problem in software or design. It helps you write cleaner, more maintainable work.` },
          { title: "Why it matters", desc: "Understanding this helps you make better decisions, avoid common mistakes, and build things that actually work the way you expect." },
          { title: "When to use it", desc: "Use it when you need to handle complexity, improve performance, or follow established best practices in your project." }
        ])}
        ${codeBlock("example", `// Conceptual example of ${topic}\n// This shows the pattern in its simplest form\n\nfunction example(input) {\n  // 1. Validate input\n  if (!input) throw new Error("Input required");\n\n  // 2. Process\n  const result = transform(input);\n\n  // 3. Return clean output\n  return result;\n}`)}
        <p class="mk-note">💡 Share more details about your specific use case and I'll give you a more precise explanation.</p>
        ${nextActions([`Show me a real example of ${topic}`,`What are alternatives to ${topic}?`,"Give me a beginner-friendly breakdown","Explain with a diagram"])}`;
    }

    // ── WRITING ───────────────────────────────────────────────
    if (intent === "write") {
      const isEmail   = m.includes("email") || m.includes("mail") || m.includes("message");
      const isBlog    = m.includes("blog") || m.includes("article") || m.includes("post");
      const isEssay   = m.includes("essay") || m.includes("report");
      const type      = isEmail ? "Email" : isBlog ? "Blog post" : isEssay ? "Essay" : "Draft";
      const template  = isEmail
        ? `Subject: [Clear, specific subject line]\n\nHi [Name],\n\nI'm reaching out because [one sentence reason].\n\n[Core message in 2–3 sentences. Be specific. State what you need.]\n\n[Optional: One line of context or benefit for them.]\n\nLet me know if you have any questions.\n\nBest,\n[Your name]`
        : isBlog
        ? `# [Compelling headline — specific & useful]\n\n## The problem\n[1–2 sentences on what pain point this solves]\n\n## What most people do wrong\n[The common mistake — this is what hooks the reader]\n\n## The better way\n[Your main insight or method, 2–3 paragraphs]\n\n## Step by step\n1. [Action step]\n2. [Action step]\n3. [Action step]\n\n## Key takeaway\n[One sentence that summarizes the whole post]\n\n---\n*[Optional: call to action or next step]*`
        : `## Title\n\n### Introduction\n[Hook the reader in 2 sentences. State what this is about.]\n\n### Point 1 — [Main argument]\n[Evidence or reasoning]\n\n### Point 2 — [Supporting point]\n[Evidence or reasoning]\n\n### Point 3 — [Counterpoint or nuance]\n[Acknowledge complexity]\n\n### Conclusion\n[Summarize and close with a clear takeaway.]`;
      return `
        <div class="mk-header">
          <span class="mk-status done">Drafted</span>
          <span class="mk-label">Writing · ${type}</span>
        </div>
        ${codeBlock("text", template, `<button class="mk-btn sendBtn">Send via email</button>`)}
        ${tagRow([type,"Editable","Copy to clipboard","Ready to use"])}
        ${nextActions(["Make this more formal","Make this shorter and punchier","Rewrite the opening","Translate this to Tamil"])}`;
    }

    // ── PLAN / ROADMAP ────────────────────────────────────────
    if (intent === "plan") {
      const topic = m.replace(/plan|roadmap|steps|how to|guide|tutorial|learn|start|begin|checklist/gi,"").trim() || "your goal";
      return `
        <div class="mk-header">
          <span class="mk-status done">Planned</span>
          <span class="mk-label">Roadmap · ${topic}</span>
        </div>
        <p class="mk-lead">Here's a clear step-by-step plan for <strong>${topic}</strong>:</p>
        ${stepList([
          { title: "Start — understand the scope", desc: "Before writing a single line or word, clarify what done looks like. What's the smallest version that's useful?" },
          { title: "Set up your environment", desc: "Get the right tools in place. Don't over-engineer — use the simplest setup that works for your goal." },
          { title: "Build the core first", desc: "Focus on the main thing only. Skip edge cases, skip polish, skip features that aren't essential yet." },
          { title: "Test with real input", desc: "Run it with actual data or use cases. See where it breaks or feels wrong." },
          { title: "Refine and ship", desc: "Fix what matters. Clean up the rough edges. Then get it out — perfectionism is the enemy of done." }
        ])}
        ${nextActions([`Give me resources for ${topic}`,"Break step 1 into smaller tasks","Write the code for this plan","Help me estimate how long this takes"])}`;
    }

    // ── IDEAS / BRAINSTORM ────────────────────────────────────
    if (intent === "idea") {
      const topic = m.replace(/idea|suggest|recommend|brainstorm|inspiration|options|what should|help me choose/gi,"").trim() || "your project";
      return `
        <div class="mk-header">
          <span class="mk-status done">Generated</span>
          <span class="mk-label">Ideas · ${topic}</span>
        </div>
        <p class="mk-lead">Here are 6 directions for <strong>${topic}</strong>. Pick one and build from there:</p>
        <div class="mk-idea-grid">
          <div class="mk-idea-card"><div class="mk-idea-num">A</div><div><b>Minimal version</b><p>The smallest thing that works. Ship in a day.</p></div></div>
          <div class="mk-idea-card"><div class="mk-idea-num">B</div><div><b>Tool approach</b><p>Build it as a utility — fast input, instant output.</p></div></div>
          <div class="mk-idea-card"><div class="mk-idea-num">C</div><div><b>Automation angle</b><p>What if this ran on its own without input each time?</p></div></div>
          <div class="mk-idea-card"><div class="mk-idea-num">D</div><div><b>Visual first</b><p>Start with the UI — make it feel real before the logic.</p></div></div>
          <div class="mk-idea-card"><div class="mk-idea-num">E</div><div><b>API-powered</b><p>Connect to existing data — don't reinvent the wheel.</p></div></div>
          <div class="mk-idea-card"><div class="mk-idea-num">F</div><div><b>Collaboration mode</b><p>Make it shareable — two people using it multiplies the value.</p></div></div>
        </div>
        ${nextActions(["Build option A","Expand on option B","Compare pros and cons","Give me more niche ideas"])}`;
    }

    // ── MATH ─────────────────────────────────────────────────
    if (intent === "math") {
      return `
        <div class="mk-header">
          <span class="mk-status done">Calculated</span>
          <span class="mk-label">Math · Formula</span>
        </div>
        <p class="mk-lead">Share the numbers or formula and I'll work through it. Here's a quick reference:</p>
        ${codeBlock("math", `// Common calculations\n\n// Percentage\nconst percent = (part / total) * 100;\n// e.g. (45 / 180) * 100 = 25%\n\n// Average\nconst avg = arr.reduce((a, b) => a + b, 0) / arr.length;\n\n// Compound interest\nconst A = P * Math.pow(1 + r/n, n*t);\n// P=principal, r=rate, n=times/year, t=years\n\n// Distance between two points\nconst d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);\n\n// Round to N decimal places\nconst rounded = Math.round(num * 10**n) / 10**n;`)}
        ${nextActions(["Calculate 15% of 4500","What is compound interest for ₹10,000 at 8% for 5 years","Solve this equation for me","Convert km to miles"])}`;
    }

    // ── DEFAULT — workspace-style helpful response ─────────────
    const topics = ["code","a website","an essay","a plan","a Python script","a landing page","a debug session","a writing draft"];
    return `
      <div class="mk-header">
        <span class="mk-status working">On it</span>
        <span class="mk-label">Maken workspace</span>
      </div>
      <p class="mk-lead">Got it — tell me more and I'll build it right now. Or pick something below to start immediately:</p>
      <div class="mk-capability-grid">
        <div class="mk-cap"><span>💻</span><b>Code</b><small>Any language</small></div>
        <div class="mk-cap"><span>🌐</span><b>Website</b><small>Full HTML/CSS/JS</small></div>
        <div class="mk-cap"><span>✍️</span><b>Write</b><small>Emails, blogs, essays</small></div>
        <div class="mk-cap"><span>🔧</span><b>Debug</b><small>Paste your error</small></div>
        <div class="mk-cap"><span>📋</span><b>Plan</b><small>Steps & roadmaps</small></div>
        <div class="mk-cap"><span>💡</span><b>Ideas</b><small>Brainstorm anything</small></div>
      </div>
      ${nextActions([
        pick(["Build me a landing page","Write a Python function"]),
        pick(["Fix my JavaScript error","Draft a professional email"]),
        pick(["Plan my project roadmap","Brainstorm app ideas"])
      ])}`;
  }

  // === OUTPUT BLOCK ACTIONS — Copy · Download · Preview ===
  document.addEventListener("click", (e) => {

    const block = e.target.closest(".mk-output-block");

    // ── COPY ──
    if (e.target.classList.contains("copyBtn") && block) {
      const codeEl = block.querySelector(".mk-code");
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
        const orig = e.target.textContent;
        e.target.textContent = "Copied ✓";
        e.target.classList.add("copied");
        setTimeout(() => { e.target.textContent = orig; e.target.classList.remove("copied"); }, 2000);
      });
      return;
    }

    // ── DOWNLOAD — real file ──
    if (e.target.classList.contains("dlBtn") && block) {
      const codeEl  = block.querySelector(".mk-code");
      const rawCode = codeEl ? codeEl.textContent.trim() : "";
      const filename = e.target.dataset.filename || "maken-output.txt";
      const mime = filename.endsWith(".html") ? "text/html"
                 : filename.endsWith(".py")   ? "text/x-python"
                 : filename.endsWith(".js")   ? "text/javascript"
                 : filename.endsWith(".css")  ? "text/css"
                 : "text/plain";

      const blob = new Blob([rawCode], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const orig = e.target.textContent;
      e.target.textContent = "Downloaded ✓";
      setTimeout(() => { e.target.textContent = orig; }, 2000);
      return;
    }

    // ── LIVE PREVIEW — HTML only ──
    if (e.target.classList.contains("previewBtn") && block) {
      const codeEl  = block.querySelector(".mk-code");
      const rawHTML = codeEl ? codeEl.textContent.trim() : "";
      openLivePreview(rawHTML);
      return;
    }

    // ── Legacy code-block-container copy (backwards compat) ──
    const oldBlock = e.target.closest(".code-block-container");
    if (!oldBlock) return;
    const textEl = oldBlock.querySelector(".code-content");
    if (!textEl) return;
    if (e.target.classList.contains("copyBtn")) {
      navigator.clipboard.writeText(textEl.textContent.trim()).then(() => {
        e.target.textContent = "Copied ✓";
        setTimeout(() => e.target.textContent = "Copy", 2000);
      });
    }
    if (e.target.classList.contains("sendBtn")) {
      const fullText = textEl.innerText.trim();
      const subjectMatch = fullText.match(/Subject:\s*(.*)/i);
      const subject = subjectMatch ? subjectMatch[1] : "Maken Draft";
      window.location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(fullText);
    }
  });

  // === LIVE PREVIEW MODAL ===
  function openLivePreview(html) {
    // Remove existing preview
    document.querySelector(".mk-preview-modal")?.remove();

    const modal = document.createElement("div");
    modal.className = "mk-preview-modal";
    modal.innerHTML = `
      <div class="mk-preview-bar">
        <span class="mk-preview-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" style="vertical-align:middle;margin-right:5px">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/>
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" stroke="currentColor" stroke-width="1.6"/>
          </svg>
          Live Preview
        </span>
        <div class="mk-preview-actions">
          <button class="mk-preview-dl mk-btn">↓ Download</button>
          <button class="mk-preview-close mk-btn">✕ Close</button>
        </div>
      </div>
      <iframe class="mk-preview-frame" sandbox="allow-scripts allow-same-origin"></iframe>
    `;

    document.body.appendChild(modal);

    // Write HTML into iframe
    const iframe = modal.querySelector(".mk-preview-frame");
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Animate in
    requestAnimationFrame(() => modal.classList.add("open"));

    // Close
    modal.querySelector(".mk-preview-close").onclick = () => {
      modal.classList.remove("open");
      setTimeout(() => modal.remove(), 260);
    };

    // Download from preview
    modal.querySelector(".mk-preview-dl").onclick = () => {
      const blob = new Blob([html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "maken-preview.html"; a.click();
      URL.revokeObjectURL(url);
    };

    // ESC to close
    const escHandler = (e) => { if (e.key === "Escape") { modal.querySelector(".mk-preview-close").click(); document.removeEventListener("keydown", escHandler); } };
    document.addEventListener("keydown", escHandler);
  }

  // === VOICE READ ===
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("voiceBtn")) {
      const content = e.target.parentElement.innerText || "";
      speakText(content);
    }
  });

  function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  // === UPLOAD DROPDOWN ===
  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = uploadDropdown.style.display === "block";
    uploadDropdown.style.display = isOpen ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!uploadDropdown.contains(e.target) && e.target !== plusBtn) {
      uploadDropdown.style.display = "none";
    }
  });

  // === SCREENSHOT ===
  screenshotBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      track.stop();

      const reader = new FileReader();
      reader.onload = function () {
        const base64 = reader.result;
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", "user-image");
        const img = document.createElement("img");
        img.src = base64;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "12px";
        img.style.cursor = "pointer";
        img.onclick = () => openImageViewer(base64);
        messageDiv.appendChild(img);
        chatWindow.appendChild(messageDiv);
        scrollToBottom();

        saveMessage(currentChatId, "user", "", base64, "image", "screenshot.png");
      };
      reader.readAsDataURL(blob);
      uploadDropdown.style.display = "none";
    } catch {
      alert("Screenshot failed. Please allow screen sharing.");
    }
  });

  // === RESPONSIVE INPUT WIDTH ===
  function adjustLayout() {
    const w = window.innerWidth;
    if (w <= 480) {
      inputBox.style.width = "96%";
    } else if (w <= 768) {
      inputBox.style.width = "94%";
    } else if (w <= 1024) {
      inputBox.style.width = "80%";
    } else {
      inputBox.style.width = "52%";
    }
  }

  window.addEventListener("resize", adjustLayout);
  adjustLayout();

  // === INIT ===
  updateHistorySidebar();

  // === SERVICE WORKER ===
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then(() => console.log("SW registered"))
        .catch(() => {});
    });
  }
  const scrollBtn = document.getElementById("scrollBtn");
    window.addEventListener("scroll", () => {
      const dist = document.body.scrollHeight - window.scrollY - window.innerHeight;
      scrollBtn.classList.toggle("visible", dist > 240);
    });
    scrollBtn.addEventListener("click", () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });

    /* ─── Wrap AI messages in avatar-row layout ───
       This intercepts new .ai-message nodes added by
       script.js and wraps them with the avatar column  */
    (function() {
      const chatWindow = document.getElementById("chatWindow");
      if (!chatWindow) return;

      function wrapAiNode(node) {
        if (!node.classList || !node.classList.contains("ai-message")) return;
        if (node.closest(".ai-row")) return; // already wrapped

        const row = document.createElement("div");
        row.className = "ai-row";

        const avatar = document.createElement("div");
        avatar.className = "ai-avatar";
        avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M13 6L8 13H12L11 18L16 11H12L13 6Z" fill="currentColor"/>
        </svg>`;

        const content = document.createElement("div");
        content.className = "ai-content";

        // Place row before node, move node inside
        chatWindow.insertBefore(row, node);
        node.parentNode && node.parentNode.removeChild(node);
        content.appendChild(node);
        row.appendChild(avatar);
        row.appendChild(content);

        // Strip conflicting inline styles from the inner node
        node.style.cssText = "";
      }

      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            wrapAiNode(n);
          });
        });
      });

      observer.observe(chatWindow, { childList: true });
    })();
});