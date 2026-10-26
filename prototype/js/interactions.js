/* ===========================================================================
   Cross-screen interactions, in load order:
     Toast       — short confirmations (docs/05 §9)
     Menu        — dropdown anchored to a trigger
     Drawer      — right-hand slide-in panel (docs/05 §2)
     Confirm     — centred yes/no dialog
     TaskActions — the state changes a screen can ask for
     DragDrop    — native HTML5 drag & drop for the Kanban board

   Drawer and Confirm are deliberately content-agnostic shells: the Task Detail
   body lives in js/task-detail.js, and Wave 6's Create Task drawer and the
   archive / deactivate confirmations reuse the same two primitives.
   =========================================================================== */

(function (global) {
  'use strict';

  var TOAST_ICON = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-circle',
    info: 'info'
  };

  var DEFAULT_DURATION = 3200;

  function root() { return document.getElementById('toast-root'); }

  /* Toast.show('Task moved to In Progress', 'success', { detail: '…' }) */
  function show(message, variant, options) {
    var host = root();
    if (!host) return null;

    options = options || {};
    variant = variant || 'info';

    var UI = global.UI;
    var toast = UI.el('div', { class: 'toast toast--' + variant }, [
      UI.el('span', { class: 'toast__icon' }, UI.icon(TOAST_ICON[variant] || 'info', 18)),
      UI.el('div', { class: 'toast__body' }, [
        UI.el('p', { class: 'toast__title', text: message }),
        options.detail ? UI.el('p', { class: 'toast__detail', text: options.detail }) : null
      ]),
      UI.el('button', {
        class: 'btn btn--icon btn--sm',
        type: 'button',
        'aria-label': 'Dismiss notification',
        onclick: function () { dismiss(toast); }
      }, UI.icon('x', 14))
    ]);

    host.appendChild(toast);
    /* next frame, so the entry transition actually runs */
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });

    var timer = setTimeout(function () { dismiss(toast); },
      options.duration || DEFAULT_DURATION);
    toast.dataset.timer = String(timer);

    return toast;
  }

  function dismiss(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    clearTimeout(Number(toast.dataset.timer));
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }

  function clearAll() {
    var host = root();
    if (!host) return;
    Array.prototype.slice.call(host.children).forEach(dismiss);
  }

  global.Toast = {
    show: show,
    success: function (m, o) { return show(m, 'success', o); },
    error: function (m, o) { return show(m, 'error', o); },
    warning: function (m, o) { return show(m, 'warning', o); },
    info: function (m, o) { return show(m, 'info', o); },
    dismiss: dismiss,
    clearAll: clearAll
  };
}(window));

/* ===========================================================================
   Menu — a dropdown anchored to a trigger button.

   Rendered into #modal-root with fixed positioning rather than inside the
   trigger's parent: the sidebar is overflow:hidden, so a popover in flow
   would be clipped at the rail. Wave 5's notification bell reuses this.
   =========================================================================== */

(function (global) {
  'use strict';

  var open = null;   /* { panel, trigger, onOutside, onKey } */

  function root() { return document.getElementById('modal-root'); }

  function close() {
    if (!open) return;
    var current = open;
    open = null;

    document.removeEventListener('mousedown', current.onOutside, true);
    document.removeEventListener('keydown', current.onKey, true);
    global.removeEventListener('resize', close);

    if (current.trigger) current.trigger.setAttribute('aria-expanded', 'false');
    current.panel.classList.remove('is-open');
    setTimeout(function () {
      if (current.panel.parentNode) current.panel.parentNode.removeChild(current.panel);
    }, 180);
  }

  /* With a trigger: is *this* menu open. With none: is *any* menu open — the
     drawer's ESC handler asks that so a dropdown inside the drawer swallows
     the first ESC instead of the whole drawer closing underneath it. */
  function isOpen(trigger) {
    return trigger ? (!!open && open.trigger === trigger) : !!open;
  }

  /* Place the panel next to the trigger, then pull it back inside the
     viewport if it overhangs — the sidebar menu opens upward, the topbar
     bell opens downward. */
  function place(panel, trigger, placement) {
    var r = trigger.getBoundingClientRect();
    var w = panel.offsetWidth;
    var h = panel.offsetHeight;
    var gap = 8;
    var top, left;

    if (placement === 'top-start') { top = r.top - h - gap; left = r.left; }
    else if (placement === 'bottom-end') { top = r.bottom + gap; left = r.right - w; }
    else { top = r.bottom + gap; left = r.left; }

    left = Math.min(Math.max(gap, left), Math.max(gap, global.innerWidth - w - gap));
    top = Math.min(Math.max(gap, top), Math.max(gap, global.innerHeight - h - gap));

    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  function items(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll('.menu__item:not([disabled])'));
  }

  function show(trigger, children, options) {
    var host = root();
    if (!host) return null;
    options = options || {};

    var UI = global.UI;
    var panel = UI.el('div', {
      class: 'menu' + (options.class ? ' ' + options.class : ''),
      role: 'menu',
      'aria-label': options.label || 'Menu',
      style: options.width ? { width: options.width + 'px' } : null
    }, children);

    host.appendChild(panel);
    place(panel, trigger, options.placement);
    requestAnimationFrame(function () { panel.classList.add('is-open'); });

    function onOutside(event) {
      if (panel.contains(event.target) || trigger.contains(event.target)) return;
      close();
    }

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        trigger.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      var list = items(panel);
      if (!list.length) return;
      event.preventDefault();
      var at = list.indexOf(document.activeElement);
      var step = event.key === 'ArrowDown' ? 1 : -1;
      list[(at + step + list.length) % list.length].focus();
    }

    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    global.addEventListener('resize', close);

    trigger.setAttribute('aria-expanded', 'true');
    open = {
      panel: panel, trigger: trigger, placement: options.placement,
      onOutside: onOutside, onKey: onKey
    };

    /* A type-as-you-search panel must leave focus in the input that opened it
       — the one case where focusing the first item is wrong (D42). */
    if (options.autoFocus !== false) {
      var focusTarget = panel.querySelector('.menu__item.is-checked') || items(panel)[0];
      if (focusTarget) focusTarget.focus();
    }

    return panel;
  }

  /* Repaint an open panel in place. The finder rebuilds its results on every
     keystroke; re-opening would re-run the entry animation and steal focus, so
     it swaps the children and re-places the panel (its height just changed). */
  function setContent(trigger, children) {
    if (!isOpen(trigger)) return null;
    var panel = open.panel;
    global.UI.clear(panel);
    panel.appendChild(global.UI.frag(children));
    place(panel, open.trigger, open.placement);
    return panel;
  }

  /* build() is a function so nothing is rendered until the menu is opened. */
  function toggle(trigger, build, options) {
    if (isOpen(trigger)) { close(); return null; }
    close();
    return show(trigger, build(), options);
  }

  /* --- Menu content helpers ---------------------------------------------- */
  function item(config) {
    var UI = global.UI;
    return UI.el('button', {
      class: 'menu__item' +
        (config.checked ? ' is-checked' : '') +
        (config.variant ? ' menu__item--' + config.variant : ''),
      type: 'button',
      role: 'menuitem',
      title: config.title || null,
      onclick: function (event) {
        close();
        if (config.onclick) config.onclick(event);
      }
    }, [
      UI.el('span', { class: 'menu__lead' },
        config.leading || (config.icon ? UI.icon(config.icon, 16) : null)),
      UI.el('span', { class: 'menu__text' }, [
        UI.el('span', { class: 'menu__label', text: config.label }),
        config.sublabel ? UI.el('span', { class: 'menu__sublabel', text: config.sublabel }) : null
      ]),
      config.checked
        ? UI.el('span', { class: 'menu__check' }, UI.icon('check', 14))
        : null
    ]);
  }

  function section(label) {
    return global.UI.el('p', { class: 'menu__section', text: label });
  }

  function separator() {
    return global.UI.el('span', { class: 'menu__separator', role: 'separator' });
  }

  global.Menu = {
    toggle: toggle,
    show: show,
    setContent: setContent,
    close: close,
    isOpen: isOpen,
    item: item,
    section: section,
    separator: separator
  };
}(window));

