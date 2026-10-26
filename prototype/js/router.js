/* ===========================================================================
   Hash router over the route table in docs/02 §4.

   Guard rules, applied in this order:
     1. no persona chosen        -> #/login
     2. unknown route            -> #/dashboard  (silent)
     3. role cannot reach it     -> #/dashboard  + a toast explaining why

   #/tasks/:taskId is not a screen of its own: it resolves to the task's board
   with selectedTaskId set, so a notification or an external link can open the
   Task Detail drawer directly (docs/02 §4).

   selectedTaskId is cleared only when the resolved path actually changes.
   Re-resolving the same route must leave it alone: every drawer action calls
   setState, which re-enters here, and nulling the id there would slam the
   drawer shut halfway through the interaction that opened it.
   =========================================================================== */

(function (global) {
  'use strict';

  var currentMatch = null;
  var lastPath = null;

  /* --- Parsing ----------------------------------------------------------- */
  function parse(hash) {
    var raw = String(hash || '').replace(/^#/, '');
    var parts = raw.split('?');
    var path = parts[0].replace(/^\/+|\/+$/g, '');
    var query = {};

    if (parts[1]) {
      parts[1].split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }

    return {
      path: path,
      segments: path ? path.split('/').map(decodeURIComponent) : [],
      query: query
    };
  }

  /* --- Route table ------------------------------------------------------- */
  function matchRoute(segments) {
    var n = segments.length;
    var head = segments[0];

    if (n === 1 && head === 'login') return { view: 'login', params: {} };
    if (n === 1 && head === 'dashboard') return { view: 'dashboard', params: {} };
    if (n === 1 && head === 'my-tasks') return { view: 'myTasks', params: {} };
    if (n === 1 && head === 'notifications') return { view: 'notifications', params: {} };

    if (head === 'divisions') {
      if (n === 1) return { view: 'divisions', params: {} };
      if (n === 2) return { view: 'divisionDetail', params: { divisionId: segments[1] } };
    }

    if (head === 'projects') {
      if (n === 1) return { view: 'projects', params: {} };
      if (n === 2) return { view: 'board', params: { projectId: segments[1] } };
      if (n === 3 && segments[2] === 'settings') {
        return { view: 'projectSettings', params: { projectId: segments[1] } };
      }
    }

    if (head === 'tasks' && n === 2) {
      return { view: 'board', params: { taskId: segments[1] }, deepLinkTask: true };
    }

    if (head === 'admin' && n === 2) {
      if (segments[1] === 'users') return { view: 'adminUsers', params: {} };
      if (segments[1] === 'divisions') return { view: 'adminDivisions', params: {} };
      if (segments[1] === 'roles') return { view: 'adminRoles', params: {} };
    }
    if (head === 'admin' && n === 3 && segments[1] === 'roles') {
      return { view: 'adminRoleEdit', params: { roleId: segments[2] } };
    }

    return null;
  }

  /* --- Access (guard rule 3) --------------------------------------------- */
  function deny(message) { return { ok: false, message: message }; }
  var ALLOW = { ok: true };

  function checkAccess(match, user) {
    var S = global.AppState;
    var P = global.Permissions;

    switch (match.view) {
      case 'divisionDetail':
        if (!S.getDivision(match.params.divisionId)) return deny('That division no longer exists.');
        if (!S.canSeeDivision(user.id, match.params.divisionId)) {
          return deny('You can only open divisions you belong to.');
        }
        return ALLOW;

      case 'board':
        if (!S.getProject(match.params.projectId)) return deny('That project no longer exists.');
        if (!S.canSeeProject(user.id, match.params.projectId)) {
          return deny('You are not a member of that project.');
        }
        return ALLOW;

      case 'projectSettings':
        if (!S.getProject(match.params.projectId)) return deny('That project no longer exists.');
        if (!S.canSeeProject(user.id, match.params.projectId)) {
          return deny('You are not a member of that project.');
        }
        if (!P.can('viewProjectSettings', { user: user })) {
          return deny('Only a Supervisor or Super Admin can open project settings.');
        }
        return ALLOW;

      case 'adminUsers':
        return P.can('manageUsers', { user: user })
          ? ALLOW : deny('User Management is available to Super Admin only.');

      case 'adminRoles':
      case 'adminRoleEdit':
        return P.can('manageUsers', { user: user })
          ? ALLOW : deny('Role Management is available to Super Admin only.');

      case 'adminDivisions':
        return P.can('manageDivisions', { user: user })
          ? ALLOW : deny('Division Management is available to Super Admin only.');

      default:
        return ALLOW;
    }
  }

  /* Deep link #/tasks/:taskId -> the board that holds the task. */
  function resolveTaskDeepLink(match, user) {
    var S = global.AppState;
    var task = S.getTask(match.params.taskId);
    if (!task) return deny('That task no longer exists.');
    if (!S.canSeeTask(user.id, task.id)) return deny('You do not have access to that task.');
    match.params.projectId = task.projectId;
    return ALLOW;
  }

  /* --- Breadcrumb (docs/02 §1) ------------------------------------------- */
  function breadcrumbFor(match) {
    var S = global.AppState;
    var crumbs = [{ label: 'Dashboard', href: '#/dashboard' }];
    if (!match) return crumbs;

    switch (match.view) {
      case 'dashboard':
        return [{ label: 'Dashboard', href: '#/dashboard', current: true }];
      case 'myTasks':
        return crumbs.concat([{ label: 'My Tasks', href: '#/my-tasks', current: true }]);
      case 'notifications':
        return crumbs.concat([{ label: 'Notifications', href: '#/notifications', current: true }]);
      case 'divisions':
        return crumbs.concat([{ label: 'Divisions', href: '#/divisions', current: true }]);
      case 'divisionDetail':
        return crumbs.concat([
          { label: 'Divisions', href: '#/divisions' },
          { label: S.getDivision(match.params.divisionId).name, href: '#/divisions/' + match.params.divisionId, current: true }
        ]);
      case 'projects':
        return crumbs.concat([{ label: 'Projects', href: '#/projects', current: true }]);
      case 'board':
        return crumbs.concat([
          { label: 'Projects', href: '#/projects' },
          { label: S.getProject(match.params.projectId).name, href: '#/projects/' + match.params.projectId, current: true }
        ]);
      case 'projectSettings':
        return crumbs.concat([
          { label: 'Projects', href: '#/projects' },
          { label: S.getProject(match.params.projectId).name, href: '#/projects/' + match.params.projectId },
          { label: 'Settings', href: '#/projects/' + match.params.projectId + '/settings', current: true }
        ]);
      case 'adminUsers':
        return crumbs.concat([{ label: 'Administration', href: '#/admin/users' }, { label: 'Users', href: '#/admin/users', current: true }]);
      case 'adminRoles':
        return crumbs.concat([{ label: 'Administration', href: '#/admin/users' }, { label: 'Roles', href: '#/admin/roles', current: true }]);
      case 'adminRoleEdit':
        return crumbs.concat([{ label: 'Administration', href: '#/admin/users' }, { label: 'Roles', href: '#/admin/roles' }, { label: 'Edit', href: '#', current: true }]);
      case 'adminDivisions':
        return crumbs.concat([{ label: 'Administration', href: '#/admin/users' }, { label: 'Divisions', href: '#/admin/divisions', current: true }]);
      default:
        return crumbs;
    }
  }

  /* --- Navigation -------------------------------------------------------- */
  function navigate(hash) {
    if (global.location.hash === hash) handleRoute();
    else global.location.hash = hash;
  }

  function renderView(match) {
    var host = document.getElementById('view');
    var view = global.Views[match.view];

    global.UI.clear(host);

    if (!view) {
      host.appendChild(global.UI.emptyState({
        icon: 'alert-circle',
        title: 'Screen not registered',
        body: T('No view is registered for "{view}".', { view: match.view })
      }));
      return;
    }

    host.appendChild(view.render(match.params));
    host.scrollTop = 0;
  }

  /* Resolves the current hash, applies the guards, renders the view.
     Never calls setState loudly — the shell owns re-rendering. */
  function handleRoute() {
    var S = global.AppState;
    var state = S.getState();
    var parsed = parse(global.location.hash);

    /* Empty hash: send somewhere real. */
    if (!parsed.path) {
      navigate(state.currentUserId ? '#/dashboard' : '#/login');
      return;
    }

    var match = matchRoute(parsed.segments);

    /* Guard 2 — unknown route, redirect quietly. */
    if (!match) {
      navigate(state.currentUserId ? '#/dashboard' : '#/login');
      return;
    }

    /* Guard 1 — no persona chosen yet. */
    if (!state.currentUserId && match.view !== 'login') {
      navigate('#/login');
      return;
    }

    match.query = parsed.query;
    match.params.query = parsed.query;

    if (match.view === 'login') {
      currentMatch = match;
      lastPath = parsed.path;
      S.setState({
        activeRoute: global.location.hash, selectedTaskId: null, createTaskProjectId: null
      }, { silent: true });
      renderView(match);
      return;
    }

    var user = S.currentUser();

    /* Guard 3 — the role cannot reach this route. */
    var access = match.deepLinkTask ? resolveTaskDeepLink(match, user) : checkAccess(match, user);
    if (!access.ok) {
      global.Toast.warning(access.message, { detail: 'Returned to your dashboard.' });
      navigate('#/dashboard');
      return;
    }

    currentMatch = match;

    /* A deep link names the task. Any other route closes the drawer only if
       the reader actually navigated somewhere — not on a plain re-render. */
    var patch = { activeRoute: global.location.hash };
    if (match.params.taskId) patch.selectedTaskId = match.params.taskId;
    else if (parsed.path !== lastPath) patch.selectedTaskId = null;
    /* The Create Task form belongs to one board — walking away from it closes
       the form, on the same "did the reader actually navigate?" test (D48). */
    if (parsed.path !== lastPath) patch.createTaskProjectId = null;
    lastPath = parsed.path;

    S.setState(patch, { silent: true });

    renderView(match);
  }

  global.Router = {
    parse: parse,
    matchRoute: matchRoute,
    navigate: navigate,
    handleRoute: handleRoute,
    breadcrumbFor: breadcrumbFor,
    current: function () { return currentMatch; }
  };
}(window));
