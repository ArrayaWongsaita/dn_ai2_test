/* ===========================================================================
   Bootstrap: renders the shell, mounts the router, and re-renders whenever
   state changes. Everything below the shell is drawn by the view the router
   resolves (docs/08 §3).

   The profile menu at the sidebar footer is the permission demo's control
   panel: it switches between all six mock users without a page reload
   (docs/03 Flow H) and resets the dataset (docs/07 §10).
   =========================================================================== */

(function (global) {
  'use strict';

  var UI = global.UI;
  var S = global.AppState;
  var P = global.Permissions;

  /* --- Sidebar (docs/02 §1) ---------------------------------------------- */
  var NAV = [
    { label: 'Dashboard',     href: '#/dashboard',     icon: 'layout-dashboard', views: ['dashboard'] },
    { label: 'My Tasks',      href: '#/my-tasks',      icon: 'check-square',     views: ['myTasks'] },
    { label: 'Divisions',     href: '#/divisions',     icon: 'layers',           views: ['divisions', 'divisionDetail'] },
    { label: 'Projects',      href: '#/projects',      icon: 'folder-kanban',    views: ['projects', 'board', 'projectSettings'] },
    { label: 'Notifications', href: '#/notifications', icon: 'bell',             views: ['notifications'], badge: 'unread' }
  ];

  /* Administration is rendered only for Super Admin (docs/04). */
  var ADMIN_NAV = [
    { label: 'User Management',     href: '#/admin/users',     icon: 'users',  views: ['adminUsers'] },
    { label: 'Role Management',     href: '#/admin/roles',     icon: 'shield', views: ['adminRoles', 'adminRoleEdit'] },
    { label: 'Division Management', href: '#/admin/divisions',  icon: 'shield', views: ['adminDivisions'] }
  ];

  function navItem(item, activeView, unread) {
    var isActive = item.views.indexOf(activeView) !== -1;
    var count = item.badge === 'unread' ? unread : 0;

    return UI.el('a', {
      class: 'nav-item' + (isActive ? ' is-active' : ''),
      href: item.href,
      title: item.label,
      'aria-current': isActive ? 'page' : null
    }, [
      UI.icon(item.icon, 18),
      UI.el('span', { class: 'nav-item__label', text: item.label }),
      count > 0 ? UI.el('span', { class: 'nav-item__count', text: String(count) }) : null
    ]);
  }

  /* --- Persona menu (docs/03 Flow H) -------------------------------------
     Switching is a state patch, never a reload: the sidebar, the topbar and
     the view all re-render from the new currentUserId. If the screen the old
     persona was on is out of reach for the new one, the router's guard sends
     it to the dashboard and says why. */
  function switchPersona(user) {
    var current = S.currentUser();
    if (current && current.id === user.id) {
      global.Toast.info(T('Already viewing as {name}', { name: user.name }));
      return;
    }

    S.setState({
      currentUserId: user.id,
      selectedTaskId: null,
      filters: S.NO_FILTERS
    });
    global.Toast.success(T('Now viewing as {name}', { name: user.name }), { detail: UI.roleLine(user) });
  }

  function toggleFailure() {
    var on = !S.getState().simulateFailure;
    S.setState({ simulateFailure: on });
    if (on) {
      global.Toast.warning('Failure simulation on', {
        detail: 'Every status change will land, then revert with an error.'
      });
    } else {
      global.Toast.info('Failure simulation off');
    }
  }

  function resetData() {
    S.resetDemoData();
    global.Toast.success('Prototype data reset', {
      detail: 'Tasks, comments, activity and notifications are back to their seeded state.'
    });
  }

  function signOut() {
    S.setState({ currentUserId: null, selectedTaskId: null });
    global.Router.navigate('#/login');
  }

  /* Order the switcher by role so the three login personas read first. */
  var ROLE_ORDER = ['SUPER_ADMIN', 'SUPERVISOR', 'USER'];

  function personaMenuItems(user) {
    var Menu = global.Menu;
    var users = S.getState().users.slice().sort(function (a, b) {
      return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
    });

    var items = [Menu.section('Switch persona')];

    users.forEach(function (u) {
      items.push(Menu.item({
        label: u.name + ' — ' + P.ROLE_LABEL[u.role],
        sublabel: UI.scopeLine(u),
        leading: UI.avatar(u, { size: 'sm', title: u.name }),
        checked: u.id === user.id,
        title: T('View the prototype as {name}', { name: u.name }),
        onclick: function () { switchPersona(u); }
      }));
    });

    items.push(Menu.separator());
    /* Written in the language it switches to, so it can always be found (D77). */
    var th = global.I18n.locale() === 'th';
    var langItem = Menu.item({
      label: th ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย',
      sublabel: th ? 'ภาษาปัจจุบัน: ไทย' : 'Current language: English',
      icon: 'globe',
      onclick: function () { global.I18n.setLocale(th ? 'en' : 'th'); }
    });
    items.push(langItem);

    /* A demo control, like Reset below it — not a product feature (D71). */
    var failing = !!S.getState().simulateFailure;
    items.push(Menu.item({
      label: 'Simulate failure',
      sublabel: failing ? 'On — status changes fail and revert' : 'Make status changes fail and revert',
      icon: 'alert-triangle',
      checked: failing,
      title: 'Demo the error state from docs/05 §1',
      onclick: toggleFailure
    }));
    items.push(Menu.item({
      label: 'Reset Prototype Data',
      sublabel: 'Restore the seeded demo dataset',
      icon: 'refresh-cw',
      onclick: resetData
    }));
    items.push(Menu.item({
      label: 'Sign out',
      sublabel: 'Back to the persona picker',
      icon: 'log-out',
      onclick: signOut
    }));

    return items;
  }

  function openPersonaMenu(trigger, placement) {
    var user = S.currentUser();
    global.Menu.toggle(trigger, function () { return personaMenuItems(user); }, {
      placement: placement,
      width: 292,
      label: 'Profile and persona'
    });
  }

  function profileBlock(user) {
    var trigger = UI.el('button', {
      class: 'profile-block',
      type: 'button',
      title: T('{name} · {role} — switch persona or reset the data', { name: user.name, role: P.ROLE_LABEL[user.role] }),
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      onclick: function () { openPersonaMenu(trigger, 'top-start'); }
    }, [
      UI.avatar(user),
      UI.el('span', { class: 'profile-block__text' }, [
        UI.el('span', { class: 'profile-block__name', text: user.name }),
        UI.el('span', { class: 'profile-block__role', text: P.ROLE_LABEL[user.role] })
      ]),
      UI.el('span', { class: 'profile-block__chevron' }, UI.icon('chevron-down', 16))
    ]);
    return trigger;
  }

  function renderSidebar(user, activeView) {
    var host = document.getElementById('sidebar');
    /* index.html's static label never passes through UI.el(), so set it here (D77) */
    host.setAttribute('aria-label', T('Main navigation'));
    document.documentElement.lang = global.I18n.locale();
    var unread = S.unreadCount(user.id);
    UI.clear(host);

    host.appendChild(UI.el('button', {
      class: 'sidebar__brand',
      type: 'button',
      title: 'TaskFlow — go to Dashboard',
      onclick: function () { global.Router.navigate('#/dashboard'); }
    }, [
      UI.el('span', { class: 'sidebar__mark' }, 'T'),
      UI.el('span', { class: 'sidebar__name', text: 'TaskFlow' })
    ]));

    host.appendChild(UI.el('nav', { class: 'sidebar__nav' }, [
      NAV.map(function (item) { return navItem(item, activeView, unread); }),
      P.can('manageUsers', { user: user })
        ? [
            UI.el('p', { class: 'nav-group__label', text: 'Administration' }),
            ADMIN_NAV.map(function (item) { return navItem(item, activeView, unread); })
          ]
        : null
    ]));

    host.appendChild(UI.el('div', { class: 'sidebar__footer' }, profileBlock(user)));
  }

  /* --- Topbar ------------------------------------------------------------ */
  function renderTopbar(user, match) {
    var host = document.getElementById('topbar');
    UI.clear(host);

    host.appendChild(UI.el('button', {
      class: 'btn btn--icon',
      type: 'button',
      title: 'Collapse or expand the sidebar',
      'aria-label': 'Toggle sidebar',
      onclick: function () { S.setState({ sidebarCollapsed: !S.getState().sidebarCollapsed }); }
    }, UI.icon('panel-left', 18)));

    var crumbs = global.Router.breadcrumbFor(match);
    var breadcrumb = UI.el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' });
    crumbs.forEach(function (crumb, i) {
      if (i > 0) breadcrumb.appendChild(UI.icon('chevron-right', 14));
      breadcrumb.appendChild(UI.el('a', {
        class: 'breadcrumb__item' + (crumb.current ? ' is-current' : ''),
        href: crumb.href,
        text: crumb.label,
        'aria-current': crumb.current ? 'page' : null
      }));
    });
    host.appendChild(breadcrumb);

    host.appendChild(UI.el('span', { class: 'spacer' }));

    /* Both widgets live in js/topbar.js — the finder keeps a half-typed query
       across this rebuild, and the bell owns its own dropdown. */
    host.appendChild(global.Topbar.search(user));
    host.appendChild(global.Topbar.bell(user));

    /* The topbar avatar opens the same menu as the sidebar profile block. */
    var avatarTrigger = UI.el('button', {
      class: 'topbar__avatar',
      type: 'button',
      title: user.name + ' · ' + P.ROLE_LABEL[user.role],
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': 'Profile and persona menu',
      onclick: function () { openPersonaMenu(avatarTrigger, 'bottom-end'); }
    }, UI.avatar(user));
    host.appendChild(avatarTrigger);
  }

  /* --- Render loop -------------------------------------------------------- */
  function renderApp() {
    /* Any open dropdown belongs to the shell that is about to be replaced. */
    if (global.Menu) global.Menu.close();

    /* The router renders #view and tells us what it resolved. */
    global.Router.handleRoute();

    var match = global.Router.current();
    var state = S.getState();
    var user = S.currentUser();
    var app = document.getElementById('app');
    var isLogin = !user || !match || match.view === 'login';

    /* The drawers live outside #view, so they are not the router's to draw:
       each one opens, repaints or closes itself from its own state key
       (docs/08 §4). They share one Drawer, and each only ever closes a drawer
       whose key it owns (D48). */
    global.TaskDetail.sync();
    global.TaskCreate.sync();

    app.classList.toggle('is-bare', isLogin);
    app.classList.toggle('is-collapsed', !isLogin && state.sidebarCollapsed);

    if (isLogin) {
      UI.clear(document.getElementById('sidebar'));
      UI.clear(document.getElementById('topbar'));
      return;
    }

    renderSidebar(user, match.view);
    renderTopbar(user, match);
  }

  function boot() {
    global.addEventListener('hashchange', renderApp);
    S.subscribe(renderApp);
    renderApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.App = { render: renderApp };
}(window));