/* ===========================================================================
   Drawer — the right-hand slide-in panel (docs/05 §2, docs/06 §9).

   Full window height with the overlay covering the sidebar and topbar too, so
   it reads as one focused layer and a stray sidebar click cannot yank the demo
   away mid-edit. The board stays visible through the restrained overlay.

   docs/05 §2 makes ESC and X unconditional and attaches the unsaved-edit
   condition to the overlay alone — so only the overlay asks hasUnsavedEdits().
   =========================================================================== */

(function (global) {
  'use strict';

  /* { key, config, panel, overlay } — null whenever no drawer is mounted. */
  var current = null;

  function root() { return document.getElementById('drawer-root'); }

  function key() { return current ? current.key : null; }
  function panel() { return current ? current.panel : null; }

  function focusables() {
    if (!current) return [];
    return Array.prototype.slice.call(current.panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
      ' textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter(function (node) { return node.offsetParent !== null || node === document.activeElement; });
  }

  /* A dropdown or a confirm dialog is stacked on top of the drawer and owns the
     keyboard while it is up. Both this handler and theirs are capture-phase on
     document, so theirs cannot stop this one — they fire in registration order,
     and the drawer registered first. Hence the explicit stand-down. */
  function stackedAbove() {
    return global.Menu.isOpen() ||
      (global.Confirm && global.Confirm.isOpen()) ||
      (global.Modal && global.Modal.isOpen());
  }

  function onKey(event) {
    if (!current) return;

    if (event.key === 'Escape') {
      if (stackedAbove()) return;         /* the top layer eats the first ESC */
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab' || stackedAbove()) return;

    var list = focusables();
    if (!list.length) return;

    var first = list[0];
    var last = list[list.length - 1];
    var inside = current.panel.contains(document.activeElement);

    if (!inside) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onOverlay() {
    if (!current) return;
    var config = current.config;
    if (config.hasUnsavedEdits && config.hasUnsavedEdits()) {
      if (config.onBlockedClose) config.onBlockedClose(current.panel);
      return;
    }
    close();
  }

  /* Draw config.render() into the panel. Called both on open and on every
     refresh, so a state change never re-runs the slide-in animation.

     A repaint destroys whatever was focused — the chip that was just clicked,
     say. Catching focus on the panel keeps the reader inside the dialog and
     keeps the Tab trap working instead of dropping them onto <body>. */
  function paint(config) {
    var UI = global.UI;
    var wasInside = current.panel.contains(document.activeElement);

    UI.clear(current.panel);
    current.panel.setAttribute('aria-label', global.I18n.soft(config.label || 'Details'));
    current.panel.appendChild(config.render());

    if (wasInside && !current.panel.contains(document.activeElement)) current.panel.focus();
  }

  /* Same key while open ⇒ repaint in place. Different key ⇒ swap the content
     without re-animating: the panel is already where it belongs, and sliding
     out and back in between two cards would read as a glitch. */
  function open(config) {
    var host = root();
    if (!host) return null;

    if (current) {
      var same = current.key === config.key;
      current.key = config.key;
      current.config = config;
      paint(config);
      if (!same && config.onOpen) config.onOpen(current.panel, false);
      return current.panel;
    }

    var UI = global.UI;
    var overlay = UI.el('div', { class: 'drawer-overlay', onmousedown: onOverlay });
    var node = UI.el('aside', {
      class: 'drawer',
      role: 'dialog',
      'aria-modal': 'true',
      tabindex: '-1',
      'aria-label': config.label || 'Details'
    });

    host.appendChild(overlay);
    host.appendChild(node);

    current = {
      key: config.key,
      config: config,
      panel: node,
      overlay: overlay,
      returnFocusTo: config.returnFocusTo || null
    };

    paint(config);
    requestAnimationFrame(function () {
      if (!current) return;
      overlay.classList.add('is-open');
      node.classList.add('is-open');
    });

    document.addEventListener('keydown', onKey, true);

    /* Move into the dialog on open — the close button is the first stop. */
    var entry = focusables()[0];
    (entry || node).focus();

    if (config.onOpen) config.onOpen(node, true);
    return node;
  }

  function close(options) {
    if (!current) return;
    var leaving = current;
    current = null;

    document.removeEventListener('keydown', onKey, true);
    global.Menu.close();

    leaving.overlay.classList.remove('is-open');
    leaving.panel.classList.remove('is-open');
    setTimeout(function () {
      if (leaving.overlay.parentNode) leaving.overlay.parentNode.removeChild(leaving.overlay);
      if (leaving.panel.parentNode) leaving.panel.parentNode.removeChild(leaving.panel);
    }, 220);

    if (!(options && options.silent) && leaving.config.onClose) leaving.config.onClose();
    restoreFocus(leaving);
  }

  /* Hand focus back to whatever opened the drawer, if it is still on screen.
     Closing often navigates, and a hashchange lands asynchronously — so the
     node focused here can be replaced a moment later. Re-query on the next
     frame and finish the job if focus fell through to <body>. */
  function restoreFocus(leaving) {
    var find = typeof leaving.returnFocusTo === 'function'
      ? leaving.returnFocusTo
      : function () { return leaving.returnFocusTo; };

    var target = find();
    if (target && target.focus) target.focus();

    requestAnimationFrame(function () {
      if (document.activeElement && document.activeElement !== document.body) return;
      var again = find();
      if (again && again.focus) again.focus();
    });
  }

  /* A short shake — the answer to an overlay click with unsaved edits. */
  function nudge(node) {
    if (!node) return;
    node.classList.remove('drawer--nudge');
    void node.offsetWidth;                 /* restart the animation */
    node.classList.add('drawer--nudge');
    setTimeout(function () { node.classList.remove('drawer--nudge'); }, 400);
  }

  global.Drawer = {
    open: open,
    close: close,
    key: key,
    panel: panel,
    nudge: nudge,
    isOpen: function () { return !!current; }
  };
}(window));

/* ===========================================================================
   Confirm — a centred yes/no dialog in #modal-root, above the drawer.

   docs/03 Flow B step 5 asks for a confirmation before a reassign; Waves 6-7
   reuse this for archive project and deactivate user.
   =========================================================================== */

(function (global) {
  'use strict';

  var current = null;   /* { overlay, dialog, onKey } */

  function close() {
    if (!current) return;
    var leaving = current;
    current = null;

    document.removeEventListener('keydown', leaving.onKey, true);
    leaving.overlay.classList.remove('is-open');
    setTimeout(function () {
      if (leaving.overlay.parentNode) leaving.overlay.parentNode.removeChild(leaving.overlay);
    }, 180);
  }

  function open(config) {
    var host = document.getElementById('modal-root');
    if (!host) return null;
    close();

    var UI = global.UI;

    function decide(confirmed) {
      close();
      if (confirmed) { if (config.onConfirm) config.onConfirm(); }
      else if (config.onCancel) config.onCancel();
    }

    var confirmBtn = UI.el('button', {
      class: 'btn btn--' + (config.variant === 'destructive' ? 'destructive' : 'primary'),
      type: 'button',
      onclick: function () { decide(true); }
    }, config.confirmLabel || 'Confirm');

    var dialog = UI.el('div', {
      class: 'dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': config.title
    }, [
      config.lead ? UI.el('div', { class: 'dialog__lead' }, config.lead) : null,
      UI.el('h2', { class: 'dialog__title', text: config.title }),
      config.body ? UI.el('p', { class: 'dialog__body', text: config.body }) : null,
      UI.el('div', { class: 'dialog__actions' }, [
        UI.el('button', {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: function () { decide(false); }
        }, config.cancelLabel || 'Cancel'),
        confirmBtn
      ])
    ]);

    var overlay = UI.el('div', {
      class: 'dialog-overlay',
      onmousedown: function (event) { if (event.target === overlay) decide(false); }
    }, dialog);

    function onKey(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();          /* the drawer behind must stay open */
      decide(false);
    }

    host.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    document.addEventListener('keydown', onKey, true);

    current = { overlay: overlay, dialog: dialog, onKey: onKey };
    confirmBtn.focus();
    return dialog;
  }

  global.Confirm = {
    open: open,
    close: close,
    isOpen: function () { return !!current; }
  };
}(window));

/* ===========================================================================
   Modal — Confirm's sibling for the cases Confirm cannot take: a dialog whose
   body is a form rather than a sentence, and whose confirm button is allowed to
   refuse (D47).

   Confirm's body is text-only and its onConfirm cannot veto, so a required
   field would have nowhere to complain. Here onConfirm() returning false keeps
   the dialog open — which is the whole of "prototype validation = required
   field visual state" (docs/02 S09). Same .dialog* markup and CSS, same
   #modal-root, so nothing new to style.

   Wave 6: New Division, Create project. Wave 7: Add User, Edit Role,
   Assign Division.
   =========================================================================== */

(function (global) {
  'use strict';

  var current = null;   /* { overlay, dialog, body, config, onKey } */

  function close() {
    if (!current) return;
    var leaving = current;
    current = null;

    document.removeEventListener('keydown', leaving.onKey, true);
    leaving.overlay.classList.remove('is-open');
    setTimeout(function () {
      if (leaving.overlay.parentNode) leaving.overlay.parentNode.removeChild(leaving.overlay);
    }, 180);
  }

  /* Focus the form, not the confirm button — the reader has typing to do. */
  function focusFirst(dialog) {
    var node = dialog.querySelector(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button.td-select'
    ) || dialog.querySelector('.btn--primary, .btn--destructive');
    if (node) node.focus();
  }

  /* Repaint the body in place — used when a picker inside the form changes the
     chips it has to draw. Never re-animates, never steals focus. */
  function refresh() {
    if (!current || !current.config.render) return;
    var inside = current.body.contains(document.activeElement);
    global.UI.clear(current.body);
    current.body.appendChild(current.config.render());
    if (inside && !current.body.contains(document.activeElement)) focusFirst(current.dialog);
  }

  function open(config) {
    var host = document.getElementById('modal-root');
    if (!host) return null;
    close();

    var UI = global.UI;

    function cancel() {
      close();
      if (config.onCancel) config.onCancel();
    }

    /* false means "not valid yet" — stay open so the marked fields are read. */
    function submit() {
      if (config.onConfirm && config.onConfirm() === false) return;
      close();
    }

    var body = UI.el('div', { class: 'dialog__form' }, config.render ? config.render() : null);

    var confirmBtn = UI.el('button', {
      class: 'btn btn--' + (config.variant === 'destructive' ? 'destructive' : 'primary'),
      type: 'button',
      onclick: submit
    }, config.confirmLabel || 'Save');

    var dialog = UI.el('div', {
      class: 'dialog dialog--form',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': config.label || config.title
    }, [
      config.lead ? UI.el('div', { class: 'dialog__lead' }, config.lead) : null,
      UI.el('h2', { class: 'dialog__title', text: config.title }),
      config.body ? UI.el('p', { class: 'dialog__body', text: config.body }) : null,
      body,
      UI.el('div', { class: 'dialog__actions' }, [
        UI.el('button', {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: cancel
        }, config.cancelLabel || 'Cancel'),
        confirmBtn
      ])
    ]);

    var overlay = UI.el('div', {
      class: 'dialog-overlay',
      onmousedown: function (event) { if (event.target === overlay) cancel(); }
    }, dialog);

    function onKey(event) {
      /* A dropdown inside the form owns the first Esc. */
      if (global.Menu.isOpen()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();        /* the drawer behind must stay open */
        cancel();
        return;
      }

      /* Enter submits from a single-line field, the way a real form would —
         but never from a textarea, where Enter is a newline. */
      if (event.key === 'Enter' && document.activeElement &&
          document.activeElement.tagName === 'INPUT' &&
          dialog.contains(document.activeElement)) {
        event.preventDefault();
        submit();
        return;
      }

      if (event.key !== 'Tab') return;

      var list = Array.prototype.slice.call(dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
        ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (node) { return node.offsetParent !== null; });
      if (!list.length) return;

      var first = list[0];
      var last = list[list.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    host.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    document.addEventListener('keydown', onKey, true);

    current = { overlay: overlay, dialog: dialog, body: body, config: config, onKey: onKey };
    focusFirst(dialog);
    return dialog;
  }

  global.Modal = {
    open: open,
    close: close,
    refresh: refresh,
    dialog: function () { return current ? current.dialog : null; },
    isOpen: function () { return !!current; }
  };
}(window));

/* ===========================================================================
   TaskActions — the business actions the board and the Task Detail drawer both
   call. Each one checks the permission, mutates state, appends the mock
   activity the PRD asks for (docs/01 §5 rules 4, 8, 10) and confirms with a
   toast (docs/05 §9). A screen never writes a task field itself.

   Every mutation is written silently and the store is notified once at the
   end, so one action costs one re-render.

   Only seven activity types exist (docs/07 §6), so priority, description and
   attachment changes toast without appending an event — inventing an eighth
   type would break UI.activitySentence, which the dashboard also reads.
   =========================================================================== */

(function (global) {
  'use strict';

  var SILENT = { silent: true };

  /* The board reads this on its next render to pulse the card that just
     landed, then clears it. Keeping it here instead of in the store avoids a
     second render whose only job would be to turn the highlight back off. */
  var landedTaskId = null;

  /* Long enough to see the card land, short enough to read as one event. */
  var REVERT_DELAY = 700;

  function consumeLanded() {
    var id = landedTaskId;
    landedTaskId = null;
    return id;
  }

  /* One notification for the whole action, and a note for the board so the
     card that changed pulses — the proof that a drawer edit reached the card
     behind it without a refresh. */
  function finish(taskId) {
    landedTaskId = taskId;
    global.AppState.setState({});
  }

  /* Date.now() alone collides inside one millisecond — a comment and its
     activity event are written in the same tick. */
  var seq = 0;
  function uid(prefix) { return prefix + Date.now().toString(36) + (++seq); }

  /* Drag & drop and the Wave 4 status dropdown both land here.
     docs/01 §5 rule 11: Completed forces progress to 100%, one way only —
     setting progress to 100% elsewhere must not complete the task. */
  function moveTask(taskId, toStatus) {
    var S = global.AppState;
    var UI = global.UI;
    var task = S.getTask(taskId);
    var user = S.currentUser();

    if (!task || !user || task.status === toStatus) return false;

    if (!global.Permissions.can('changeStatus', { user: user, task: task })) {
      global.Toast.error('You cannot change the status of this task.');
      return false;
    }

    var fromStatus = task.status;
    var fromProgress = task.progress;
    var completing = toStatus === 'COMPLETED' && fromProgress !== 100;

    /* docs/05 §1 "Simulate failure" (D71, D72): the optimistic update lands,
       the pretend server refuses, and the card goes back. Nothing is appended
       to the activity log and progress is never forced — the change did not
       happen. Only status is written, so only status is reverted: a comment
       added inside the window survives. If anything else moved the task in
       the meantime (another drop, a Reset), the revert stands down. */
    if (S.getState().simulateFailure) {
      var epoch = S.epoch();
      S.updateTask(taskId, { status: toStatus }, SILENT);
      finish(taskId);
      setTimeout(function () {
        var now = S.getTask(taskId);
        if (S.epoch() !== epoch || !now || now.status !== toStatus) return;
        S.updateTask(taskId, { status: fromStatus }, SILENT);
        finish(taskId);
        global.Toast.error('Couldn’t move task', {
          detail: T('Simulated failure — {title} went back to {status}.', {
            title: task.title, status: UI.STATUS_LABEL[fromStatus] })
        });
      }, REVERT_DELAY);
      return false;
    }

    S.updateTask(taskId,
      completing ? { status: toStatus, progress: 100 } : { status: toStatus },
      SILENT);

    S.appendActivity(taskId, {
      type: 'STATUS_CHANGED', actorId: user.id, from: fromStatus, to: toStatus
    }, SILENT);

    if (completing) {
      S.appendActivity(taskId, {
        type: 'PROGRESS_CHANGED', actorId: user.id, from: fromProgress, to: 100
      }, SILENT);
    }

    finish(taskId);

    global.Toast.success(T('Task moved to {status}', { status: UI.STATUS_LABEL[toStatus] }), {
      detail: completing
        ? T('{title} · progress set to 100%', { title: task.title })
        : task.title
    });

    return true;
  }

  /* --- Progress (docs/05 §5, docs/01 §10) ------------------------------- */
  function setProgress(taskId, value) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user) return false;

    if (!global.Permissions.can('changeProgress', { user: user, task: task })) {
      global.Toast.error('You cannot change the progress of this task.');
      return false;
    }

    /* docs/01 §5 rule 9 — progress never leaves 0-100. */
    var to = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    var from = task.progress;
    if (to === from) return false;

    S.updateTask(taskId, { progress: to }, SILENT);
    S.appendActivity(taskId, {
      type: 'PROGRESS_CHANGED', actorId: user.id, from: from, to: to
    }, SILENT);

    /* Rule 11 runs one way only: Completed forces 100%, but 100% here must
       not complete the task — 100% done and still in Review is normal. */
    finish(taskId);
    global.Toast.success(T('Progress updated to {n}%', { n: to }), { detail: task.title });
    return true;
  }

  /* --- Reassign (docs/05 §4, docs/03 Flow B) ---------------------------- */
  function reassign(taskId, toUserId) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    var target = S.getUser(toUserId);
    if (!task || !user || !target) return false;

    /* docs/04 — a User may only hand on a task they hold themselves. */
    if (!global.Permissions.can('reassignTask', { user: user, task: task })) {
      global.Toast.error(global.Permissions.LOCK_REASON.assignee);
      return false;
    }

    /* docs/01 §5 rule 6 — the assignee must be a project member. */
    var project = S.getProject(task.projectId);
    if (!project || project.memberIds.indexOf(toUserId) === -1) {
      global.Toast.error(T('{name} is not a member of {project}', {
        name: target.name, project: project ? project.name : T('this project') }), {
        detail: 'Only project members can take a task.'
      });
      return false;
    }

    /* D61 — a deactivated person is out of every picker, so this can only be
       reached another way; the rule holds all the same. */
    if (!S.isActive(target)) {
      global.Toast.error(T('{name} is deactivated', { name: target.name }), {
        detail: 'Reactivate them in User Management before handing them work.'
      });
      return false;
    }

    if (task.assigneeId === toUserId) {
      global.Toast.info(T('Already assigned to {name}', { name: target.name }));
      return false;
    }

    var from = task.assigneeId;
    S.updateTask(taskId, { assigneeId: toUserId }, SILENT);
    S.appendActivity(taskId, {
      type: 'REASSIGNED', actorId: user.id, from: from, to: toUserId
    }, SILENT);

    /* The new assignee hears about it (D40). Taking a task back yourself needs
       no notification — you are the one who just did it. */
    if (toUserId !== user.id) {
      S.pushNotification({
        userId: toUserId,
        type: 'TASK_REASSIGNED',
        taskId: taskId,
        projectId: task.projectId,
        actorId: user.id
      }, SILENT);
    }

    finish(taskId);
    global.Toast.success(T('Task reassigned to {name}', { name: target.name }), { detail: task.title });
    return true;
  }

  /* --- Priority (manager only, docs/04) -------------------------------- */
  function setPriority(taskId, priority) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user) return false;

    if (!global.Permissions.canEditField('priority', { user: user, task: task })) {
      global.Toast.error(global.Permissions.LOCK_REASON.priority);
      return false;
    }
    if (task.priority === priority) return false;

    S.updateTask(taskId, { priority: priority }, SILENT);
    finish(taskId);
    global.Toast.success(T('Priority set to {priority}', { priority: global.UI.PRIORITY_LABEL[priority] }), { detail: task.title });
    return true;
  }

  /* --- Deadline (manager only, docs/04) -------------------------------- */
  function setDeadline(taskId, date) {
    var S = global.AppState;
    var UI = global.UI;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user) return false;

    if (!global.Permissions.canEditField('deadline', { user: user, task: task })) {
      global.Toast.error(global.Permissions.LOCK_REASON.deadline);
      return false;
    }

    var before = task.deadline ? S.startOfDay(task.deadline).getTime() : null;
    var after = date ? S.startOfDay(date).getTime() : null;
    if (before === after) return false;

    S.updateTask(taskId, { deadline: date || null }, SILENT);
    S.appendActivity(taskId, {
      type: 'DEADLINE_CHANGED', actorId: user.id, from: task.deadline || null, to: date || null
    }, SILENT);

    finish(taskId);
    global.Toast.success(
      date ? T('Deadline set to {date}', { date: UI.formatDate(date) }) : 'Deadline removed',
      { detail: task.title }
    );
    return true;
  }

  /* --- Description (every role, docs/04) ------------------------------- */
  function setDescription(taskId, html) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user) return false;

    if (!global.Permissions.canEditField('description', { user: user, task: task })) {
      global.Toast.error('You cannot edit the description of this task.');
      return false;
    }
    if (task.description === html) return false;

    S.updateTask(taskId, { description: html }, SILENT);
    finish(taskId);
    global.Toast.success('Description updated', { detail: task.title });
    return true;
  }

  /* --- Comments (docs/05 §7) ------------------------------------------- */
  function addComment(taskId, body) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    var text = String(body || '').trim();
    if (!task || !user || !text) return null;

    if (!global.Permissions.can('comment', { user: user, task: task })) {
      global.Toast.error('You cannot comment on this task.');
      return null;
    }

    var comment = {
      id: uid('c'), taskId: taskId, authorId: user.id, body: text, at: new Date()
    };

    S.updateTask(taskId, { comments: task.comments.concat([comment]) }, SILENT);
    S.appendActivity(taskId, {
      type: 'COMMENT_ADDED', actorId: user.id, commentId: comment.id
    }, SILENT);

    finish(taskId);
    global.Toast.success('Comment added', { detail: task.title });
    return comment;
  }

  /* --- Title / Collaborators (manager only, docs/04) --------------------
     Wave 4 left both read-only for every persona (D27) because the Create Task
     form owned the inputs. It does now, so the same controls come back here for
     a manager. Neither appends an activity event — docs/07 §6 defines exactly
     seven types and none covers them (D29). */
  function setTitle(taskId, title) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    var text = String(title || '').trim();
    if (!task || !user) return false;

    if (!global.Permissions.canEditField('title', { user: user, task: task })) {
      global.Toast.error(global.Permissions.LOCK_REASON.title);
      return false;
    }
    if (!text) {
      global.Toast.warning('A task needs a title', { detail: 'The previous title was kept.' });
      return false;
    }
    if (text === task.title) return false;

    S.updateTask(taskId, { title: text }, SILENT);
    finish(taskId);
    global.Toast.success('Title updated', { detail: text });
    return true;
  }

  function setCollaborators(taskId, userIds) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user) return false;

    if (!global.Permissions.canEditField('collaborators', { user: user, task: task })) {
      global.Toast.error(global.Permissions.LOCK_REASON.collaborators);
      return false;
    }

    /* The main assignee is not a collaborator as well — docs/01 §5 rule 5 keeps
       those two roles distinct. */
    var next = (userIds || []).filter(function (id, index, all) {
      return id !== task.assigneeId && all.indexOf(id) === index;
    });
    if (next.join(',') === (task.collaboratorIds || []).join(',')) return false;

    S.updateTask(taskId, { collaboratorIds: next }, SILENT);
    finish(taskId);
    global.Toast.success(
      next.length ? 'Collaborators updated' : 'Collaborators cleared',
      { detail: task.title }
    );
    return true;
  }

  /* --- Create (docs/02 S09, docs/03 Flow C) -----------------------------
     draft = { title, description, assigneeId, collaboratorIds, priority,
               status, deadline, progress } */
  function createTask(projectId, draft) {
    var S = global.AppState;
    var UI = global.UI;
    var project = S.getProject(projectId);
    var user = S.currentUser();
    if (!project || !user) return null;

    if (!global.Permissions.can('createTask', { user: user, project: project })) {
      global.Toast.error('Only a Supervisor or Super Admin can create a task.');
      return null;
    }

    var title = String(draft.title || '').trim();
    if (!title) {
      global.Toast.warning('A task needs a title');
      return null;
    }

    /* docs/01 §5 rules 5 and 6 — exactly one assignee, and a project member. */
    var assignee = S.getUser(draft.assigneeId);
    if (!assignee || project.memberIds.indexOf(assignee.id) === -1) {
      global.Toast.error('Pick an assignee from the project members', {
        detail: T('Only a member of {project} can take a task.', { project: project.name })
      });
      return null;
    }

    var status = draft.status || 'TODO';
    var progress = Math.max(0, Math.min(100, Math.round(Number(draft.progress) || 0)));
    /* Rule 11, one way only: Completed means 100%. */
    if (status === 'COMPLETED') progress = 100;

    var task = {
      id: S.nextId('t', S.getState().tasks),
      projectId: project.id,
      title: title,
      description: String(draft.description || ''),
      status: status,
      priority: draft.priority || 'MEDIUM',
      assigneeId: assignee.id,
      collaboratorIds: (draft.collaboratorIds || []).filter(function (id) {
        return id !== assignee.id;
      }),
      progress: progress,
      deadline: draft.deadline || null,
      createdById: user.id,
      createdAt: new Date(),
      activity: [],
      comments: [],
      attachments: []
    };

    /* Closing the form is part of the same write, so the board repaints once
       and the new card keeps the landed pulse finish() sets up (D48). */
    S.setState({ createTaskProjectId: null }, SILENT);
    S.addTask(task, SILENT);

    S.appendActivity(task.id, { type: 'CREATED', actorId: user.id }, SILENT);
    S.appendActivity(task.id, { type: 'ASSIGNED', actorId: user.id, to: assignee.id }, SILENT);

    /* The assignee hears about it, unless they assigned it to themselves —
       the D40 rule, applied to creation. */
    if (assignee.id !== user.id) {
      S.pushNotification({
        userId: assignee.id,
        type: 'TASK_ASSIGNED',
        taskId: task.id,
        projectId: project.id,
        actorId: user.id
      }, SILENT);
    }

    finish(task.id);
    global.Toast.success('Task created', {
      detail: title + ' · ' + UI.STATUS_LABEL[status] + ' · ' + assignee.name /* data + label */
    });
    return task;
  }

  /* --- Attachments (docs/08 §8 — local preview, never an upload) ------- */
  function addAttachment(taskId, file) {
    var S = global.AppState;
    var task = S.getTask(taskId);
    var user = S.currentUser();
    if (!task || !user || !file || !file.name) return null;

    if (!global.Permissions.can('addAttachment', { user: user, task: task })) {
      global.Toast.error('You cannot add attachments to this task.');
      return null;
    }

    var record = {
      id: uid('f'),
      taskId: taskId,
      name: file.name,
      size: typeof file.size === 'number' ? global.UI.formatBytes(file.size) : String(file.size || ''),
      uploadedById: user.id,
      at: new Date(),
      url: file.url || null
    };

    S.updateTask(taskId, { attachments: task.attachments.concat([record]) }, SILENT);
    finish(taskId);
    global.Toast.success('Attachment added', { detail: record.name });
    return record;
  }

  global.TaskActions = {
    createTask: createTask,
    moveTask: moveTask,
    setTitle: setTitle,
    setCollaborators: setCollaborators,
    setProgress: setProgress,
    reassign: reassign,
    setPriority: setPriority,
    setDeadline: setDeadline,
    setDescription: setDescription,
    addComment: addComment,
    addAttachment: addAttachment,
    consumeLanded: consumeLanded
  };
}(window));

