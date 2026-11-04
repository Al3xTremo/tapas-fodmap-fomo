(() => {
  "use strict";
  const raw = Array.isArray(window.TAPAS) ? window.TAPAS : [];
  // Static immutable catalogue; only local images following the expected pattern.
  const tapas = raw.filter((t, i) =>
    t && Number.isInteger(t.id) && t.id >= 1 && t.id <= 11 &&
    raw.findIndex(x => x && x.id === t.id) === i &&
    typeof t.name === 'string' && typeof t.cat === 'string' &&
    typeof t.desc === 'string' && typeof t.public === 'string' &&
    Number.isInteger(t.time) &&
    /^imagenes\/tapa-(?:0[1-9]|1[01])\.webp$/.test(t.img)
  );
  const byId = new Map(tapas.map(t => [t.id, t]));
  const categoryCold = new Set([2,3,4,6,7,8,9,10,11]);
  const menu = document.querySelector('#cards');
  const basketList = document.querySelector('#basket-list');
  const count = document.querySelector('#count');
  const confirmBtn = document.querySelector('#confirm');
  const modal = document.querySelector('#modal');
  const toast = document.querySelector('#toast');
  const whatsappLink = document.querySelector('#whatsapp');
  // No contact number, analytics, backend, cookies, or web storage.
  // On refresh the selection is intentionally cleared for privacy.
  let selected = [];
  let ticketDateText = '';
  let toastTimer;
  let previouslyFocused = null;

  function elem(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2700);
  }
  function renderCards(filter = 'all') {
    menu.replaceChildren();
    const visible = tapas.filter(t => filter === 'all' ||
      (filter === 'frio' ? categoryCold.has(t.id) : !categoryCold.has(t.id)));
    for (const t of visible) {
      const chosen = selected.includes(t.id);
      const card = elem('article', 'food-card');
      const photo = elem('div', 'food-photo');
      const img = elem('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = t.img;
      img.alt = `Imagen ilustrativa de ${t.name.toLowerCase()}`;
      img.referrerPolicy = 'no-referrer';
      photo.append(img, elem('span', 'food-num', String(t.id).padStart(2, '0')));
      const content = elem('div', 'food-content');
      content.append(elem('div', 'food-category', t.cat), elem('h3', '', t.name),
        elem('p', 'food-desc', t.desc), elem('div', 'ingredient-label', 'Ingredientes'),
        elem('p', 'ingredients', t.public));
      const foot = elem('div', 'card-foot');
      foot.append(elem('span', 'time', `◷ ${t.time} min aprox.`));
      const button = elem('button', `choose${chosen ? ' selected' : ''}`, chosen ? '✓ Elegida' : '+ Elegir tapa');
      button.type = 'button';
      button.dataset.id = String(t.id);
      button.setAttribute('aria-pressed', String(chosen));
      foot.append(button);
      content.append(foot);
      card.append(photo, content);
      menu.append(card);
    }
  }
  function renderBasket() {
    basketList.replaceChildren();
    if (selected.length === 0) {
      basketList.append(elem('li', 'empty', 'Aquí aparecerán las tapas que elijas ♡'));
    }
    for (const id of selected) {
      const item = byId.get(id);
      if (!item) continue;
      const li = elem('li');
      const remove = elem('button', 'basket-remove', 'Quitar');
      remove.type = 'button';
      remove.dataset.remove = String(id);
      li.append(elem('span', '', item.name), remove);
      basketList.append(li);
    }
    count.textContent = `${selected.length} / 3`;
    confirmBtn.disabled = selected.length !== 3;
    const active = document.querySelector('.filter.active');
    renderCards(active ? active.dataset.filter : 'all');
  }
  function toggle(id) {
    if (!byId.has(id)) return;
    if (selected.includes(id)) selected = selected.filter(n => n !== id);
    else if (selected.length >= 3) {
      notify('Ya tienes 3 tapas. Quita una para cambiar tu selección ♡');
      return;
    } else selected.push(id);
    renderBasket();
  }
  menu.addEventListener('click', event => {
    const button = event.target.closest('button[data-id]');
    if (button) toggle(Number(button.dataset.id));
  });
  basketList.addEventListener('click', event => {
    const button = event.target.closest('button[data-remove]');
    if (button) toggle(Number(button.dataset.remove));
  });
  document.querySelector('#reset').addEventListener('click', () => {
    selected = [];
    renderBasket();
    notify('Selección vaciada. Puedes volver a elegir.');
  });
  document.querySelector('#filters').addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    for (const b of document.querySelectorAll('.filter')) {
      const isActive = b === button;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    }
    renderCards(['all', 'frio', 'caliente'].includes(button.dataset.filter) ? button.dataset.filter : 'all');
  });

  function orderText() {
    return '🍽️ *TAPAS FODMAP PARA VENCER AL FOMO*\n' +
      '💌 *Comanda para el chef*\n\n' +
      '*Mis 3 tapas elegidas:*\n' +
      selected.map((id, i) => `${i + 1}. ${byId.get(id).name}`).join('\n') +
      '\n\n' + ticketDateText +
      '\n\n¿Me preparas estas tapas? ❤️\n' +
      'Total: un beso ♡';
  }
  function prepareWhatsAppLink() {
    // Click-to-chat without a number: user chooses contact and presses Send.
    whatsappLink.href = 'https://wa.me/?text=' + encodeURIComponent(orderText());
  }
  confirmBtn.addEventListener('click', () => {
    if (selected.length !== 3 || selected.some(id => !byId.has(id))) return;
    const date = new Date().toLocaleString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    ticketDateText = `Fecha · ${date}`;
    document.querySelector('#ticket-date').textContent = ticketDateText;
    prepareWhatsAppLink();
    const list = document.querySelector('#ticket-list');
    list.replaceChildren();
    for (const [index, id] of selected.entries()) {
      const li = elem('li');
      li.append(elem('span', '', `0${index + 1} · ${byId.get(id).name}`), elem('span', '', '✓'));
      list.append(li);
    }
    previouslyFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('ticket-open');
    document.querySelector('#close').focus();
  });
  function close() {
    modal.hidden = true;
    document.body.classList.remove('ticket-open');
    (previouslyFocused || confirmBtn).focus();
  }
  document.querySelector('#close').addEventListener('click', close);
  document.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'Tab') {
      const focusables = [...modal.querySelectorAll('button:not([disabled]), a[href]')];
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  document.querySelector('#print').addEventListener('click', () => window.print());
  renderBasket();
})();
