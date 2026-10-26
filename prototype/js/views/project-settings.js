/* ===========================================================================
   S12 Project Settings / Members (docs/02 S12 · docs/04).

   Reached from the board header's Settings button — the route and its guard
   have existed since Wave 1, but nothing linked to it until now. The guard in
   router.js already refuses a normal User, so everything here can assume a
   manager; the per-control permission checks stay anyway, because a persona
   switch re-renders this screen in place.

   Section order follows docs/02 S12: project info, members, add member, remove
   member, archive project.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  /* The rename input holds its own draft so typing never costs a re-render. */
  var rename = { projectId: null, value: '' };

  function syncRenameDraft(project) {
    if (rename.projectId !== project.id) {
      rename = { projectId: project.id, value: project.name };
    }
  }

  function infoPanel(c) {
    var UI = global.UI;
    var S = global.AppState;
    var P = global.Permissions;

    var counted = c.tasks.filter(function (t) { return t.status !== 'CANCELLED'; });
    var done = counted.filter(function (t) { return t.status === 'COMPLETED'; });
    var pct = counted.length ? Math.round((done.length / counted.length) * 100) : 0;

    var head = [
      UI.icon('wrench', 16),
      UI.el('h2', { class: 'section-title', text: 'Project info' })
    ];
    if (c.project.status === 'ARCHIVED') {
      head.push(UI.badge('Archived', 'warning', { dot: false, icon: 'archive' }));
    } else {
      head.push(UI.badge('Active', 'success', { dot: false }));
    }

    var children = [UI.el('div', { class: 'panel__head' }, head)];

    /* docs/04 has no "edit project" row; a settings screen whose info block is
       read-only reads as broken, so a manager can rename (D55). */
    if (P.can('editProject', { user: c.user, project: c.project })) {
      var input = UI.el('input', {
        class: 'input', id: 'ps-name', type: 'text', autocomplete: 'off',
        oninput: function (event) { rename.value = event.target.value; },
        onkeydown: function (event) {
          if (event.key === 'Enter') {
            event.preventDefault();
            global.ProjectActions.rename(c.project.id, rename.value);
          }
        }
      });
      input.value = rename.value;

      children.push(UI.el('div', { class: 'inline-form' }, [
        UI.field({ label: 'Project name', id: 'ps-name', name: 'name', control: input }),
        UI.el('button', {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: function () { global.ProjectActions.rename(c.project.id, rename.value); }
        }, 'Save')
      ]));
    } else {
      children.push(UI.el('h3', { class: 'section-title', text: c.project.name }));
    }

    children.push(UI.el('div', { class: 'info-grid' }, [
      UI.el('div', { class: 'info-item' }, [
        UI.el('span', { class: 'info-item__label', text: 'Division' }),
        UI.el('span', { class: 'info-item__value' }, c.division
          ? UI.el('a', {
              class: 'list-row__name',
              href: '#/divisions/' + c.division.id,
              text: c.division.name
            })
          : UI.el('span', { class: 'text-muted', text: 'No division' }))
      ]),
      UI.el('div', { class: 'info-item' }, [
        UI.el('span', { class: 'info-item__label', text: 'Created' }),
        UI.el('span', {
          class: 'info-item__value',
          text: c.project.createdAt ? UI.formatDate(c.project.createdAt) : 'unknown'
        })
      ]),
      UI.el('div', { class: 'info-item' }, [
        UI.el('span', { class: 'info-item__label', text: 'Members' }),
        UI.el('span', { class: 'info-item__value' }, [
          UI.avatarStack(c.members, { max: 4 }),
          UI.el('span', { text: String(c.members.length) })
        ])
      ]),
      UI.el('div', { class: 'info-item' }, [
        UI.el('span', { class: 'info-item__label', text: 'Tasks' }),
        UI.el('span', {
          class: 'info-item__value',
          text: counted.length
            ? counted.length + ' · ' + T('{n} completed', { n: done.length })
            : 'None yet'
        })
      ]),
      UI.el('div', { class: 'info-item' }, [
        UI.el('span', { class: 'info-item__label', text: 'Completion' }),
        UI.el('span', { class: 'info-item__value' },
          counted.length
            ? UI.progressBar(pct, { label: T('{name} completion', { name: c.project.name }), showValue: true })
            : UI.el('span', { class: 'text-muted', text: '—' }))
      ])
    ]));

    /* Cancelled tasks are off the board entirely (docs/01 §7), so say so rather
       than let the two numbers quietly disagree. */
    var cancelled = c.tasks.length - counted.length;
    if (cancelled) {
      children.push(UI.el('p', {
        class: 'panel__note',
        text: T('{tasks} not counted above.', { tasks: UI.plural(cancelled, 'cancelled task') })
      }));
    }

    return UI.el('section', { class: 'panel surface' }, children);
  }

  function membersPanel(c) {
    var UI = global.UI;
    var S = global.AppState;
    var canManage = global.Permissions.can('manageProjectMembers', {
      user: c.user, project: c.project
    });

    /* Division members first: they are the people who belong here already. */
    function candidateGroups() {
      var inDivision = [];
      var elsewhere = [];
      S.activeUsers().forEach(function (u) {
        if (c.project.memberIds.indexOf(u.id) !== -1) return;
        if (c.division && c.division.memberIds.indexOf(u.id) !== -1) inDivision.push(u);
        else elsewhere.push(u);
      });
      return { inDivision: inDivision, elsewhere: elsewhere };
    }

    var addBtn = UI.el('button', {
      class: 'btn btn--secondary btn--sm',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: T('Add a member to {name}', { name: c.project.name }),
      onclick: function () {
        global.Menu.toggle(addBtn, function () {
          var groups = candidateGroups();
          if (!groups.inDivision.length && !groups.elsewhere.length) {
            return [UI.el('p', {
              class: 'picker-note',
              text: 'Everyone is already a member of this project.'
            })];
          }

          function row(person) {
            return global.Menu.item({
              label: person.name,
              sublabel: global.Permissions.ROLE_LABEL[person.role],
              leading: UI.avatar(person, { size: 'sm' }),
              onclick: function () {
                global.ProjectActions.addMember(c.project.id, person.id);
              }
            });
          }

          var out = [];
          if (groups.inDivision.length) {
            out.push(global.Menu.section(T('{name} members', { name: c.division ? c.division.name : T('Division') })));
            out = out.concat(groups.inDivision.map(row));
          }
          if (groups.elsewhere.length) {
            if (out.length) out.push(global.Menu.separator());
            out.push(global.Menu.section('Elsewhere in the company'));
            out = out.concat(groups.elsewhere.map(row));
          }
          return out;
        }, { placement: 'bottom-end', width: 290, label: 'Add a member' });
      }
    }, [UI.icon('user-plus', 14), 'Add Member']);

    /* docs/01 §5 rule 6 — a task's assignee has to be a project member, so the
       work is handed on before the person leaves. ProjectActions refuses and
       names the rule; asking for a confirmation first would waste a click. */
    function askRemove(member, holding) {
      if (holding.length) {
        global.ProjectActions.removeMember(c.project.id, member.id);
        return;
      }
      global.Confirm.open({
        lead: UI.avatar(member, { size: 'lg' }),
        title: T('Remove {name}?', { name: member.name }),
        body: T('They lose access to the {name} board and can no longer be assigned its tasks. You can add them back.', {
          name: c.project.name }),
        confirmLabel: 'Remove Member',
        variant: 'destructive',
        onConfirm: function () {
          global.ProjectActions.removeMember(c.project.id, member.id);
        }
      });
    }

    var rows = c.members.map(function (member) {
      var holding = c.tasks.filter(function (t) {
        return t.assigneeId === member.id && t.status !== 'CANCELLED';
      });

      return UI.memberRow(member, {
        isYou: member.id === c.user.id,
        isSupervisor: !!c.division && c.division.supervisorId === member.id,
        meta: [holding.length ? T('{tasks} assigned', { tasks: UI.plural(holding.length, 'task') }) : T('no tasks')],
        actions: canManage
          ? UI.el('button', {
              class: 'btn btn--icon',
              type: 'button',
              title: holding.length
                ? T('{name} still holds {tasks}', { name: member.name, tasks: UI.plural(holding.length, 'task') })
                : T('Remove {name} from {place}', { name: member.name, place: c.project.name }),
              'aria-label': T('Remove {name} from {place}', { name: member.name, place: c.project.name }),
              onclick: function () { askRemove(member, holding); }
            }, UI.icon('user-minus', 16))
          : null
      });
    });

    var head = [
      UI.icon('users', 16),
      UI.el('h2', { class: 'section-title', text: 'Members' }),
      UI.el('span', { class: 'panel__count', text: String(c.members.length) }),
      UI.el('span', { class: 'spacer' })
    ];
    if (canManage) head.push(addBtn);

    return UI.el('section', { class: 'panel surface' }, [
      UI.el('div', { class: 'panel__head' }, head),
      c.members.length
        ? UI.el('div', { class: 'list-rows' }, rows)
        : UI.el('p', {
            class: 'panel__note',
            text: 'Nobody is a member yet, so no task in this project can be assigned.'
          })
    ]);
  }

  function dangerPanel(c) {
    var UI = global.UI;
    var archived = c.project.status === 'ARCHIVED';

    var action = archived
      ? UI.el('button', {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: function () { global.ProjectActions.restore(c.project.id); }
        }, [UI.icon('rotate-ccw', 16), 'Restore project'])
      : UI.el('button', {
          class: 'btn btn--destructive',
          type: 'button',
          onclick: function () {
            global.Confirm.open({
              title: T('Archive {name}?', { name: c.project.name }),
              body: T('It leaves the projects list and the dashboard. Its tasks are kept, and you can restore it from {place} at any time.', {
                place: c.division ? c.division.name : T('the division') }),
              confirmLabel: 'Archive Project',
              variant: 'destructive',
              onConfirm: function () {
                if (global.ProjectActions.archive(c.project.id) && c.division) {
                  global.Router.navigate('#/divisions/' + c.division.id);
                }
              }
            });
          }
        }, [UI.icon('archive', 16), 'Archive project']);

    return UI.el('section', { class: 'panel surface panel--danger' }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon('alert-triangle', 16),
        UI.el('h2', { class: 'section-title', text: archived ? 'Archived' : 'Archive project' })
      ]),
      UI.el('p', {
        class: 'panel__note',
        text: archived
          ? 'This project is archived. Restoring puts it back on the projects list.'
          : 'Archiving hides the project without deleting anything. Nothing is destroyed ' +
            'and nothing is sent anywhere — this prototype keeps everything in the browser.'
      }),
      UI.el('div', { class: 'row gap-2' }, action)
    ]);
  }

  Views.projectSettings = {
    render: function (params) {
      var UI = global.UI;
      var S = global.AppState;

      var project = S.getProject(params.projectId);
      syncRenameDraft(project);

      var c = {
        project: project,
        user: S.currentUser(),
        division: S.getDivision(project.divisionId),
        members: project.memberIds.map(S.getUser).filter(Boolean),
        tasks: S.projectTasks(project.id)
      };

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'Project Settings' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: project.name + ' · ' + (c.division ? c.division.name : T('No division'))
            })
          ]),
          UI.el('span', { class: 'spacer' }),
          UI.el('a', {
            class: 'btn btn--secondary',
            href: '#/projects/' + project.id,
            title: T('Back to the {name} board', { name: project.name })
          }, [UI.icon('folder-kanban', 16), 'Open board'])
        ]),

        UI.el('div', { class: 'panels' }, [
          infoPanel(c),
          membersPanel(c),
          dangerPanel(c)
        ])
      ]);
    }
  };
}(window));
