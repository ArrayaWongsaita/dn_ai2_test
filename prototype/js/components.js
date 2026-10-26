/* ===========================================================================
   Shared rendering helpers. Everything that draws DOM goes through here so
   the screens stay short and consistent.

   Icons are hand-written inline SVG in the Lucide style (docs/06 §10) —
   a CDN is not available at file:// and a full icon library would be dead
   weight for the dozen glyphs this prototype uses.
   =========================================================================== */

(function (global) {
  'use strict';

  /* --- el(): the only DOM builder in the prototype ----------------------- */
  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) { append(node, c); });
      return;
    }
    node.appendChild(child.nodeType ? child
      : document.createTextNode(typeof child === 'string' ? global.I18n.soft(child) : String(child)));
  }

  var TRANSLATED_PROPS = { text: 1, title: 1, placeholder: 1, 'aria-label': 1 };

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};

    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;

      /* TH / EN (D77): every visible string passes the soft lookup here. */
      if (TRANSLATED_PROPS[key]) value = global.I18n.soft(value);

      if (key === 'class' || key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'dataset') {
        Object.keys(value).forEach(function (d) { node.dataset[d] = value[d]; });
      } else if (key === 'style') Object.assign(node.style, value);
      else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else node.setAttribute(key, value === true ? '' : value);
    });

    append(node, children);
    return node;
  }

  function frag(children) {
    var f = document.createDocumentFragment();
    append(f, children);
    return f;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /* --- Icons ------------------------------------------------------------- */
  var ICONS = {
    'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    'check-square': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'layers': '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    'folder-kanban': '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    'paperclip': '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'panel-left': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    'inbox': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    'dot': '<circle cx="12" cy="12" r="3"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/>',
    'trending-up': '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    'switch': '<path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M8 21H3v-5"/><path d="M3 21l8-8"/>',
    'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 4.24-.94"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/>',
    'ban': '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    'grip-vertical': '<circle cx="9" cy="5" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
    /* Wave 4: the Task Detail drawer — editor toolbar, files, edit affordance */
    'bold': '<path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/>',
    'italic': '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    'list': '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    'list-ordered': '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 5h1v4"/><path d="M3.5 9h2.5"/><path d="M6 15.5c0-.8-2-.8-2 0 0 1 2 1.5 2 2.5H4"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'image': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3.5 20.5"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6"/><path d="M9 13h6M9 17h5"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 9 5-5 5 5"/><path d="M12 4v12"/>',
    'pencil': '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    /* Wave 5: notification types, the filter row and mark-all-read */
    'at-sign': '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    'filter': '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/>',
    'check-check': '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    'user-minus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
    'folder-plus': '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6M9 13h6"/>',
    'archive': '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
    'trash-2': '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    'crown': '<path d="M2 18h20"/><path d="m3 7 4 4 5-7 5 7 4-4-2 8H5L3 7Z"/>',
    'globe': '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'more-vertical': '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    'user-x': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5"/><path d="m22 8-5 5"/>'
  };

  function icon(name, size) {
    var px = size || 18;
    var span = el('span', { class: 'icon', 'aria-hidden': 'true' });
    span.innerHTML =
      '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || ICONS.dot) + '</svg>';
    return span;
  }

  /* --- Labels: colour is never the only signal (docs/06 §12) ------------- */
  var STATUS_LABEL = global.I18n.labels({
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    REVIEW: 'Review',
    COMPLETED: 'Completed',
    BLOCKED: 'Blocked',
    CANCELLED: 'Cancelled'
  });

  var STATUS_VARIANT = {
    TODO: 'neutral',
    IN_PROGRESS: 'info',
    REVIEW: 'purple',
    COMPLETED: 'success',
    BLOCKED: 'danger',
    CANCELLED: 'neutral'
  };

  var PRIORITY_LABEL = global.I18n.labels({ LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' });
  var PRIORITY_VARIANT = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' };

  var DEADLINE_LABEL = global.I18n.labels({
    overdue: 'Overdue',
    'due-today': 'Due today',
    'due-soon': 'Due soon',
    upcoming: 'Upcoming',
    completed: 'Completed',
    none: 'No deadline'
  });

  var DEADLINE_VARIANT = {
    overdue: 'danger',
    'due-today': 'warning',
    'due-soon': 'warning',
    upcoming: 'neutral',
    completed: 'neutral',
    none: 'neutral'
  };

  /* --- Badges ------------------------------------------------------------ */
  function badge(label, variant, options) {
    options = options || {};
    return el('span', {
      class: 'badge badge--' + (variant || 'neutral') + (options.class ? ' ' + options.class : ''),
      title: options.title
    }, [
      options.dot === false ? null : el('span', { class: 'badge__dot' }),
      options.icon ? icon(options.icon, 12) : null,
      el('span', { text: label })
    ]);
  }

  function statusBadge(status) {
    return badge(STATUS_LABEL[status] || status, STATUS_VARIANT[status]);
  }

  function priorityBadge(priority) {
    return badge(PRIORITY_LABEL[priority] || priority, PRIORITY_VARIANT[priority]);
  }

  /* --- Avatars ----------------------------------------------------------- */
  function avatarColorClass(user) {
    var n = parseInt(String(user.id).replace(/\D/g, ''), 10) || 1;
    return 'avatar--c' + (((n - 1) % 6) + 1);
  }

  function initials(user) {
    if (user.avatar) return user.avatar;
    return String(user.name || '?').trim().charAt(0).toUpperCase();
  }

  function avatar(user, options) {
    options = options || {};
    if (!user) {
      return el('span', { class: 'avatar avatar--' + (options.size || 'md'), title: T('Unassigned'), text: '?' });
    }
    var sizeClass = options.size && options.size !== 'md' ? ' avatar--' + options.size : '';
    return el('span', {
      class: 'avatar ' + avatarColorClass(user) + sizeClass,
      title: options.title || (user.name + ' · ' + (global.Permissions ? global.Permissions.ROLE_LABEL[user.role] : user.role)),
      'aria-label': user.name
    }, initials(user));
  }

  function avatarStack(users, options) {
    options = options || {};
    var max = options.max || 4;
    var shown = users.slice(0, max);
    var extra = users.length - shown.length;
    return el('span', { class: 'avatar-stack' }, [
      shown.map(function (u) { return avatar(u, { size: options.size || 'sm' }); }),
      extra > 0
        ? el('span', {
            class: 'avatar avatar--' + (options.size || 'sm') + ' avatar-stack__more',
            title: users.slice(max).map(function (u) { return u.name; }).join(', ')
          }, '+' + extra)
        : null
    ]);
  }

  /* --- Progress ---------------------------------------------------------- */
  function progressBar(value, options) {
    options = options || {};
    var pct = Math.max(0, Math.min(100, Math.round(value || 0)));
    return el('div', {
      class: 'progress' + (options.class ? ' ' + options.class : ''),
      role: 'progressbar',
      'aria-valuenow': pct,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-label': options.label || T('Progress')
    }, [
      el('span', { class: 'progress__track' }, [
        el('span', {
          class: 'progress__fill' + (pct === 100 ? ' is-complete' : ''),
          style: { width: pct + '%' }
        })
      ]),
      options.showValue === false ? null : el('span', { class: 'progress__value', text: pct + '%' })
    ]);
  }

  /* --- Empty state (docs/05 §10) ----------------------------------------- */
  function emptyState(config) {
    config = config || {};
    return el('div', { class: 'empty-state' + (config.compact ? ' empty-state--compact' : '') }, [
      el('span', { class: 'empty-state__icon' }, icon(config.icon || 'inbox', 22)),
      el('p', { class: 'empty-state__title', text: config.title || T('Nothing here yet') }),
      config.body ? el('p', { class: 'empty-state__body', text: config.body }) : null,
      config.action || null
    ]);
  }

  /* --- Route placeholder — each wave replaces one of these --------------- */
  function placeholder(config) {
    var chips = (config.meta || []).map(function (m) {
      return el('span', { class: 'placeholder__chip' }, [m.label + ': ', el('b', { text: String(m.value) })]);
    });
    return el('section', { class: 'placeholder' }, [
      el('span', { class: 'placeholder__screen', text: config.screen }),
      el('h2', { class: 'placeholder__title', text: config.title }),
      config.body ? el('p', { class: 'placeholder__body', text: config.body }) : null,
      chips.length ? el('div', { class: 'placeholder__meta' }, chips) : null,
      el('p', { class: 'text-sm text-muted', text: T('This screen is built in {wave}.', { wave: config.wave }) })
    ]);
  }

  /* --- Dates ------------------------------------------------------------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    var months = global.I18n.locale() === 'th' ? MONTHS_TH : MONTHS;
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  function formatDateTime(value) {
    if (!value) return '';
    var d = new Date(value);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return formatDate(d) + ', ' + hh + ':' + mm;
  }

  function relativeTime(value) {
    if (!value) return '';
    var diff = Date.now() - new Date(value).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return T('just now');
    if (mins < 60) return T('{n}m ago', { n: mins });
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return T('{n}h ago', { n: hrs });
    var days = Math.round(hrs / 24);
    if (days < 7) return T('{n}d ago', { n: days });
    return formatDate(value);
  }

  /* <input type="date"> speaks yyyy-mm-dd in *local* time. toISOString() would
     shift the day for every timezone east or west of UTC, which would quietly
     break the docs/01 §9 deadline states — so read and write local parts. */
  function toDateInputValue(value) {
    if (!value) return '';
    var d = new Date(value);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function fromDateInputValue(text) {
    if (!text) return null;
    var parts = String(text).split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
  }

  /* Attachment sizes: the seeds carry a formatted string, a file picked in the
     browser carries a byte count. */
  function formatBytes(bytes) {
    var n = Number(bytes);
    if (!isFinite(n) || n <= 0) return '0 KB';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /* --- Activity copy (docs/07 §6) ---------------------------------------
     One sentence per event type. The dashboard's Recently Updated list and
     the Wave 4 activity timeline both read from here, so the wording of an
     event never drifts between the two places it appears. */
  function actorName(userId) {
    var user = global.AppState.getUser(userId);
    return user ? user.name : T('Someone');
  }

  function activitySentence(event) {
    if (!event) return '';
    var who = actorName(event.actorId);

    switch (event.type) {
      case 'CREATED':
        return T('{who} created this task', { who: who });
      case 'ASSIGNED':
        return T('{who} assigned this task to {to}', { who: who, to: actorName(event.to) });
      case 'STATUS_CHANGED':
        return T('{who} moved this task from {from} to {to}', {
          who: who, from: STATUS_LABEL[event.from] || event.from, to: STATUS_LABEL[event.to] || event.to
        });
      case 'PROGRESS_CHANGED':
        return T('{who} changed progress from {from}% to {to}%', { who: who, from: event.from, to: event.to });
      case 'REASSIGNED':
        return T('{who} reassigned this task from {from} to {to}', {
          who: who, from: actorName(event.from), to: actorName(event.to)
        });
      case 'DEADLINE_CHANGED':
        return event.to
          ? T('{who} changed the deadline to {date}', { who: who, date: formatDate(event.to) })
          : T('{who} removed the deadline', { who: who });
      case 'COMMENT_ADDED':
        return T('{who} commented', { who: who });
      default:
        return T('{who} updated this task', { who: who });
    }
  }

  /* --- Notification copy (docs/07 §8) -----------------------------------
     Six types, six message templates, rendered verbatim from that table. The
     bell dropdown and S13 both read from here so the wording never drifts —
     the same reason activitySentence above exists (D18). */
  var NOTIFICATION_LABEL = global.I18n.labels({
    TASK_ASSIGNED: 'Assigned',
    TASK_REASSIGNED: 'Reassigned',
    MENTION: 'Mention',
    DEADLINE_CHANGED: 'Deadline changed',
    DUE_SOON: 'Due soon',
    OVERDUE: 'Overdue'
  });

  var NOTIFICATION_ICON = {
    TASK_ASSIGNED: 'user-plus',
    TASK_REASSIGNED: 'switch',
    MENTION: 'at-sign',
    DEADLINE_CHANGED: 'calendar',
    DUE_SOON: 'clock',
    OVERDUE: 'alert-triangle'
  };

  var NOTIFICATION_VARIANT = {
    TASK_ASSIGNED: 'purple',
    TASK_REASSIGNED: 'info',
    MENTION: 'purple',
    DEADLINE_CHANGED: 'info',
    DUE_SOON: 'warning',
    OVERDUE: 'danger'
  };

  function notificationSentence(n) {
    if (!n) return '';
    var S = global.AppState;
    var task = n.taskId ? S.getTask(n.taskId) : null;
    var title = task ? task.title : T('a task');
    var quoted = '\u201c' + title + '\u201d';
    var who = actorName(n.actorId);

    switch (n.type) {
      case 'TASK_ASSIGNED':
        return T('{who} assigned you {task}', { who: who, task: quoted });
      case 'TASK_REASSIGNED':
        return T('{who} reassigned {task} to you', { who: who, task: quoted });
      case 'MENTION':
        return T('{who} mentioned you in {task}', { who: who, task: quoted });
      case 'DEADLINE_CHANGED':
        return T('{who} changed the deadline of {task}', { who: who, task: quoted });
      case 'DUE_SOON': {
        if (!task || !task.deadline) return T('{task} is due soon', { task: quoted });
        var days = S.daysUntil(task.deadline);
        if (days <= 0) return T('{task} is due today', { task: quoted });
        return T('{task} is due in {days}', { task: quoted, days: plural(days, 'day') });
      }
      case 'OVERDUE': {
        if (!task || !task.deadline) return T('{task} is overdue', { task: quoted });
        var late = Math.abs(S.daysUntil(task.deadline));
        return T('{task} is overdue by {days}', { task: quoted, days: plural(late, 'day') });
      }
      default:
        return T('{task} was updated', { task: quoted });
    }
  }

  /* The newest event on a task — the prototype has no updatedAt field, so
     recency is read off the activity log (see TODO.md D18). */
  function lastActivity(task) {
    if (!task || !task.activity || !task.activity.length) return null;
    return task.activity.reduce(function (latest, event) {
      return new Date(event.at) > new Date(latest.at) ? event : latest;
    });
  }

  /* --- Persona scope copy ------------------------------------------------
     S01, the sidebar persona switcher and the dashboard header all describe
     "what this persona can see". One source of wording for all three. */
  /* "2 matches", not "2 matchs" — the finder's result heading needs the -es
     rule, and every other caller ("task", "project", "day") is unaffected. */
  function plural(count, word) {
    return global.I18n.plural(count, word);
  }

  /* Archived projects are out of every card grid, so they are out of the scope
     line too — otherwise the sentence claims more projects than the grid below
     it shows (D52). Their tasks go with them, for the same reason. */
  function scopeCounts(user) {
    var S = global.AppState;
    var projects = S.activeProjects(user.id);
    var ids = projects.map(function (p) { return p.id; });
    return {
      divisions: S.activeDivisions(user.id).length,
      projects: projects.length,
      tasks: S.visibleTasks(user.id).filter(function (t) {
        return ids.indexOf(t.projectId) !== -1;
      }).length
    };
  }

  function scopeLine(user) {
    var c = scopeCounts(user);
    return plural(c.divisions, 'division') + ' · ' + plural(c.projects, 'project') +
      ' · ' + plural(c.tasks, 'task');
  }

  function roleLine(user) {
    var S = global.AppState;
    var label = global.Permissions.ROLE_LABEL[user.role];

    if (user.role === 'SUPER_ADMIN') {
      return T('{role} · sees every division, project and task', { role: label });
    }
    if (user.role === 'SUPERVISOR') {
      var names = S.visibleDivisions(user.id).map(function (d) { return d.name; });
      return T('{role} · supervises {divisions}', { role: label, divisions: names.join(', ') || T('no division') });
    }
    var projects = S.activeProjects(user.id).length;
    return T('{role} · member of {projects}', { role: label, projects: plural(projects, 'project') });
  }

  /* --- TH / EN switch (D77) ---------------------------------------------
     Each option is written in its own language, so someone who cannot read
     the current one can still find the way back. */
  function langSwitch() {
    var current = global.I18n.locale();
    return el('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' },
      [['en', 'EN', 'English'], ['th', 'ไทย', 'ภาษาไทย']].map(function (opt) {
        var on = opt[0] === current;
        var btn = el('button', {
          class: 'lang-switch__opt' + (on ? ' is-active' : ''),
          type: 'button',
          'aria-pressed': on ? 'true' : 'false',
          onclick: function () { if (!on) global.I18n.setLocale(opt[0]); }
        });
        /* set after el() so the soft lookup never touches the language names */
        btn.textContent = opt[1];
        btn.title = opt[2];
        return btn;
      }));
  }

  /* --- Stat tile: a number that links somewhere (S02, reused in S03) ----- */
  function statTile(config) {
    var value = Number(config.value) || 0;
    return el('a', {
      class: 'stat-tile stat-tile--' + (config.variant || 'purple') + (value === 0 ? ' is-zero' : ''),
      href: config.href,
      title: config.title || config.label
    }, [
      el('span', { class: 'stat-tile__icon' }, icon(config.icon || 'dot', 18)),
      el('span', { class: 'stat-tile__value', text: String(value) }),
      el('span', { class: 'stat-tile__label', text: config.label }),
      config.hint ? el('span', { class: 'stat-tile__hint', text: config.hint }) : null
    ]);
  }

  /* --- Form field (docs/06 §8: labels above fields) ----------------------
     Returns the wrapper; the caller keeps its own reference to the control.
     setFieldError() flips the state later, which is what "prototype validation
     = required field visual state" needs (docs/02 S09) — nothing is marked
     until the reader has pressed Create once. */
  function field(config) {
    var control = config.control;
    var labelTag = config.id ? 'label' : 'span';
    var labelProps = { class: 'field__label' };
    if (config.id) labelProps['for'] = config.id;

    return el('div', { class: 'field', dataset: { field: config.name || '' } }, [
      el(labelTag, labelProps, [
        config.label,
        config.required
          ? frag([
              el('span', { class: 'field__req', 'aria-hidden': 'true', text: '*' }),
              el('span', { class: 'sr-only', text: ' ' + T('(required)') })
            ])
          : null
      ]),
      control,
      el('p', { class: 'field__error', hidden: 'hidden' }),
      config.hint ? el('p', { class: 'field__hint', text: config.hint }) : null
    ]);
  }

  function setFieldError(wrapper, message) {
    if (!wrapper) return wrapper;
    var line = wrapper.querySelector('.field__error');
    var control = wrapper.querySelector('.input, .textarea, .select, .td-select, .range');

    if (message) {
      wrapper.classList.add('field--error');
      if (line) { line.textContent = global.I18n.soft(message); line.removeAttribute('hidden'); }
      if (control) control.setAttribute('aria-invalid', 'true');
    } else {
      wrapper.classList.remove('field--error');
      if (line) { line.textContent = ''; line.setAttribute('hidden', 'hidden'); }
      if (control) control.removeAttribute('aria-invalid');
    }
    return wrapper;
  }

  /* --- List row: a member, or anything else that is a row with an action ---
     A <div>, not a <button>, because it carries its own trailing controls —
     .project-card and .task-row are anchors and cannot. */
  function listRow(config) {
    return el('div', {
      class: 'list-row' + (config.variant ? ' list-row--' + config.variant : '') +
        (config.muted ? ' is-muted' : ''),
      dataset: config.dataset || null
    }, [
      config.lead ? el('span', { class: 'list-row__lead' }, config.lead) : null,
      el('div', { class: 'list-row__body' }, [
        el('span', { class: 'list-row__head' }, [
          config.href
            ? el('a', { class: 'list-row__name', href: config.href, text: config.title })
            : el('span', { class: 'list-row__name', text: config.title }),
          config.pills || null
        ]),
        config.meta && config.meta.length
          ? el('span', { class: 'list-row__meta' }, joinDots(config.meta))
          : null
      ]),
      el('span', { class: 'spacer' }),
      config.actions ? el('span', { class: 'list-row__actions' }, config.actions) : null
    ]);
  }

  /* "a · b · c" with the same dot the cards use. */
  function joinDots(parts) {
    var out = [];
    parts.filter(Boolean).forEach(function (part, index) {
      if (index) out.push(el('span', { class: 'list-row__dot' }));
      out.push(typeof part === 'string' ? el('span', { text: part }) : part);
    });
    return out;
  }

  function memberRow(user, options) {
    options = options || {};
    var pills = [];

    if (options.isSupervisor) {
      pills.push(badge('Supervisor', 'purple', { dot: false, icon: 'crown' }));
    }
    if (options.isYou) pills.push(el('span', { class: 'list-row__you', text: T('You') }));
    if (options.pills) pills = pills.concat(options.pills);

    var meta = [global.Permissions.ROLE_LABEL[user.role], user.email];
    if (options.meta) meta = meta.concat(options.meta);

    return listRow({
      variant: 'member',
      lead: avatar(user, { size: 'md' }),
      title: user.name,
      pills: pills.length ? frag(pills) : null,
      meta: meta,
      actions: options.actions || null,
      dataset: { userId: user.id }
    });
  }

  /* --- Division card (S04) ----------------------------------------------
     Deliberately the same class names as .project-card: the two grids sit one
     level apart in the same hierarchy and must read as the same object family.
     Content order follows docs/02 S04 — name, supervisor, members, projects. */
  function divisionCard(division) {
    var S = global.AppState;
    var user = S.currentUser();
    var supervisor = S.getUser(division.supervisorId);
    var members = division.memberIds.map(S.getUser).filter(Boolean);
    var projects = S.getState().projects.filter(function (p) {
      return p.divisionId === division.id;
    });
    var active = projects.filter(function (p) { return p.status !== 'ARCHIVED'; });
    var archived = projects.length - active.length;

    var hint = T('Open to see members and projects');
    if (supervisor && user && supervisor.id === user.id) hint = T('You supervise this division');
    else if (user && division.memberIds.indexOf(user.id) !== -1) hint = T('You are a member');

    return el('a', {
      class: 'project-card division-card',
      href: '#/divisions/' + division.id,
      title: T('Open {name}', { name: division.name })
    }, [
      el('span', { class: 'project-card__top' }, [
        el('span', { class: 'division-card__sup' }, [
          avatar(supervisor, { size: 'sm' }),
          el('span', {
            class: 'division-card__sup-name',
            text: supervisor ? supervisor.name : T('No supervisor')
          })
        ]),
        el('span', { class: 'spacer' }),
        avatarStack(members, { max: 3 })
      ]),
      el('span', { class: 'project-card__name', text: division.name }),
      el('span', { class: 'project-card__meta' }, joinDots([
        plural(members.length, 'member'),
        active.length ? plural(active.length, 'active project') : T('No active project'),
        archived ? el('span', { class: 'text-muted', text: T('{n} archived', { n: archived }) }) : null
      ])),
      el('span', { class: 'project-card__hint', text: hint })
    ]);
  }

  /* --- Project card: S02 dashboard and S06 projects list share this ------ */
  function projectCard(project, options) {
    options = options || {};
    var S = global.AppState;
    var division = S.getDivision(project.divisionId);
    var members = project.memberIds.map(S.getUser).filter(Boolean);
    var tasks = S.projectTasks(project.id);

    var counted = tasks.filter(function (t) { return t.status !== 'CANCELLED'; });
    var done = counted.filter(function (t) { return t.status === 'COMPLETED'; });
    var overdue = counted.filter(function (t) { return S.deadlineState(t) === 'overdue'; });
    var pct = counted.length ? Math.round((done.length / counted.length) * 100) : 0;

    return el('a', {
      class: 'project-card',
      href: '#/projects/' + project.id,
      title: T('Open the {name} board', { name: project.name })
    }, [
      el('span', { class: 'project-card__top' }, [
        badge(division ? division.name : T('No division'), 'purple', { dot: false }),
        el('span', { class: 'spacer' }),
        avatarStack(members, { max: 3 })
      ]),
      el('span', { class: 'project-card__name', text: project.name }),
      el('span', { class: 'project-card__meta' }, [
        el('span', { text: counted.length ? plural(counted.length, 'task') : T('No tasks yet') }),
        done.length ? el('span', { class: 'project-card__dot' }) : null,
        done.length ? el('span', { text: T('{n} completed', { n: done.length }) }) : null,
        overdue.length ? el('span', { class: 'project-card__dot' }) : null,
        overdue.length
          ? el('span', { class: 'text-danger', text: T('{n} overdue', { n: overdue.length }) })
          : null
      ]),
      counted.length
        ? progressBar(pct, { label: T('{name} completion', { name: project.name }) })
        : el('span', { class: 'project-card__hint', text: options.emptyHint || T('Open the board to add the first task') })
    ]);
  }

  /* --- Deadline chip (docs/01 §9) ---------------------------------------
     The chip carries the colour; the card never turns red (docs/06 §5). Each
     state gets its own icon and wording so colour is not the only signal. */
  function deadlineChip(task) {
    if (!task || !task.deadline) return null;

    var S = global.AppState;
    var state = S.deadlineState(task);
    var days = S.daysUntil(task.deadline);
    var date = formatDate(task.deadline);
    var conf;

    switch (state) {
      case 'overdue':
        conf = {
          label: T('Overdue · {date}', { date: date }),
          icon: 'alert-triangle',
          title: T('Deadline was {date} — {days} ago', { date: date, days: plural(Math.abs(days), 'day') })
        };
        break;
      case 'due-today':
        conf = { label: T('Due today'), icon: 'clock', title: T('Due today, {date}', { date: date }) };
        break;
      case 'due-soon':
        conf = {
          label: T('Due in {n}d', { n: days }),
          icon: 'clock',
          title: T('Due {date} — in {days}', { date: date, days: plural(days, 'day') }),
          soft: true
        };
        break;
      case 'completed':
        conf = { label: date, icon: 'check', title: T('Completed · the deadline was {date}', { date: date }) };
        break;
      default:
        conf = { label: date, icon: 'calendar', title: T('Due {date} — in {days}', { date: date, days: plural(days, 'day') }) };
    }

    return badge(conf.label, DEADLINE_VARIANT[state], {
      dot: false,
      icon: conf.icon,
      title: conf.title,
      class: 'deadline-chip' + (conf.soft ? ' deadline-chip--soft' : '')
    });
  }

  /* --- Task card (docs/06 §5) -------------------------------------------
     Reading order is fixed by the spec: priority, title, assignee + deadline,
     progress, then the comment / attachment indicators. Business rule 15 —
     everything that matters is legible without opening the task.

     The card is an anchor so it is keyboard reachable and focusable for free;
     the board makes the same element draggable. */
  function taskCard(task, options) {
    options = options || {};
    var S = global.AppState;
    var assignee = S.getUser(task.assigneeId);
    var isDone = task.status === 'COMPLETED';
    var comments = (task.comments || []).length;
    var files = (task.attachments || []).length;

    var describe = T('{priority} priority, {status}, {progress}% done, assigned to {who}', {
      priority: PRIORITY_LABEL[task.priority], status: STATUS_LABEL[task.status],
      progress: task.progress, who: assignee ? assignee.name : T('nobody')
    });

    return el('a', {
      class: 'task-card' +
        (isDone ? ' task-card--done' : '') +
        (options.selected ? ' is-selected' : '') +
        (options.landed ? ' is-landed' : ''),
      href: '#/tasks/' + task.id,
      draggable: options.draggable === false ? null : 'true',
      dataset: { taskId: task.id, status: task.status },
      title: task.title + ' — ' + describe,
      'aria-label': task.title + ' — ' + describe
    }, [
      el('span', { class: 'task-card__top' }, [
        priorityBadge(task.priority),
        options.showStatus ? statusBadge(task.status) : null,
        isDone && !options.showStatus
          ? el('span', { class: 'task-card__done-mark', title: 'Completed' }, icon('check', 14))
          : null,
        el('span', { class: 'spacer' }),
        el('span', { class: 'task-card__grip', 'aria-hidden': 'true', title: 'Drag to change status' },
          icon('grip-vertical', 14))
      ]),

      el('span', { class: 'task-card__title', text: task.title }),

      el('span', { class: 'task-card__row' }, [
        el('span', { class: 'task-card__assignee' }, [
          avatar(assignee, { size: 'sm' }),
          el('span', {
            class: 'task-card__assignee-name',
            text: assignee ? assignee.name : T('Unassigned')
          })
        ]),
        el('span', { class: 'spacer' }),
        deadlineChip(task)
      ]),

      progressBar(task.progress, { label: T('{title} progress', { title: task.title }) }),

      comments || files
        ? el('span', { class: 'task-card__foot' }, [
            comments
              ? el('span', { class: 'task-card__stat', title: plural(comments, 'comment') }, [
                  icon('message-square', 13), el('span', { text: String(comments) })
                ])
              : null,
            files
              ? el('span', { class: 'task-card__stat', title: plural(files, 'attachment') }, [
                  icon('paperclip', 13), el('span', { text: String(files) })
                ])
              : null
          ])
        : null
    ]);
  }

  /* --- Task row: S03 My Tasks (TODO.md D35) -----------------------------
     My Tasks spans projects, so the project name has to be on the row — and
     the assignee is always the reader, so the board card's avatar slot would
     say nothing here. A button rather than an anchor: the row opens the drawer
     in place with a setState, it does not navigate (D37).

     data-task-id matches the board card, so Drawer's focus hand-back finds
     whichever of the two opened it. */
  function taskRow(task, options) {
    options = options || {};
    var S = global.AppState;
    var project = S.getProject(task.projectId);
    var isDone = task.status === 'COMPLETED';
    var comments = (task.comments || []).length;
    var files = (task.attachments || []).length;

    var describe = T('{priority} priority, {status}, {progress}% done', {
      priority: PRIORITY_LABEL[task.priority], status: STATUS_LABEL[task.status], progress: task.progress
    }) + (project ? T(', in {project}', { project: project.name }) : '');

    return el('button', {
      class: 'task-row' +
        (isDone ? ' task-row--done' : '') +
        (options.selected ? ' is-selected' : '') +
        (options.landed ? ' is-landed' : '') +
        ' task-row--' + task.priority.toLowerCase(),
      type: 'button',
      dataset: { taskId: task.id, status: task.status },
      title: task.title + ' \u2014 ' + describe,
      'aria-label': task.title + ' \u2014 ' + describe,
      onclick: function () {
        if (options.onclick) options.onclick(task);
        else global.AppState.setState({ selectedTaskId: task.id });
      }
    }, [
      el('span', { class: 'task-row__accent', 'aria-hidden': 'true' }),
      el('span', { class: 'task-row__body' }, [
        el('span', { class: 'task-row__head' }, [
          priorityBadge(task.priority),
          el('span', { class: 'task-row__title', text: task.title }),
          el('span', { class: 'spacer' }),
          statusBadge(task.status)
        ]),
        el('span', { class: 'task-row__foot' }, [
          el('span', { class: 'task-row__project' }, [
            icon('folder-kanban', 13),
            el('span', { text: project ? project.name : 'No project' })
          ]),
          deadlineChip(task),
          comments
            ? el('span', { class: 'task-row__stat', title: plural(comments, 'comment') }, [
                icon('message-square', 13), el('span', { text: String(comments) })
              ])
            : null,
          files
            ? el('span', { class: 'task-row__stat', title: plural(files, 'attachment') }, [
                icon('paperclip', 13), el('span', { text: String(files) })
              ])
            : null,
          el('span', { class: 'spacer' }),
          progressBar(task.progress, {
            class: 'task-row__progress',
            label: T('{title} progress', { title: task.title })
          })
        ])
      ])
    ]);
  }

  /* --- Tab bar: S03 tabs are links, so the hash is the state (D36) ------- */
  function tabBar(tabs, activeKey, options) {
    options = options || {};
    return el('nav', { class: 'tab-bar', 'aria-label': options.label || 'Filters' },
      tabs.map(function (tab) {
        var isActive = tab.key === activeKey;
        return el('a', {
          class: 'tab' + (isActive ? ' is-active' : '') + (tab.count === 0 ? ' is-empty' : ''),
          href: tab.href,
          title: tab.title || tab.label,
          'aria-current': isActive ? 'page' : null
        }, [
          el('span', { class: 'tab__label', text: tab.label }),
          el('span', { class: 'tab__count', text: String(tab.count) })
        ]);
      }));
  }

  global.UI = {
    el: el,
    frag: frag,
    clear: clear,
    icon: icon,
    badge: badge,
    statusBadge: statusBadge,
    priorityBadge: priorityBadge,
    avatar: avatar,
    avatarStack: avatarStack,
    initials: initials,
    progressBar: progressBar,
    emptyState: emptyState,
    placeholder: placeholder,
    statTile: statTile,
    langSwitch: langSwitch,
    plural: plural,
    scopeCounts: scopeCounts,
    scopeLine: scopeLine,
    roleLine: roleLine,
    field: field,
    setFieldError: setFieldError,
    listRow: listRow,
    memberRow: memberRow,
    divisionCard: divisionCard,
    projectCard: projectCard,
    taskCard: taskCard,
    taskRow: taskRow,
    tabBar: tabBar,
    deadlineChip: deadlineChip,
    activitySentence: activitySentence,
    notificationSentence: notificationSentence,
    lastActivity: lastActivity,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    relativeTime: relativeTime,
    toDateInputValue: toDateInputValue,
    fromDateInputValue: fromDateInputValue,
    formatBytes: formatBytes,
    STATUS_LABEL: STATUS_LABEL,
    STATUS_VARIANT: STATUS_VARIANT,
    PRIORITY_LABEL: PRIORITY_LABEL,
    PRIORITY_VARIANT: PRIORITY_VARIANT,
    DEADLINE_LABEL: DEADLINE_LABEL,
    DEADLINE_VARIANT: DEADLINE_VARIANT,
    NOTIFICATION_LABEL: NOTIFICATION_LABEL,
    NOTIFICATION_ICON: NOTIFICATION_ICON,
    NOTIFICATION_VARIANT: NOTIFICATION_VARIANT
  };
}(window));
