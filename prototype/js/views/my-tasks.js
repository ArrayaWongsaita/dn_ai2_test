/* ===========================================================================
   S03 — My Tasks (docs/02 S03, docs/03 Flow F).

   "Where is my work?" — everything assigned to the current persona, across
   every project they can see, split into the five tabs docs/02 names.

   The active tab lives in the hash (TODO.md D36): docs/02 §4 already lists
   #/my-tasks?filter=overdue as a route, so the dashboard tiles, the tabs and
   the browser's back button all drive the same one mechanism. router.js clears
   selectedTaskId only when the *path* changes (D26), so switching tabs never
   slams an open drawer shut.

   Rows are UI.taskRow and open the drawer with a plain setState — no
   navigation, so closing the drawer returns here rather than to a board.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  var TABS = [
    {
      key: 'assigned',
      label: 'Assigned to Me',
      /* Open work: done and cancelled tasks have their own places. */
      match: function (task) { return task.status !== 'COMPLETED' && task.status !== 'CANCELLED'; },
      empty: null                       /* role-dependent — see emptyFor() */
    },
    {
      key: 'due-today',
      label: 'Due Today',
      match: function (task) { return global.AppState.deadlineState(task) === 'due-today'; },
      empty: {
        icon: 'calendar',
        title: 'Nothing due today',
        body: 'No task assigned to you has today as its deadline. Check Upcoming for what is next.'
      }
    },
    {
      key: 'upcoming',
      label: 'Upcoming',
      match: function (task) {
        var state = global.AppState.deadlineState(task);
        return state === 'due-soon' || state === 'upcoming';
      },
      empty: {
        icon: 'clock',
        title: 'Nothing scheduled ahead',
        body: 'None of your open tasks has a deadline in the future.'
      }
    },
    {
      key: 'overdue',
      label: 'Overdue',
      match: function (task) { return global.AppState.deadlineState(task) === 'overdue'; },
      empty: {
        icon: 'check-circle',
        title: 'Nothing overdue',
        body: 'Every task assigned to you is still inside its deadline. Keep it that way.'
      }
    },
    {
      key: 'completed',
      label: 'Completed',
      match: function (task) { return task.status === 'COMPLETED'; },
      empty: {
        icon: 'check',
        title: 'Nothing finished yet',
        body: 'Drag a card into Completed on a project board and it lands here.'
      }
    }
  ];

  /* The dashboard's fourth tile has no tab of its own (TODO.md D19): it lands
     on Assigned to Me with an extra, removable status filter. */
  var STATUS_ALIAS = { 'in-progress': 'IN_PROGRESS' };

  function tabFor(key) {
    for (var i = 0; i < TABS.length; i++) {
      if (TABS[i].key === key) return TABS[i];
    }
    return TABS[0];
  }

  function href(key) { return '#/my-tasks?filter=' + key; }

  /* Soonest deadline first, no-deadline last — the order a reader scans in. */
  function byDeadline(a, b) {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  }

  function emptyFor(tab, user) {
    var UI = global.UI;
    if (tab.empty) return UI.emptyState(tab.empty);

    /* Assigned to Me, empty. A manager holding nothing is normal — say so in
       the same words the dashboard uses rather than implying an empty app. */
    if (global.Permissions.isManager(user)) {
      var counts = UI.scopeCounts(user);
      return UI.emptyState({
        icon: 'folder-kanban',
        title: 'Nothing assigned to you',
        body: T('As {role} you oversee {tasks} across {projects} rather than holding work yourself.', {
          role: global.Permissions.ROLE_LABEL[user.role], tasks: UI.plural(counts.tasks, 'task'),
          projects: UI.plural(counts.projects, 'project') }),
        action: UI.el('a', { class: 'btn btn--primary', href: '#/projects' }, [
          'Open a project board', UI.icon('arrow-right', 16)
        ])
      });
    }

    return UI.emptyState({
      icon: 'check-square',
      title: 'No open tasks',
      body: 'Nothing is assigned to you right now. A Supervisor assigns work from the project board.'
    });
  }

  /* --- View ---------------------------------------------------------------- */
  Views.myTasks = {
    render: function (params) {
      var UI = global.UI;
      var S = global.AppState;
      var user = S.currentUser();
      var state = S.getState();

      var requested = (params && params.query && params.query.filter) || 'assigned';
      var statusFilter = STATUS_ALIAS[requested] || null;
      var tab = tabFor(statusFilter ? 'assigned' : requested);

      var mine = S.tasksAssignedTo(user.id);

      var tabs = TABS.map(function (t) {
        return {
          key: t.key,
          label: t.label,
          count: mine.filter(t.match).length,
          href: href(t.key),
          title: T(t.label) + ' — ' + UI.plural(mine.filter(t.match).length, 'task')
        };
      });

      var rows = mine.filter(tab.match)
        .filter(function (task) { return !statusFilter || task.status === statusFilter; })
        .sort(byDeadline);

      var body;
      if (rows.length) {
        body = UI.el('div', { class: 'task-rows' }, rows.map(function (task) {
          return UI.taskRow(task, { selected: task.id === state.selectedTaskId });
        }));
      } else if (statusFilter) {
        /* Narrowed by the deep link, not by the tab — offer the way back. */
        body = UI.emptyState({
          icon: 'trending-up',
          title: T('Nothing in {status}', { status: UI.STATUS_LABEL[statusFilter] }),
          body: T('None of your open tasks is in {status} right now.', { status: UI.STATUS_LABEL[statusFilter] }),
          action: UI.el('a', { class: 'btn btn--secondary', href: href('assigned') },
            'Show every open task')
        });
      } else {
        body = emptyFor(tab, user);
      }

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'My Tasks' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: mine.length
                ? T('{tasks} assigned to you across {projects}.', { tasks: UI.plural(mine.length, 'task'),
                    projects: UI.plural(S.activeProjects(user.id).length, 'project') })
                : 'Everything assigned to you, across every project you can see.'
            })
          ]),
          UI.el('span', { class: 'spacer' }),
          UI.el('a', { class: 'btn btn--secondary', href: '#/projects' }, [
            'All projects', UI.icon('arrow-right', 16)
          ])
        ]),

        UI.tabBar(tabs, tab.key, { label: 'My Tasks views' }),

        /* The chip appears only on the ?filter=in-progress deep link (D19). */
        statusFilter
          ? UI.el('div', { class: 'filter-chips' }, [
              UI.el('span', { class: 'filter-chips__label', text: 'Also filtered by' }),
              UI.el('a', {
                class: 'filter-chip',
                href: href('assigned'),
                title: T('Remove the {status} filter', { status: UI.STATUS_LABEL[statusFilter] })
              }, [
                UI.icon('trending-up', 13),
                UI.el('span', { text: UI.STATUS_LABEL[statusFilter] }),
                UI.icon('x', 13)
              ])
            ])
          : null,

        body
      ]);
    }
  };
}(window));
