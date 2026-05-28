document.addEventListener("DOMContentLoaded", function () {

  // ============================================================
  //  ELEMENT REFS
  // ============================================================
  const hero           = document.getElementById("heroSection");
  const chatWindow     = document.querySelector('.chat-window');
  const sendBtn        = document.getElementById("sendBtn");
  const chatbox        = document.getElementById("userinput");
  const inputBox       = document.getElementById("inputBox");
  const footer         = document.getElementById("footer");
  const plusBtn        = document.getElementById("plusBtn");
  const uploadDropdown = document.getElementById("uploadDropdown");
  const screenshotBtn  = document.getElementById("screenshotBtn");
  const historyList    = document.getElementById("historyList");
  const menuToggle     = document.getElementById("menuToggle");
  const sidebar        = document.getElementById("sidebar");
  const closeSidebarBtn= document.getElementById("closeSidebarBtn");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const voiceIconEl    = document.getElementById("voiceIconEl");

  // V3 refs
  const voiceModal     = document.getElementById("voiceModal");
  const voiceOrb       = document.getElementById("voiceOrb");
  const voiceWave      = document.getElementById("voiceWave");
  const voiceStatus    = document.getElementById("voiceStatus");
  const voiceTranscript= document.getElementById("voiceTranscript");
  const voiceSendBtn   = document.getElementById("voiceSendBtn");
  const voiceCloseBtn  = document.getElementById("voiceCloseBtn");
  const imageGenBtn    = document.getElementById("imageGenBtn");

  // ============================================================
  //  SIDEBAR
  // ============================================================
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
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeSidebar(); closeVoiceModal(); } });
  document.getElementById("editLogoBtn").addEventListener("click", () => { window.location.href = "dashboard.html"; });

  // ============================================================
  //  SUGGESTION CHIPS
  // ============================================================
  function fillAndSend(text) {
    chatbox.value = text;
    autoResizeTextarea();
    sendMessage();
  }
  document.getElementById("codeBtn").addEventListener("click",    () => fillAndSend("Fix my code error"));
  document.getElementById("websiteBtn").addEventListener("click", () => fillAndSend("Build a website"));
  document.getElementById("writeBtn").addEventListener("click",   () => fillAndSend("Write a message"));
  if (imageGenBtn) imageGenBtn.addEventListener("click", () => fillAndSend("Generate an image of a futuristic city at night"));

  // ============================================================
  //  TEXTAREA AUTO-RESIZE
  // ============================================================
  function autoResizeTextarea() {
    chatbox.style.height = "auto";
    chatbox.style.height = Math.min(chatbox.scrollHeight, 180) + "px";
  }
  chatbox.addEventListener("input", autoResizeTextarea);

  // ============================================================
  //  V3: LIVE VOICE MODAL
  // ============================================================
  let recognition = null;
  let voiceListening = false;
  let voiceResult = "";

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  function openVoiceModal() {
    voiceModal.classList.add("active");
    voiceResult = "";
    voiceTranscript.textContent = "Your words will appear here…";
    voiceStatus.textContent = "Tap the mic to speak";
    voiceWave.classList.remove("active");
    voiceOrb.classList.remove("listening");
  }

  function closeVoiceModal() {
    voiceModal.classList.remove("active");
    stopVoiceListening();
  }

  function startVoiceListening() {
    if (!SpeechRec) {
      voiceStatus.textContent = "Not supported in this browser";
      return;
    }
    if (voiceListening) { stopVoiceListening(); return; }

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      voiceListening = true;
      voiceOrb.classList.add("listening");
      voiceWave.classList.add("active");
      voiceStatus.textContent = "Listening…";
    };

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) voiceResult += final + " ";
      voiceTranscript.textContent = (voiceResult + interim).trim() || "Your words will appear here…";
    };

    recognition.onerror = () => {
      voiceStatus.textContent = "Couldn't hear — try again";
      voiceOrb.classList.remove("listening");
      voiceWave.classList.remove("active");
      voiceListening = false;
    };

    recognition.onend = () => {
      voiceOrb.classList.remove("listening");
      voiceWave.classList.remove("active");
      voiceListening = false;
      if (voiceResult.trim()) {
        voiceStatus.textContent = "Got it — send or retry";
      } else {
        voiceStatus.textContent = "Tap the mic to speak";
      }
    };

    recognition.start();
  }

  function stopVoiceListening() {
    if (recognition) { try { recognition.stop(); } catch(e) {} }
    voiceListening = false;
    voiceOrb.classList.remove("listening");
    voiceWave.classList.remove("active");
    if (voiceIconEl) voiceIconEl.classList.remove("live-active");
  }

  // Open voice modal when mic icon clicked in input bar
  if (voiceIconEl) {
    voiceIconEl.addEventListener("click", () => {
      openVoiceModal();
      setTimeout(() => startVoiceListening(), 300);
    });
  }

  // Orb tap toggles listening
  voiceOrb.addEventListener("click", () => {
    if (voiceListening) stopVoiceListening();
    else startVoiceListening();
  });

  // Send voice result
  voiceSendBtn.addEventListener("click", () => {
    const text = voiceResult.trim() || voiceTranscript.textContent.trim();
    if (text && text !== "Your words will appear here…") {
      closeVoiceModal();
      chatbox.value = text;
      autoResizeTextarea();
      sendMessage();
    }
  });

  voiceCloseBtn.addEventListener("click", closeVoiceModal);

  // ============================================================
  //  LOCAL STORAGE
  // ============================================================
  let conversations = JSON.parse(localStorage.getItem("makenChats")) || [];
  let currentChatId = null;

  // ============================================================
  //  FILE HANDLING
  // ============================================================
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

  // ============================================================
  //  SEND MESSAGE
  // ============================================================
  sendBtn.addEventListener("click", sendMessage);
  chatbox.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  async function sendMessage() {
    const userMessage = chatbox.value.trim();
    if (!userMessage && !selectedFile) return;

    if (!currentChatId) startNewConversation(userMessage || "Attachment");

    const fileForAI = selectedFile;

    if (selectedFile) {
      const base64 = await fileToBase64(selectedFile);
      displayFileMessage(selectedFile);
      saveMessage(currentChatId, "user", "", base64, selectedFile.type.startsWith("image") ? "image" : "file", selectedFile.name);
      selectedFile = null;
      previewContainer.innerHTML = "";
      previewContainer.style.display = "none";
    }

    if (userMessage) {
      addMessageToChat(userMessage, false);
      saveMessage(currentChatId, "user", userMessage);
    }

    chatbox.value = "";
    chatbox.style.height = "auto";
    uploadDropdown.style.display = "none";
    transitionToChat();

    // loader
    const aiMessage = document.createElement("div");
    aiMessage.classList.add("message", "ai-message", "loading");
    aiMessage.innerHTML = buildLoader();
    chatWindow.appendChild(aiMessage);
    scrollToBottom();

    const delay = detectImageIntent(userMessage) ? 3200 : 900;

    setTimeout(async () => {
      const response = await generateAIResponse(userMessage, fileForAI);
      aiMessage.classList.remove("loading");
      aiMessage.innerHTML = "";
      typeText(aiMessage, response);
      saveMessage(currentChatId, "ai", response);
    }, delay);
  }

  // ============================================================
  //  IMAGE INTENT DETECTION
  // ============================================================
  function detectImageIntent(msg) {
    if (!msg) return false;
    const m = msg.toLowerCase();
    return ["generate image","create image","make image","draw","generate a","create a picture",
      "show me","illustrate","visualize","image of","picture of","photo of","artwork","painting",
      "render","design image","generate art"].some(k => m.includes(k));
  }

  // ============================================================
  //  LOADER
  // ============================================================
  function buildLoader() {
    return `<div class="gemini-loader">
      <div class="ai-icon-wrapper">
        <svg viewBox="0 0 24 24" class="ai-pulse-icon" fill="none">
          <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M13 6L8 13H12L11 18L16 11H12L13 6Z" fill="white"/>
        </svg>
      </div>
      <div class="shimmer-container">
        <div class="shimmer-line medium"></div>
        <div class="shimmer-line"></div>
        <div class="shimmer-line short"></div>
      </div>
    </div>`;
  }

  // ============================================================
  //  TRANSITION HERO → CHAT
  // ============================================================
  function transitionToChat() {
    if (hero.style.display === "none") return;
    hero.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    hero.style.opacity = "0";
    hero.style.transform = "translateY(-10px)";
    setTimeout(() => {
      hero.style.display = "none";
      chatWindow.style.display = "flex";
    }, 280);
    footer.innerHTML = "Maken V3 · Build space · Fast · Private";
  }

  // ============================================================
  //  DISPLAY FILE MESSAGE
  // ============================================================
  function displayFileMessage(file) {
    const type = file.type.split("/")[0];
    const messageDiv = document.createElement("div");
    if (type === "image") {
      messageDiv.classList.add("message", "user-image");
      const img = document.createElement("img");
      const imgURL = URL.createObjectURL(file);
      img.src = imgURL;
      img.style.cssText = "max-width:200px;border-radius:12px;cursor:pointer;";
      img.onclick = () => openImageViewer(imgURL);
      messageDiv.appendChild(img);
    } else {
      messageDiv.classList.add("message", "user-message");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.textContent = "📄 " + file.name;
      link.style.cssText = "color:inherit;text-decoration:none;";
      messageDiv.appendChild(link);
    }
    chatWindow.appendChild(messageDiv);
    scrollToBottom();
  }

  // ============================================================
  //  IMAGE VIEWER
  // ============================================================
  function openImageViewer(src) {
    const viewer = document.createElement("div");
    viewer.classList.add("image-viewer");
    viewer.innerHTML = `<span class="close-btn">✕</span><img src="${src}" class="full-image"/>`;
    document.body.appendChild(viewer);
    viewer.querySelector(".close-btn").onclick = () => viewer.remove();
    viewer.onclick = (e) => { if (e.target === viewer) viewer.remove(); };
  }

  // ============================================================
  //  CONVERSATION MANAGEMENT
  // ============================================================
  function startNewConversation(firstMessage) {
    chatWindow.innerHTML = "";
    const chatId = Date.now();
    const title = firstMessage.length > 30 ? firstMessage.slice(0, 30) + "…" : firstMessage;
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
      titleSpan.addEventListener("click", () => { loadConversation(chat.id); closeSidebar(); });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✕";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteConversation(chat.id); });
      item.appendChild(titleSpan);
      item.appendChild(deleteBtn);
      historyList.appendChild(item);
    });
  }

  function deleteConversation(chatId) {
    if (!confirm("Delete this chat?")) return;
    conversations = conversations.filter(c => c.id !== chatId);
    saveToLocal();
    updateHistorySidebar();
    if (currentChatId === chatId) window.location.href = "dashboard.html";
  }

  function loadConversation(chatId) {
    const chat = conversations.find(c => c.id === chatId);
    if (!chat) return;
    currentChatId = chatId;
    chatWindow.innerHTML = "";
    hero.style.display = "none";
    chatWindow.style.display = "flex";
    chat.messages.forEach(msg => {
      if (msg.type === "image") {
        const div = document.createElement("div");
        div.classList.add("message", msg.sender === "ai" ? "ai-message" : "user-image");
        const img = document.createElement("img");
        img.src = msg.content;
        img.style.cssText = "max-width:200px;border-radius:12px;cursor:pointer;";
        img.onclick = () => openImageViewer(msg.content);
        div.appendChild(img);
        chatWindow.appendChild(div);
      } else if (msg.type === "file") {
        const div = document.createElement("div");
        div.classList.add("message", "user-message");
        div.textContent = "📄 " + msg.name;
        chatWindow.appendChild(div);
      } else {
        addMessageToChat(msg.text, msg.sender === "ai");
      }
    });
    scrollToBottom();
    updateHistorySidebar();
  }

  function saveToLocal() { localStorage.setItem("makenChats", JSON.stringify(conversations)); }

  function scrollToBottom() {
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }

  // ============================================================
  //  TYPE EFFECT
  // ============================================================
  function typeText(element, htmlContent) {
    let i = 0;
    const step = 5;
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

  function codeBlock(lang, code) {
    return `<div class="mk-output-block">
      <div class="mk-output-bar">
        <span class="mk-lang">${lang}</span>
        <div class="mk-bar-actions">
          <button class="mk-btn copyBtn">Copy</button>
        </div>
      </div>
      <pre class="mk-code">${code}</pre>
    </div>`;
  }

  function stepList(steps) {
    return `<div class="mk-steps">${steps.map((s,i) => `
      <div class="mk-step">
        <div class="mk-step-num">${i+1}</div>
        <div class="mk-step-body">
          <div class="mk-step-title">${s.title}</div>
          <div class="mk-step-desc">${s.desc}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  function tagRow(tags) {
    return `<div class="mk-tags">${tags.map(t => `<span class="mk-tag">${t}</span>`).join("")}</div>`;
  }

  function nextActions(actions) {
    return `<div class="mk-next-label">Next — tell Maken to:</div>
      <div class="mk-next-actions">${actions.map(a =>
        `<button class="mk-next-btn" onclick="document.getElementById('userinput').value='${a.replace(/'/g,"\\'")}';document.getElementById('userinput').focus();">${a}</button>`
      ).join("")}</div>`;
  }

  // ============================================================
  //  V3: IMAGE GENERATION (fake loading → real Unsplash image)
  // ============================================================
  function buildImageGenResponse(prompt) {
    const m = prompt.toLowerCase();

    // Pick a relevant Unsplash category based on prompt
    const categories = [
      { keys: ["city","urban","street","night","neon"], q: "futuristic+city+night" },
      { keys: ["nature","forest","mountain","landscape","sunset"], q: "nature+landscape" },
      { keys: ["space","galaxy","stars","cosmos","planet"], q: "galaxy+space+stars" },
      { keys: ["ocean","sea","beach","water","wave"], q: "ocean+beach+waves" },
      { keys: ["portrait","person","face","human","woman","man"], q: "portrait+photography" },
      { keys: ["animal","cat","dog","bird","wolf","lion"], q: "wildlife+animal" },
      { keys: ["food","cake","coffee","pizza","dessert"], q: "food+photography" },
      { keys: ["car","vehicle","supercar","motorcycle"], q: "supercar+vehicle" },
      { keys: ["abstract","art","pattern","color","gradient"], q: "abstract+art+colorful" },
      { keys: ["building","architecture","interior","room"], q: "architecture+interior" },
    ];

    let query = "digital+art+creative";
    for (const cat of categories) {
      if (cat.keys.some(k => m.includes(k))) { query = cat.q; break; }
    }

    // Use multiple image sources for variety
    const seed = Math.floor(Math.random() * 1000);
    const w = 800, h = 450;
    const imageUrl = `https://picsum.photos/seed/${seed}/${w}/${h}`;

    const cleanPrompt = prompt.replace(/generate (an? )?image (of)?|create (an? )?image (of)?|draw|make (an? )?image/gi, "").trim() || prompt;

    // Build the animated loading card that resolves to image
    const loadId = "imggen_" + Date.now();

    // Steps that animate during "generation"
    return `<div class="mk-header">
      <span class="mk-status working">Generating</span>
      <span class="mk-label">Image · AI Render</span>
    </div>
    <p class="mk-lead" style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">
      Prompt: <em style="color:var(--text)">"${cleanPrompt}"</em>
    </p>
    <div class="img-gen-card" id="${loadId}">
      <div class="img-gen-loading">
        <div class="img-gen-shimmer">
          <div class="img-gen-shimmer-icon">🎨</div>
          <div class="img-gen-shimmer-text">Rendering your image…</div>
        </div>
        <div class="img-gen-steps">
          <span class="img-gen-step active" id="${loadId}_s1">◉ Analyzing prompt</span>
          <span class="img-gen-step" id="${loadId}_s2">○ Composing scene</span>
          <span class="img-gen-step" id="${loadId}_s3">○ Rendering details</span>
          <span class="img-gen-step" id="${loadId}_s4">○ Finalizing</span>
        </div>
      </div>
    </div>
    ${nextActions(["Generate another variation","Make it dark and moody","Change the style to watercolor","Generate a portrait version"])}
    <script>
    (function(){
      var steps = ["${loadId}_s1","${loadId}_s2","${loadId}_s3","${loadId}_s4"];
      var delays = [0, 900, 1800, 2600];
      steps.forEach(function(id, i){
        setTimeout(function(){
          var el = document.getElementById(id);
          if(!el) return;
          if(i > 0) {
            var prev = document.getElementById(steps[i-1]);
            if(prev){ prev.textContent = prev.textContent.replace("◉","✓"); prev.classList.remove("active"); prev.classList.add("done"); }
          }
          el.textContent = el.textContent.replace("○","◉");
          el.classList.add("active");
        }, delays[i]);
      });
      setTimeout(function(){
        var last = document.getElementById(steps[steps.length-1]);
        if(last){ last.textContent = last.textContent.replace("◉","✓"); last.classList.remove("active"); last.classList.add("done"); }
        var card = document.getElementById("${loadId}");
        if(!card) return;
        var img = new Image();
        img.onload = function(){
          card.innerHTML =
            '<div class="img-gen-result">' +
              '<img src="${imageUrl}" alt="${cleanPrompt}" style="cursor:pointer" onclick="(function(s){var v=document.createElement(\'div\');v.className=\'image-viewer\';v.innerHTML=\'<span class=\\\"close-btn\\\" onclick=\\\"this.parentElement.remove()\\\">✕</span><img src=\\\"\'+s+\'\\\"/>\';document.body.appendChild(v);v.onclick=function(e){if(e.target===v)v.remove();};})(\\'${imageUrl}\\')"/>' +
              '<div class="img-gen-toolbar">' +
                '<span class="img-gen-meta">✓ Generated · 800×450</span>' +
                '<div class="img-gen-actions">' +
                  '<button class="img-gen-btn" onclick="window.open(\'${imageUrl}\',\'_blank\')">View full</button>' +
                  '<button class="img-gen-btn" onclick="var a=document.createElement(\'a\');a.href=\'${imageUrl}\';a.download=\'maken-image.jpg\';a.click();">Download</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          var hdr = card.previousElementSibling && card.previousElementSibling.previousElementSibling;
          var statusEl = document.querySelector("#${loadId}").closest(".ai-message, .ai-content")&&document.querySelector("#${loadId}").closest(".ai-message, .ai-content").querySelector(".mk-status");
          var allStatus = document.querySelectorAll(".mk-status.working");
          allStatus.forEach(function(s){s.textContent="✓ Generated";s.classList.remove("working");s.classList.add("done");});
        };
        img.onerror = function(){
          card.innerHTML = '<p class="mk-note">⚠️ Image load failed — try a different prompt.</p>';
        };
        img.src = "${imageUrl}";
      }, 3200);
    })();
    <\/script>`;
  }

  // ============================================================
  //  INTENT DETECTION
  // ============================================================
  function detectIntent(msg) {
    const m = msg.toLowerCase();
    if (detectImageIntent(msg)) return "imagegen";
    const map = {
      python:  ["python","py","pandas","numpy","django","flask","fastapi","def ","print("],
      js:      ["javascript","js","node","react","vue","typescript","ts","express","next","console.log"],
      css:     ["css","style","sass","tailwind","flexbox","grid","animation","responsive","dark mode"],
      html:    ["html","webpage","landing page","homepage","portfolio","web page"],
      website: ["website","site","build a web","create a web","make a web","make a site","build me a web"],
      fix:     ["fix","debug","error","bug","not working","broken","issue","problem","crash","undefined","null","typeerror"],
      explain: ["explain","what is","how does","how do","why does","tell me about","what does","difference between"],
      write:   ["write","draft","essay","blog","article","email","letter","message","post","content","copy"],
      plan:    ["plan","roadmap","steps","how to","guide","tutorial","learn","start","begin","checklist"],
      idea:    ["idea","suggest","recommend","brainstorm","inspiration","options","what should","help me choose"],
      math:    ["math","calculate","formula","equation","solve","sum","average","percentage","convert"],
      hello:   ["hi","hello","hey","sup","namaste","good morning","good evening","hola"]
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
  //  RESPONSE GENERATOR
  // ============================================================
  async function generateAIResponse(userMessage, selectedFile) {
    const msg = (userMessage || "").trim();
    const m   = msg.toLowerCase();
    const intent = detectIntent(m);

    // ── FILE ──────────────────────────────────────────────────
    if (selectedFile) {
      const isImg  = selectedFile.type.startsWith("image");
      const isCode = /\.(js|py|ts|html|css|json|txt|md|csv)$/i.test(selectedFile.name);
      const size   = (selectedFile.size / 1024).toFixed(1) + " KB";
      return `<div class="mk-header">
        <span class="mk-status done">Received</span>
        <span class="mk-label">${isImg?"🖼️ Image":isCode?"📄 Code file":"📎 File"} · ${selectedFile.name}</span>
      </div>
      <div class="mk-file-card">
        <div class="mk-file-row"><span class="mk-file-key">Name</span><span class="mk-file-val">${selectedFile.name}</span></div>
        <div class="mk-file-row"><span class="mk-file-key">Size</span><span class="mk-file-val">${size}</span></div>
        <div class="mk-file-row"><span class="mk-file-key">Type</span><span class="mk-file-val">${selectedFile.type||"unknown"}</span></div>
      </div>
      ${nextActions(isImg
        ? ["Describe what's in this image","Turn this into a UI component","Suggest design improvements","Extract text from this image"]
        : isCode
        ? ["Review this code for bugs","Add comments to this code","Explain what this code does","Refactor and clean this up"]
        : ["Summarize this file","Extract key points","Convert to another format","Analyze the content"]
      )}`;
    }

    // ── IMAGE GENERATION ──────────────────────────────────────
    if (intent === "imagegen") {
      return buildImageGenResponse(msg);
    }

    // ── HELLO ─────────────────────────────────────────────────
    if (intent === "hello") {
      return `<div class="mk-header">
        <span class="mk-status done">Ready</span>
        <span class="mk-label">Maken V3 · Build space</span>
      </div>
      <p class="mk-lead">Hey! I'm Maken — your build workspace. I make things, not just chat.</p>
      <div class="mk-capability-grid">
        <div class="mk-cap"><span>💻</span><b>Code</b><small>Any language</small></div>
        <div class="mk-cap"><span>🌐</span><b>Websites</b><small>Full HTML/CSS/JS</small></div>
        <div class="mk-cap"><span>✍️</span><b>Writing</b><small>Drafts & content</small></div>
        <div class="mk-cap"><span>🔧</span><b>Debug</b><small>Fix errors fast</small></div>
        <div class="mk-cap"><span>🎨</span><b>Images</b><small>AI image gen</small></div>
        <div class="mk-cap"><span>🎤</span><b>Voice</b><small>Speak to build</small></div>
      </div>
      ${nextActions(["Generate an image of a futuristic city","Build me a landing page","Write a Python script","Fix my code error"])}`;
    }

    // ── PYTHON ────────────────────────────────────────────────
    if (intent === "python") {
      const topic = m.includes("sort")?"sort":m.includes("class")?"class":m.includes("file")?"file":"starter";
      const snippets = {
        "sort": "items = [5, 2, 9, 1, 7, 3]\n\n# Ascending\nprint(sorted(items))\n\n# Descending\nprint(sorted(items, reverse=True))\n\n# Sort dicts by key\npeople = [{'name':'Alice','age':30},{'name':'Bob','age':25}]\nprint(sorted(people, key=lambda x: x['age']))",
        "class": "class Product:\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def discount(self, pct):\n        return self.price * (1 - pct/100)\n\n    def in_stock(self):\n        return self.stock > 0\n\n    def __repr__(self):\n        return f'Product({self.name!r}, {self.price})'\n\np = Product('Laptop', 999, stock=5)\nprint(p)\nprint('Discounted:', p.discount(10))",
        "file": "import json\nfrom pathlib import Path\n\ndef read_json(path):\n    with open(path) as f:\n        return json.load(f)\n\ndef write_json(path, data):\n    with open(path, 'w') as f:\n        json.dump(data, f, indent=2)\n\n# Usage\ndata = {'name': 'Maken', 'version': 3}\nwrite_json('config.json', data)\nprint(read_json('config.json'))",
        "starter": "from dataclasses import dataclass\nfrom typing import Optional\n\n@dataclass\nclass Config:\n    name: str\n    version: str = '1.0.0'\n    debug: bool = False\n\ndef process(items, limit=None):\n    result = [x for x in items if x]\n    return result[:limit] if limit else result\n\nif __name__ == '__main__':\n    cfg = Config(name='MyApp')\n    out = process(['a','','b',None,'c'], limit=2)\n    print(cfg, out)"
      };
      return `<div class="mk-header">
        <span class="mk-status done">Built</span>
        <span class="mk-label">Python · ${topic}</span>
      </div>
      ${codeBlock("python", snippets[topic])}
      ${tagRow(["Python 3.10+","Type hints","Ready to run","Copy & paste"])}
      ${nextActions(["Add error handling","Convert to a class","Add unit tests","Explain step by step"])}`;
    }

    // ── JAVASCRIPT ────────────────────────────────────────────
    if (intent === "js") {
      const isReact = m.includes("react")||m.includes("component");
      const isAsync = m.includes("fetch")||m.includes("async")||m.includes("api");
      const code = isReact
        ? "import { useState, useEffect } from 'react';\n\nfunction DataCard({ title, url }) {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    fetch(url)\n      .then(r => r.json())\n      .then(setData)\n      .finally(() => setLoading(false));\n  }, [url]);\n\n  if (loading) return <p>Loading…</p>;\n  return (\n    <div className=\"card\">\n      <h2>{title}</h2>\n      <pre>{JSON.stringify(data, null, 2)}</pre>\n    </div>\n  );\n}\n\nexport default DataCard;"
        : isAsync
        ? "async function fetchData(url, retries = 3) {\n  for (let i = 1; i <= retries; i++) {\n    try {\n      const res = await fetch(url);\n      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n      return await res.json();\n    } catch (err) {\n      if (i === retries) throw err;\n      await new Promise(r => setTimeout(r, i * 500));\n    }\n  }\n}\n\nfetchData('https://api.example.com/data')\n  .then(data => console.log('OK', data))\n  .catch(err => console.error('Failed:', err.message));"
        : "const utils = {\n  debounce(fn, ms = 300) {\n    let t;\n    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };\n  },\n\n  groupBy(arr, key) {\n    return arr.reduce((acc, item) => {\n      (acc[item[key]] ??= []).push(item);\n      return acc;\n    }, {});\n  },\n\n  formatDate(date) {\n    return new Intl.DateTimeFormat('en-IN', {\n      day:'numeric', month:'short', year:'numeric'\n    }).format(new Date(date));\n  }\n};\n\nconst orders = [{id:1,status:'done'},{id:2,status:'pending'},{id:3,status:'done'}];\nconsole.log(utils.groupBy(orders, 'status'));";
      return `<div class="mk-header">
        <span class="mk-status done">Built</span>
        <span class="mk-label">JavaScript · ${isReact?"React":isAsync?"Async/Await":"Utilities"}</span>
      </div>
      ${codeBlock("javascript", code)}
      ${tagRow([isReact?"React 18":"Vanilla JS",isAsync?"Async":"ES2023","No dependencies","Copy & use"])}
      ${nextActions(["Add TypeScript types","Add error handling","Write unit tests","Explain this code"])}`;
    }

    // ── WEBSITE / HTML ────────────────────────────────────────
    if (intent === "website" || intent === "html") {
      const isDark = m.includes("dark");
      const isPortfolio = m.includes("portfolio");
      const label = isPortfolio ? "Portfolio" : "Landing page";
      const bgColor = isDark ? "#0b0b0b" : "#f5f5f3";
      const textColor = isDark ? "#e8eaf0" : "#111";
      const themeTag = isDark ? "Dark theme" : "Light theme";
      const h1 = isPortfolio ? "I build things for the web" : "The fastest way to ship your idea";
      const p  = isPortfolio ? "Open to freelance. Based in India." : "No setup. No login. Just start.";
      const html = "&lt;!DOCTYPE html&gt;\n&lt;html lang=\"en\"&gt;\n&lt;head&gt;\n  &lt;meta charset=\"UTF-8\"&gt;\n  &lt;meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"&gt;\n  &lt;title&gt;My Page&lt;/title&gt;\n  &lt;style&gt;\n    *{margin:0;padding:0;box-sizing:border-box;}\n    body{background:" + bgColor + ";color:" + textColor + ";font-family:system-ui,sans-serif;}\n    header{padding:20px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #222;}\n    .logo{font-weight:700;font-size:1.2rem;color:#4f8fff;}\n    nav a{margin-left:24px;color:inherit;text-decoration:none;opacity:.7;}\n    nav a:hover{opacity:1;}\n    .hero{min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;}\n    h1{font-size:clamp(2rem,6vw,4rem);font-weight:700;line-height:1.15;max-width:700px;}\n    p{margin:20px 0;font-size:1.1rem;opacity:.7;max-width:500px;}\n    .cta{background:#4f8fff;color:#fff;border:none;padding:14px 32px;border-radius:99px;font-size:1rem;font-weight:700;cursor:pointer;}\n  &lt;/style&gt;\n&lt;/head&gt;\n&lt;body&gt;\n  &lt;header&gt;\n    &lt;div class=\"logo\"&gt;" + (isPortfolio?"Portfolio":"Brand") + "&lt;/div&gt;\n    &lt;nav&gt;&lt;a href=\"#\"&gt;Work&lt;/a&gt;&lt;a href=\"#\"&gt;About&lt;/a&gt;&lt;a href=\"#\"&gt;Contact&lt;/a&gt;&lt;/nav&gt;\n  &lt;/header&gt;\n  &lt;section class=\"hero\"&gt;\n    &lt;h1&gt;" + h1 + "&lt;/h1&gt;\n    &lt;p&gt;" + p + "&lt;/p&gt;\n    &lt;button class=\"cta\"&gt;Get started &amp;rarr;&lt;/button&gt;\n  &lt;/section&gt;\n&lt;/body&gt;\n&lt;/html&gt;";
      return `<div class="mk-header">
        <span class="mk-status done">Built</span>
        <span class="mk-label">HTML · ${label}</span>
      </div>
      ${codeBlock("html", html)}
      ${tagRow(["Responsive", "Clean CSS", themeTag, "Open in browser"])}
      ${nextActions(["Add a features section","Add smooth scroll","Add a contact form","Make it dark themed"])}`;
    }

    // ── CSS ───────────────────────────────────────────────────
    if (intent === "css") {
      const isAnim = m.includes("anim")||m.includes("transition")||m.includes("hover");
      const code = isAnim
        ? "@keyframes fadeUp {\n  from { opacity:0; transform:translateY(16px); }\n  to   { opacity:1; transform:translateY(0); }\n}\n.fade-up { animation: fadeUp 0.5s ease both; }\n\n@keyframes shimmer {\n  from { background-position:200% 0; }\n  to   { background-position:-200% 0; }\n}\n.skeleton {\n  background: linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%);\n  background-size: 200% 100%;\n  animation: shimmer 1.4s linear infinite;\n  border-radius: 6px;\n  height: 14px;\n}\n\n.btn { transition: transform 0.2s, box-shadow 0.2s; }\n.btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(79,143,255,0.25); }"
        : ":root {\n  --bg:#0b0b0b; --surface:#111; --border:#1e1e1e;\n  --accent:#4f8fff; --text:#e8eaf0; --muted:#888;\n  --space-sm:8px; --space-md:16px; --space-lg:32px;\n  --radius:14px; --t:0.22s cubic-bezier(0.4,0,0.2,1);\n}\n\n*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}\nbody{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;}\n\n.card {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  padding: var(--space-md);\n  transition: border-color var(--t);\n}\n.card:hover { border-color:var(--accent); }";
      return `<div class="mk-header">
        <span class="mk-status done">Built</span>
        <span class="mk-label">CSS · ${isAnim?"Animations":"Variable system"}</span>
      </div>
      ${codeBlock("css", code)}
      ${tagRow(["Modern CSS","No framework","Copy & paste","Production ready"])}
      ${nextActions(["Add dark/light toggle","Add responsive breakpoints","Add more animations","Convert to Tailwind"])}`;
    }

    // ── FIX / DEBUG ───────────────────────────────────────────
    if (intent === "fix") {
      return `<div class="mk-header">
        <span class="mk-status working">Debugging</span>
        <span class="mk-label">Bug analysis</span>
      </div>
      <p class="mk-lead">Paste your code and error message — I'll find and fix it. Common causes:</p>
      ${stepList([
        { title:"Check the error line", desc:"Open DevTools (F12) → Console. The line number tells you exactly where it broke." },
        { title:"Trace your values", desc:"Add <code>console.log()</code> before the crash to see what each variable holds." },
        { title:"Safe access patterns", desc:"Use optional chaining <code>obj?.prop</code> and <code>?? 'default'</code> to prevent null crashes." }
      ])}
      ${codeBlock("javascript", "// Common fixes\n\n// Null crash fix\nconst name = user?.profile?.name ?? 'Guest';\n\n// Array guard\nif (!Array.isArray(data)) return [];\nreturn data.map(item => item.value);\n\n// Async error handling\ntry {\n  const result = await fetchData();\n  return result;\n} catch (err) {\n  console.error('Failed:', err.message);\n  return null;\n}")}
      ${nextActions(["Paste your code here","Show me the error message","Fix my async function","Add error handling to my code"])}`;
    }

    // ── EXPLAIN ───────────────────────────────────────────────
    if (intent === "explain") {
      const topic = msg.replace(/explain|what is|how does|how do|why does|tell me about|what does/gi,"").trim() || "this";
      return `<div class="mk-header">
        <span class="mk-status done">Explained</span>
        <span class="mk-label">${topic}</span>
      </div>
      ${stepList([
        { title:"What it is", desc:`<strong>${topic}</strong> is a concept or tool used to solve a specific problem. It helps you build cleaner, more maintainable work.` },
        { title:"Why it matters", desc:"Understanding this helps you make better decisions, avoid mistakes, and write code that works the way you expect." },
        { title:"When to use it", desc:"Use it when you need to handle complexity, improve performance, or follow established patterns in your project." }
      ])}
      ${codeBlock("example", "// Simple conceptual example\nfunction example(input) {\n  if (!input) throw new Error('Input required');\n  const result = transform(input); // your logic here\n  return result;\n}")}
      <p class="mk-note">💡 Give me more context and I'll explain it specifically for your use case.</p>
      ${nextActions([`Show a real example of ${topic}`,`What are alternatives to ${topic}?`,"Give me a beginner breakdown","Explain with a diagram"])}`;
    }

    // ── WRITE ─────────────────────────────────────────────────
    if (intent === "write") {
      const isEmail = m.includes("email")||m.includes("mail")||m.includes("message");
      const isBlog  = m.includes("blog")||m.includes("article")||m.includes("post");
      const type    = isEmail?"Email":isBlog?"Blog post":"Draft";
      const template = isEmail
        ? "Subject: [Clear, specific subject line]\n\nHi [Name],\n\nI'm reaching out because [one sentence reason].\n\n[Core message in 2-3 sentences. Be specific. State what you need.]\n\n[Optional: one line of context or value for them.]\n\nBest,\n[Your name]"
        : isBlog
        ? "# [Compelling headline]\n\n## The problem\n[1-2 sentences on the pain point]\n\n## What most people do wrong\n[The hook]\n\n## The better way\n[Your main insight, 2-3 paragraphs]\n\n## Step by step\n1. [Action]\n2. [Action]\n3. [Action]\n\n## Key takeaway\n[One sentence summary]"
        : "## Title\n\n### Introduction\n[Hook the reader. State what this is about.]\n\n### Main point\n[Evidence or reasoning]\n\n### Supporting point\n[Evidence or reasoning]\n\n### Conclusion\n[Summarize with a clear takeaway.]";
      return `<div class="mk-header">
        <span class="mk-status done">Drafted</span>
        <span class="mk-label">Writing · ${type}</span>
      </div>
      ${codeBlock("text", template)}
      ${tagRow([type,"Editable","Copy to clipboard","Ready to use"])}
      ${nextActions(["Make this more formal","Make it shorter","Rewrite the opening","Translate to Tamil"])}`;
    }

    // ── PLAN ──────────────────────────────────────────────────
    if (intent === "plan") {
      const topic = msg.replace(/plan|roadmap|steps|how to|guide|tutorial|learn|start|begin|checklist/gi,"").trim() || "your goal";
      return `<div class="mk-header">
        <span class="mk-status done">Planned</span>
        <span class="mk-label">Roadmap · ${topic}</span>
      </div>
      ${stepList([
        { title:"Define what done looks like", desc:"Before writing a line, clarify the smallest version that's actually useful." },
        { title:"Set up your environment", desc:"Get the right tools. Don't over-engineer — use the simplest setup that works." },
        { title:"Build the core first", desc:"Focus on the main thing only. Skip edge cases and polish for now." },
        { title:"Test with real input", desc:"Run it with actual data. See where it breaks or feels wrong." },
        { title:"Refine and ship", desc:"Fix what matters. Clean the rough edges. Then get it out — done beats perfect." }
      ])}
      ${nextActions([`Resources for ${topic}`,"Break step 1 into tasks","Write the code for this plan","Estimate how long this takes"])}`;
    }

    // ── IDEAS ─────────────────────────────────────────────────
    if (intent === "idea") {
      const topic = msg.replace(/idea|suggest|recommend|brainstorm|what should|help me choose/gi,"").trim() || "your project";
      return `<div class="mk-header">
        <span class="mk-status done">Generated</span>
        <span class="mk-label">Ideas · ${topic}</span>
      </div>
      <p class="mk-lead">6 directions for <strong>${topic}</strong> — pick one and build:</p>
      <div class="mk-idea-grid">
        <div class="mk-idea-card"><div class="mk-idea-num">A</div><div><b>Minimal version</b><p>Smallest thing that works. Ship in a day.</p></div></div>
        <div class="mk-idea-card"><div class="mk-idea-num">B</div><div><b>Tool approach</b><p>Fast input, instant output. Pure utility.</p></div></div>
        <div class="mk-idea-card"><div class="mk-idea-num">C</div><div><b>Automation</b><p>What if this ran on its own without input each time?</p></div></div>
        <div class="mk-idea-card"><div class="mk-idea-num">D</div><div><b>Visual first</b><p>Start with the UI — make it feel real before the logic.</p></div></div>
        <div class="mk-idea-card"><div class="mk-idea-num">E</div><div><b>API-powered</b><p>Connect to existing data — don't reinvent the wheel.</p></div></div>
        <div class="mk-idea-card"><div class="mk-idea-num">F</div><div><b>Shareable</b><p>Make it collaborative — two users multiplies the value.</p></div></div>
      </div>
      ${nextActions(["Build option A","Expand on option B","Compare pros and cons","Give me more niche ideas"])}`;
    }

    // ── MATH ──────────────────────────────────────────────────
    if (intent === "math") {
      return `<div class="mk-header">
        <span class="mk-status done">Ready</span>
        <span class="mk-label">Math · Formulas</span>
      </div>
      <p class="mk-lead">Share your numbers and I'll calculate. Quick reference:</p>
      ${codeBlock("math", "// Percentage\nconst pct = (part / total) * 100;\n// e.g. (45 / 180) * 100 = 25%\n\n// Average\nconst avg = arr.reduce((a,b) => a+b, 0) / arr.length;\n\n// Compound interest\nconst A = P * Math.pow(1 + r/n, n*t);\n// P=principal, r=annual rate, n=compounds/yr, t=years\n\n// Round to N decimals\nconst rounded = Math.round(num * 10**n) / 10**n;")}
      ${nextActions(["Calculate 15% of 4500","Compound interest ₹10,000 at 8% for 5 years","Solve an equation","Convert units"])}`;
    }

    // ── DEFAULT ───────────────────────────────────────────────
    return `<div class="mk-header">
      <span class="mk-status working">On it</span>
      <span class="mk-label">Maken V3 workspace</span>
    </div>
    <p class="mk-lead">Tell me more and I'll build it. Or start with one of these:</p>
    <div class="mk-capability-grid">
      <div class="mk-cap"><span>💻</span><b>Code</b><small>Any language</small></div>
      <div class="mk-cap"><span>🌐</span><b>Website</b><small>Full HTML/CSS/JS</small></div>
      <div class="mk-cap"><span>✍️</span><b>Write</b><small>Emails, blogs, essays</small></div>
      <div class="mk-cap"><span>🔧</span><b>Debug</b><small>Paste your error</small></div>
      <div class="mk-cap"><span>🎨</span><b>Image</b><small>AI generation</small></div>
      <div class="mk-cap"><span>📋</span><b>Plan</b><small>Steps & roadmaps</small></div>
    </div>
    ${nextActions([
      pick(["Build me a landing page","Write a Python function","Generate an image of a sunset"]),
      pick(["Fix my JavaScript error","Draft a professional email"]),
      pick(["Plan my project roadmap","Brainstorm app ideas"])
    ])}`;
  }

  // ============================================================
  //  COPY BUTTON HANDLER
  // ============================================================
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("copyBtn") || e.target.classList.contains("mk-btn")) {
      const block = e.target.closest(".mk-output-block");
      if (block) {
        const codeEl = block.querySelector(".mk-code");
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
            const orig = e.target.textContent;
            e.target.textContent = "Copied ✓";
            e.target.classList.add("copied");
            setTimeout(() => { e.target.textContent = orig; e.target.classList.remove("copied"); }, 2000);
          });
        }
        return;
      }
    }
  });

  // ============================================================
  //  UPLOAD DROPDOWN
  // ============================================================
  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    uploadDropdown.style.display = uploadDropdown.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!uploadDropdown.contains(e.target) && e.target !== plusBtn)
      uploadDropdown.style.display = "none";
  });

  // ============================================================
  //  SCREENSHOT
  // ============================================================
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
        if (!currentChatId) startNewConversation("Screenshot");
        transitionToChat();
        const div = document.createElement("div");
        div.classList.add("message","user-image");
        const img = document.createElement("img");
        img.src = base64;
        img.style.cssText = "max-width:200px;border-radius:12px;cursor:pointer;";
        img.onclick = () => openImageViewer(base64);
        div.appendChild(img);
        chatWindow.appendChild(div);
        scrollToBottom();
        saveMessage(currentChatId, "user", "", base64, "image", "screenshot.png");
      };
      reader.readAsDataURL(blob);
      uploadDropdown.style.display = "none";
    } catch { alert("Screenshot failed — allow screen sharing."); }
  });

  // ============================================================
  //  RESPONSIVE WIDTH
  // ============================================================
  function adjustLayout() {
    const w = window.innerWidth;
    inputBox.style.width = w<=480?"96%":w<=768?"94%":w<=1024?"80%":"52%";
  }
  window.addEventListener("resize", adjustLayout);
  adjustLayout();

  // ============================================================
  //  SCROLL PILL
  // ============================================================
  const scrollBtn = document.getElementById("scrollBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () => {
      scrollBtn.classList.toggle("visible", document.body.scrollHeight-window.scrollY-window.innerHeight>240);
    });
    scrollBtn.addEventListener("click", () => window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"}));
  }

  // ============================================================
  //  AI AVATAR WRAPPER
  // ============================================================
  (function(){
    if (!chatWindow) return;
    function wrap(node) {
      if (!node.classList||!node.classList.contains("ai-message")) return;
      if (node.closest(".ai-row")) return;
      const row = document.createElement("div"); row.className="ai-row";
      const av  = document.createElement("div"); av.className="ai-avatar";
      av.innerHTML=`<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 6L8 13H12L11 18L16 11H12L13 6Z" fill="currentColor"/></svg>`;
      const ct  = document.createElement("div"); ct.className="ai-content";
      chatWindow.insertBefore(row, node);
      node.parentNode&&node.parentNode.removeChild(node);
      ct.appendChild(node); row.appendChild(av); row.appendChild(ct);
      node.style.cssText="";
    }
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)wrap(n);}))).observe(chatWindow,{childList:true});
  })();

  // ============================================================
  //  INIT
  // ============================================================
  updateHistorySidebar();
  if ("serviceWorker" in navigator)
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(()=>{}));

});