/* ===========================================================================
   ProjectActions / DivisionActions — the structure above the board
   (docs/02 S04, S05, S12 · docs/03 Flow E · docs/04).

   Same shape as TaskActions: check the permission, refuse with a toast that
   names the rule, write once through the store, confirm with a toast. These
   mutations notify loudly on their own — there is no card to pulse, so no
   silent-then-finish() dance is needed.
   =========================================================================== */

(function (global) {
  'use strict';

  function create(config) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(config.divisionId);
    if (!user || !division) return null;

    if (!global.Permissions.can('createProject', { user: user, division: division })) {
      global.Toast.error('Only a Supervisor or Super Admin can create a project.');
      return null;
    }

    var name = String(config.name || '').trim();
    if (!name) {
      global.Toast.warning('A project needs a name');
      return null;
    }

    /* The supervisor and whoever created it are in by default — a project with
       no members can never be assigned a task (docs/01 §5 rule 6). */
    var members = (config.memberIds && config.memberIds.length
      ? config.memberIds
      : [division.supervisorId, user.id]
    ).filter(function (id, index, all) {
      return !!S.getUser(id) && all.indexOf(id) === index;
    });

    var project = {
      id: S.nextId('p', S.getState().projects),
      name: name,
      divisionId: division.id,
      memberIds: members,
      status: 'ACTIVE',
      createdAt: new Date()
    };

    S.addProject(project);
    global.Toast.success('Project created', {
      detail: name + ' · ' + division.name + ' · ' + global.UI.plural(members.length, 'member') /* data + noun */
    });
    return project;
  }

  function rename(projectId, name) {
    var S = global.AppState;
    var user = S.currentUser();
    var project = S.getProject(projectId);
    if (!user || !project) return false;

    if (!global.Permissions.can('editProject', { user: user, project: project })) {
      global.Toast.error('Only a Supervisor or Super Admin can rename a project.');
      return false;
    }

    var next = String(name || '').trim();
    if (!next) {
      global.Toast.warning('A project needs a name', { detail: 'The previous name was kept.' });
      return false;
    }
    if (next === project.name) return false;

    S.updateProject(projectId, { name: next });
    global.Toast.success('Project renamed', { detail: next });
    return true;
  }

  function addMember(projectId, userId) {
    var S = global.AppState;
    var user = S.currentUser();
    var project = S.getProject(projectId);
    var target = S.getUser(userId);
    if (!user || !project || !target) return false;

    if (!global.Permissions.can('manageProjectMembers', { user: user, project: project })) {
      global.Toast.error('Only a Supervisor or Super Admin can manage project members.');
      return false;
    }
    if (project.memberIds.indexOf(userId) !== -1) {
      global.Toast.info(T('{name} is already a member', { name: target.name }));
      return false;
    }

    S.updateProject(projectId, { memberIds: project.memberIds.concat([userId]) });
    global.Toast.success(T('{name} added to {place}', { name: target.name, place: project.name }), {
      detail: 'They can now be assigned tasks on this board.'
    });
    return true;
  }

  function removeMember(projectId, userId) {
    var S = global.AppState;
    var user = S.currentUser();
    var project = S.getProject(projectId);
    var target = S.getUser(userId);
    if (!user || !project || !target) return false;

    if (!global.Permissions.can('manageProjectMembers', { user: user, project: project })) {
      global.Toast.error('Only a Supervisor or Super Admin can manage project members.');
      return false;
    }

    /* docs/01 §5 rule 6 — an assignee has to be a project member, so the work
       has to be handed on first. Refusing here teaches the rule. */
    var holding = S.projectTasks(projectId).filter(function (t) {
      return t.assigneeId === userId && t.status !== 'CANCELLED';
    });
    if (holding.length) {
      global.Toast.error(T('Reassign {name}’s work first', { name: target.name }), {
        detail: T('A task’s assignee must be a project member — {name} still holds {tasks}.', {
          name: target.name, tasks: global.UI.plural(holding.length, 'task') })
      });
      return false;
    }

    S.updateProject(projectId, {
      memberIds: project.memberIds.filter(function (id) { return id !== userId; })
    });
    global.Toast.success(T('{name} removed from {place}', { name: target.name, place: project.name }));
    return true;
  }

  /* Archive is reversible on purpose (D52): a stakeholder who clicks it
     mid-demo gets the board back without resetting the whole dataset. */
  function setArchived(projectId, archived) {
    var S = global.AppState;
    var user = S.currentUser();
    var project = S.getProject(projectId);
    if (!user || !project) return false;

    if (!global.Permissions.can('archiveProject', { user: user, project: project })) {
      global.Toast.error('Only a Supervisor or Super Admin can archive a project.');
      return false;
    }
    if ((project.status === 'ARCHIVED') === archived) return false;

    S.updateProject(projectId, { status: archived ? 'ARCHIVED' : 'ACTIVE' });
    if (archived) {
      global.Toast.success('Project archived', {
        detail: T('{name} is off the project list. Restore it from the division.', { name: project.name })
      });
    } else {
      global.Toast.success('Project restored', { detail: T('{name} is active again.', { name: project.name }) });
    }
    return true;
  }

  global.ProjectActions = {
    create: create,
    rename: rename,
    addMember: addMember,
    removeMember: removeMember,
    archive: function (projectId) { return setArchived(projectId, true); },
    restore: function (projectId) { return setArchived(projectId, false); }
  };
}(window));

