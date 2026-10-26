/* ===========================================================================
   The two topbar widgets (TODO.md D43).

   Search  — a global task finder (D34). docs/02 §1 puts Search in the topbar
             and docs/05 §11 puts one in the Kanban header: they are two
             different jobs. The board filters cards in place; this one finds a
             task anywhere the persona can see and opens its drawer.

   Bell    — the compact notification dropdown from docs/05 §8.

   Both reuse Menu rather than growing a second popover primitive, so outside
   click, ESC and arrow-key navigation come for free. app.js draws the shell
   and calls in here; the notification behaviour itself is NotificationActions.
   =========================================================================== */

(function (global) {
  'use strict';

  var RESULT_LIMIT = 8;
  var BELL_LIMIT = 6;

  /* --- Global task finder ------------------------------------------------- */

  /* The topbar is cleared and rebuilt on every state change, so the input node
     is cached: re-appending it keeps the half-typed query. Removing a focused
     node does not fire blur, so `focused` survives the rebuild and the input
     can take focus back on the next frame — otherwise typing a query while the
     drawer is open behind you would drop you onto <body> mid-word. */
  var finder = null;
  var query = '';
  var focused = false;
  var ownerId = null;

  function matches(user) {
    var term = query.trim().toLowerCase();
    if (!term) return [];
    return global.AppState.visibleTasks(user.id).filter(function (task) {
      return String(task.title || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  function choose(task) {
    query = '';
    if (finder) finder.input.value = '';
    global.Menu.close();
    global.AppState.setState({ selectedTaskId: task.id });
  }

  function resultRow(task) {
    var UI = global.UI;
    var S = global.AppState;
    var project = S.getProject(task.projectId);
    var assignee = S.getUser(task.assigneeId);

    return global.Menu.item({
      label: task.title,
      sublabel: (project ? project.name : 'No project') + ' · ' +
        UI.STATUS_LABEL[task.status] + ' · ' + (assignee ? assignee.name : 'Unassigned'),
      leading: UI.el('span', { class: 'finder__mark finder__mark--' + task.priority.toLowerCase() },
        UI.icon('check-square', 15)),
      title: T('Open {name}', { name: task.title }),
      onclick: function () { choose(task); }
    });
  }

  function resultNodes(user) {
    var UI = global.UI;
    var found = matches(user);

    if (!found.length) {
      return [
        UI.el('p', { class: 'menu__section', text: 'No match' }),
        UI.el('p', { class: 'menu__note', text: T('No task in your projects has “{q}” in its title.', { q: query.trim() }) })
      ];
    }

    var shown = found.slice(0, RESULT_LIMIT);
    var nodes = [
      UI.el('p', {
        class: 'menu__section',
        text: found.length > shown.length
          ? T('Top {n} of {matches}', { n: shown.length, matches: UI.plural(found.length, 'match') })
          : UI.plural(found.length, 'match')
      })
    ];

    shown.forEach(function (task) { nodes.push(resultRow(task)); });
    return nodes;
  }

  function refreshResults(user) {
    if (!finder) return;
    var Menu = global.Menu;

    if (!query.trim()) {
      if (Menu.isOpen(finder.input)) Menu.close();
      return;
    }

    if (Menu.isOpen(finder.input)) Menu.setContent(finder.input, resultNodes(user));
    else {
      Menu.show(finder.input, resultNodes(user), {
        placement: 'bottom-start',
        width: 380,
        label: 'Task search results',
        class: 'menu--finder',
        autoFocus: false            /* keep the caret in the input (D42) */
      });
    }
  }

  function buildFinder() {
    var UI = global.UI;

    var input = UI.el('input', {
      class: 'input topbar__search-input',
      type: 'search',
      placeholder: 'Search tasks',
      autocomplete: 'off',
      title: 'Find a task in any project you can see',
      'aria-label': 'Search tasks',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      oninput: function (event) {
        query = event.target.value;
        refreshResults(global.AppState.currentUser());
      },
      onfocus: function () { focused = true; },
      /* Reopening is a click, not a focus. Menu's Esc handler closes the panel
         and hands focus back to this input — if focus alone reopened it, Esc
         could never actually dismiss the results. */
      onclick: function () {
        if (query.trim() && !global.Menu.isOpen(input)) {
          refreshResults(global.AppState.currentUser());
        }
      },
      /* Typing here never touches the store, so no re-render happens under the
         caret — a blur really is the reader leaving. An unrelated re-render does
         drop the focus flag, which is right: the query text survives on the
         cached node, but focus should not be yanked back from elsewhere. */
      onblur: function () { focused = false; },
      onkeydown: function (event) {
        if (event.key === 'Escape') {
          query = '';
          input.value = '';
          global.Menu.close();
          return;
        }
        if (event.key !== 'Enter') return;
        event.preventDefault();
        var found = matches(global.AppState.currentUser());
        if (found.length) choose(found[0]);
      }
    });

    var wrap = UI.el('span', { class: 'input-with-icon topbar__search' }, [
      UI.icon('search', 16),
      input
    ]);

    return { wrap: wrap, input: input };
  }

  function search(user) {
    /* A persona switch must not hand the next reader the old query. */
    if (ownerId !== user.id) {
      ownerId = user.id;
      query = '';
      focused = false;
      finder = null;
    }

    if (!finder) finder = buildFinder();
    finder.input.value = query;

    if (focused) {
      requestAnimationFrame(function () {
        if (finder && finder.input.isConnected) finder.input.focus();
      });
    }

    return finder.wrap;
  }

  /* --- Notification bell (docs/05 §8) ------------------------------------- */

  function bellRow(notification) {
    var UI = global.UI;
    var S = global.AppState;
    var type = notification.type;
    var actor = notification.actorId ? S.getUser(notification.actorId) : null;
    var label = UI.NOTIFICATION_LABEL[type] || 'Update';

    return UI.el('button', {
      class: 'menu__item notif-row' + (notification.read ? ' is-read' : ' is-unread'),
      type: 'button',
      role: 'menuitem',
      title: T(notification.read ? '{label} — open this task' : '{label} · unread — open this task', { label: label }),
      onclick: function () {
        global.Menu.close();
        global.NotificationActions.open(notification);
      }
    }, [
      UI.el('span', {
        class: 'notif-row__icon notif-row__icon--' + (UI.NOTIFICATION_VARIANT[type] || 'neutral')
      }, actor ? UI.avatar(actor, { size: 'sm' }) : UI.icon(UI.NOTIFICATION_ICON[type] || 'bell', 15)),
      UI.el('span', { class: 'notif-row__body' }, [
        UI.el('span', { class: 'notif-row__text', text: UI.notificationSentence(notification) }),
        UI.el('span', { class: 'notif-row__meta' }, [
          UI.el('span', { text: label }),
          UI.el('span', { class: 'notif-row__dot' }),
          UI.el('span', { text: UI.relativeTime(notification.at) })
        ])
      ]),
      notification.read
        ? null
        : UI.el('span', { class: 'notif-row__unread', title: 'Unread', 'aria-label': 'Unread' })
    ]);
  }

  function bellNodes(user) {
    var UI = global.UI;
    var Menu = global.Menu;
    var list = global.NotificationActions.listFor(user.id);
    var unread = list.filter(function (n) { return !n.read; }).length;

    var head = UI.el('div', { class: 'menu__head' }, [
      UI.el('span', { class: 'menu__head-title', text: 'Notifications' }),
      unread
        ? UI.badge(T('{n} unread', { n: unread }), 'danger', { dot: false })
        : UI.badge('All read', 'neutral', { dot: false }),
      UI.el('span', { class: 'spacer' }),
      unread
        ? UI.el('button', {
            class: 'btn btn--ghost btn--sm',
            type: 'button',
            title: 'Mark every notification as read',
            onclick: function () {
              Menu.close();
              global.NotificationActions.markAllRead();
            }
          }, [UI.icon('check-check', 14), 'Mark all read'])
        : null
    ]);

    if (!list.length) {
      return [
        head,
        UI.emptyState({
          icon: 'bell',
          compact: true,
          title: 'Nothing yet',
          body: 'Assignments, deadline changes and mentions land here.'
        })
      ];
    }

    var shown = list.slice(0, BELL_LIMIT);
    var nodes = [head];
    shown.forEach(function (n) { nodes.push(bellRow(n)); });

    nodes.push(Menu.separator());
    nodes.push(UI.el('a', {
      class: 'menu__item menu__item--footer',
      role: 'menuitem',
      href: '#/notifications',
      title: 'Open the full notification list',
      onclick: function () { Menu.close(); }
    }, [
      UI.el('span', { class: 'menu__lead' }, UI.icon('inbox', 16)),
      UI.el('span', { class: 'menu__text' }, [
        UI.el('span', { class: 'menu__label', text: 'View all notifications' }),
        list.length > shown.length
          ? UI.el('span', { class: 'menu__sublabel', text: T('{notifications} in total', { notifications: UI.plural(list.length, 'notification') }) })
          : null
      ]),
      UI.icon('arrow-right', 14)
    ]));

    return nodes;
  }

  function bell(user) {
    var UI = global.UI;
    var unread = global.AppState.unreadCount(user.id);

    var trigger = UI.el('button', {
      class: 'btn btn--icon topbar__bell',
      type: 'button',
      title: unread ? UI.plural(unread, 'unread notification') : 'Notifications — nothing unread',
      'aria-label': unread ? T('Notifications, {n} unread', { n: unread }) : 'Notifications',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      onclick: function () {
        global.Menu.toggle(trigger, function () {
          return bellNodes(global.AppState.currentUser());
        }, {
          placement: 'bottom-end',
          width: 360,
          label: 'Notifications',
          class: 'menu--notifications'
        });
      }
    }, [
      UI.icon('bell', 18),
      unread > 0 ? UI.el('span', { class: 'bell-dot', text: String(unread) }) : null
    ]);

    return trigger;
  }

  global.Topbar = {
    search: search,
    bell: bell
  };
}(window));
