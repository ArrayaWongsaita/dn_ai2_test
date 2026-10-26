/* ===========================================================================
   State store + selectors (docs/08 §4).

   Everything lives in memory — no localStorage, so a refresh always returns
   the seeded demo. Every mutation goes through setState so subscribers
   re-render; arrays are replaced, never mutated in place.
   =========================================================================== */

(function (global) {
  'use strict';

  var listeners = [];
  var state = null;

  /* Board filters are project-scoped by carrying the project they belong to
     (TODO.md D38): walking to another board must start clean, and resetting
     them from inside a render would mean a setState during render. */
  var NO_FILTERS = {
    projectId: null, search: '', assigneeId: null, priority: null, deadlineState: null
  };

  function seed(carryOver) {
    var data = global.MockData.build();
    return {
      currentUserId: carryOver && carryOver.currentUserId ? carryOver.currentUserId : null,
      activeRoute: '#/login',
      selectedTaskId: null,
      createTaskProjectId: null,
      showBlockedColumn: false,
      sidebarCollapsed: carryOver ? !!carryOver.sidebarCollapsed : false,
      /* TH / EN (D77) — kept across a reset, like the persona (D13). */
      locale: carryOver && carryOver.locale === 'th' ? 'th' : 'en',
      simulateFailure: false,
      filters: NO_FILTERS,
      users: data.users,
      divisions: data.divisions,
      projects: data.projects,
      tasks: data.tasks,
      notifications: data.notifications
    };
  }

  function getState() { return state; }

  function notify() {
    listeners.slice().forEach(function (fn) { fn(state); });
  }

  /* setState({...}) merges and notifies. Pass { silent: true } when the patch
     is the router recording where it already is — notifying there would make
     the router re-enter itself on every navigation. */
  function setState(patch, options) {
    state = Object.assign({}, state, patch);
    if (!options || !options.silent) notify();
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  /* Bumped by every reset, so a delayed callback (the Simulate failure
     revert) can tell it is holding a reference to a dataset that is gone. */
  var epoch = 0;
  function currentEpoch() { return epoch; }

  function resetDemoData() {
    epoch += 1;
    state = seed(state);
    notify();
    return state;
  }

  /* --- Lookups --------------------------------------------------------- */
  function byId(collection, id) {
    for (var i = 0; i < collection.length; i++) {
      if (collection[i].id === id) return collection[i];
    }
    return null;
  }

  function getUser(id) { return byId(state.users, id); }
  function getDivision(id) { return byId(state.divisions, id); }
  function getProject(id) { return byId(state.projects, id); }
  function getTask(id) { return byId(state.tasks, id); }
  function currentUser() { return state.currentUserId ? getUser(state.currentUserId) : null; }

  function roleOf(userId) {
    var user = getUser(userId);
    return user ? user.role : null;
  }

  /* Deactivating someone in S10 takes them out of every people picker (D61),
     but never out of getUser — a task they already hold still has to draw
     their name and avatar. */
  function isActive(user) { return !!user && user.status !== 'INACTIVE'; }

  function activeUsers() { return state.users.filter(isActive); }

  /* The "Divisions" column on S10: which divisions a person belongs to,
     whatever their role. */
  function divisionsOf(userId) {
    return state.divisions.filter(function (d) { return d.memberIds.indexOf(userId) !== -1; });
  }

  /* --- Visibility (docs/01 §5 rules 12-14, verified against docs/07 §9) -- */
  function visibleDivisions(userId) {
    var role = roleOf(userId);
    if (role === 'SUPER_ADMIN') return state.divisions.slice();
    if (role === 'SUPERVISOR') {
      return state.divisions.filter(function (d) { return d.supervisorId === userId; });
    }
    return state.divisions.filter(function (d) { return d.memberIds.indexOf(userId) !== -1; });
  }

  /* Archiving a division is the D52 treatment applied one level up: the card
     leaves S04 and the scope line, but visibleDivisions stays honest so
     #/divisions/:id and Restore both still have somewhere to point (D63). */
  function activeDivisions(userId) {
    return visibleDivisions(userId).filter(function (d) { return d.status !== 'ARCHIVED'; });
  }

  function archivedDivisions(userId) {
    return visibleDivisions(userId).filter(function (d) { return d.status === 'ARCHIVED'; });
  }

  function visibleProjects(userId) {
    var role = roleOf(userId);
    if (role === 'SUPER_ADMIN') return state.projects.slice();
    if (role === 'SUPERVISOR') {
      var supervised = visibleDivisions(userId).map(function (d) { return d.id; });
      return state.projects.filter(function (p) { return supervised.indexOf(p.divisionId) !== -1; });
    }
    return state.projects.filter(function (p) { return p.memberIds.indexOf(userId) !== -1; });
  }

  /* Archiving a project takes it out of every card grid and out of the scope
     line, but never out of visibleProjects — the board, its tasks and
     #/projects/:id/settings must stay reachable so Restore has somewhere to
     live (D52). */
  function activeProjects(userId) {
    return visibleProjects(userId).filter(function (p) { return p.status !== 'ARCHIVED'; });
  }

  function archivedProjects(userId) {
    return visibleProjects(userId).filter(function (p) { return p.status === 'ARCHIVED'; });
  }

  function visibleTasks(userId) {
    var ids = visibleProjects(userId).map(function (p) { return p.id; });
    return state.tasks.filter(function (t) { return ids.indexOf(t.projectId) !== -1; });
  }

  function canSeeProject(userId, projectId) {
    return visibleProjects(userId).some(function (p) { return p.id === projectId; });
  }

  function canSeeDivision(userId, divisionId) {
    return visibleDivisions(userId).some(function (d) { return d.id === divisionId; });
  }

  function canSeeTask(userId, taskId) {
    var task = getTask(taskId);
    return !!task && canSeeProject(userId, task.projectId);
  }

  /* --- Task grouping ---------------------------------------------------- */
  var STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED', 'CANCELLED'];

  function projectTasks(projectId) {
    return state.tasks.filter(function (t) { return t.projectId === projectId; });
  }

  /* docs/01 §5 rule 6 says an assignee must be a project member; D61 adds that
     they must still be active. Every assignee / collaborator picker reads this
     — the board header and the assignee filter deliberately do not, because
     you must still be able to see and filter a deactivated person's work. */
  function assignableMembers(projectId) {
    var project = getProject(projectId);
    if (!project) return [];
    return project.memberIds.map(getUser).filter(isActive);
  }

  function tasksByStatus(projectId) {
    var grouped = {};
    STATUSES.forEach(function (s) { grouped[s] = []; });
    projectTasks(projectId).forEach(function (t) {
      if (grouped[t.status]) grouped[t.status].push(t);
    });
    return grouped;
  }

  function tasksAssignedTo(userId) {
    return visibleTasks(userId).filter(function (t) { return t.assigneeId === userId; });
  }

  /* --- Deadline state (docs/01 §9) --------------------------------------
     Order matters: the first matching row wins. Compare whole days only, so
     both sides are normalised to local midnight first. */
  function startOfDay(value) {
    var d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil(deadline) {
    return Math.round((startOfDay(deadline) - startOfDay(new Date())) / (24 * 60 * 60 * 1000));
  }

  function deadlineState(task) {
    if (!task) return 'none';
    if (task.status === 'COMPLETED') return 'completed';
    if (!task.deadline) return 'none';
    var diff = daysUntil(task.deadline);
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'due-today';
    if (diff <= 3) return 'due-soon';
    return 'upcoming';
  }

  /* --- Board filters (docs/05 §11) ---------------------------------------
     state.filters carries the project it was set on, so a board only ever
     applies its own filters (D38). Everything here is a read — the board
     writes through setState like any other screen. */
  function filtersFor(projectId) {
    var f = state.filters || NO_FILTERS;
    return f.projectId && f.projectId === projectId ? f : NO_FILTERS;
  }

  function activeFilterCount(projectId) {
    var f = filtersFor(projectId);
    var n = 0;
    if (String(f.search || '').trim()) n += 1;
    if (f.assigneeId) n += 1;
    if (f.priority) n += 1;
    if (f.deadlineState) n += 1;
    return n;
  }

  function matchesFilters(task, projectId) {
    var f = filtersFor(projectId);
    var term = String(f.search || '').trim().toLowerCase();

    if (term && String(task.title || '').toLowerCase().indexOf(term) === -1) return false;
    if (f.assigneeId && task.assigneeId !== f.assigneeId) return false;
    if (f.priority && task.priority !== f.priority) return false;
    if (f.deadlineState && deadlineState(task) !== f.deadlineState) return false;
    return true;
  }

  function filterTasks(tasks, projectId) {
    if (!activeFilterCount(projectId)) return tasks;
    return tasks.filter(function (t) { return matchesFilters(t, projectId); });
  }

  /* --- Notifications ---------------------------------------------------- */
  function notificationsFor(userId) {
    return state.notifications.filter(function (n) { return n.userId === userId; });
  }

  function unreadCount(userId) {
    return notificationsFor(userId).filter(function (n) { return !n.read; }).length;
  }

  /* --- Mutations used from Wave 3 onward --------------------------------
     Both take the same { silent: true } option as setState. One board drop is
     three mutations (status, then up to two activity events) — writing them
     silently and notifying once keeps the board to a single re-render. */
  function updateTask(taskId, patch, options) {
    var updated = null;
    var tasks = state.tasks.map(function (t) {
      if (t.id !== taskId) return t;
      updated = Object.assign({}, t, patch);
      return updated;
    });
    setState({ tasks: tasks }, options);
    return updated;
  }

  function appendActivity(taskId, event, options) {
    var task = getTask(taskId);
    if (!task) return null;
    var entry = Object.assign({
      id: 'a' + Date.now() + Math.floor(Math.random() * 1000),
      taskId: taskId,
      at: new Date()
    }, event);
    updateTask(taskId, { activity: task.activity.concat([entry]) }, options);
    return entry;
  }

  /* Takes the same { silent: true } option as the rest of the store (D41):
     marking a notification read *and* opening its task is two mutations that
     should cost one render. */
  function markNotificationRead(notificationId, options) {
    setState({
      notifications: state.notifications.map(function (n) {
        return n.id === notificationId ? Object.assign({}, n, { read: true }) : n;
      })
    }, options);
  }

  function markAllNotificationsRead(userId, options) {
    setState({
      notifications: state.notifications.map(function (n) {
        return n.userId === userId && !n.read ? Object.assign({}, n, { read: true }) : n;
      })
    }, options);
  }

  /* A reassign tells the new assignee (D40) — newest first, same shape as the
     docs/07 §8 seeds. */
  var notifySeq = 0;
  function pushNotification(record, options) {
    var entry = Object.assign({
      id: 'n' + Date.now().toString(36) + (++notifySeq),
      read: false,
      at: new Date()
    }, record);
    setState({ notifications: [entry].concat(state.notifications) }, options);
    return entry;
  }

  /* --- Creation (Wave 6) -------------------------------------------------
     A division, project or task created in the demo lands in the URL
     (#/projects/p5, #/tasks/t17), so ids stay short and sequential rather than
     using the timestamp uid() that comments and activity events use. */
  function nextId(prefix, collection) {
    var max = 0;
    collection.forEach(function (row) {
      var match = new RegExp('^' + prefix + '(\\d+)$').exec(row.id);
      if (match) max = Math.max(max, Number(match[1]));
    });
    return prefix + (max + 1);
  }

  function addTask(task, options) {
    setState({ tasks: state.tasks.concat([task]) }, options);
    return task;
  }

  function addProject(project, options) {
    setState({ projects: state.projects.concat([project]) }, options);
    return project;
  }

  function addDivision(division, options) {
    setState({ divisions: state.divisions.concat([division]) }, options);
    return division;
  }

  function updateProject(projectId, patch, options) {
    var updated = null;
    var projects = state.projects.map(function (p) {
      if (p.id !== projectId) return p;
      updated = Object.assign({}, p, patch);
      return updated;
    });
    setState({ projects: projects }, options);
    return updated;
  }

  function updateDivision(divisionId, patch, options) {
    var updated = null;
    var divisions = state.divisions.map(function (d) {
      if (d.id !== divisionId) return d;
      updated = Object.assign({}, d, patch);
      return updated;
    });
    setState({ divisions: divisions }, options);
    return updated;
  }

  function addUser(user, options) {
    setState({ users: state.users.concat([user]) }, options);
    return user;
  }

  function updateUser(userId, patch, options) {
    var updated = null;
    var users = state.users.map(function (u) {
      if (u.id !== userId) return u;
      updated = Object.assign({}, u, patch);
      return updated;
    });
    setState({ users: users }, options);
    return updated;
  }

  state = seed(null);

  global.AppState = {
    /* store */
    getState: getState,
    setState: setState,
    subscribe: subscribe,
    resetDemoData: resetDemoData,
    epoch: currentEpoch,
    /* lookups */
    currentUser: currentUser,
    getUser: getUser,
    getDivision: getDivision,
    getProject: getProject,
    getTask: getTask,
    roleOf: roleOf,
    isActive: isActive,
    activeUsers: activeUsers,
    divisionsOf: divisionsOf,
    /* visibility */
    visibleDivisions: visibleDivisions,
    activeDivisions: activeDivisions,
    archivedDivisions: archivedDivisions,
    visibleProjects: visibleProjects,
    activeProjects: activeProjects,
    archivedProjects: archivedProjects,
    visibleTasks: visibleTasks,
    canSeeProject: canSeeProject,
    canSeeDivision: canSeeDivision,
    canSeeTask: canSeeTask,
    /* tasks */
    STATUSES: STATUSES,
    projectTasks: projectTasks,
    assignableMembers: assignableMembers,
    tasksByStatus: tasksByStatus,
    tasksAssignedTo: tasksAssignedTo,
    deadlineState: deadlineState,
    daysUntil: daysUntil,
    startOfDay: startOfDay,
    /* filters */
    NO_FILTERS: NO_FILTERS,
    filtersFor: filtersFor,
    activeFilterCount: activeFilterCount,
    matchesFilters: matchesFilters,
    filterTasks: filterTasks,
    /* notifications */
    notificationsFor: notificationsFor,
    unreadCount: unreadCount,
    /* mutations */
    nextId: nextId,
    addTask: addTask,
    addProject: addProject,
    addDivision: addDivision,
    addUser: addUser,
    updateProject: updateProject,
    updateDivision: updateDivision,
    updateUser: updateUser,
    updateTask: updateTask,
    appendActivity: appendActivity,
    markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,
    pushNotification: pushNotification
  };
}(window));