(function (global) {
  'use strict';

  /* docs/03 Flow E. Wave 7's S11 Division Management reuses this verb. */
  function create(config) {
    var S = global.AppState;
    var user = S.currentUser();
    if (!user) return null;

    if (!global.Permissions.can('createDivision', { user: user })) {
      global.Toast.error('Only a Super Admin can create a division.');
      return null;
    }

    var name = String(config.name || '').trim();
    var supervisor = S.getUser(config.supervisorId);
    if (!name) {
      global.Toast.warning('A division needs a name');
      return null;
    }
    if (!supervisor) {
      global.Toast.warning('Pick a supervisor for the division');
      return null;
    }

    var division = {
      id: S.nextId('d', S.getState().divisions),
      name: name,
      supervisorId: supervisor.id,
      memberIds: [supervisor.id],
      status: 'ACTIVE'
    };

    S.addDivision(division);
    global.Toast.success('Division created', {
      detail: T('{name} · supervised by {sup}', { name: name, sup: supervisor.name })
    });
    return division;
  }

  function addMember(divisionId, userId) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(divisionId);
    var target = S.getUser(userId);
    if (!user || !division || !target) return false;

    if (!global.Permissions.can('manageDivisionMembers', { user: user, division: division })) {
      global.Toast.error('Only a Supervisor or Super Admin can manage division members.');
      return false;
    }
    if (division.memberIds.indexOf(userId) !== -1) {
      global.Toast.info(T('{name} is already a member', { name: target.name }));
      return false;
    }

    S.updateDivision(divisionId, { memberIds: division.memberIds.concat([userId]) });
    global.Toast.success(T('{name} added to {place}', { name: target.name, place: division.name }));
    return true;
  }

  function removeMember(divisionId, userId) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(divisionId);
    var target = S.getUser(userId);
    if (!user || !division || !target) return false;

    if (!global.Permissions.can('manageDivisionMembers', { user: user, division: division })) {
      global.Toast.error('Only a Supervisor or Super Admin can manage division members.');
      return false;
    }

    /* A division without its supervisor has nobody who can see it (docs/01 §5
       rule 14) — changing who supervises it is Super Admin work, not a removal. */
    if (division.supervisorId === userId) {
      global.Toast.error('The supervisor cannot be removed', {
        detail: T('Assign a different supervisor to {name} first.', { name: division.name })
      });
      return false;
    }

    S.updateDivision(divisionId, {
      memberIds: division.memberIds.filter(function (id) { return id !== userId; })
    });
    global.Toast.success(T('{name} removed from {place}', { name: target.name, place: division.name }));
    return true;
  }

  function rename(divisionId, name) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(divisionId);
    if (!user || !division) return false;

    if (!global.Permissions.can('editDivision', { user: user, division: division })) {
      global.Toast.error('Only a Super Admin can edit a division.');
      return false;
    }

    var next = String(name || '').trim();
    if (!next) {
      global.Toast.warning('A division needs a name', { detail: 'The previous name was kept.' });
      return false;
    }
    if (next === division.name) return false;

    S.updateDivision(divisionId, { name: next });
    global.Toast.success('Division renamed', { detail: next });
    return true;
  }

  /* The new supervisor joins the division; the previous one stays a member, so
     nobody silently loses their projects. S05's member list is where they are
     removed, deliberately as a second, separate decision. */
  function assignSupervisor(divisionId, userId) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(divisionId);
    var target = S.getUser(userId);
    if (!user || !division || !target) return false;

    if (!global.Permissions.can('assignSupervisor', { user: user, division: division })) {
      global.Toast.error('Only a Super Admin can assign a supervisor.');
      return false;
    }
    if (division.supervisorId === userId) {
      global.Toast.info(T('{name} already supervises {division}', { name: target.name, division: division.name }));
      return false;
    }
    if (target.role !== 'SUPERVISOR' && target.role !== 'SUPER_ADMIN') {
      global.Toast.error(T('{name} is not a Supervisor', { name: target.name }), {
        detail: 'Change their role in User Management first.'
      });
      return false;
    }
    if (!S.isActive(target)) {
      global.Toast.error(T('{name} is deactivated', { name: target.name }), {
        detail: 'Activate them in User Management first.'
      });
      return false;
    }

    var previous = S.getUser(division.supervisorId);
    var members = division.memberIds.indexOf(userId) === -1
      ? division.memberIds.concat([userId])
      : division.memberIds;

    S.updateDivision(divisionId, { supervisorId: userId, memberIds: members });
    global.Toast.success(T('{name} now supervises {division}', { name: target.name, division: division.name }), {
      detail: previous
        ? T('{name} stays a member but no longer sees the division’s projects.', { name: previous.name })
        : 'They see every project in the division.'
    });
    return true;
  }

  /* Reversible, exactly like a project (D52). Refusing while projects remain
     beats cascading boards out from under a Supervisor (D63). */
  function setArchived(divisionId, archived) {
    var S = global.AppState;
    var user = S.currentUser();
    var division = S.getDivision(divisionId);
    if (!user || !division) return false;

    if (!global.Permissions.can('archiveDivision', { user: user, division: division })) {
      global.Toast.error('Only a Super Admin can archive a division.');
      return false;
    }
    if ((division.status === 'ARCHIVED') === archived) return false;

    if (archived) {
      var live = S.getState().projects.filter(function (p) {
        return p.divisionId === divisionId && p.status !== 'ARCHIVED';
      });
      if (live.length) {
        global.Toast.error(T('Archive {name}’s projects first', { name: division.name }), {
          detail: T('It still has {projects}. A project cannot outlive the division it belongs to.', {
            projects: global.UI.plural(live.length, 'active project') })
        });
        return false;
      }
    }

    S.updateDivision(divisionId, { status: archived ? 'ARCHIVED' : 'ACTIVE' });
    if (archived) {
      global.Toast.success('Division archived', {
        detail: T('{name} is off the divisions list. Restore it from Administration → Divisions.', {
          name: division.name })
      });
    } else {
      global.Toast.success('Division restored', { detail: T('{name} is active again.', { name: division.name }) });
    }
    return true;
  }

  global.DivisionActions = {
    create: create,
    rename: rename,
    assignSupervisor: assignSupervisor,
    addMember: addMember,
    removeMember: removeMember,
    archive: function (divisionId) { return setArchived(divisionId, true); },
    restore: function (divisionId) { return setArchived(divisionId, false); }
  };
}(window));

