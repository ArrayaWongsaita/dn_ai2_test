/* ===========================================================================
   Role rules for the prototype (docs/04-ROLE-PERMISSION-PROTOTYPE.md).
   This is a UI-visibility helper, not a security layer.

     Permissions.can('createTask', { user: user, project: project })
     Permissions.canEditField('priority', { user: user, task: task })

   Preference from docs/04: hide what a role cannot use. Use a disabled +
   tooltip state only where it teaches a rule — LOCK_REASON carries the copy.
   =========================================================================== */

(function (global) {
  'use strict';

  function isAdmin(user) { return !!user && user.role === 'SUPER_ADMIN'; }
  function isSupervisor(user) { return !!user && user.role === 'SUPERVISOR'; }
  function isManager(user) { return isAdmin(user) || isSupervisor(user); }

  /* One entry per row of the docs/04 capability table. ctx supplies whichever
     of { user, task, project, division } the rule needs. */
  var RULES = {
    /* Divisions */
    viewAllDivisions: function (ctx) { return isAdmin(ctx.user); },
    viewDivision: function (ctx) {
      if (isAdmin(ctx.user)) return true;
      if (!ctx.division || !ctx.user) return false;
      if (isSupervisor(ctx.user)) return ctx.division.supervisorId === ctx.user.id;
      return ctx.division.memberIds.indexOf(ctx.user.id) !== -1;
    },
    createDivision: function (ctx) { return isAdmin(ctx.user); },
    editDivision: function (ctx) { return isAdmin(ctx.user); },
    /* docs/04 has no row for division *membership*, and docs/02 S05 lists
       `Add member` under "Supervisor / Super Admin" — so this follows S05, not
       the admin-only rows above it (D54). */
    manageDivisionMembers: function (ctx) { return isManager(ctx.user); },
    archiveDivision: function (ctx) { return isAdmin(ctx.user); },
    assignSupervisor: function (ctx) { return isAdmin(ctx.user); },

    /* Projects */
    createProject: function (ctx) { return isManager(ctx.user); },
    /* docs/04 has no "edit project" row either; a settings screen whose info
       block cannot be edited reads as broken (D55). */
    editProject: function (ctx) { return isManager(ctx.user); },
    manageProjectMembers: function (ctx) { return isManager(ctx.user); },
    viewProjectSettings: function (ctx) { return isManager(ctx.user); },
    archiveProject: function (ctx) { return isManager(ctx.user); },

    /* Tasks */
    createTask: function (ctx) { return isManager(ctx.user); },
    editTask: function (ctx) { return !!ctx.user; },   /* a User edits a subset — see canEditField */
    archiveTask: function (ctx) { return isManager(ctx.user); },
    deleteTask: function (ctx) { return isManager(ctx.user); },

    /* Reassign: a User may only hand on a task they hold themselves */
    reassignTask: function (ctx) {
      if (isManager(ctx.user)) return true;
      if (!ctx.user || !ctx.task) return false;
      return ctx.task.assigneeId === ctx.user.id;
    },

    changeStatus: function (ctx) { return !!ctx.user; },
    dragTask: function (ctx) { return !!ctx.user; },
    changeProgress: function (ctx) { return !!ctx.user; },
    changeDeadline: function (ctx) { return isManager(ctx.user); },
    changePriority: function (ctx) { return isManager(ctx.user); },
    changeTitle: function (ctx) { return isManager(ctx.user); },
    changeCollaborators: function (ctx) { return isManager(ctx.user); },
    changeDescription: function (ctx) { return !!ctx.user; },
    comment: function (ctx) { return !!ctx.user; },
    addAttachment: function (ctx) { return !!ctx.user; },
    viewActivity: function (ctx) { return !!ctx.user; },

    /* Administration */
    manageUsers: function (ctx) { return isAdmin(ctx.user); },
    manageDivisions: function (ctx) { return isAdmin(ctx.user); }
  };

  function can(action, ctx) {
    var rule = RULES[action];
    if (!rule) {
      console.warn('[permissions] unknown action:', action);
      return false;
    }
    return !!rule(ctx || {});
  }

  /* --- Limited edit (docs/04 §Limited edit) ------------------------------
     Field-level answer for the Task Detail drawer. Supervisor and Super Admin
     edit everything; a User edits the work, not the framing around it. */
  var USER_EDITABLE = ['status', 'progress', 'description', 'comment', 'attachment'];

  function canEditField(field, ctx) {
    var user = ctx && ctx.user;
    if (!user) return false;
    if (isManager(user)) return true;
    if (field === 'assignee') {
      return !!ctx.task && ctx.task.assigneeId === user.id;
    }
    return USER_EDITABLE.indexOf(field) !== -1;
  }

  var LOCK_REASON = global.I18n.labels({
    priority: 'Only Supervisor can change priority',
    deadline: 'Only Supervisor can change deadline',
    title: 'Only Supervisor can change the title',
    collaborators: 'Only Supervisor can change collaborators',
    assignee: 'You can only reassign tasks assigned to you'
  });

  var ROLE_LABEL = global.I18n.labels({
    SUPER_ADMIN: 'Super Admin',
    SUPERVISOR: 'Supervisor',
    USER: 'User'
  });

  global.Permissions = {
    can: can,
    canEditField: canEditField,
    isAdmin: isAdmin,
    isSupervisor: isSupervisor,
    isManager: isManager,
    LOCK_REASON: LOCK_REASON,
    ROLE_LABEL: ROLE_LABEL,
    USER_EDITABLE: USER_EDITABLE
  };
}(window));
