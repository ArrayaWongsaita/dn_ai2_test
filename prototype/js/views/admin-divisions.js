/* ===========================================================================
   S11 Division Management (docs/02 S11 · docs/03 Flow E · docs/04).

   Super Admin only — every row of docs/04 this screen touches (create
   division, assign supervisor, edit, archive) is Super Admin alone, which is
   why S05 points here rather than offering the controls itself.

   The four dialogs live in js/division-forms.js because S04 opens two of them
   as well (D65). This file is the list and its ⋮ menus, nothing more.

   Flow E ends with "the new division card appears", so creating one from here
   stays on this screen rather than navigating to the new division (D67) —
   S04's + New Division still lands on the detail, where the card's own screen
   is the proof.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  function projectsIn(divisionId) {
    return global.AppState.getState().projects.filter(function (p) {
      return p.divisionId === divisionId;
    });
  }

  function rowMenu(trigger, division) {
    var UI = global.UI;
    var supervisor = global.AppState.getUser(division.supervisorId);
    var live = projectsIn(division.id).filter(function (p) { return p.status !== 'ARCHIVED'; });

    global.Menu.toggle(trigger, function () {
      return [
        global.Menu.section(division.name),
        global.Menu.item({
          label: 'Edit Division',
          sublabel: 'Rename it',
          icon: 'pencil',
          onclick: function () { global.DivisionForms.openEdit(division); }
        }),
        global.Menu.item({
          label: 'Assign Supervisor',
          sublabel: supervisor ? T('{name} today', { name: supervisor.name }) : 'Nobody supervises it',
          icon: 'crown',
          onclick: function () { global.DivisionForms.openAssignSupervisor(division); }
        }),
        global.Menu.separator(),
        global.Menu.item({
          label: 'Archive Division',
          /* Say why it will be refused before the click, not after (D63). */
          sublabel: live.length
            ? T('{projects} must go first', { projects: UI.plural(live.length, 'active project') })
            : 'Reversible — restore it from here',
          icon: 'archive',
          variant: 'destructive',
          onclick: function () { global.DivisionForms.confirmArchive(division); }
        })
      ];
    }, { placement: 'bottom-end', width: 280, label: T('Actions for {name}', { name: division.name }) });
  }

  function divisionRow(division, viewer) {
    var UI = global.UI;
    var S = global.AppState;
    var supervisor = S.getUser(division.supervisorId);
    var projects = projectsIn(division.id);
    var live = projects.filter(function (p) { return p.status !== 'ARCHIVED'; });

    var pills = [];
    if (supervisor) {
      pills.push(UI.el('span', { class: 'division-card__sup' }, [
        UI.avatar(supervisor, { size: 'sm' }),
        UI.el('span', { class: 'division-card__sup-name', text: supervisor.name })
      ]));
    } else {
      pills.push(UI.badge('No supervisor', 'danger', { dot: false, icon: 'alert-triangle' }));
    }
    if (supervisor && supervisor.id === viewer.id) {
      pills.push(UI.el('span', { class: 'list-row__you', text: 'You' }));
    }

    var trigger = UI.el('button', {
      class: 'btn btn--icon',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: T('Actions for {name}', { name: division.name }),
      'aria-label': T('Actions for {name}', { name: division.name }),
      onclick: function () { rowMenu(trigger, division); }
    }, UI.icon('more-vertical', 16));

    return UI.listRow({
      lead: UI.icon('layers', 18),
      title: division.name,
      href: '#/divisions/' + division.id,
      pills: UI.frag(pills),
      meta: [
        UI.plural(division.memberIds.length, 'member'),
        UI.plural(live.length, 'active project'),
        projects.length > live.length
          ? UI.plural(projects.length - live.length, 'archived project')
          : null
      ].filter(Boolean),
      actions: trigger,
      dataset: { divisionId: division.id }
    });
  }

  /* Same shape as the archived-projects block on S05 (D52 / D63): archiving is
     reversible, and this is where it is reversed. */
  function archivedBlock(divisions) {
    var UI = global.UI;
    if (!divisions.length) return null;

    return UI.el('section', { class: 'panel surface' }, [
      UI.el('div', { class: 'panel__head' }, [
        UI.icon('archive', 16),
        UI.el('h2', { class: 'section-title', text: 'Archived' }),
        UI.el('span', { class: 'panel__count', text: String(divisions.length) })
      ]),
      UI.el('div', { class: 'list-rows' }, divisions.map(function (division) {
        return UI.listRow({
          muted: true,
          lead: UI.icon('archive', 18),
          title: division.name,
          href: '#/divisions/' + division.id,
          meta: [
            UI.plural(division.memberIds.length, 'member'),
            UI.plural(projectsIn(division.id).length, 'project')
          ],
          actions: UI.el('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            title: T('Restore {name}', { name: division.name }),
            onclick: function () { global.DivisionActions.restore(division.id); }
          }, [UI.icon('rotate-ccw', 14), 'Restore'])
        });
      })),
      UI.el('p', {
        class: 'panel__note',
        text: 'An archived division keeps its members and its projects. It is only off ' +
          'the divisions list until it is restored.'
      })
    ]);
  }

  Views.adminDivisions = {
    render: function () {
      var UI = global.UI;
      var S = global.AppState;
      var user = S.currentUser();

      var active = S.activeDivisions(user.id);
      var archived = S.archivedDivisions(user.id);

      var list = active.length
        ? UI.el('div', { class: 'list-rows' }, active.map(function (d) {
            return divisionRow(d, user);
          }))
        : UI.emptyState({
            compact: true,
            icon: 'layers',
            title: archived.length ? 'Every division is archived' : 'No divisions yet',
            body: archived.length
              ? 'Restore one below, or create a new one.'
              : 'A division is the layer above the boards — create the first one and ' +
                'give it a supervisor.',
            action: UI.el('button', {
              class: 'btn btn--primary',
              type: 'button',
              onclick: function () { global.DivisionForms.openNew(); }
            }, [UI.icon('plus', 16), 'New Division'])
          });

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'Division Management' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: UI.plural(active.length, 'active division') +
                (archived.length ? ' · ' + T('{n} archived', { n: archived.length }) : '') +
                ' · ' + T('{projects} underneath', { projects: UI.plural(S.getState().projects.length, 'project') })
            })
          ]),
          UI.el('span', { class: 'spacer' }),
          UI.el('a', {
            class: 'btn btn--secondary',
            href: '#/admin/users',
            title: 'People, roles and status'
          }, [UI.icon('users', 16), 'Users']),
          UI.el('button', {
            class: 'btn btn--primary',
            type: 'button',
            title: 'Create a new division',
            /* Flow E step 8: the new row appears right here (D67). */
            onclick: function () { global.DivisionForms.openNew(); }
          }, [UI.icon('plus', 16), 'New Division'])
        ]),

        UI.el('div', { class: 'panels' }, [
          UI.el('section', { class: 'panel surface' }, [
            UI.el('div', { class: 'panel__head' }, [
              UI.icon('shield', 16),
              UI.el('h2', { class: 'section-title', text: 'Divisions' }),
              UI.el('span', { class: 'panel__count', text: String(active.length) })
            ]),
            list,
            UI.el('p', {
              class: 'panel__note',
              text: 'A supervisor sees every project in the division they supervise, so ' +
                'assigning one here changes what that person can reach.'
            })
          ]),
          archivedBlock(archived)
        ])
      ]);
    }
  };
}(window));