/* ===========================================================================
   UserActions — S10 User Management (docs/02 S10 · docs/04 "User management").

   Same idiom as ProjectActions / DivisionActions. Two rules shape everything
   here:

   - Deactivating is a real change, not a badge (D61): an inactive person
     leaves every people picker. So it is refused whenever it would orphan
     something — a division without a supervisor, or a task without a valid
     assignee (docs/01 §5 rule 6). The refusal is the teaching moment (D62).
   - You cannot edit yourself. The persona switcher is how you become someone
     else in this prototype; changing your own role mid-demo would eject you
     from the screen you are standing on.

   No notification is pushed: docs/07 §8 defines six types and none covers an
   administrative change (D66, following D29).
   =========================================================================== */

(function (global) {
  'use strict';

  var ROLES = ['SUPER_ADMIN', 'SUPERVISOR', 'USER'];

  function allowed(action) {
    var user = global.AppState.currentUser();
    if (!user || !global.Permissions.can('manageUsers', { user: user })) {
      global.Toast.error(T('Only a Super Admin can {action}.', { action: T(action) }));
      return null;
    }
    return user;
  }

  /* Everything a deactivation or a demotion would strand. */
  function commitments(userId) {
    var S = global.AppState;
    return {
      divisions: S.getState().divisions.filter(function (d) {
        return d.supervisorId === userId && d.status !== 'ARCHIVED';
      }),
      openTasks: S.getState().tasks.filter(function (t) {
        return t.assigneeId === userId &&
          t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
      })
    };
  }

  function names(rows) {
    return rows.map(function (row) { return row.name; }).join(', ');
  }

  function create(draft) {
    var S = global.AppState;
    if (!allowed('add a user')) return null;

    var name = String(draft.name || '').trim();
    var email = String(draft.email || '').trim().toLowerCase();

    if (!name) {
      global.Toast.warning('A user needs a name');
      return null;
    }
    if (!email || email.indexOf('@') === -1) {
      global.Toast.warning('A user needs an email address');
      return null;
    }
    var clash = S.getState().users.filter(function (u) {
      return String(u.email).toLowerCase() === email;
    })[0];
    if (clash) {
      global.Toast.error(T('{email} is already {name}’s address', { email: email, name: clash.name }));
      return null;
    }

    var user = {
      id: S.nextId('u', S.getState().users),
      name: name,
      email: email,
      role: ROLES.indexOf(draft.role) === -1 ? 'USER' : draft.role,
      avatar: name.charAt(0).toUpperCase(),
      status: 'ACTIVE'
    };

    var division = draft.divisionId ? S.getDivision(draft.divisionId) : null;
    S.addUser(user, division ? { silent: true } : null);
    if (division) {
      S.updateDivision(division.id, { memberIds: division.memberIds.concat([user.id]) });
    }

    global.Toast.success('User added', {
      detail: name + ' \u00b7 ' + global.Permissions.ROLE_LABEL[user.role] +
        ' \u00b7 ' + (division ? division.name : T('no division yet'))
    });
    return user;
  }

  function setRole(userId, role) {
    var S = global.AppState;
    var admin = allowed('change a role');
    if (!admin) return false;

    var target = S.getUser(userId);
    if (!target || ROLES.indexOf(role) === -1) return false;
    if (target.role === role) return false;

    if (target.id === admin.id) {
      global.Toast.error('You cannot change your own role', {
        detail: 'Switch persona from the profile menu to see the prototype as someone else.'
      });
      return false;
    }

    /* A division with no supervisor is a division nobody can see
       (docs/01 §5 rule 14) — hand it on before demoting its supervisor. */
    if (role === 'USER') {
      var supervising = commitments(userId).divisions;
      if (supervising.length) {
        global.Toast.error(T('{name} still supervises {divisions}', { name: target.name, divisions: names(supervising) }), {
          detail: 'Assign a different supervisor in Division Management first.'
        });
        return false;
      }
    }

    S.updateUser(userId, { role: role });
    global.Toast.success(T('{name} is now a {role}', { name: target.name, role: global.Permissions.ROLE_LABEL[role] }), {
      detail: role === 'SUPERVISOR'
        ? T('A Supervisor sees the divisions they supervise — assign {name} one in Division Management.', {
            name: target.name })
        : global.UI.roleLine(Object.assign({}, target, { role: role }))
    });
    return true;
  }

  function setStatus(userId, active) {
    var S = global.AppState;
    var admin = allowed(active ? 'activate a user' : 'deactivate a user');
    if (!admin) return false;

    var target = S.getUser(userId);
    if (!target) return false;
    if (S.isActive(target) === active) return false;

    if (!active) {
      if (target.id === admin.id) {
        global.Toast.error('You cannot deactivate yourself', {
          detail: 'You are the persona this demo is being viewed as.'
        });
        return false;
      }

      var held = commitments(userId);
      if (held.divisions.length) {
        global.Toast.error(T('{name} supervises {divisions}', { name: target.name, divisions: names(held.divisions) }), {
          detail: 'Assign a different supervisor in Division Management first.'
        });
        return false;
      }
      if (held.openTasks.length) {
        global.Toast.error(T('Reassign {name}’s work first', { name: target.name }), {
          detail: T('They still hold {tasks} — a task’s assignee has to be someone who can still work on it.', {
            tasks: global.UI.plural(held.openTasks.length, 'open task') })
        });
        return false;
      }
    }

    S.updateUser(userId, { status: active ? 'ACTIVE' : 'INACTIVE' });
    if (active) {
      global.Toast.success(T('{name} reactivated', { name: target.name }), {
        detail: 'They can be assigned tasks and added to projects again.'
      });
    } else {
      global.Toast.success(T('{name} deactivated', { name: target.name }), {
        detail: 'They keep their memberships but no longer appear in any assignee picker.'
      });
    }
    return true;
  }

  global.UserActions = {
    ROLES: ROLES,
    create: create,
    setRole: setRole,
    commitments: commitments,
    activate: function (userId) { return setStatus(userId, true); },
    deactivate: function (userId) { return setStatus(userId, false); }
  };
}(window));

