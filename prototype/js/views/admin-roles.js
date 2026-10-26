/* ===========================================================================
   S12 Role Management — PROTOTYPE for wayfinder ticket #9 (Wave 7 extension).

   Throwaway: roles live in this module's memory, not in AppState, and nothing
   here changes what Permissions.can() answers for the personas. The question
   it answers is "how should a Super Admin create and edit a Role?":
     - list of Roles with user counts
     - create / edit screen: name, Permission picker grouped from the Catalog
     - Cross-Division flags (view-all required by act-all)
     - Super Admin locked; Super-Admin-only Permissions not grantable
     - delete blocked while Users hold the Role
   Permission Catalog = ticket "Permission Catalog" (18 Permissions).
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  /* --- The Catalog (fixed in code; the UI cannot add to it) -------------- */
  var GROUPS = [
    { id: 'task', title: 'Tasks', perms: [
      ['task:create', 'Create tasks', 'Add a task to a project'],
      ['task:archive', 'Archive tasks', 'Archive only — nobody can hard-delete'],
      ['task:edit-core', 'Edit title & collaborators', 'The framing of a task'],
      ['task:set-priority', 'Set priority', ''],
      ['task:set-deadline', 'Set deadline', ''],
      ['task:change-status', 'Change status', 'Includes drag & drop on the board'],
      ['task:update-progress', 'Update progress', '0–100%'],
      ['task:edit-content', 'Edit description & attachments', '']
    ] },
    { id: 'reassign', title: 'Reassign', perms: [
      ['task:reassign-own', 'Reassign own tasks', 'Only tasks where they are the assignee'],
      ['task:reassign-any', 'Reassign any task', 'Implies reassigning their own']
    ] },
    { id: 'org', title: 'Organisation', perms: [
      ['division:create', 'Create divisions', 'System-level, not tied to a membership'],
      ['division:assign-supervisor', 'Assign division supervisor', ''],
      ['project:create', 'Create projects', 'Only in divisions they belong to'],
      ['project:manage-members', 'Manage project members', '']
    ] },
    { id: 'cross', title: 'Cross-Division', cross: true, perms: [
      ['division:view-all', 'View all divisions', 'Read everything, beyond their memberships'],
      ['division:act-all', 'Act in all divisions', 'Their other Permissions work everywhere. Needs “View all”']
    ] },
    { id: 'admin', title: 'Administration', perms: [
      ['user:manage', 'Manage users', 'Create, deactivate, assign a Role'],
      ['role:manage', 'Manage roles', 'Create, edit and delete Roles']
    ] }
  ];
  var SUPER_ADMIN_ONLY = ['user:manage', 'role:manage'];
  var ALL = [];
  GROUPS.forEach(function (g) { g.perms.forEach(function (p) { ALL.push(p[0]); }); });

  function tasksAll() { return ALL.filter(function (k) { return k.indexOf('task:') === 0 && k !== 'task:reassign-own' && k !== 'task:reassign-any'; }); }

  /* --- Mock role store ---------------------------------------------------- */
  var roles = [
    { id: 'r-sa', name: 'Super Admin', superAdmin: true, perms: ALL.slice(), mockUsers: 0, stateRole: 'SUPER_ADMIN' },
    { id: 'r-sup', name: 'Supervisor', perms: tasksAll().concat(['task:reassign-any', 'project:create', 'project:manage-members']), mockUsers: 0, stateRole: 'SUPERVISOR' },
    { id: 'r-usr', name: 'User', perms: ['task:change-status', 'task:update-progress', 'task:edit-content', 'task:reassign-own'], mockUsers: 0, stateRole: 'USER' },
    { id: 'r-aud', name: 'Auditor', perms: ['division:view-all'], mockUsers: 2 }
  ];
  var seq = 0;
  var draft = null;     /* { id|null, name, perms:{}, submitted } */

  function repaint() { global.AppState.setState({ _rolesRev: ++seq }); }
  function byId(id) { return roles.filter(function (r) { return r.id === id; })[0]; }
  function userCount(role) {
    if (!role.stateRole) return role.mockUsers;
    return global.AppState.getState().users.filter(function (u) { return u.role === role.stateRole; }).length;
  }
  function isSeeded(role) { return !!role.stateRole && !role.superAdmin; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* --- Validation --------------------------------------------------------- */
  function nameError() {
    var name = draft.name.trim();
    if (!name) return 'A role needs a name.';
    if (name.toLowerCase() === 'super admin') return '“Super Admin” is reserved.';
    var clash = roles.some(function (r) { return r.id !== draft.id && r.name.toLowerCase() === name.toLowerCase(); });
    return clash ? 'Another role already has that name.' : null;
  }

  /* --- Picker ------------------------------------------------------------- */
  function toggle(key, on) {
    if (on) {
      draft.perms[key] = true;
      if (key === 'division:act-all') draft.perms['division:view-all'] = true;
      if (key === 'task:reassign-any') draft.perms['task:reassign-own'] = true;
    } else {
      delete draft.perms[key];
      if (key === 'division:view-all') delete draft.perms['division:act-all'];
      if (key === 'task:reassign-own') delete draft.perms['task:reassign-any'];
    }
    repaint();
  }

  function permRow(group, perm) {
    var UI = global.UI;
    var key = perm[0];
    var locked = SUPER_ADMIN_ONLY.indexOf(key) !== -1;
    var on = !!draft.perms[key];
    var box = UI.el('input', {
      type: 'checkbox', id: 'perm-' + key, disabled: locked ? 'disabled' : null,
      onchange: function (e) { toggle(key, e.target.checked); }
    });
    box.checked = on;

    return UI.el('label', { class: 'perm-row' + (locked ? ' is-locked' : '') + (on ? ' is-on' : ''), 'for': 'perm-' + key }, [
      box,
      UI.el('span', { class: 'perm-row__body' }, [
        UI.el('span', { class: 'perm-row__name' }, [
          perm[1],
          group.cross ? UI.badge('Cross-Division', 'warning', { dot: false }) : null,
          locked ? UI.badge('Super Admin only', 'neutral', { dot: false, icon: 'lock' }) : null
        ]),
        perm[2] ? UI.el('span', { class: 'perm-row__desc', text: perm[2] }) : null,
        UI.el('code', { class: 'perm-row__key', text: key })
      ])
    ]);
  }

  function groupCard(group) {
    var UI = global.UI;
    var free = group.perms.filter(function (p) { return SUPER_ADMIN_ONLY.indexOf(p[0]) === -1; });
    var chosen = free.filter(function (p) { return draft.perms[p[0]]; }).length;
    var allOn = free.length && chosen === free.length;

    return UI.el('section', { class: 'panel surface perm-group' + (group.cross ? ' perm-group--cross' : '') }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon(group.cross ? 'layers' : 'shield', 16),
        UI.el('h2', { class: 'section-title', text: group.title }),
        UI.el('span', { class: 'panel__count', text: chosen + '/' + free.length }),
        UI.el('span', { class: 'spacer' }),
        free.length > 1 ? UI.el('button', {
          class: 'btn btn--ghost', type: 'button',
          onclick: function () { free.forEach(function (p) { if (allOn) delete draft.perms[p[0]]; else draft.perms[p[0]] = true; }); if (!allOn && group.id === 'cross') draft.perms['division:view-all'] = true; repaint(); }
        }, allOn ? 'Clear all' : 'Select all') : null
      ]),
      group.cross ? UI.el('p', { class: 'panel__note', text: 'These reach data outside the user’s own divisions and projects. Grant deliberately.' }) : null,
      UI.el('div', { class: 'perm-list' }, group.perms.map(function (p) { return permRow(group, p); }))
    ]);
  }

  /* --- Save / delete ------------------------------------------------------ */
  function save() {
    draft.submitted = true;
    if (nameError()) { repaint(); return; }
    var perms = Object.keys(draft.perms);
    var existing = draft.id && byId(draft.id);
    if (existing) { existing.name = draft.name.trim(); existing.perms = perms; }
    else roles.push({ id: 'r-' + Date.now(), name: draft.name.trim(), perms: perms, mockUsers: 0 });
    global.Toast.success(existing ? 'Role saved. Changes apply on each user’s next request.' : 'Role created');
    location.hash = '#/admin/roles';
  }

  function tryDelete(role) {
    var n = userCount(role);
    if (n) {
      global.Toast.error(plural(n, 'user') + ' still hold “' + role.name + '”. Move them to another role first.');
      return;
    }
    global.Confirm.open({
      title: 'Delete “' + role.name + '”?',
      body: 'No users hold this role. This cannot be undone.',
      confirmLabel: 'Delete role', variant: 'destructive',
      onConfirm: function () {
        roles = roles.filter(function (r) { return r.id !== role.id; });
        global.Toast.success('Role deleted');
        location.hash = '#/admin/roles';
        repaint();
      }
    });
  }

  /* --- Screens ------------------------------------------------------------ */
  function roleRow(role) {
    var UI = global.UI;
    var n = userCount(role);
    var pills = [];
    if (role.superAdmin) pills.push(UI.badge('Built-in', 'purple', { dot: false, icon: 'lock' }));
    else pills.push(UI.badge(isSeeded(role) ? 'Seeded' : 'Custom', 'neutral', { dot: false }));
    if (role.perms.indexOf('division:view-all') !== -1) pills.push(UI.badge('Cross-Division', 'warning', { dot: false }));

    var actions = role.superAdmin
      ? UI.el('span', { class: 'list-row__you', text: 'Locked' })
      : UI.frag([
          UI.el('a', { class: 'btn btn--secondary', href: '#/admin/roles/' + role.id }, [UI.icon('pencil', 16), 'Edit']),
          UI.el('button', { class: 'btn btn--icon', type: 'button', title: n ? 'Has users — cannot delete' : 'Delete role', 'aria-label': 'Delete role', onclick: function () { tryDelete(role); } }, UI.icon('trash-2', 16))
        ]);

    return UI.listRow({
      variant: 'member',
      lead: UI.icon(role.superAdmin ? 'crown' : 'shield', 20),
      title: role.name,
      href: role.superAdmin ? null : '#/admin/roles/' + role.id,
      pills: UI.frag(pills),
      meta: [plural(n, 'user'), role.superAdmin ? 'All ' + ALL.length + ' permissions' : plural(role.perms.length, 'permission')],
      actions: actions
    });
  }

  function list() {
    var UI = global.UI;
    return UI.el('div', { class: 'view' }, [
      UI.el('header', { class: 'view__header' }, [
        UI.el('div', {}, [
          UI.el('h1', { class: 'page-title', text: 'Role Management' }),
          UI.el('p', { class: 'view__subtitle', text: plural(roles.length, 'role') + ' · a role is a set of permissions from a fixed catalog' })
        ]),
        UI.el('span', { class: 'spacer' }),
        UI.el('a', { class: 'btn btn--primary', href: '#/admin/roles/new' }, [UI.icon('plus', 16), 'Create Role'])
      ]),
      UI.el('section', { class: 'panel surface' }, [
        UI.el('div', { class: 'list-rows' }, roles.map(roleRow)),
        UI.el('p', { class: 'panel__note', text: 'PROTOTYPE — roles here are in-memory and do not change the personas. A user holds exactly one role. Deleting a role that users hold is blocked.' })
      ])
    ]);
  }

  function editor(params) {
    var UI = global.UI;
    var role = params.roleId === 'new' ? null : byId(params.roleId);
    if (params.roleId !== 'new' && (!role || role.superAdmin)) {
      return UI.el('div', { class: 'view' }, UI.el('p', { class: 'panel__note', text: 'That role cannot be edited.' }));
    }
    if (!draft || draft.id !== (role ? role.id : null)) {
      draft = { id: role ? role.id : null, name: role ? role.name : '', perms: {}, submitted: false };
      (role ? role.perms : []).forEach(function (k) { draft.perms[k] = true; });
    }

    var err = draft.submitted ? nameError() : null;
    var input = UI.el('input', { class: 'input', id: 'role-name', placeholder: 'e.g. Team Lead', autocomplete: 'off', oninput: function (e) { draft.name = e.target.value; } });
    input.value = draft.name;
    var nameField = UI.field({ label: 'Role name', id: 'role-name', name: 'name', required: true, control: input, hint: 'Unique. “Super Admin” is reserved.' });
    requestAnimationFrame(function () { if (err) UI.setFieldError(nameField, err); });

    var count = Object.keys(draft.perms).length;
    var n = role ? userCount(role) : 0;

    return UI.el('div', { class: 'view' }, [
      UI.el('header', { class: 'view__header' }, [
        UI.el('div', {}, [
          UI.el('h1', { class: 'page-title', text: role ? 'Edit role' : 'Create role' }),
          UI.el('p', { class: 'view__subtitle', text: count + ' of ' + ALL.length + ' permissions selected' + (role ? ' · ' + plural(n, 'user') + ' hold this role' : '') })
        ]),
        UI.el('span', { class: 'spacer' }),
        UI.el('a', { class: 'btn btn--secondary', href: '#/admin/roles', onclick: function () { draft = null; } }, 'Cancel'),
        UI.el('button', { class: 'btn btn--primary', type: 'button', onclick: save }, role ? 'Save changes' : 'Create role')
      ]),
      UI.el('section', { class: 'panel surface' }, [nameField]),
      UI.el('p', { class: 'panel__note', text: 'Everyone also gets Baseline Access with every role: view their divisions and projects, view activity, comment.' }),
      UI.el('div', { class: 'panels perm-groups' }, GROUPS.map(groupCard)),
      role ? UI.el('section', { class: 'panel surface panel--danger' }, [
        UI.el('div', { class: 'panel__head' }, [UI.icon('trash-2', 16), UI.el('h2', { class: 'section-title', text: 'Delete role' })]),
        UI.el('p', { class: 'panel__note', text: n ? plural(n, 'user') + ' hold this role. Move them to another role before it can be deleted.' : 'No users hold this role.' }),
        UI.el('button', { class: 'btn btn--destructive', type: 'button', onclick: function () { tryDelete(role); } }, 'Delete role')
      ]) : null
    ]);
  }

  Views.adminRoles = { render: function () { draft = null; return list(); } };
  Views.adminRoleEdit = { render: function (params) { return editor(params); } };
}(window));
