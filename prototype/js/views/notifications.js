/* ===========================================================================
   S13 — Notifications (docs/02 S13, docs/03 Flow G).

   All six docs/07 §8 types, read and unread visually distinct — never by
   colour alone (docs/06 §12): an unread row carries a marker dot, a stronger
   surface and a bolder line.

   The wording comes from UI.notificationSentence, which the bell dropdown also
   reads, so the two never drift. The click behaviour is NotificationActions.open
   — it marks read and opens the drawer *over this list* (TODO.md D37), which is
   what makes the row visibly turn read while you watch.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  function row(notification, selectedTaskId) {
    var UI = global.UI;
    var S = global.AppState;
    var type = notification.type;
    var actor = notification.actorId ? S.getUser(notification.actorId) : null;
    var project = notification.projectId ? S.getProject(notification.projectId) : null;
    var task = notification.taskId ? S.getTask(notification.taskId) : null;
    var label = UI.NOTIFICATION_LABEL[type] || 'Update';
    var isSelected = !!task && task.id === selectedTaskId;

    return UI.el('button', {
      class: 'notif-item' +
        (notification.read ? ' is-read' : ' is-unread') +
        (isSelected ? ' is-selected' : ''),
      type: 'button',
      dataset: { notificationId: notification.id },
      title: T(notification.read ? '{label}' : '{label} · unread', { label: label }) +
        (task ? T(' — open {title}', { title: task.title }) : ''),
      onclick: function () { global.NotificationActions.open(notification); }
    }, [
      UI.el('span', {
        class: 'notif-item__icon notif-item__icon--' + (UI.NOTIFICATION_VARIANT[type] || 'neutral'),
        title: label
      }, UI.icon(UI.NOTIFICATION_ICON[type] || 'bell', 16)),

      UI.el('span', { class: 'notif-item__body' }, [
        UI.el('span', { class: 'notif-item__text', text: UI.notificationSentence(notification) }),
        UI.el('span', { class: 'notif-item__meta' }, [
          UI.badge(label, UI.NOTIFICATION_VARIANT[type] || 'neutral', { dot: false }),
          actor ? UI.avatar(actor, { size: 'sm' }) : null,
          actor ? UI.el('span', { text: actor.name }) : null,
          project ? UI.el('span', { class: 'notif-item__dot' }) : null,
          project ? UI.el('span', { text: project.name }) : null,
          UI.el('span', { class: 'notif-item__dot' }),
          UI.el('span', { text: UI.relativeTime(notification.at) })
        ])
      ]),

      notification.read
        ? UI.el('span', { class: 'notif-item__read', text: 'Read' })
        : UI.el('span', { class: 'notif-item__unread' }, [
            UI.el('span', { class: 'notif-item__marker', 'aria-hidden': 'true' }),
            UI.el('span', { text: 'Unread' })
          ])
    ]);
  }

  Views.notifications = {
    render: function () {
      var UI = global.UI;
      var S = global.AppState;
      var user = S.currentUser();
      var state = S.getState();
      var list = global.NotificationActions.listFor(user.id);
      var unread = list.filter(function (n) { return !n.read; }).length;

      var header = UI.el('header', { class: 'view__header' }, [
        UI.el('div', {}, [
          UI.el('h1', { class: 'page-title', text: 'Notifications' }),
          UI.el('p', {
            class: 'view__subtitle',
            text: list.length
              ? UI.plural(list.length, 'notification') +
                ' · ' + (unread ? T('{n} unread', { n: unread }) : T('all read'))
              : 'What changed while you were away.'
          })
        ]),
        UI.el('span', { class: 'spacer' }),
        unread
          ? UI.el('button', {
              class: 'btn btn--secondary',
              type: 'button',
              title: 'Mark every notification as read',
              onclick: function () { global.NotificationActions.markAllRead(); }
            }, [UI.icon('check-check', 16), 'Mark all read'])
          : null
      ]);

      if (!list.length) {
        return UI.el('div', { class: 'view' }, [
          header,
          UI.emptyState({
            icon: 'bell',
            title: 'No notifications yet',
            body: 'When someone assigns you a task, changes a deadline or mentions you, it shows up here.',
            action: UI.el('a', { class: 'btn btn--secondary', href: '#/my-tasks' }, [
              'Go to My Tasks', UI.icon('arrow-right', 16)
            ])
          })
        ]);
      }

      return UI.el('div', { class: 'view' }, [
        header,

        /* Nothing unread is worth saying out loud — but the read history stays
           on screen, so the reader still has something to click (docs/05 §10). */
        unread
          ? null
          : UI.el('p', { class: 'notif-caught-up' }, [
              UI.icon('check-circle', 16),
              UI.el('span', { text: 'You are all caught up. Everything below has been read.' })
            ]),

        UI.el('div', { class: 'notif-list' }, list.map(function (n) {
          return row(n, state.selectedTaskId);
        }))
      ]);
    }
  };
}(window));
