/* ===========================================================================
   S01 — Mock Login / Role Switcher (docs/02 S01, docs/07 §9).

   Three entry points, one per role. Each option states what that persona can
   see, so the permission story starts before the first click. The profile
   menu in the sidebar can switch to any of the six mock users afterwards.
   =========================================================================== */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  var PERSONAS = [
    { userId: 'u1', role: 'Super Admin', blurb: 'Full visibility, plus the administration screens' },
    { userId: 'u2', role: 'Supervisor',  blurb: 'One division: its projects, members and tasks' },
    { userId: 'u3', role: 'User',        blurb: 'Only the projects they are a member of' }
  ];

  function continueAs(userId) {
    var UI = global.UI;
    var user = global.AppState.getUser(userId);

    global.AppState.setState({
      currentUserId: userId,
      selectedTaskId: null,
      filters: { search: '', assigneeId: null, priority: null, deadlineState: null }
    });
    global.Router.navigate('#/dashboard');
    global.Toast.success(T('Signed in as {name}', { name: user.name }), { detail: UI.roleLine(user) });
  }

  function option(persona) {
    var UI = global.UI;
    var user = global.AppState.getUser(persona.userId);

    return UI.el('button', {
      class: 'login__option',
      type: 'button',
      title: T('Continue as {role}', { role: T(persona.role) }),
      onclick: function () { continueAs(persona.userId); }
    }, [
      UI.avatar(user, { size: 'lg', title: user.name }),
      UI.el('span', { class: 'login__option-text' }, [
        UI.el('span', { class: 'login__option-role' }, [
          persona.role,
          UI.el('span', { class: 'login__option-who', text: user.name })
        ]),
        UI.el('span', { class: 'login__option-blurb', text: persona.blurb }),
        UI.el('span', { class: 'login__option-scope' }, [
          UI.icon('layers', 13),
          UI.el('span', { text: UI.scopeLine(user) })
        ])
      ]),
      UI.el('span', { class: 'login__option-go' }, UI.icon('arrow-right', 18))
    ]);
  }

  Views.login = {
    render: function () {
      var UI = global.UI;

      return UI.el('div', { class: 'login' }, [
        UI.el('div', { class: 'login__card surface' }, [
          UI.el('div', { class: 'login__brand' }, [
            UI.el('span', { class: 'sidebar__mark' }, 'T'),
            UI.el('span', { class: 'login__brand-text' }, [
              UI.el('span', { class: 'sidebar__name', text: 'TaskFlow' }),
              UI.el('span', { class: 'login__tagline', text: 'Task Management & Assignment' })
            ]),
            UI.el('span', { class: 'spacer' }),
            UI.langSwitch()
          ]),

          UI.el('div', { class: 'login__intro' }, [
            UI.el('h1', { class: 'login__title', text: 'Continue as' }),
            UI.el('p', { class: 'text-sm text-secondary', text: 'Pick a role to explore what it can see and do. You can switch persona at any time from the profile menu.' })
          ]),

          UI.el('div', { class: 'login__options' }, PERSONAS.map(option)),

          UI.el('p', { class: 'text-xs text-muted', text: 'Prototype only — no real authentication. Six mock users are available once you are in.' })
        ])
      ]);
    }
  };
}(window));
