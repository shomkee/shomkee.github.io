/* Progressive enhancement: projects and navigation work without JavaScript. */
(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Private mode: state still works for this visit. */ } };
  let lang = (read('shomkee-lang') || read('lang')) === 'en' ? 'en' : 'ru';
  let filter = 'all', activeCommand = 0, toastTimer, lastFocus;
  const t = (ru, en) => lang === 'ru' ? ru : en;
  const darkMedia = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = $('#commands'), commandInput = $('#command-search');
  const cards = $$('.project-card');
  const viewer = window.Studio3D;
  const modelLabels = {
    terminal: ['Терминал', 'Terminal', 'THE TERMINAL', '01'],
    bot: ['Бот', 'Bot', 'LITTLE HELPER', '02'],
    orbit: ['Орбита', 'Orbit', 'IN GOOD ORBIT', '03']
  };
  $$('.enhanced').forEach(node => { node.hidden = false; });
  function notice(text) { clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000); }
  function filterProjects() {
    const query = $('#project-search').value.trim().toLocaleLowerCase(); let count = 0;
    for (const card of cards) {
      const match = (filter === 'all' || card.dataset.category === filter) && (card.dataset.keywords + ' ' + card.textContent).toLocaleLowerCase().includes(query);
      card.hidden = !match; if (match) count++;
    }
    $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    $('#empty-results').hidden = count !== 0;
    $('#filter-status').textContent = t('Найдено проектов: ', 'Projects found: ') + count;
  }
  function modelDescription() {
    const key = viewer && viewer.ready ? viewer.info.model : 'terminal';
    const labels = modelLabels[key];
    $('#model-name').textContent = labels[2]; $('#model-number').textContent = labels[3]; $('#scene-count').textContent = labels[3] + ' / 03';
    $('#scene').setAttribute('aria-label', t('3D-модель «' + labels[0] + '». Перетащи для вращения. Стрелки вращают, Home сбрасывает вид.', '3D ' + labels[1] + '. Drag to rotate. Arrow keys rotate; Home resets the view.'));
  }
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('Шомка — сайты, боты и цифровые эксперименты', 'Shomka — websites, bots and digital experiments');
    $$('[data-ru]').forEach(node => { node.textContent = node.dataset[lang]; });
    $$('[data-aria-ru]').forEach(node => node.setAttribute('aria-label', node.getAttribute('data-aria-' + lang)));
    $$('[data-placeholder-ru]').forEach(node => { node.placeholder = node.getAttribute('data-placeholder-' + lang); });
    $('#lang').textContent = lang === 'ru' ? 'EN' : 'RU';
    $('#lang').setAttribute('aria-label', t('Switch to English', 'Переключить на русский'));
    filterProjects(); modelDescription(); themeMeta(); motionLabel();
    if (dialog.open) renderCommands();
  }
  function isDark() { return document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : darkMedia.matches; }
  function themeMeta() {
    const dark = isDark();
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151918' : '#f5f4f0';
    $('#theme').setAttribute('aria-label', dark ? t('Включить светлую тему', 'Switch to light theme') : t('Включить тёмную тему', 'Switch to dark theme'));
  }
  function toggleTheme() { const theme = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; write('shomkee-theme', theme); themeMeta(); }
  function toggleLanguage() { lang = lang === 'ru' ? 'en' : 'ru'; write('shomkee-lang', lang); applyLang(); }
  function motionLabel() { const enabled = Boolean(viewer && viewer.ready && viewer.info.auto); $('#motion').setAttribute('aria-pressed', String(enabled)); }
  function viewerAvailability() {
    const available = Boolean(viewer && viewer.ready);
    $('.scene-controls').hidden = !available; $('.scene-hint').hidden = !available;
    motionLabel(); modelDescription();
  }
  function selectModel(name) {
    if (!viewer || !viewer.setModel(name)) return;
    $$('[data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === name)));
    modelDescription();
  }
  function toggleMotion() {
    if (!viewer || !viewer.ready) return;
    const value = viewer.setAuto(!viewer.info.auto); write('shomkee-auto', String(value)); motionLabel();
  }
  function scrollToSection(id) {
    const section = document.querySelector(id);
    section.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
    const heading = section.querySelector('h2') || section;
    heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
  }
  async function copyProfile() {
    const url = 'https://github.com/shomkee';
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement('textarea'); input.value = url; input.style.position = 'fixed'; input.style.top = '-9999px';
        document.body.append(input); input.select(); const copied = document.execCommand('copy'); input.remove();
        if (!copied) throw new Error('Copy unavailable');
      }
      notice(t('Ссылка на GitHub скопирована', 'GitHub profile link copied'));
    } catch { notice(t('Не удалось скопировать. Ссылка: ', 'Could not copy. Link: ') + url); }
  }
  function actions() {
    const base = [
      { label: t('Открыть проекты', 'Explore projects'), words: 'проекты projects work', hint: '01', run: () => scrollToSection('#work') },
      { label: t('Обо мне', 'About me'), words: 'обо мне about', hint: '02', run: () => scrollToSection('#about') },
      { label: t('Контакт', 'Contact'), words: 'контакт contact', hint: '03', run: () => scrollToSection('#contact') },
      { label: t('Переключить тему', 'Toggle color theme'), words: 'тема светлая тёмная theme light dark', hint: '◐', run: toggleTheme },
      { label: t('Switch to English', 'Переключить на русский'), words: 'язык language english русский', hint: 'RU / EN', run: toggleLanguage },
      { label: t('Скопировать GitHub', 'Copy GitHub profile'), words: 'копировать copy github', hint: '↗', run: copyProfile }
    ];
    if (viewer && viewer.ready) base.push({ label: t('Познакомиться с 3D-ботом', 'Meet the 3D bot'), words: 'бот робот 3d bot robot play', hint: '3D', run: () => { selectModel('bot'); $('#playground').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' }); $('#scene').focus({ preventScroll: true }); } });
    return base;
  }
  function closeCommands() { if (dialog.open) dialog.close(); }
  function renderCommands() {
    const query = commandInput.value.toLocaleLowerCase().trim();
    const items = actions().filter(action => (action.words + ' ' + action.label).toLocaleLowerCase().includes(query));
    const host = $('#command-list'); host.replaceChildren(); activeCommand = 0;
    items.forEach(action => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'command-item';
      const label = document.createElement('span'); label.textContent = action.label;
      const hint = document.createElement('span'); hint.textContent = action.hint; hint.setAttribute('aria-hidden', 'true');
      button.append(label, hint); button.addEventListener('click', () => { closeCommands(); action.run(); }); host.append(button);
    });
    $('#command-empty').hidden = items.length > 0; highlightCommand();
  }
  function highlightCommand() { $$('.command-item').forEach((node, i) => { node.dataset.active = String(i === activeCommand); }); }
  function openCommands() {
    if (!dialog.showModal) return notice(t('Быстрые команды недоступны в этом браузере.', 'Quick commands are not supported by this browser.'));
    if (dialog.open) { closeCommands(); return; }
    lastFocus = document.activeElement; commandInput.value = ''; renderCommands(); dialog.showModal(); commandInput.focus();
  }
  $('#open-commands').addEventListener('click', openCommands); $('#close-commands').addEventListener('click', closeCommands);
  dialog.addEventListener('close', () => { if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); });
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeCommands(); });
  commandInput.addEventListener('input', renderCommands);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeCommands(); return; }
    const items = $$('.command-item');
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    if (event.key === 'Enter' && document.activeElement !== commandInput) return;
    event.preventDefault();
    if (event.key === 'Enter') { items[activeCommand].click(); return; }
    const focused = items.indexOf(document.activeElement); if (focused >= 0) activeCommand = focused;
    activeCommand = (activeCommand + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    highlightCommand(); items[activeCommand].focus();
  });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey) { event.preventDefault(); openCommands(); } });
  $('#lang').addEventListener('click', toggleLanguage); $('#theme').addEventListener('click', toggleTheme); darkMedia.addEventListener('change', themeMeta);
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; filterProjects(); }));
  $('#project-search').addEventListener('input', filterProjects);
  $('#clear-filters').addEventListener('click', () => { filter = 'all'; $('#project-search').value = ''; filterProjects(); $('#project-search').focus(); });
  $$('[data-model]').forEach(button => button.addEventListener('click', () => selectModel(button.dataset.model)));
  $('#reset-scene').addEventListener('click', () => { if (viewer) viewer.reset(); });
  $('#download-model').addEventListener('click', () => { try { viewer.exportModel(); notice(t('Модель готова — формат glTF', 'Model ready — glTF format')); } catch { notice(t('Не удалось экспортировать модель.', 'Could not export the model.')); } });
  $('#motion').addEventListener('click', toggleMotion); $('#copy-profile').addEventListener('click', copyProfile);
  window.addEventListener('studio:unavailable', viewerAvailability); window.addEventListener('studio:restored', viewerAvailability);
  window.addEventListener('studio:motionoff', motionLabel);
  if (viewer && viewer.ready) viewer.setAuto(!reduced.matches && !(navigator.connection && navigator.connection.saveData) && read('shomkee-auto') === 'true');
  if (!navigator.platform.toLowerCase().includes('mac')) $('.command-trigger kbd').textContent = 'Ctrl K';
  applyLang(); viewerAvailability();
})();