/* ===========================================================================
   NotificationActions — what a notification does when it is clicked
   (docs/05 §8, docs/03 Flow G).

   Marking read and opening the task are two mutations, so the first is written
   silently and the store is notified once (D41) — the same shape TaskActions
   uses. Opening is a plain setState, not a navigation: the drawer lands over
   whichever screen the bell was clicked from, and the list stays on screen so
   the row visibly turns read (D37).
   =========================================================================== */

(function (global) {
  'use strict';

  var SILENT = { silent: true };

  function open(notification) {
    var S = global.AppState;
    var user = S.currentUser();
    if (!notification || !user) return false;

    if (!notification.read) S.markNotificationRead(notification.id, SILENT);

    /* The task may have moved out of reach since the notification was written
       — say the persona was swapped mid-demo. Say so rather than open nothing. */
    if (notification.taskId && !S.canSeeTask(user.id, notification.taskId)) {
      S.setState({});
      global.Toast.warning('That task is no longer available to you', {
        detail: 'The notification has been marked as read.'
      });
      return false;
    }

    if (notification.taskId) {
      S.setState({ selectedTaskId: notification.taskId });
      return true;
    }

    /* No task on the record: the project is the next best destination. */
    if (notification.projectId && S.canSeeProject(user.id, notification.projectId)) {
      S.setState({});
      global.Router.navigate('#/projects/' + notification.projectId);
      return true;
    }

    S.setState({});
    return false;
  }

  function markAllRead() {
    var S = global.AppState;
    var user = S.currentUser();
    if (!user) return false;

    var unread = S.unreadCount(user.id);
    if (!unread) {
      global.Toast.info('Nothing unread');
      return false;
    }

    S.markAllNotificationsRead(user.id);
    global.Toast.success(
      unread === 1 ? 'Notification marked as read' : T('All {n} notifications marked as read', { n: unread })
    );
    return true;
  }

  /* Newest first, for both the bell and S13. */
  function listFor(userId) {
    return global.AppState.notificationsFor(userId).slice().sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });
  }

  global.NotificationActions = {
    open: open,
    markAllRead: markAllRead,
    listFor: listFor
  };
}(window));

