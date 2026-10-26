/* ===========================================================================
   S02 — Dashboard (docs/02 S02).

   Short and actionable, not a BI page. Three blocks:
     1. Welcome + role, with what this persona can see
     2. Four summary tiles, each a deep link into S03 My Tasks
     3. The projects this persona is allowed to open, plus recent activity

   The tiles count only tasks assigned to the current user, so the number on
   the tile always equals the number the linked My Tasks filter will show
   (TODO.md D16).
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  var RECENT_LIMIT = 6;

  var TILES = [
    {
      key: 'assigned', label: 'My Tasks', hint: 'open and assigned to you',
      icon: 'check-square', variant: 'purple',
      match: function (task) { return task.status !== 'COMPLETED' && task.status !== 'CANCELLED'; }
    },
    {
      key: 'due-today', label: 'Due Today', hint: 'assigned to you',
      icon: 'calendar', variant: 'warning',
      match: function (task) { return global.AppState.deadlineState(task) === 'due-today'; }
    },
    {
      key: 'overdue', label: 'Overdue', hint: 'assigned to you',
      icon: 'alert-triangle', variant: 'danger',
      match: function (task) { return global.AppState.deadlineState(task) === 'overdue'; }
    },
    {
      key: 'in-progress', label: 'In Progress', hint: 'assigned to you',
      icon: 'trending-up', variant: 'info',
      match: function (task) { return task.status === 'IN_PROGRESS'; }
    }
  ];

  /* --- Header ------------------------------------------------------------- */
  function header(user) {
    var UI = global.UI;
    var counts = UI.scopeCounts(user);

    return UI.el('header', { class: 'view__header' }, [
      UI.el('div', { class: 'stack gap-2' }, [
        UI.el('h1', { class: 'page-title', text: T('Welcome back, {name}', { name: user.name }) }),
        UI.el('p', { class: 'view__subtitle', text: UI.roleLine(user) }),
        UI.el('div', { class: 'scope-chips' }, [
          scopeChip('layers', UI.plural(counts.divisions, 'division'), 'Divisions you can see'),
          scopeChip('folder-kanban', UI.plural(counts.projects, 'project'), 'Projects you can open'),
          scopeChip('check-square', UI.plural(counts.tasks, 'task'), 'Tasks inside those projects')
        ])
      ]),
      UI.el('span', { class: 'spacer' }),
      UI.el('a', { class: 'btn btn--secondary', href: '#/my-tasks' }, [
        'View my tasks', UI.icon('arrow-right', 16)
      ])
    ]);
  }

  function scopeChip(iconName, label, title) {
    var UI = global.UI;
    return UI.el('span', { class: 'scope-chip', title: title }, [
      UI.icon(iconName, 14),
      UI.el('span', { text: label })
    ]);
  }

  /* --- Summary tiles ------------------------------------------------------ */
  function tiles(user) {
    var UI = global.UI;
    var mine = global.AppState.tasksAssignedTo(user.id);

    return UI.el('section', { class: 'dash-tiles', 'aria-label': 'My work at a glance' },
      TILES.map(function (tile) {
        return UI.statTile({
          value: mine.filter(tile.match).length,
          label: tile.label,
          hint: tile.hint,
          icon: tile.icon,
          variant: tile.variant,
          href: '#/my-tasks?filter=' + tile.key,
          title: T('Open My Tasks filtered by {label}', { label: T(tile.label) })
        });
      }));
  }

  /* A manager with nothing assigned would otherwise read as an empty app. */
  function scopeNote(user) {
    var UI = global.UI;
    var counts = UI.scopeCounts(user);
    var text = global.Permissions.isManager(user)
      ? T('Nothing is assigned to you directly — as {role} you oversee {tasks} across {projects}.', {
          role: global.Permissions.ROLE_LABEL[user.role], tasks: UI.plural(counts.tasks, 'task'),
          projects: UI.plural(counts.projects, 'project') })
      : 'You have no tasks assigned right now. A Supervisor assigns work from the project board.';

    return UI.el('p', { class: 'dash-note' }, [UI.icon('info', 15), UI.el('span', { text: text })]);
  }

  /* --- Recently updated -------------------------------------------------- */
  function recentRows(user) {
    var UI = global.UI;
    var S = global.AppState;

    return S.visibleTasks(user.id)
      .map(function (task) { return { task: task, event: UI.lastActivity(task) }; })
      .filter(function (row) { return !!row.event; })
      .sort(function (a, b) { return new Date(b.event.at) - new Date(a.event.at); })
      .slice(0, RECENT_LIMIT);
  }

  function recentItem(row) {
    var UI = global.UI;
    var S = global.AppState;
    var project = S.getProject(row.task.projectId);
    var actor = S.getUser(row.event.actorId);

    return UI.el('a', {
      class: 'recent-item',
      href: '#/tasks/' + row.task.id,
      title: T('Open {name}', { name: row.task.title })
    }, [
      UI.avatar(actor, { size: 'sm' }),
      UI.el('span', { class: 'recent-item__body' }, [
        UI.el('span', { class: 'recent-item__title', text: row.task.title }),
        UI.el('span', { class: 'recent-item__meta' }, [
          UI.el('span', { text: UI.activitySentence(row.event) }),
          UI.el('span', { class: 'project-card__dot' }),
          UI.el('span', { text: project ? project.name : 'Unknown project' }),
          UI.el('span', { class: 'project-card__dot' }),
          UI.el('span', { text: UI.relativeTime(row.event.at) })
        ])
      ]),
      UI.statusBadge(row.task.status)
    ]);
  }

  function recentPanel(user) {
    var UI = global.UI;
    var rows = recentRows(user);

    return UI.el('section', { class: 'dash-panel surface' }, [
      UI.el('div', { class: 'dash-panel__head' }, [
        UI.el('h2', { class: 'section-title', text: 'Recently updated' }),
        UI.el('span', { class: 'spacer' }),
        UI.icon('activity', 16)
      ]),
      rows.length
        ? UI.el('div', { class: 'recent-list' }, rows.map(recentItem))
        : UI.emptyState({
            icon: 'activity',
            compact: true,
            title: 'No activity yet',
            body: 'Once tasks are created or moved in your projects, the latest changes show up here.'
          })
    ]);
  }

  /* --- Projects ----------------------------------------------------------- */
  function projectsPanel(user) {
    var UI = global.UI;
    /* Archived projects are off every card grid (D52). */
    var projects = global.AppState.activeProjects(user.id);

    return UI.el('section', { class: 'dash-panel dash-panel--plain' }, [
      UI.el('div', { class: 'dash-panel__head' }, [
        UI.el('h2', { class: 'section-title', text: 'Your projects' }),
        UI.el('span', { class: 'badge badge--neutral', text: String(projects.length) }),
        UI.el('span', { class: 'spacer' }),
        UI.el('a', { class: 'btn btn--ghost btn--sm', href: '#/projects' }, [
          'All projects', UI.icon('arrow-right', 14)
        ])
      ]),
      projects.length
        ? UI.el('div', { class: 'project-grid' }, projects.map(function (project) {
            return UI.projectCard(project);
          }))
        : UI.emptyState({
            icon: 'folder-kanban',
            title: 'No projects yet',
            body: 'You are not a member of any project. A Supervisor adds members from the project settings screen.'
          })
    ]);
  }

  /* --- View --------------------------------------------------------------- */
  Views.dashboard = {
    render: function () {
      var UI = global.UI;
      var user = global.AppState.currentUser();
      var openMine = global.AppState.tasksAssignedTo(user.id)
        .filter(TILES[0].match).length;

      return UI.el('div', { class: 'view' }, [
        header(user),
        tiles(user),
        openMine === 0 ? scopeNote(user) : null,
        UI.el('div', { class: 'dash-cols' }, [
          projectsPanel(user),
          recentPanel(user)
        ])
      ]);
    }
  };
}(window));
