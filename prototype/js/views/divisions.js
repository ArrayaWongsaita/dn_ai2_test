/* ===========================================================================
   S04 Divisions + S05 Division Detail (docs/02 S04, S05 · docs/03 Flow E).

   The layer above the board. A division card is deliberately a .project-card
   with a supervisor chip: the two grids sit one step apart in the same
   hierarchy (Organization → Division → Project → Task) and must read as the
   same family of object.

   Every action here is hidden rather than disabled for a role that cannot use
   it (docs/04) — a User sees the structure and nothing else.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  /* The Create project draft. Module-level because Modal repaints its body
     through render(), exactly as the drawers repaint theirs. The division
     dialogs moved to js/division-forms.js when S11 started opening them too
     (D65) — this file calls DivisionForms for all four of them. */
  var newProject = null;    /* { divisionId, name, memberIds, submitted } */

  function projectsIn(divisionId) {
    return global.AppState.getState().projects.filter(function (p) {
      return p.divisionId === divisionId;
    });
  }

  function peoplePicker(trigger, config) {
    return global.DivisionForms.peoplePicker(trigger, config);
  }

  Views.divisions = {
    render: function () {
      var UI = global.UI;
      var S = global.AppState;
      var P = global.Permissions;
      var user = S.currentUser();
      /* An archived division leaves the grid and the scope line but keeps its
         detail screen reachable, exactly as an archived project does (D63). */
      var divisions = S.activeDivisions(user.id);
      var archived = S.archivedDivisions(user.id);

      var actions = [];
      /* docs/02 S04: Super Admin only. */
      if (P.can('createDivision', { user: user })) {
        actions.push(UI.el('button', {
          class: 'btn btn--primary',
          type: 'button',
          title: 'Create a new division',
          onclick: function () {
            /* From the grid, the new division's own screen is the proof it
               exists — S11 stays put instead, so its row appears (D67). */
            global.DivisionForms.openNew({
              onCreated: function (division) {
                global.Router.navigate('#/divisions/' + division.id);
              }
            });
          }
        }, [UI.icon('plus', 16), 'New Division']));
      }

      var body = divisions.length
        ? UI.el('div', { class: 'project-grid' },
            divisions.map(function (d) { return UI.divisionCard(d); }))
        : UI.emptyState({
            icon: 'layers',
            title: archived.length ? 'Every division is archived' : 'No divisions to show',
            body: archived.length
              ? 'Restore one from Administration \u2192 Divisions, or create a new one.'
              : P.can('createDivision', { user: user })
                ? 'Create the first division, then add projects inside it.'
                : 'You are not a member of a division yet. A Super Admin adds you to one.'
          });

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'Divisions' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: divisions.length
                ? T('The structure above the boards. {scope}.', { scope: UI.scopeLine(user) })
                : 'Every division you are allowed to see appears here.'
            })
          ]),
          UI.el('span', { class: 'spacer' })
        ].concat(actions)),
        body,
        /* Say where the missing cards went, rather than letting the grid
           quietly disagree with Administration (D63). */
        archived.length
          ? UI.el('p', { class: 'panel__note' }, [
              T('{divisions} archived · ', { divisions: UI.plural(archived.length, 'division') }),
              P.can('archiveDivision', { user: user })
                ? UI.el('a', { href: '#/admin/divisions', text: 'restore from Administration' })
                : UI.el('span', { text: 'a Super Admin can restore them' })
            ])
          : null
      ]);
    }
  };

  /* --- S05 -------------------------------------------------------------- */

  function openNewProject(division) {
    var UI = global.UI;
    var S = global.AppState;
    var user = S.currentUser();

    /* The supervisor and whoever is creating it start as members — a project
       with nobody in it can never be assigned a task (docs/01 §5 rule 6). */
    var seed = [division.supervisorId, user.id].filter(function (id, i, all) {
      return all.indexOf(id) === i;
    });
    newProject = { divisionId: division.id, name: '', memberIds: seed, submitted: false };

    function body() {
      var nameInput = UI.el('input', {
        class: 'input', id: 'np-name', type: 'text',
        placeholder: 'e.g. Spring Product Launch', autocomplete: 'off',
        oninput: function (event) {
          newProject.name = event.target.value;
          if (newProject.submitted && newProject.name.trim()) UI.setFieldError(nameField, null);
        }
      });
      nameInput.value = newProject.name;

      var nameField = UI.field({
        label: 'Project name', id: 'np-name', name: 'name', required: true, control: nameInput
      });

      var chosen = newProject.memberIds.map(S.getUser).filter(Boolean);
      var available = division.memberIds
        .filter(function (id) { return newProject.memberIds.indexOf(id) === -1; })
        .map(S.getUser)
        .filter(S.isActive);

      var chips = chosen.map(function (member) {
        var locked = member.id === division.supervisorId;
        return UI.el(locked ? 'span' : 'button', {
          class: 'filter-chip',
          type: locked ? null : 'button',
          title: locked ? 'The supervisor is always a member' : T('Remove {name}', { name: member.name }),
          onclick: locked ? null : function () {
            newProject.memberIds = newProject.memberIds.filter(function (id) {
              return id !== member.id;
            });
            global.Modal.refresh();
          }
        }, [
          UI.avatar(member, { size: 'sm' }),
          UI.el('span', { text: member.name }),
          locked ? null : UI.icon('x', 14)
        ]);
      });

      var add = UI.el('button', {
        class: 'btn btn--secondary btn--sm',
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        disabled: available.length ? null : 'disabled',
        title: available.length
          ? T('Add a member from {name}', { name: division.name })
          : T('Everyone in {name} is already a member', { name: division.name }),
        onclick: function () {
          peoplePicker(add, {
            section: T('{name} members', { name: division.name }),
            people: available,
            empty: 'Everyone in this division is already a member.',
            onpick: function (person) {
              newProject.memberIds = newProject.memberIds.concat([person.id]);
              global.Modal.refresh();
            }
          });
        }
      }, [UI.icon('user-plus', 14), 'Add']);

      var membersField = UI.field({
        label: 'Members', name: 'members',
        control: UI.el('div', { class: 'chip-row' }, chips.concat([add])),
        hint: 'Only members can be assigned a task on this board. More can be added later.'
      });

      if (newProject.submitted && !newProject.name.trim()) {
        requestAnimationFrame(function () {
          UI.setFieldError(nameField, 'A project needs a name.');
        });
      }

      return UI.frag([nameField, membersField]);
    }

    global.Modal.open({
      title: 'Create project',
      body: T('A new project in {name} starts with an empty board.', { name: division.name }),
      confirmLabel: 'Create Project',
      render: body,
      onConfirm: function () {
        if (!newProject.name.trim()) {
          newProject.submitted = true;
          global.Modal.refresh();
          return false;
        }
        var created = global.ProjectActions.create(newProject);
        if (!created) return false;
        /* Land on the new board — its empty state is what says what to do next. */
        global.Router.navigate('#/projects/' + created.id);
        return true;
      }
    });
  }

  function supervisorPanel(c) {
    var UI = global.UI;
    var supervisor = c.supervisor;

    return UI.el('section', { class: 'panel surface' }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon('crown', 16),
        UI.el('h2', { class: 'section-title', text: 'Supervisor' })
      ]),
      /* Deliberately not a .list-row: the members list below repeats this
         person, and two identical cards in a row read as a rendering bug. */
      supervisor
        ? UI.el('div', { class: 'row gap-3' }, [
            UI.avatar(supervisor, { size: 'lg' }),
            UI.el('div', { class: 'stack gap-1' }, [
              UI.el('span', { class: 'list-row__head' }, [
                UI.el('span', { class: 'list-row__name', text: supervisor.name }),
                UI.badge(global.Permissions.ROLE_LABEL[supervisor.role], 'purple', { dot: false }),
                supervisor.id === c.user.id
                  ? UI.el('span', { class: 'list-row__you', text: 'You' })
                  : null
              ]),
              UI.el('span', { class: 'list-row__meta' }, [
                UI.el('span', { text: supervisor.email }),
                UI.el('span', { class: 'list-row__dot' }),
                UI.el('span', { text: T('sees every project in {name}', { name: c.division.name }) })
              ])
            ])
          ])
        : UI.el('p', { class: 'panel__note', text: 'This division has no supervisor.' }),
      global.Permissions.isAdmin(c.user)
        ? UI.el('p', { class: 'panel__note' }, [
            'Assigning a different supervisor lives in ',
            UI.el('a', { href: '#/admin/divisions', text: 'Administration \u2192 Divisions' }),
            '.'
          ])
        : UI.el('p', {
            class: 'panel__note',
            text: 'Only a Super Admin can change who supervises a division.'
          })
    ]);
  }

  function membersPanel(c) {
    var UI = global.UI;
    var canManage = global.Permissions.can('manageDivisionMembers', {
      user: c.user, division: c.division
    });

    var rows = c.members.map(function (member) {
      var isSupervisor = member.id === c.division.supervisorId;
      var projectCount = c.projects.filter(function (p) {
        return p.status !== 'ARCHIVED' && p.memberIds.indexOf(member.id) !== -1;
      }).length;

      return UI.memberRow(member, {
        isSupervisor: isSupervisor,
        isYou: member.id === c.user.id,
        meta: [T('{projects} here', { projects: UI.plural(projectCount, 'project') })],
        actions: canManage && !isSupervisor
          ? UI.el('button', {
              class: 'btn btn--icon',
              type: 'button',
              title: T('Remove {name} from {place}', { name: member.name, place: c.division.name }),
              'aria-label': T('Remove {name} from {place}', { name: member.name, place: c.division.name }),
              onclick: function () {
                global.Confirm.open({
                  lead: UI.avatar(member, { size: 'lg' }),
                  title: T('Remove {name}?', { name: member.name }),
                  body: 'They stay on any project they are already a member of. ' +
                    'You can add them back at any time.',
                  confirmLabel: 'Remove Member',
                  variant: 'destructive',
                  onConfirm: function () {
                    global.DivisionActions.removeMember(c.division.id, member.id);
                  }
                });
              }
            }, UI.icon('user-minus', 16))
          : null
      });
    });

    return UI.el('section', { class: 'panel surface' }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon('users', 16),
        UI.el('h2', { class: 'section-title', text: 'Members' }),
        UI.el('span', { class: 'panel__count', text: String(c.members.length) })
      ]),
      UI.el('div', { class: 'list-rows' }, rows)
    ]);
  }

  function projectsPanel(c) {
    var UI = global.UI;
    var P = global.Permissions;
    var canCreate = P.can('createProject', { user: c.user, division: c.division });
    var canArchive = P.can('archiveProject', { user: c.user });

    var active = c.projects.filter(function (p) { return p.status !== 'ARCHIVED'; });
    var archived = c.projects.filter(function (p) { return p.status === 'ARCHIVED'; });

    var body = active.length
      ? UI.el('div', { class: 'project-grid' },
          active.map(function (p) { return UI.projectCard(p); }))
      : UI.emptyState({
          compact: true,
          icon: 'folder-kanban',
          title: T('No project in {name} yet', { name: c.division.name }),
          body: canCreate
            ? 'Create one and its board opens empty, ready for the first task.'
            : 'A Supervisor creates the projects for this division.',
          action: canCreate
            ? UI.el('button', {
                class: 'btn btn--primary',
                type: 'button',
                onclick: function () { openNewProject(c.division); }
              }, [UI.icon('folder-plus', 16), 'Create project'])
            : null
        });

    /* Archiving is reversible, and this row is where it is reversed (D52). */
    var archivedBlock = archived.length
      ? UI.el('div', { class: 'stack gap-2' }, [
          UI.el('p', { class: 'panel__note', text: 'Archived' }),
          UI.el('div', { class: 'list-rows' }, archived.map(function (project) {
            return UI.listRow({
              muted: true,
              lead: UI.icon('archive', 18),
              title: project.name,
              href: '#/projects/' + project.id,
              meta: [UI.plural(project.memberIds.length, 'member'),
                     UI.plural(global.AppState.projectTasks(project.id).length, 'task')],
              actions: canArchive
                ? UI.el('button', {
                    class: 'btn btn--secondary btn--sm',
                    type: 'button',
                    title: T('Restore {name}', { name: project.name }),
                    onclick: function () { global.ProjectActions.restore(project.id); }
                  }, [UI.icon('rotate-ccw', 14), 'Restore'])
                : null
            });
          }))
        ])
      : null;

    return UI.el('section', { class: 'panel surface' }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon('folder-kanban', 16),
        UI.el('h2', { class: 'section-title', text: 'Projects' }),
        UI.el('span', { class: 'panel__count', text: String(active.length) })
      ]),
      body,
      archivedBlock
    ]);
  }

  Views.divisionDetail = {
    render: function (params) {
      var UI = global.UI;
      var S = global.AppState;
      var P = global.Permissions;

      var division = S.getDivision(params.divisionId);
      var user = S.currentUser();

      var c = {
        division: division,
        user: user,
        supervisor: S.getUser(division.supervisorId),
        members: division.memberIds.map(S.getUser).filter(Boolean),
        projects: projectsIn(division.id)
      };

      var active = c.projects.filter(function (p) { return p.status !== 'ARCHIVED'; });
      var actions = [];

      if (P.can('manageDivisionMembers', { user: user, division: division })) {
        var candidates = S.activeUsers().filter(function (u) {
          return division.memberIds.indexOf(u.id) === -1;
        });
        var addBtn = UI.el('button', {
          class: 'btn btn--secondary',
          type: 'button',
          'aria-haspopup': 'menu',
          'aria-expanded': 'false',
          title: T('Add a member to {name}', { name: division.name }),
          onclick: function () {
            peoplePicker(addBtn, {
              section: T('Not in {name} yet', { name: division.name }),
              people: candidates,
              empty: 'Everyone already belongs to this division.',
              onpick: function (person) {
                global.DivisionActions.addMember(division.id, person.id);
              }
            });
          }
        }, [UI.icon('user-plus', 16), 'Add Member']);
        actions.push(addBtn);
      }

      if (P.can('createProject', { user: user, division: division })) {
        actions.push(UI.el('button', {
          class: 'btn btn--primary',
          type: 'button',
          title: T('Create a project in {name}', { name: division.name }),
          onclick: function () { openNewProject(division); }
        }, [UI.icon('folder-plus', 16), 'Create project']));
      }

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: division.name }),
            UI.el('p', {
              class: 'view__subtitle',
              text: T('Supervisor: {name}', { name: c.supervisor ? c.supervisor.name : T('none') }) +
                ' · ' + UI.plural(c.members.length, 'member') +
                ' · ' + UI.plural(active.length, 'project')
            })
          ]),
          UI.el('span', { class: 'spacer' })
        ].concat(actions)),

        UI.el('div', { class: 'panels' }, [
          supervisorPanel(c),
          membersPanel(c),
          projectsPanel(c)
        ])
      ]);
    }
  };
}(window));