/* ===========================================================================
   DragDrop — native HTML5 drag & drop for the Kanban board (docs/05 §1).

   Native rather than a pointer-event reimplementation: it is what the
   file:// constraint and "no vendored libraries" leave, and the browser
   gives the drag ghost, the cursor and the keyboard-cancel for free.

   The board re-renders on drop, which replaces the card that fired the drag.
   Cleanup is therefore also bound at document level — a dragend that never
   arrives must not leave the board stuck in its dragging state.
   =========================================================================== */

(function (global) {
  'use strict';

  var dragging = null;   /* { taskId, fromStatus } */
  var justDragged = false;

  function clearHighlights() {
    var marked = document.querySelectorAll('.column.is-drop-target, .column.is-drop-source');
    Array.prototype.forEach.call(marked, function (node) {
      node.classList.remove('is-drop-target');
      node.classList.remove('is-drop-source');
    });
  }

  /* A successful drop re-renders the board, which removes the very card that
     started the drag — so its own dragend never arrives. Every piece of
     teardown therefore lives here, on the document, including releasing the
     click guard: leaving that latched would kill every later card click. */
  function endDrag() {
    var stale = document.querySelectorAll('.task-card.is-dragging');
    Array.prototype.forEach.call(stale, function (node) {
      node.classList.remove('is-dragging');
    });
    document.body.classList.remove('is-dragging-task');
    clearHighlights();
    dragging = null;
    setTimeout(function () { justDragged = false; }, 0);
  }

  document.addEventListener('dragend', endDrag);
  document.addEventListener('drop', endDrag);

  /* --- Card -------------------------------------------------------------- */
  function card(node, task) {
    node.addEventListener('dragstart', function (event) {
      var user = global.AppState.currentUser();
      if (!global.Permissions.can('dragTask', { user: user, task: task })) {
        event.preventDefault();
        return;
      }

      dragging = { taskId: task.id, fromStatus: task.status };
      justDragged = true;

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        /* An anchor would otherwise hand the browser its own href. */
        try { event.dataTransfer.setData('text/plain', task.id); } catch (e) { /* IE-era guard */ }
      }

      document.body.classList.add('is-dragging-task');
      /* One tick late: the browser snapshots the drag ghost first, so the
         ghost stays crisp while the source card fades behind it. */
      setTimeout(function () { node.classList.add('is-dragging'); }, 0);
    });

    /* A drag that ends on the card itself must not also open the task. */
    node.addEventListener('click', function (event) {
      if (justDragged) event.preventDefault();
    });
  }

  /* --- Column ------------------------------------------------------------ */
  function column(node, status, onDrop) {
    /* dragenter/dragleave fire for every child element, so the column tracks
       how deep the pointer is rather than trusting a single leave. */
    var depth = 0;

    function accepts() { return !!dragging && dragging.fromStatus !== status; }

    function highlight() {
      node.classList.toggle('is-drop-target', accepts());
      node.classList.toggle('is-drop-source', !!dragging && !accepts());
    }

    function unhighlight() {
      depth = 0;
      node.classList.remove('is-drop-target');
      node.classList.remove('is-drop-source');
    }

    node.addEventListener('dragenter', function (event) {
      if (!dragging) return;
      event.preventDefault();
      depth += 1;
      highlight();
    });

    node.addEventListener('dragover', function (event) {
      if (!dragging) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = accepts() ? 'move' : 'none';
      }
    });

    node.addEventListener('dragleave', function () {
      depth -= 1;
      if (depth <= 0) unhighlight();
    });

    node.addEventListener('drop', function (event) {
      event.preventDefault();
      var taskId = dragging
        ? dragging.taskId
        : (event.dataTransfer ? event.dataTransfer.getData('text/plain') : '');
      unhighlight();
      if (taskId) onDrop(taskId, status);
    });
  }

  global.DragDrop = {
    card: card,
    column: column,
    isDragging: function () { return !!dragging; }
  };
}(window));
