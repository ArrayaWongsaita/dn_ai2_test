/* ===========================================================================
   S09 Create Task — the drawer that puts work on the board
   (docs/02 S09 · docs/03 Flow C · docs/06 §8).

   State-driven like the Task Detail drawer: state.createTaskProjectId is the
   single source of truth, sync() is the only entry point, and app.js calls it
   after every render. The two drawers share one Drawer singleton, so each
   sync() only ever closes a drawer whose key it owns (D48).

   Drafts live here, not in the store — typing must never cost a re-render.
   A picker does repaint the body, which is cheap and keeps the draft honest.

   docs/02 S09: "Prototype validation แค่ required field visual state" — so
   nothing is marked until Create has been pressed once (D49).
   =========================================================================== */

(function (global) {
  'use strict';

  var KEY = 'create-task:';

  /* { projectId, userId, title, description, assigneeId, collaboratorIds,
       priority, status, deadline, progress, submitted } */
  var draft = null;
  var pendingFocus = null;    /* data-control value to refocus after a repaint */
  var createdTaskId = null;   /* so closing hands focus to the new card */

  var PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  var QUICK = [0, 25, 50, 75, 100];

  var DEFAULTS = {
    title: '', description: '', assigneeId: null, collaboratorIds: [],
    priority: 'MEDIUM', status: 'TODO', deadline: null, progress: 0
  };

  function reset(projectId, userId) {
    draft = Object.assign({
      projectId: projectId, userId: userId, submitted: false
    }, DEFAULTS, { collaboratorIds: [] });
  }

  function isMine() {
    var key = global.Drawer.key();
    return !!key && key.indexOf(KEY) === 0;
  }

  /* An unsaved edit is anything at all typed or picked — docs/05 §2 guards the
     overlay click on exactly this, and abandoning a half-filled form by
     mis-clicking is the mistake worth catching (D30 keeps ESC unconditional). */
  function hasUnsavedEdits() {
    if (!draft) return false;
    return Object.keys(DEFAULTS).some(function (key) {
      if (key === 'collaboratorIds') return draft.collaboratorIds.length > 0;
      if (key === 'deadline') return !!draft.deadline;
      return draft[key] !== DEFAULTS[key];
    });
  }

  function errors() {
    var out = {};
    if (!draft) return out;
    /* docs/01 §6: Title, Project, Status, Priority and Assignee are required.
       Project comes from the board, Status and Priority ship with defaults —
       which leaves these two (D49). */
    if (!String(draft.title || '').trim()) out.title = 'A task needs a title.';
    if (!draft.assigneeId) out.assignee = 'Choose who owns this task.';
    return out;
  }

  /* Repaint without touching the store — a picker changed something only this
     module cares about. Mirrors TaskDetail.refresh(). */
  function refresh(focus) {
    if (!isMine()) return;
    pendingFocus = focus || null;
    global.Drawer.open(config(global.AppState.getProject(draft.projectId)));
  }

  /* --- Controls ----------------------------------------------------------- */

  /* Every select in this form is the house pattern: a button that opens a Menu.
     docs/05 §3 asks for the same lightweight controls the drawer already uses. */
  function select(config) {
    var UI = global.UI;
    var trigger = UI.el('button', {
      class: 'td-select td-select--input',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      dataset: { control: config.name },
      title: config.title,
      onclick: function () {
        global.Menu.toggle(trigger, config.build, {
          placement: 'bottom-start',
          width: config.width || 260,
          label: config.title
        });
      }
    }, [config.display, UI.icon('chevron-down', 16)]);
    return trigger;
  }

  function placeholder(text) {
    return global.UI.el('span', { class: 'td-select__placeholder', text: text });
  }

  function titleField() {
    var UI = global.UI;
    var input = UI.el('input', {
      class: 'input',
      id: 'ct-title',
      type: 'text',
      placeholder: 'What needs doing?',
      autocomplete: 'off',
      dataset: { control: 'title' },
      oninput: function (event) {
        draft.title = event.target.value;
        /* Clear the mark as soon as it stops being true — nagging a reader who
           is already fixing it is the thing that makes forms feel hostile. */
        if (draft.submitted && draft.title.trim()) UI.setFieldError(wrapper, null);
      }
    });
    input.value = draft.title;

    var wrapper = UI.field({
      label: 'Title', id: 'ct-title', name: 'title', required: true, control: input
    });
    return wrapper;
  }

  function descriptionField() {
    var UI = global.UI;
    var input = UI.el('textarea', {
      class: 'textarea',
      id: 'ct-description',
      rows: '3',
      placeholder: 'Context, links, what "done" looks like…',
      dataset: { control: 'description' },
      oninput: function (event) { draft.description = event.target.value; }
    });
    input.value = draft.description;

    return UI.field({
      label: 'Description', id: 'ct-description', name: 'description', control: input,
      hint: 'Optional. The full editor with formatting is in the task detail.'
    });
  }

  function assigneeField(c) {
    var UI = global.UI;
    var assignee = draft.assigneeId ? c.S.getUser(draft.assigneeId) : null;

    var control = select({
      name: 'assignee',
      title: 'Choose an assignee',
      width: 280,
      display: assignee
        ? UI.el('span', { class: 'td-person' }, [
            UI.avatar(assignee, { size: 'sm' }),
            UI.el('span', { text: assignee.name })
          ])
        : placeholder('Choose a project member'),
      /* docs/01 §5 rule 6 — only project members can hold a task (6.6). */
      build: function () {
        return [global.Menu.section('Project members')].concat(
          c.members.map(function (member) {
            return global.Menu.item({
              label: member.name,
              sublabel: global.Permissions.ROLE_LABEL[member.role] +
                (member.id === c.user.id ? ' · you' : ''),
              leading: UI.avatar(member, { size: 'sm' }),
              checked: member.id === draft.assigneeId,
              onclick: function () {
                draft.assigneeId = member.id;
                /* Nobody is both the owner and a collaborator. */
                draft.collaboratorIds = draft.collaboratorIds.filter(function (id) {
                  return id !== member.id;
                });
                refresh('assignee');
              }
            });
          })
        );
      }
    });

    return UI.field({
      label: 'Assignee', name: 'assignee', required: true, control: control,
      hint: 'One owner per task, and they must be a member of this project.'
    });
  }

  function collaboratorsField(c) {
    var UI = global.UI;
    var chosen = draft.collaboratorIds.map(c.S.getUser).filter(Boolean);
    var available = c.members.filter(function (m) {
      return m.id !== draft.assigneeId && draft.collaboratorIds.indexOf(m.id) === -1;
    });

    var chips = chosen.map(function (member) {
      return UI.el('button', {
        class: 'filter-chip',
        type: 'button',
        title: T('Remove {name}', { name: member.name }),
        onclick: function () {
          draft.collaboratorIds = draft.collaboratorIds.filter(function (id) {
            return id !== member.id;
          });
          refresh('collaborators');
        }
      }, [UI.avatar(member, { size: 'sm' }), UI.el('span', { text: member.name }), UI.icon('x', 14)]);
    });

    /* One pick per open — Menu.item closes the panel before it fires, so a
       real multi-select would fight the primitive. Chips plus a repeatable
       Add reads better anyway. */
    var add = UI.el('button', {
      class: 'btn btn--secondary btn--sm',
      type: 'button',
      dataset: { control: 'collaborators' },
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      disabled: available.length ? null : 'disabled',
      title: available.length
        ? 'Add a collaborator'
        : 'Every other project member is already on this task',
      onclick: function () {
        global.Menu.toggle(add, function () {
          return [global.Menu.section('Project members')].concat(
            available.map(function (member) {
              return global.Menu.item({
                label: member.name,
                sublabel: global.Permissions.ROLE_LABEL[member.role],
                leading: UI.avatar(member, { size: 'sm' }),
                onclick: function () {
                  draft.collaboratorIds = draft.collaboratorIds.concat([member.id]);
                  refresh('collaborators');
                }
              });
            })
          );
        }, { placement: 'bottom-start', width: 260, label: 'Add a collaborator' });
      }
    }, [UI.icon('user-plus', 14), 'Add']);

    return UI.field({
      label: 'Collaborators', name: 'collaborators',
      control: UI.el('div', { class: 'chip-row' },
        chips.concat([chosen.length ? null : UI.el('span', {
          class: 'chip-row__empty', text: 'Nobody else yet.'
        }), add]))
    });
  }

  function priorityField() {
    var UI = global.UI;
    var control = select({
      name: 'priority',
      title: 'Choose a priority',
      width: 220,
      display: UI.priorityBadge(draft.priority),
      build: function () {
        return PRIORITIES.map(function (priority) {
          return global.Menu.item({
            label: UI.PRIORITY_LABEL[priority],
            leading: UI.el('span', { class: 'td-dot td-dot--' + priority.toLowerCase() }),
            checked: priority === draft.priority,
            onclick: function () { draft.priority = priority; refresh('priority'); }
          });
        });
      }
    });
    return UI.field({ label: 'Priority', name: 'priority', control: control });
  }

  function statusField() {
    var UI = global.UI;
    var S = global.AppState;
    var control = select({
      name: 'status',
      title: 'Choose a starting status',
      width: 260,
      display: UI.statusBadge(draft.status),
      build: function () {
        return S.STATUSES.map(function (status) {
          return global.Menu.item({
            label: UI.STATUS_LABEL[status],
            leading: UI.el('span', { class: 'td-dot td-dot--' + status.toLowerCase() }),
            sublabel: status === 'COMPLETED' ? 'Starts at 100% progress' : null,
            checked: status === draft.status,
            onclick: function () {
              draft.status = status;
              /* docs/01 §5 rule 11, one way only. */
              if (status === 'COMPLETED') draft.progress = 100;
              refresh('status');
            }
          });
        });
      }
    });
    return UI.field({
      label: 'Status', name: 'status', control: control,
      hint: draft.status === 'TODO' ? 'New work normally starts in To Do.' : null
    });
  }

  function deadlineField() {
    var UI = global.UI;
    var input = UI.el('input', {
      class: 'input td-date',
      id: 'ct-deadline',
      type: 'date',
      dataset: { control: 'deadline' },
      onchange: function (event) {
        draft.deadline = UI.fromDateInputValue(event.target.value);
      }
    });
    input.value = UI.toDateInputValue(draft.deadline);

    return UI.field({
      label: 'Deadline', id: 'ct-deadline', name: 'deadline', control: input,
      hint: 'Optional. Leave it empty and the card shows no deadline chip.'
    });
  }

  function progressField() {
    var UI = global.UI;
    var value = UI.el('span', { class: 'td-progress__value', text: draft.progress + '%' });
    var bar = UI.progressBar(draft.progress, { label: 'Initial progress' });

    var range = UI.el('input', {
      class: 'range',
      id: 'ct-progress',
      type: 'range', min: '0', max: '100', step: '5',
      dataset: { control: 'progress' },
      oninput: function (event) {
        draft.progress = Number(event.target.value);
        value.textContent = draft.progress + '%';
        var fill = bar.querySelector('.progress__fill');
        if (fill) fill.style.width = draft.progress + '%';
      }
    });
    range.value = String(draft.progress);

    var chips = QUICK.map(function (step) {
      return UI.el('button', {
        class: 'td-chip' + (step === draft.progress ? ' is-active' : ''),
        type: 'button',
        onclick: function () { draft.progress = step; refresh('progress'); }
      }, step + '%');
    });

    return UI.field({
      label: 'Progress initial value', name: 'progress',
      control: UI.el('div', { class: 'td-progress' }, [
        UI.el('div', { class: 'td-progress__top' }, [bar, value]),
        range,
        UI.el('div', { class: 'td-progress__quick' }, chips)
      ])
    });
  }

  /* --- Submit ------------------------------------------------------------- */
  function submit() {
    var bad = errors();
    var keys = Object.keys(bad);

    if (keys.length) {
      draft.submitted = true;
      refresh(keys[0]);
      global.Toast.warning(
        keys.length === 1 ? 'One field still needs an answer' : 'Two fields still need an answer',
        { detail: keys.map(function (k) { return T(bad[k]); }).join(' ') }
      );
      return;
    }

    var created = global.TaskActions.createTask(draft.projectId, draft);
    /* createTask clears state.createTaskProjectId itself, so the render it
       triggers is what closes this drawer — one repaint, and the new card keeps
       its landed pulse. */
    if (created) createdTaskId = created.id;
  }

  /* --- Render ------------------------------------------------------------- */
  function render(project) {
    var UI = global.UI;
    var S = global.AppState;

    var c = {
      S: S,
      project: project,
      user: S.currentUser(),
      division: S.getDivision(project.divisionId),
      /* Active members only: a deactivated person is out of every picker (D61). */
      members: S.assignableMembers(project.id)
    };

    var bad = draft.submitted ? errors() : {};

    var fields = [
      titleField(),
      descriptionField(),
      assigneeField(c),
      collaboratorsField(c),
      UI.el('div', { class: 'td-form__row' }, [priorityField(), statusField()]),
      deadlineField(),
      progressField()
    ];

    var body = UI.el('div', { class: 'td-body' }, [
      UI.el('div', { class: 'td-form' }, fields),
      c.members.length
        ? null
        : UI.el('p', { class: 'td-note' }, [
            UI.icon('alert-triangle', 14),
            UI.el('span', {
              text: T('{name} has no members yet, so nobody can be assigned. Add a member in project settings first.', {
                name: project.name })
            })
          ])
    ]);

    var head = UI.el('header', { class: 'td-head' }, [
      UI.el('div', { class: 'td-head__top' }, [
        UI.badge('New task', 'purple', { dot: false, icon: 'plus' }),
        UI.el('span', { class: 'spacer' }),
        UI.el('button', {
          class: 'btn btn--icon',
          type: 'button',
          title: 'Close (Esc)',
          'aria-label': 'Close the create task form',
          onclick: function () { requestClose(); }
        }, UI.icon('x', 18))
      ]),
      UI.el('h2', { class: 'td-head__title', text: 'Create task' }),
      UI.el('p', { class: 'td-head__meta' }, [
        UI.el('span', { text: project.name }),
        UI.el('span', { class: 'td-head__dot' }),
        UI.el('span', { text: c.division ? c.division.name : 'No division' }),
        UI.el('span', { class: 'td-head__dot' }),
        UI.el('span', { text: T('Created by {name}', { name: c.user.name }) })
      ])
    ]);

    var foot = UI.el('div', { class: 'td-foot' }, [
      UI.el('span', {
        class: 'td-foot__note',
        text: T('Lands in {status}.', { status: UI.STATUS_LABEL[draft.status] })
      }),
      UI.el('span', { class: 'spacer' }),
      UI.el('button', {
        class: 'btn btn--secondary',
        type: 'button',
        onclick: function () { requestClose(); }
      }, 'Cancel'),
      UI.el('button', {
        class: 'btn btn--primary',
        type: 'button',
        dataset: { control: 'create' },
        onclick: submit
      }, [UI.icon('plus', 16), 'Create Task'])
    ]);

    /* Mark the fields the last Create press found wanting, then put the reader
       on the first one — or back on the control they were just using. */
    requestAnimationFrame(function () {
      if (!body.isConnected) return;

      Object.keys(bad).forEach(function (name) {
        UI.setFieldError(body.querySelector('[data-field="' + name + '"]'), bad[name]);
      });

      var focus = pendingFocus;
      pendingFocus = null;
      var node = focus ? body.querySelector('[data-control="' + focus + '"]') : null;
      if (node && !node.disabled) node.focus();
    });

    return UI.el('div', { class: 'td' }, [head, body, foot]);
  }

  /* --- Open / close ------------------------------------------------------- */
  function config(project) {
    return {
      key: KEY + project.id,
      label: T('Create a task in {name}', { name: project.name }),
      render: function () { return render(project); },
      hasUnsavedEdits: hasUnsavedEdits,
      /* A form drawer opens with the cursor in the first field, not on the
         close button the generic shell would pick. onOpen fires on a first
         mount and on a key change, which is exactly when that is right. */
      onOpen: function (panel) {
        var title = panel.querySelector('#ct-title');
        if (title) title.focus();
      },
      onBlockedClose: function (panel) {
        global.Drawer.nudge(panel);
        global.Toast.warning('This form has something in it', {
          detail: 'Press Esc or Cancel to discard it.'
        });
      },
      onClose: afterClose,
      returnFocusTo: function () {
        return (createdTaskId && document.querySelector('[data-task-id="' + createdTaskId + '"]')) ||
          document.querySelector('.board__actions .btn--primary');
      }
    };
  }

  function requestClose() { global.Drawer.close(); }

  function afterClose() {
    draft = null;
    if (global.AppState.getState().createTaskProjectId) {
      global.AppState.setState({ createTaskProjectId: null });
    }
  }

  /* The single entry point: app.js calls this after every render, right after
     TaskDetail.sync(). */
  function sync() {
    var S = global.AppState;
    var state = S.getState();
    var user = S.currentUser();
    var id = state.createTaskProjectId;
    var project = id ? S.getProject(id) : null;

    var allowed = !!project && !!user &&
      S.canSeeProject(user.id, project.id) &&
      global.Permissions.can('createTask', { user: user, project: project });

    if (!allowed) {
      /* Only ever close our own drawer — the detail drawer may be the one that
         is up (D48). */
      if (isMine()) global.Drawer.close({ silent: true });
      draft = null;

      if (id) {
        /* Silent: sync() runs at the end of a render, and this is bookkeeping
           the same way the router's activeRoute write is (D14). */
        S.setState({ createTaskProjectId: null }, { silent: true });
        if (project && user) {
          global.Toast.info('Only a Supervisor or Super Admin can create a task', {
            detail: 'The form closed when you switched persona.'
          });
        }
      }
      return;
    }

    if (!draft || draft.projectId !== project.id || draft.userId !== user.id) {
      reset(project.id, user.id);
      createdTaskId = null;
    }
    global.Drawer.open(config(project));
  }

  global.TaskCreate = {
    sync: sync,
    open: function (projectId) {
      global.AppState.setState({ createTaskProjectId: projectId, selectedTaskId: null });
    },
    requestClose: requestClose,
    hasUnsavedEdits: hasUnsavedEdits,
    refresh: refresh
  };
}(window));
