/* ===========================================================================
   S10 User Management (docs/02 S10 · docs/04 "User management").

   Super Admin only. The route guard in router.js already refuses everyone
   else, but the per-action checks in UserActions stay anyway — a persona
   switch re-renders this screen in place before the guard gets a chance.

   Drawn as list rows rather than a table (D64): the same .list-row language
   the division and project member lists already use, so Administration reads
   like the rest of the product instead of like a separate admin console.
   Each row carries one ⋮ menu — Edit Role, Assign Division, Activate /
   Deactivate — which is docs/02 S10's action list minus Add User, which is a
   header button because it does not belong to any one row.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  /* Read first, and the three login personas lead. */
  var ROLE_ORDER = ['SUPER_ADMIN', 'SUPERVISOR', 'USER'];

  function sortedUsers() {
    return global.AppState.getState().users.slice().sort(function (a, b) {
      var byRole = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
      if (byRole) return byRole;
      return a.name.localeCompare(b.name);
    });
  }

  /* What each role actually means, said once and reused by both role pickers
     — including D68's trap: a Supervisor sees the divisions they supervise,
     not the ones they are a member of. */
  var ROLE_NOTE = {
    SUPER_ADMIN: 'Sees every division, project and task',
    SUPERVISOR: 'Sees only the divisions they supervise',
    USER: 'Sees only the projects they are a member of'
  };

  /* --- Add User ---------------------------------------------------------
     Draft lives at module level because Modal repaints its body through
     render(), exactly as the drawers repaint theirs. */
  var draft = null;

  function errors() {
    var out = {};
    var email = draft.email.trim().toLowerCase();
    if (!draft.name.trim()) out.name = 'A user needs a name.';
    if (!email) out.email = 'A user needs an email address.';
    else if (email.indexOf('@') === -1) out.email = 'That does not look like an email address.';
    else if (global.AppState.getState().users.some(function (u) {
      return String(u.email).toLowerCase() === email;
    })) out.email = 'Somebody already uses that address.';
    return out;
  }

  function openAddUser() {
    var UI = global.UI;
    var S = global.AppState;
    var P = global.Permissions;

    draft = { name: '', email: '', role: 'USER', divisionId: null, submitted: false };

    function textField(config) {
      var input = UI.el('input', {
        class: 'input', id: config.id, type: config.type || 'text',
        placeholder: config.placeholder, autocomplete: 'off',
        oninput: function (event) {
          draft[config.key] = event.target.value;
          if (draft.submitted && !errors()[config.key]) UI.setFieldError(wrapper, null);
        }
      });
      input.value = draft[config.key];

      var wrapper = UI.field({
        label: config.label, id: config.id, name: config.key,
        required: true, control: input, hint: config.hint
      });
      return wrapper;
    }

    function rolePicker() {
      var trigger = UI.el('button', {
        class: 'td-select td-select--input',
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        onclick: function () {
          global.Menu.toggle(trigger, function () {
            return [global.Menu.section('Role')].concat(
              global.UserActions.ROLES.map(function (role) {
                return global.Menu.item({
                  label: P.ROLE_LABEL[role],
                  sublabel: ROLE_NOTE[role],
                  checked: role === draft.role,
                  onclick: function () {
                    draft.role = role;
                    global.Modal.refresh();
                  }
                });
              })
            );
          }, { placement: 'bottom-end', width: 300, label: 'Role' });
        }
      }, [
        UI.el('span', { text: P.ROLE_LABEL[draft.role] }),
        UI.icon('chevron-down', 16)
      ]);

      return UI.field({
        label: 'Role', name: 'role', control: trigger, hint: ROLE_NOTE[draft.role]
      });
    }

    function divisionPicker() {
      var divisions = S.getState().divisions.filter(function (d) {
        return d.status !== 'ARCHIVED';
      });
      var chosen = draft.divisionId ? S.getDivision(draft.divisionId) : null;

      var trigger = UI.el('button', {
        class: 'td-select td-select--input',
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        onclick: function () {
          global.Menu.toggle(trigger, function () {
            if (!divisions.length) {
              return [UI.el('p', { class: 'picker-note', text: 'No active division to join yet.' })];
            }
            return [
              global.Menu.section('Division'),
              global.Menu.item({
                label: 'No division yet',
                sublabel: 'They can be added to one later',
                checked: !draft.divisionId,
                onclick: function () {
                  draft.divisionId = null;
                  global.Modal.refresh();
                }
              })
            ].concat(divisions.map(function (division) {
              var supervisor = S.getUser(division.supervisorId);
              return global.Menu.item({
                label: division.name,
                sublabel: supervisor ? T('Supervised by {name}', { name: supervisor.name }) : 'No supervisor',
                checked: division.id === draft.divisionId,
                onclick: function () {
                  draft.divisionId = division.id;
                  global.Modal.refresh();
                }
              });
            }));
          }, { placement: 'bottom-end', width: 300, label: 'Division' });
        }
      }, [
        chosen
          ? UI.el('span', { text: chosen.name })
          : UI.el('span', { class: 'td-select__placeholder', text: 'No division yet' }),
        UI.icon('chevron-down', 16)
      ]);

      return UI.field({
        label: 'Division', name: 'division', control: trigger,
        hint: 'A division is how they reach a project, and a project is how they reach a task.'
      });
    }

    function body() {
      var nameField = textField({
        key: 'name', id: 'nu-name', label: 'Full name', placeholder: 'e.g. Kim'
      });
      var emailField = textField({
        key: 'email', id: 'nu-email', label: 'Email', type: 'email',
        placeholder: 'e.g. kim@company.test'
      });

      var bad = draft.submitted ? errors() : {};
      requestAnimationFrame(function () {
        if (bad.name) UI.setFieldError(nameField, bad.name);
        if (bad.email) UI.setFieldError(emailField, bad.email);
      });

      return UI.frag([nameField, emailField, rolePicker(), divisionPicker()]);
    }

    global.Modal.open({
      title: 'Add user',
      body: 'A mock account. Nothing is emailed and no password is set — this prototype ' +
        'keeps everything in the browser.',
      confirmLabel: 'Add User',
      render: body,
      onConfirm: function () {
        if (Object.keys(errors()).length) {
          draft.submitted = true;
          global.Modal.refresh();
          return false;      /* stay open so the marks can be read (D47) */
        }
        return !!global.UserActions.create(draft);
      }
    });
  }

  /* --- Row actions ------------------------------------------------------- */

  function openRoleMenu(trigger, target) {
    var P = global.Permissions;

    global.Menu.toggle(trigger, function () {
      return [global.Menu.section(T('Role for {name}', { name: target.name }))].concat(
        global.UserActions.ROLES.map(function (role) {
          return global.Menu.item({
            label: P.ROLE_LABEL[role],
            sublabel: ROLE_NOTE[role],
            checked: role === target.role,
            onclick: function () { global.UserActions.setRole(target.id, role); }
          });
        })
      );
    }, { placement: 'bottom-end', width: 300, label: 'Edit role' });
  }

  /* One click toggles membership. DivisionActions already refuses to strip a
     division of its own supervisor, so that rule is enforced in one place. */
  function openDivisionMenu(trigger, target) {
    var UI = global.UI;
    var S = global.AppState;

    global.Menu.toggle(trigger, function () {
      var divisions = S.getState().divisions.filter(function (d) {
        return d.status !== 'ARCHIVED';
      });
      if (!divisions.length) {
        return [UI.el('p', { class: 'picker-note', text: 'No active division yet.' })];
      }

      return [global.Menu.section(T('Divisions for {name}', { name: target.name }))].concat(
        divisions.map(function (division) {
          var member = division.memberIds.indexOf(target.id) !== -1;
          var supervises = division.supervisorId === target.id;
          return global.Menu.item({
            label: division.name,
            sublabel: supervises
              ? 'Supervisor — cannot be removed here'
              : (member ? 'Member · click to remove' : 'Click to add'),
            leading: UI.icon(supervises ? 'crown' : (member ? 'user-minus' : 'user-plus'), 16),
            checked: member,
            onclick: function () {
              if (member) global.DivisionActions.removeMember(division.id, target.id);
              else global.DivisionActions.addMember(division.id, target.id);
            }
          });
        })
      );
    }, { placement: 'bottom-end', width: 300, label: 'Assign division' });
  }

  function confirmDeactivate(target) {
    var UI = global.UI;
    var held = global.UserActions.commitments(target.id);

    /* Refuse before asking: UserActions names the rule, and a confirmation
       for something that cannot happen wastes a click (the D53 shape). */
    if (held.divisions.length || held.openTasks.length) {
      global.UserActions.deactivate(target.id);
      return;
    }

    global.Confirm.open({
      lead: UI.avatar(target, { size: 'lg' }),
      title: T('Deactivate {name}?', { name: target.name }),
      body: 'They keep their divisions and projects, but stop appearing in every assignee, ' +
        'collaborator and member picker. You can reactivate them here at any time.',
      confirmLabel: 'Deactivate',
      variant: 'destructive',
      onConfirm: function () { global.UserActions.deactivate(target.id); }
    });
  }

  function rowMenu(trigger, target) {
    var active = global.AppState.isActive(target);

    global.Menu.toggle(trigger, function () {
      return [
        global.Menu.section(target.name),
        global.Menu.item({
          label: 'Edit Role',
          sublabel: global.Permissions.ROLE_LABEL[target.role],
          icon: 'shield',
          onclick: function () { openRoleMenu(trigger, target); }
        }),
        global.Menu.item({
          label: 'Assign Division',
          sublabel: T('{divisions} today', { divisions: global.UI.plural(
            global.AppState.divisionsOf(target.id).length, 'division') }),
          icon: 'layers',
          onclick: function () { openDivisionMenu(trigger, target); }
        }),
        global.Menu.separator(),
        active
          ? global.Menu.item({
              label: 'Deactivate',
              sublabel: 'Take them out of every picker',
              icon: 'user-x',
              variant: 'destructive',
              onclick: function () { confirmDeactivate(target); }
            })
          : global.Menu.item({
              label: 'Activate',
              sublabel: 'Let them hold work again',
              icon: 'user-check',
              onclick: function () { global.UserActions.activate(target.id); }
            })
      ];
    }, { placement: 'bottom-end', width: 270, label: T('Actions for {name}', { name: target.name }) });
  }

  /* --- Rows --------------------------------------------------------------- */

  function userRow(target, viewer) {
    var UI = global.UI;
    var S = global.AppState;
    var P = global.Permissions;

    var active = S.isActive(target);
    var divisions = S.divisionsOf(target.id);
    var supervises = S.getState().divisions.filter(function (d) {
      return d.supervisorId === target.id;
    });

    var pills = [UI.badge(P.ROLE_LABEL[target.role], 'purple', { dot: false })];
    pills.push(active
      ? UI.badge('Active', 'success', { dot: false })
      : UI.badge('Inactive', 'neutral', { dot: false, icon: 'user-x' }));
    if (supervises.length) {
      pills.push(UI.badge(T('Supervisor of {divisions}', { divisions: supervises.map(function (d) {
        return d.name;
      }).join(', ') }), 'neutral', { dot: false, icon: 'crown' }));
    }
    if (target.id === viewer.id) pills.push(UI.el('span', { class: 'list-row__you', text: 'You' }));

    /* docs/02 S10 asks for name, email, role, divisions and status. Role and
       status are pills; email and divisions are the meta line. */
    var meta = [
      target.email,
      divisions.length
        ? divisions.map(function (d) { return d.name; }).join(', ')
        : 'No division'
    ];

    var trigger = UI.el('button', {
      class: 'btn btn--icon',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: T('Actions for {name}', { name: target.name }),
      'aria-label': T('Actions for {name}', { name: target.name }),
      onclick: function () { rowMenu(trigger, target); }
    }, UI.icon('more-vertical', 16));

    return UI.listRow({
      variant: 'member',
      muted: !active,
      lead: UI.avatar(target, { size: 'md' }),
      title: target.name,
      pills: UI.frag(pills),
      meta: meta,
      actions: trigger,
      dataset: { userId: target.id }
    });
  }

  Views.adminUsers = {
    render: function () {
      var UI = global.UI;
      var S = global.AppState;
      var user = S.currentUser();
      var users = sortedUsers();
      var inactive = users.filter(function (u) { return !S.isActive(u); }).length;

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'User Management' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: UI.plural(users.length, 'user') + ' · ' +
                T('{n} active', { n: users.length - inactive }) +
                (inactive ? ' · ' + T('{n} inactive', { n: inactive }) : '')
            })
          ]),
          UI.el('span', { class: 'spacer' }),
          UI.el('a', {
            class: 'btn btn--secondary',
            href: '#/admin/divisions',
            title: 'Divisions, supervisors and archiving'
          }, [UI.icon('shield', 16), 'Divisions']),
          UI.el('button', {
            class: 'btn btn--primary',
            type: 'button',
            title: 'Add a mock user',
            onclick: openAddUser
          }, [UI.icon('user-plus', 16), 'Add User'])
        ]),

        UI.el('div', { class: 'panels' }, [
          UI.el('section', { class: 'panel surface' }, [
            UI.el('div', { class: 'panel__head' }, [
              UI.icon('users', 16),
              UI.el('h2', { class: 'section-title', text: 'People' }),
              UI.el('span', { class: 'panel__count', text: String(users.length) })
            ]),
            UI.el('div', { class: 'list-rows' }, users.map(function (u) {
              return userRow(u, user);
            })),
            UI.el('p', {
              class: 'panel__note',
              text: 'Everything here is mock. Deactivating somebody keeps their history but ' +
                'takes them out of every assignee and member picker in the prototype.'
            })
          ])
        ])
      ]);
    }
  };
}(window));
