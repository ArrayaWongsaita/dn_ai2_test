/* S07 Kanban Board (docs/02 S07) + S12 Project Settings placeholder.

   Board layout: a fixed header, then a column strip that scrolls sideways
   while each column scrolls on its own. Four columns by default; Blocked is
   a toggle and Cancelled never gets a column (TODO.md D2, docs/01 §7).

   Drag & drop lives in js/interactions.js — this file only draws, wires the
   drop handler to TaskActions.moveTask, and keeps the scroll position across
   the re-render a drop causes.

   Clicking a card is a plain anchor to #/tasks/:id: the router records the id
   and js/task-detail.js opens the drawer over the board. The board's only part
   in that is marking the card is-selected so the reader can see which one the
   drawer belongs to.

   Search and the three filters (docs/05 §11) read and write state.filters,
   which carries the project it belongs to so another board never inherits them
   (TODO.md D38). Filtering narrows what each column shows; it never hides the
   way back — the count reads "n of m" and a board filtered down to nothing
   keeps its columns and says how to undo it (D39). */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  var MAIN_COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];

  /* Each column says what belongs in it while it is empty, and what dropping
     something there would mean (docs/05 §10 — explain the next action). */
  var EMPTY_COLUMN = {
    TODO:        { title: 'Nothing to do',        hint: 'Drop a task here to put it back in the queue' },
    IN_PROGRESS: { title: 'Nothing in progress',  hint: 'Drop a task here when work starts on it' },
    REVIEW:      { title: 'Nothing to review',    hint: 'Drop a task here when it is ready to check' },
    COMPLETED:   { title: 'Nothing completed yet',hint: 'Drop a task here to finish it — progress jumps to 100%' },
    BLOCKED:     { title: 'Nothing blocked',      hint: 'Drop a task here when it is stuck on someone else' }
  };

  var DEADLINE_FILTERS = ['overdue', 'due-today', 'due-soon', 'upcoming', 'none'];

  /* A drop re-renders the whole board. Without this the stakeholder would be
     thrown back to the top-left of the board on every single move. */
  var scrollMemory = { projectId: null, x: 0, columns: {} };
  var lastSelectedTaskId = null;

  /* The search input is cached rather than rebuilt: every keystroke writes to
     the store, which replaces this whole view. Re-appending the same node keeps
     the text, and the caret is put back on the next frame. */
  var searchBox = null;
  var searchFocused = false;
  var searchCaret = null;
  /* Open only while a keystroke's own re-render is running. Chrome fires blur
     when the focused node is replaced, and that blur must not be read as "the
     reader left the box" — otherwise the search would accept one character and
     then go deaf. Every setState here is synchronous, so the window is exact. */
  var repainting = false;

  function rememberProject(projectId) {
    if (scrollMemory.projectId === projectId) return;
    scrollMemory = { projectId: projectId, x: 0, columns: {} };
  }

  /* --- Filters ------------------------------------------------------------ */

  /* Always writes projectId, so the filters belong to this board alone (D38);
     filtersFor() hands back a clean base when the reader has walked elsewhere. */
  function setFilter(projectId, patch) {
    var S = global.AppState;
    S.setState({
      filters: Object.assign({}, S.filtersFor(projectId), patch, { projectId: projectId })
    });
  }

  /* Writes a filter from inside the search box and hands the caret straight
     back. setState re-renders synchronously, so by the time it returns the very
     same input node is back on the page — waiting for the next frame would drop
     any keystroke typed in between, which is exactly what fast typing does. */
  function setFilterFromSearch(input, projectId, patch) {
    repainting = true;
    try {
      setFilter(projectId, patch);
      if (input.isConnected) restoreCaret(input);
    } finally {
      repainting = false;
    }
  }

  function restoreCaret(input) {
    input.focus();
    if (searchCaret === null) return;
    try { input.setSelectionRange(searchCaret, searchCaret); } catch (e) { /* type=search */ }
  }

  function clearFilters() {
    global.AppState.setState({ filters: global.AppState.NO_FILTERS });
    global.Toast.info('Filters cleared');
  }

  function buildSearchBox() {
    var UI = global.UI;

    var input = UI.el('input', {
      class: 'input board__search-input',
      type: 'search',
      placeholder: 'Search cards',
      autocomplete: 'off',
      title: 'Filter the cards on this board by title',
      'aria-label': 'Search cards on this board',
      oninput: function (event) {
        searchCaret = event.target.selectionStart;
        searchFocused = true;
        setFilterFromSearch(input, input.dataset.projectId, { search: event.target.value });
      },
      onfocus: function () { searchFocused = true; },
      onblur: function () { if (!repainting) searchFocused = false; },
      onkeydown: function (event) {
        if (event.key !== 'Escape' || !input.value) return;
        event.stopPropagation();
        searchCaret = 0;
        searchFocused = true;
        setFilterFromSearch(input, input.dataset.projectId, { search: '' });
      }
    });

    var wrap = UI.el('span', { class: 'input-with-icon board__search' }, [
      UI.icon('search', 16),
      input
    ]);

    return { wrap: wrap, input: input };
  }

  function searchControl(ctx) {
    if (!searchBox) searchBox = buildSearchBox();
    searchBox.input.dataset.projectId = ctx.project.id;
    searchBox.input.value = ctx.filters.search || '';

    /* Fallback for a re-render the box did not cause — picking a dropdown
       option, say. The typing path restores focus synchronously instead. */
    if (searchFocused && !repainting) {
      requestAnimationFrame(function () {
        if (!searchBox || !searchBox.input.isConnected) return;
        if (document.activeElement === searchBox.input) return;
        restoreCaret(searchBox.input);
      });
    }

    return searchBox.wrap;
  }

  /* One dropdown shape for all three filters: a "clear" row first, then the
     options, each marked when it is the active one. */
  function filterDropdown(config) {
    var UI = global.UI;
    var Menu = global.Menu;

    var button = UI.el('button', {
      class: 'btn btn--secondary btn--sm board__filter' + (config.value ? ' is-on' : ''),
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: config.value ? T(config.label) + ': ' + T(config.activeLabel) : T('Filter by {what}', { what: T(config.label).toLowerCase() }),
      onclick: function () {
        Menu.toggle(button, function () {
          var items = [Menu.section(config.label)];

          items.push(Menu.item({
            label: config.anyLabel,
            icon: 'x',
            checked: !config.value,
            onclick: function () { config.onPick(null); }
          }));
          items.push(Menu.separator());

          config.options.forEach(function (option) {
            items.push(Menu.item({
              label: option.label,
              sublabel: option.sublabel,
              leading: option.leading,
              icon: option.icon,
              checked: option.value === config.value,
              onclick: function () { config.onPick(option.value); }
            }));
          });

          return items;
        }, { placement: 'bottom-start', width: 248, label: T('{what} filter', { what: T(config.label) }) });
      }
    }, [
      config.icon ? UI.icon(config.icon, 14) : null,
      UI.el('span', {
        class: 'board__filter-label',
        text: config.value ? config.activeLabel : config.label
      }),
      UI.icon('chevron-down', 14)
    ]);

    return button;
  }

  function filterRow(ctx) {
    var UI = global.UI;
    var S = global.AppState;
    var projectId = ctx.project.id;
    var f = ctx.filters;

    var assignee = f.assigneeId ? S.getUser(f.assigneeId) : null;

    var controls = [
      searchControl(ctx),

      filterDropdown({
        label: 'Assignee',
        anyLabel: 'Anyone',
        icon: 'user',
        value: f.assigneeId,
        activeLabel: assignee ? assignee.name : 'Anyone',
        /* docs/01 §5 rule 6 — only project members can hold a task. */
        options: ctx.members.map(function (member) {
          return {
            value: member.id,
            label: member.name,
            sublabel: global.Permissions.ROLE_LABEL[member.role],
            leading: UI.avatar(member, { size: 'sm' })
          };
        }),
        onPick: function (value) { setFilter(projectId, { assigneeId: value }); }
      }),

      filterDropdown({
        label: 'Priority',
        anyLabel: 'Any priority',
        icon: 'alert-circle',
        value: f.priority,
        activeLabel: UI.PRIORITY_LABEL[f.priority] || 'Any priority',
        options: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(function (priority) {
          return {
            value: priority,
            label: UI.PRIORITY_LABEL[priority],
            leading: UI.el('span', {
              class: 'dot-swatch dot-swatch--' + UI.PRIORITY_VARIANT[priority],
              'aria-hidden': 'true'
            })
          };
        }),
        onPick: function (value) { setFilter(projectId, { priority: value }); }
      }),

      filterDropdown({
        label: 'Deadline',
        anyLabel: 'Any deadline',
        icon: 'calendar',
        value: f.deadlineState,
        activeLabel: UI.DEADLINE_LABEL[f.deadlineState] || 'Any deadline',
        /* The docs/01 §9 states, in the order that spec lists them. */
        options: DEADLINE_FILTERS.map(function (state) {
          return { value: state, label: UI.DEADLINE_LABEL[state] };
        }),
        onPick: function (value) { setFilter(projectId, { deadlineState: value }); }
      })
    ];

    controls.push(UI.el('span', { class: 'spacer' }));

    if (ctx.activeFilters) {
      controls.push(UI.el('span', {
        class: 'board__filter-count',
        text: T('{n} of {total} cards · {filters} active', {
          n: ctx.matching, total: ctx.inColumns, filters: UI.plural(ctx.activeFilters, 'filter') })
      }));
      controls.push(UI.el('button', {
        class: 'btn btn--ghost btn--sm',
        type: 'button',
        title: 'Remove every filter and show all cards again',
        onclick: clearFilters
      }, [UI.icon('x', 14), 'Clear all']));
    } else {
      controls.push(UI.el('span', {
        class: 'board__filter-count is-idle',
        text: 'No filters — showing every card'
      }));
    }

    return UI.el('div', { class: 'board__filters', role: 'search' }, controls);
  }

  /* --- Column ------------------------------------------------------------- */
  function renderColumn(status, tasks, total, ctx) {
    var UI = global.UI;
    var empty = EMPTY_COLUMN[status];
    var filtered = ctx.activeFilters > 0;

    var body = UI.el('div', {
      class: 'column__body',
      onscroll: function (event) { scrollMemory.columns[status] = event.target.scrollTop; }
    }, [
      tasks.map(function (task) {
        var card = UI.taskCard(task, {
          selected: task.id === ctx.selectedTaskId,
          landed: task.id === ctx.landedTaskId
        });
        global.DragDrop.card(card, task);
        return card;
      }),
      tasks.length
        ? null
        : UI.el('div', { class: 'column__empty' }, filtered && total
            /* Hidden by a filter, not genuinely empty — say which. */
            ? [
                UI.el('span', { class: 'column__empty-title', text: 'No matching cards' }),
                UI.el('span', {
                  class: 'column__empty-hint',
                  text: T(total === 1 ? '{cards} here is hidden by the current filters' : '{cards} here are hidden by the current filters', { cards: UI.plural(total, 'card') })
                })
              ]
            : [
                UI.el('span', { class: 'column__empty-title', text: empty.title }),
                UI.el('span', { class: 'column__empty-hint', text: empty.hint })
              ]),
      /* Revealed only while a card is dragged over this column. */
      UI.el('div', { class: 'column__dropzone', 'aria-hidden': 'true' }, [
        UI.icon('arrow-right', 14),
        UI.el('span', { text: T('Move to {status}', { status: UI.STATUS_LABEL[status] }) })
      ])
    ]);

    ctx.bodies[status] = body;

    var showsSplit = filtered && tasks.length !== total;

    var column = UI.el('section', {
      class: 'column column--' + status.toLowerCase(),
      dataset: { status: status },
      'aria-label': UI.STATUS_LABEL[status] + ' — ' + (showsSplit
        ? T('{n} of {total} shown', { n: UI.plural(tasks.length, 'task'), total: total })
        : UI.plural(tasks.length, 'task'))
    }, [
      UI.el('header', { class: 'column__head' }, [
        UI.el('h2', { class: 'column__name', text: UI.STATUS_LABEL[status] }),
        UI.el('span', {
          class: 'column__count' + (showsSplit ? ' is-filtered' : ''),
          title: showsSplit
            ? T('{n} of {total} shown — the rest are filtered out', { n: tasks.length, total: UI.plural(total, 'task') })
            : T('{tasks} in {status}', { tasks: UI.plural(tasks.length, 'task'), status: UI.STATUS_LABEL[status] }),
          text: showsSplit ? T('{n} of {total}', { n: tasks.length, total: total }) : String(tasks.length)
        })
      ]),
      body
    ]);

    global.DragDrop.column(column, status, function (taskId, toStatus) {
      global.TaskActions.moveTask(taskId, toStatus);
    });

    return column;
  }

  /* --- Header ------------------------------------------------------------- */
  function renderHeader(ctx) {
    var UI = global.UI;
    var S = global.AppState;
    var P = global.Permissions;
    var project = ctx.project;
    var user = ctx.user;

    var meta = [
      UI.el('span', { text: T('{tasks} on the board', { tasks: UI.plural(ctx.onBoard, 'task') }) })
    ];

    if (ctx.doneCount) {
      meta.push(UI.el('span', { class: 'board__meta-dot' }));
      meta.push(UI.el('span', { text: T('{n} completed', { n: ctx.doneCount }) }));
    }
    if (ctx.overdueCount) {
      meta.push(UI.el('span', { class: 'board__meta-dot' }));
      meta.push(UI.el('span', { class: 'text-danger', text: T('{n} overdue', { n: ctx.overdueCount }) }));
    }
    if (ctx.cancelledCount) {
      meta.push(UI.el('span', {
        class: 'board__hidden-chip',
        title: 'Cancelled tasks have no column — they are reachable through the filters and the task status dropdown.'
      }, [UI.icon('ban', 12), UI.el('span', { text: T('{n} cancelled, hidden', { n: ctx.cancelledCount }) })]));
    }

    /* D71 — while the demo toggle is on, the board says so, so a presenter
       never mistakes a scripted revert for a real bug. */
    if (S.getState().simulateFailure) {
      meta.push(UI.el('span', { class: 'board__fail-chip', role: 'status' }, [
        UI.icon('alert-triangle', 12),
        UI.el('span', { text: 'Failure simulation on' }),
        UI.el('button', {
          class: 'board__fail-off',
          type: 'button',
          title: 'Turn failure simulation off',
          onclick: function () {
            S.setState({ simulateFailure: false });
            global.Toast.info('Failure simulation off');
          }
        }, 'Turn off')
      ]));
    }

    var actions = [];

    if (ctx.members.length) {
      actions.push(UI.el('span', { class: 'board__members' }, [
        UI.el('span', { class: 'board__members-label', text: 'Members' }),
        UI.avatarStack(ctx.members, { max: 5 })
      ]));
    }

    actions.push(UI.el('button', {
      class: 'btn btn--secondary',
      type: 'button',
      'aria-pressed': ctx.showBlocked ? 'true' : 'false',
      title: ctx.showBlocked
        ? 'Hide the Blocked column'
        : 'Show the Blocked column — blocked tasks are off the board by default',
      onclick: function () { S.setState({ showBlockedColumn: !ctx.showBlocked }); }
    }, [
      UI.icon(ctx.showBlocked ? 'eye-off' : 'eye', 16),
      T(ctx.showBlocked ? 'Hide Blocked ({n})' : 'Show Blocked ({n})', { n: ctx.blockedCount })
    ]));

    /* The only way into S12 — the route has always resolved, but nothing
       linked to it before Wave 6. docs/04: hidden for a User, not disabled. */
    if (P.can('viewProjectSettings', { user: user, project: project })) {
      actions.push(UI.el('a', {
        class: 'btn btn--secondary',
        href: '#/projects/' + project.id + '/settings',
        title: 'Project info, members and archive'
      }, [UI.icon('settings', 16), 'Settings']));
    }

    /* docs/04: a normal User never sees this button at all. */
    if (P.can('createTask', { user: user, project: project })) {
      actions.push(UI.el('button', {
        class: 'btn btn--primary',
        type: 'button',
        title: T('Add a task to {name}', { name: project.name }),
        onclick: function () { global.TaskCreate.open(project.id); }
      }, [UI.icon('plus', 16), 'Add Task']));
    }

    return UI.el('header', { class: 'board__header' }, [
      UI.el('div', { class: 'board__title-row' }, [
        UI.el('h1', { class: 'page-title', text: project.name }),
        UI.badge(ctx.division ? ctx.division.name : 'No division', 'purple', { dot: false }),
        UI.el('span', { class: 'spacer' }),
        UI.el('div', { class: 'board__actions' }, actions)
      ]),
      UI.el('p', { class: 'board__meta' }, meta),
      /* A project with no tasks has nothing to filter (D21 owns that case). */
      ctx.onBoard ? filterRow(ctx) : null
    ]);
  }

  /* --- View -------------------------------------------------------------- */
  Views.board = {
    render: function (params) {
      var UI = global.UI;
      var S = global.AppState;
      var P = global.Permissions;

      var project = S.getProject(params.projectId);
      var user = S.currentUser();
      var state = S.getState();
      var grouped = S.tasksByStatus(project.id);

      rememberProject(project.id);

      var showBlocked = !!state.showBlockedColumn;
      var columns = MAIN_COLUMNS.concat(showBlocked ? ['BLOCKED'] : []);
      var onBoardTasks = MAIN_COLUMNS.concat(['BLOCKED']).reduce(function (all, status) {
        return all.concat(grouped[status]);
      }, []);

      var selectedTask = params.taskId ? S.getTask(params.taskId) : null;
      if (selectedTask && selectedTask.projectId !== project.id) selectedTask = null;

      /* What the filters let through, counted over the columns actually on
         screen — so the number in the filter row matches what the reader sees. */
      var visibleTasks = columns.reduce(function (all, status) {
        return all.concat(grouped[status]);
      }, []);
      var matching = S.filterTasks(visibleTasks, project.id);

      var ctx = {
        project: project,
        user: user,
        division: S.getDivision(project.divisionId),
        /* Everyone, including anyone deactivated in S10: these feed the header
           avatar stack and the assignee filter, and you must still be able to
           see and filter a deactivated person's work (D61). */
        members: project.memberIds.map(S.getUser).filter(Boolean),
        showBlocked: showBlocked,
        blockedCount: grouped.BLOCKED.length,
        cancelledCount: grouped.CANCELLED.length,
        onBoard: onBoardTasks.length,
        inColumns: visibleTasks.length,
        doneCount: grouped.COMPLETED.length,
        overdueCount: onBoardTasks.filter(function (t) {
          return S.deadlineState(t) === 'overdue';
        }).length,
        filters: S.filtersFor(project.id),
        activeFilters: S.activeFilterCount(project.id),
        matching: matching.length,
        selectedTaskId: selectedTask ? selectedTask.id : null,
        landedTaskId: global.TaskActions.consumeLanded(),
        bodies: {}
      };

      var view = UI.el('div', { class: 'view view--board' }, renderHeader(ctx));

      var strip;
      if (onBoardTasks.length === 0 && ctx.cancelledCount === 0) {
        /* docs/05 §10 — a project with no tasks says what happens next
           instead of showing five empty columns. */
        strip = UI.el('div', { class: 'board__blank' }, UI.emptyState({
          icon: 'folder-kanban',
          title: T('No tasks in {name} yet', { name: project.name }),
          body: P.can('createTask', { user: user, project: project })
            ? 'Add the first task and it lands in To Do, ready to drag across the board.'
            : 'Nothing has been assigned in this project. A Supervisor adds the first task.',
          action: P.can('createTask', { user: user, project: project })
            ? UI.el('button', {
                class: 'btn btn--primary',
                type: 'button',
                onclick: function () { global.TaskCreate.open(project.id); }
              }, [UI.icon('plus', 16), 'Add Task'])
            : null
        }));
      } else {
        strip = UI.el('div', {
          class: 'board__columns',
          onscroll: function (event) { scrollMemory.x = event.target.scrollLeft; }
        }, columns.map(function (status) {
          return renderColumn(
            status,
            S.filterTasks(grouped[status], project.id),
            grouped[status].length,
            ctx
          );
        }));
      }

      /* D39 — filtered down to nothing keeps the columns and keeps the exit
         visible. Never a board the reader cannot get back out of. */
      if (ctx.inColumns > 0 && ctx.activeFilters > 0 && ctx.matching === 0) {
        view.appendChild(UI.el('div', { class: 'board__no-match' }, [
          UI.icon('filter', 16),
          UI.el('span', {
            class: 'board__no-match-text',
            text: T('No card on this board matches the current filters — all {n} are hidden.', { n: ctx.inColumns })
          }),
          UI.el('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onclick: clearFilters
          }, [UI.icon('x', 14), 'Clear all filters'])
        ]));
      }

      view.appendChild(strip);

      /* Restore where the board was before the re-render, then let a freshly
         deep-linked task pull itself into view. */
      requestAnimationFrame(function () {
        if (!strip.isConnected) return;
        if (strip.classList.contains('board__columns')) strip.scrollLeft = scrollMemory.x;
        Object.keys(ctx.bodies).forEach(function (status) {
          ctx.bodies[status].scrollTop = scrollMemory.columns[status] || 0;
        });

        if (ctx.selectedTaskId && ctx.selectedTaskId !== lastSelectedTaskId) {
          var card = strip.querySelector('.task-card.is-selected');
          if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        lastSelectedTaskId = ctx.selectedTaskId;
      });

      return view;
    }
  };

}(window));
