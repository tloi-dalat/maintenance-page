const translations = {
  vi: {
    pageTitle: "TLOI - Website đang được bảo trì",
    title: "Website đang được bảo trì",
    messageHtml: 'Website sẽ sớm hoạt động trở lại. Kiểm tra <a href="https://link.tloi.vn/status" class="status-link" target="_blank" rel="noopener noreferrer">link.tloi.vn/status</a> để cập nhật thông tin.'
  },
  en: {
    pageTitle: "TLOI - Website Under Maintenance",
    title: "Sorry, we're down for maintenance",
    messageHtml: 'We\'ll be back up shortly. Check <a href="https://link.tloi.vn/status" class="status-link" target="_blank" rel="noopener noreferrer">link.tloi.vn/status</a> for updates.'
  }
};

let isSwitching = false;

function updateGlider(btn, animate = true) {
  const glider = document.getElementById('lang-glider');
  if (!glider || !btn) return;

  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || isReduced) {
    const prevTransition = glider.style.transition;
    glider.style.transition = 'none';
    glider.style.width = `${btn.offsetWidth}px`;
    glider.style.height = `${btn.offsetHeight}px`;
    glider.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    glider.style.opacity = '1';
    void glider.offsetHeight;
    glider.style.transition = prevTransition;
    return;
  }

  glider.style.width = `${btn.offsetWidth}px`;
  glider.style.height = `${btn.offsetHeight}px`;
  glider.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
  glider.style.opacity = '1';
}

function setLanguage(lang, animate = true) {
  const selected = translations[lang] ? lang : 'vi';
  const activeBtn = document.getElementById('btn-' + selected);

  document.getElementById('btn-vi').classList.toggle('active', selected === 'vi');
  document.getElementById('btn-en').classList.toggle('active', selected === 'en');
  updateGlider(activeBtn, animate);

  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    activeBtn.classList.remove('pop');
    void activeBtn.offsetWidth;
    activeBtn.classList.add('pop');
    setTimeout(() => activeBtn.classList.remove('pop'), 280);
  }

  if (document.documentElement.lang === selected && animate) return;

  const content = translations[selected];
  const textContainer = document.getElementById('text-content');

  try {
    localStorage.setItem('tloi_lang', selected);
  } catch (e) {}

  if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.lang = selected;
    document.title = content.pageTitle;
    document.getElementById('title').textContent = content.title;
    document.getElementById('message').innerHTML = content.messageHtml;
    return;
  }

  if (isSwitching) return;
  isSwitching = true;

  textContainer.classList.add('is-fading');
  setTimeout(() => {
    document.documentElement.lang = selected;
    document.title = content.pageTitle;
    document.getElementById('title').textContent = content.title;
    document.getElementById('message').innerHTML = content.messageHtml;
    textContainer.classList.remove('is-fading');
    setTimeout(() => {
      isSwitching = false;
    }, 220);
  }, 120);
}

function initLanguage() {
  const urlParam = new URLSearchParams(window.location.search).get('lang');
  let targetLang = 'vi';
  if (urlParam && (urlParam === 'vi' || urlParam === 'en')) {
    targetLang = urlParam;
  } else {
    try {
      const savedLang = localStorage.getItem('tloi_lang');
      if (savedLang && (savedLang === 'vi' || savedLang === 'en')) {
        targetLang = savedLang;
      }
    } catch (e) {}
  }

  setLanguage(targetLang, false);

  const activeBtn = document.getElementById('btn-' + targetLang);
  updateGlider(activeBtn, false);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      const currentActive = document.querySelector('.lang-btn.active');
      if (currentActive) updateGlider(currentActive, false);
    });
  }
}

window.addEventListener('resize', () => {
  const currentActive = document.querySelector('.lang-btn.active');
  if (currentActive) updateGlider(currentActive, false);
});

initLanguage();

