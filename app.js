(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (menu && nav) {
    menu.hidden = false;
    const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
    });
    matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
  }

  const preview = document.getElementById('desktop-preview');
  if (preview) {
    document.getElementById('preview-controls').hidden = false;
    const describe = () => {
      const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
      preview.querySelector('.bar-left img').src = preview.dataset.accent === 'lavender' ? 'assets/mark.svg' : `assets/mark-${preview.dataset.accent}.svg`;
      document.getElementById('preview-status').textContent = `${capital(preview.dataset.layout)} layout with ${capital(preview.dataset.accent)} bar accent.`;
    };
    for (const property of ['layout', 'accent']) {
      const buttons = document.querySelectorAll(`button[data-${property}]`);
      buttons.forEach((button) => button.addEventListener('click', () => {
        preview.dataset[property] = button.dataset[property];
        buttons.forEach((peer) => peer.setAttribute('aria-pressed', String(peer === button)));
        describe();
      }));
    }
  }

  const tabs = Array.from(document.querySelectorAll('.tour-tabs [role="tab"]'));
  function selectTab(tab, focus = false) {
    tabs.forEach((peer) => {
      const selected = peer === tab;
      peer.setAttribute('aria-selected', String(selected));
      peer.tabIndex = selected ? 0 : -1;
      document.getElementById(peer.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const offsets = { ArrowRight: 1, ArrowLeft: -1 };
      let next;
      if (event.key in offsets) next = (index + offsets[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); selectTab(tabs[next], true);
    });
  });

  const dialog = document.getElementById('preview-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const dialogImage = document.getElementById('dialog-image');
    const close = () => dialog.close();
    document.querySelectorAll('[data-enlarge]').forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const image = button.parentElement.querySelector('img');
        dialogImage.src = image.src; dialogImage.alt = image.alt;
        const label = button.closest('[role="tabpanel"]').getAttribute('aria-labelledby');
        document.getElementById('dialog-title').textContent = `${document.getElementById(label).textContent} preview`;
        dialog.showModal(); document.documentElement.classList.add('no-scroll');
      });
    });
    document.getElementById('close-preview').addEventListener('click', close);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => document.documentElement.classList.remove('no-scroll'));
  }

  const options = document.getElementById('install-options');
  const installCode = document.getElementById('install-code');
  if (options) {
    options.hidden = false;
    const inputs = [...options.querySelectorAll('[name="component"]')];
    const known = new Set(['bar','clock','control-center','notifications','menu','weather','update','lockscreen','theme']);
    const cloud = options.elements.namedItem('cloud');
    try {
      const saved = JSON.parse(sessionStorage.getItem('velunori-selection-v2') || 'null');
      const query = new URL(location.href).searchParams;
      const chosen = query.has('components') ? query.get('components').split(',') : saved?.components;
      if (Array.isArray(chosen) && chosen.every(name => known.has(name))) inputs.forEach(input => { input.checked = chosen.includes(input.value); });
      cloud.checked = query.has('cloud') ? query.get('cloud') === '1' : saved?.cloud === true;
    } catch { /* Session storage is optional, including direct file previews. */ }
    function updateCommands() {
      const selected = inputs.filter(input => input.checked && known.has(input.value));
      const names = selected.map(input => input.value);
      cloud.disabled = !names.includes('clock');
      if (cloud.disabled) cloud.checked = false;
      const full = names.length === known.size;
      const selection = full ? '--all' : `--components ${names.join(',')}`;
      const args = selection + (cloud.checked ? ' --cloud' : '');
      if (installCode) installCode.textContent = names.length
        ? `curl -fsSL ${options.dataset.installerUrl} | bash -s -- ${args}`
        : 'Select a component above, or run curl -fsSL https://velunori.github.io/install.sh | bash to choose in the terminal.';
      const library = names.some(name => name !== 'theme');
      document.getElementById('library-summary').hidden = !library;
      const summary = document.getElementById('install-summary');
      if (summary) summary.textContent = `${names.length} component${names.length === 1 ? '' : 's'} · ${library ? 'shared library included' : 'no library needed'} · ${cloud.checked ? 'cloud libraries selected' : 'cloud libraries not selected'}`;
      document.getElementById('selection-summary').textContent = selected.length ? selected.map(input => input.dataset.title).join(', ') + '.' : 'No components selected.';
      const effects = [names.includes('bar') ? 'Floating Bars replaces your bar.' : 'Your current bar stays in place.'];
      if (names.includes('theme')) effects.push('Dusk applies its theme and wallpaper.');
      if (names.includes('lockscreen')) effects.push('Serene requires a matching lock service.');
      effects.push('The script checks the plan and asks for confirmation.');
      document.getElementById('selection-effects').textContent = effects.join(' ');
      options.querySelectorAll('[data-install-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.installMode === (full ? 'all' : 'custom'))));
      document.querySelector('[data-copy="install-code"]').disabled = !names.length;
      try { sessionStorage.setItem('velunori-selection-v2', JSON.stringify({components:names, cloud:cloud.checked})); } catch { /* Optional preference storage. */ }
      document.querySelectorAll('[data-copy-status]').forEach(element => { element.textContent = ''; });
    }
    options.querySelectorAll('[data-install-mode]').forEach(button => button.addEventListener('click', () => {
      inputs.forEach(input => { input.checked = button.dataset.installMode === 'all' || input.value === 'control-center'; });
      updateCommands();
    }));
    options.addEventListener('change', updateCommands);
    updateCommands();
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const code = document.getElementById(button.dataset.copy);
      const status = document.querySelector(`[data-copy-status="${button.dataset.copy}"]`);
      let copied = false;
      try { await navigator.clipboard.writeText(code.textContent); copied = true; } catch {
        const field = document.createElement('textarea');
        field.value = code.textContent; field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.append(field);
        field.select();
        try { copied = document.execCommand('copy'); } catch { copied = false; }
        field.remove(); button.focus({ preventScroll: true });
      }
      if (status) status.textContent = copied ? 'Commands copied. Review them before running.' : 'Copy is unavailable in this browser. Select and copy the commands above.';
      button.textContent = copied ? 'Copied ✓' : 'Copy commands';
      window.setTimeout(() => { button.textContent = 'Copy commands'; }, 2000);
    });
  });
})();
