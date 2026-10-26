/* ===========================================================================
   Mock dataset — docs/07-MOCK-DATA.md is the contract for this file.

   build() constructs the whole dataset fresh on every call so the relative
   dates are re-evaluated. That is what makes resetDemoData() honest: a demo
   left open overnight still has a task that is "Due today" in the morning.
   =========================================================================== */

(function (global) {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var HOUR = 60 * 60 * 1000;

  function daysFromNow(n) { return new Date(Date.now() + n * DAY); }
  function hoursAgo(n) { return new Date(Date.now() - n * HOUR); }

  function build() {
    /* --- Users (§2) ----------------------------------------------------- */
    var users = [
      { id: 'u1', name: 'Prim',  email: 'prim@company.test',  role: 'SUPER_ADMIN', avatar: 'P', status: 'ACTIVE' },
      { id: 'u2', name: 'Nina',  email: 'nina@company.test',  role: 'SUPERVISOR',  avatar: 'N', status: 'ACTIVE' },
      { id: 'u3', name: 'James', email: 'james@company.test', role: 'USER',        avatar: 'J', status: 'ACTIVE' },
      { id: 'u4', name: 'Aom',   email: 'aom@company.test',   role: 'USER',        avatar: 'A', status: 'ACTIVE' },
      { id: 'u5', name: 'Ben',   email: 'ben@company.test',   role: 'SUPERVISOR',  avatar: 'B', status: 'ACTIVE' },
      { id: 'u6', name: 'Mook',  email: 'mook@company.test',  role: 'USER',        avatar: 'M', status: 'ACTIVE' }
    ];

    /* --- Divisions (§3) ------------------------------------------------- */
    var divisions = [
      { id: 'd1', name: 'Marketing',  supervisorId: 'u2', memberIds: ['u2', 'u3', 'u4'], status: 'ACTIVE' },
      { id: 'd2', name: 'Admin',      supervisorId: 'u5', memberIds: ['u5', 'u6'],       status: 'ACTIVE' },
      { id: 'd3', name: 'Management', supervisorId: 'u1', memberIds: ['u1'],             status: 'ACTIVE' }
    ];

    /* --- Projects (§4) -------------------------------------------------- */
    var projects = [
      { id: 'p1', name: 'Facebook Campaign Q4', divisionId: 'd1', memberIds: ['u2', 'u3', 'u4'], status: 'ACTIVE', createdAt: hoursAgo(24 * 30) },
      { id: 'p2', name: 'New Website Launch',   divisionId: 'd1', memberIds: ['u2', 'u4'],       status: 'ACTIVE', createdAt: hoursAgo(24 * 21) },
      { id: 'p3', name: 'Office Operations',    divisionId: 'd2', memberIds: ['u5', 'u6'],       status: 'ACTIVE', createdAt: hoursAgo(24 * 12) },
      { id: 'p4', name: 'Brand Refresh 2027',   divisionId: 'd1', memberIds: ['u2', 'u3'],       status: 'ACTIVE', createdAt: hoursAgo(24 * 6) }
    ];

    /* --- Activity helper (§6) ------------------------------------------- */
    var activitySeq = 0;
    function act(taskId, type, actorId, at, extra) {
      var event = { id: 'a' + (++activitySeq), taskId: taskId, type: type, actorId: actorId, at: at };
      if (extra) {
        Object.keys(extra).forEach(function (key) { event[key] = extra[key]; });
      }
      return event;
    }

    /* --- Comments (§7) --------------------------------------------------- */
    var comments = [
      { id: 'c1', taskId: 't1', authorId: 'u2', body: 'Can we get the 1080x1080 version too?', at: hoursAgo(20) },
      { id: 'c2', taskId: 't1', authorId: 'u3', body: 'On it — first drafts ready tomorrow morning.', at: hoursAgo(6) },
      { id: 'c3', taskId: 't4', authorId: 'u2', body: 'The headline in section 2 still reads a little long.', at: hoursAgo(28) },
      { id: 'c4', taskId: 't4', authorId: 'u4', body: 'Trimmed it to nine words. Take another look?', at: hoursAgo(9) },
      { id: 'c5', taskId: 't4', authorId: 'u3', body: 'Much better now. Happy to move this to Review.', at: hoursAgo(4) }
    ];
    function commentsFor(taskId) {
      return comments.filter(function (c) { return c.taskId === taskId; });
    }

    /* --- Attachments (§7) ------------------------------------------------ */
    var attachments = [
      { id: 'f1', taskId: 't1', name: 'ad-brief-v2.pdf', size: '248 KB', uploadedById: 'u2', at: hoursAgo(30), url: null }
    ];
    function attachmentsFor(taskId) {
      return attachments.filter(function (f) { return f.taskId === taskId; });
    }

    /* --- Tasks (§5) ------------------------------------------------------ */
    function task(spec) {
      return {
        id: spec.id,
        projectId: spec.projectId,
        title: spec.title,
        description: spec.description || '',
        status: spec.status,
        priority: spec.priority,
        assigneeId: spec.assigneeId,
        collaboratorIds: spec.collaboratorIds || [],
        progress: spec.progress,
        deadline: spec.deadline === undefined ? null : spec.deadline,
        createdById: spec.createdById || 'u2',
        createdAt: spec.createdAt,
        activity: spec.activity || [],
        comments: commentsFor(spec.id),
        attachments: attachmentsFor(spec.id)
      };
    }

    var tasks = [
      /* --- Facebook Campaign Q4 (p1) ------------------------------------ */
      task({
        id: 't1', projectId: 'p1',
        title: 'Prepare Facebook Ad Creative',
        description: 'Three creative variants for the Q4 push: one static, one carousel, one short video cut. Square and story sizes for each.',
        status: 'TODO', priority: 'HIGH', assigneeId: 'u3', collaboratorIds: ['u4'],
        progress: 10, deadline: daysFromNow(5), createdAt: hoursAgo(72),
        activity: [
          act('t1', 'CREATED', 'u2', hoursAgo(72)),
          act('t1', 'ASSIGNED', 'u2', hoursAgo(72), { to: 'u3' }),
          act('t1', 'DEADLINE_CHANGED', 'u2', hoursAgo(48), { from: daysFromNow(2), to: daysFromNow(5) }),
          act('t1', 'COMMENT_ADDED', 'u2', hoursAgo(20), { commentId: 'c1' }),
          act('t1', 'PROGRESS_CHANGED', 'u3', hoursAgo(18), { from: 0, to: 10 }),
          act('t1', 'COMMENT_ADDED', 'u3', hoursAgo(6), { commentId: 'c2' })
        ]
      }),
      task({
        id: 't2', projectId: 'p1',
        title: 'Draft Q4 Audience Targeting Brief',
        description: 'Define the three core audiences and the exclusion list for the Q4 flight.',
        status: 'TODO', priority: 'MEDIUM', assigneeId: 'u4',
        progress: 0, deadline: daysFromNow(2), createdAt: hoursAgo(60),
        activity: [
          act('t2', 'CREATED', 'u2', hoursAgo(60)),
          act('t2', 'ASSIGNED', 'u2', hoursAgo(60), { to: 'u4' })
        ]
      }),
      task({
        id: 't3', projectId: 'p1',
        title: 'Collect Competitor Ad Examples',
        description: 'Screenshot anything interesting from the five competitors in the ad library.',
        status: 'TODO', priority: 'LOW', assigneeId: 'u3',
        progress: 0, deadline: null, createdAt: hoursAgo(52),
        activity: [
          act('t3', 'CREATED', 'u2', hoursAgo(52)),
          act('t3', 'ASSIGNED', 'u2', hoursAgo(52), { to: 'u3' })
        ]
      }),
      task({
        id: 't4', projectId: 'p1',
        title: 'Review Landing Page Copy',
        description: 'Full pass on the campaign landing page: headline, subhead, three benefit blocks, CTA.',
        status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: 'u4', collaboratorIds: ['u3'],
        progress: 65, deadline: daysFromNow(0), createdAt: hoursAgo(96),
        activity: [
          act('t4', 'CREATED', 'u2', hoursAgo(96)),
          act('t4', 'ASSIGNED', 'u2', hoursAgo(96), { to: 'u3' }),
          act('t4', 'REASSIGNED', 'u3', hoursAgo(70), { from: 'u3', to: 'u4' }),
          act('t4', 'STATUS_CHANGED', 'u4', hoursAgo(46), { from: 'TODO', to: 'IN_PROGRESS' }),
          act('t4', 'COMMENT_ADDED', 'u2', hoursAgo(28), { commentId: 'c3' }),
          act('t4', 'PROGRESS_CHANGED', 'u4', hoursAgo(10), { from: 30, to: 65 }),
          act('t4', 'COMMENT_ADDED', 'u4', hoursAgo(9), { commentId: 'c4' }),
          act('t4', 'COMMENT_ADDED', 'u3', hoursAgo(4), { commentId: 'c5' })
        ]
      }),
      task({
        id: 't5', projectId: 'p1',
        title: 'Set Up Conversion Tracking',
        description: 'Pixel plus three custom conversion events, verified in the test environment first.',
        status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u3',
        progress: 35, deadline: daysFromNow(1), createdAt: hoursAgo(80),
        activity: [
          act('t5', 'CREATED', 'u2', hoursAgo(80)),
          act('t5', 'ASSIGNED', 'u2', hoursAgo(80), { to: 'u3' }),
          act('t5', 'STATUS_CHANGED', 'u3', hoursAgo(30), { from: 'TODO', to: 'IN_PROGRESS' }),
          act('t5', 'PROGRESS_CHANGED', 'u3', hoursAgo(12), { from: 15, to: 35 })
        ]
      }),
      task({
        id: 't6', projectId: 'p1',
        title: 'Finalize Campaign Tracking Sheet',
        description: 'One sheet the whole team reads: spend, reach, CPL and status per creative.',
        status: 'REVIEW', priority: 'MEDIUM', assigneeId: 'u3', collaboratorIds: ['u2'],
        progress: 90, deadline: daysFromNow(-2), createdAt: hoursAgo(120),
        activity: [
          act('t6', 'CREATED', 'u2', hoursAgo(120)),
          act('t6', 'ASSIGNED', 'u2', hoursAgo(120), { to: 'u3' }),
          act('t6', 'STATUS_CHANGED', 'u3', hoursAgo(96), { from: 'TODO', to: 'IN_PROGRESS' }),
          act('t6', 'DEADLINE_CHANGED', 'u2', hoursAgo(60), { from: daysFromNow(-5), to: daysFromNow(-2) }),
          act('t6', 'PROGRESS_CHANGED', 'u3', hoursAgo(40), { from: 40, to: 90 }),
          act('t6', 'STATUS_CHANGED', 'u3', hoursAgo(26), { from: 'IN_PROGRESS', to: 'REVIEW' })
        ]
      }),
      task({
        id: 't7', projectId: 'p1',
        title: 'Proofread Ad Headlines',
        description: 'Twelve headline variants — check length limits and the claims wording.',
        status: 'REVIEW', priority: 'LOW', assigneeId: 'u4',
        progress: 80, deadline: daysFromNow(4), createdAt: hoursAgo(64),
        activity: [
          act('t7', 'CREATED', 'u2', hoursAgo(64)),
          act('t7', 'ASSIGNED', 'u2', hoursAgo(64), { to: 'u4' }),
          act('t7', 'STATUS_CHANGED', 'u4', hoursAgo(20), { from: 'IN_PROGRESS', to: 'REVIEW' })
        ]
      }),
      task({
        id: 't8', projectId: 'p1',
        title: 'Publish Campaign Assets',
        description: 'Upload the approved set to the shared drive and notify the media team.',
        status: 'COMPLETED', priority: 'HIGH', assigneeId: 'u4',
        progress: 100, deadline: daysFromNow(-1), createdAt: hoursAgo(110),
        activity: [
          act('t8', 'CREATED', 'u2', hoursAgo(110)),
          act('t8', 'ASSIGNED', 'u2', hoursAgo(110), { to: 'u4' }),
          act('t8', 'STATUS_CHANGED', 'u4', hoursAgo(16), { from: 'REVIEW', to: 'COMPLETED' }),
          act('t8', 'PROGRESS_CHANGED', 'u4', hoursAgo(16), { from: 85, to: 100 })
        ]
      }),
      task({
        id: 't9', projectId: 'p1',
        title: 'Book Media Placement Slots',
        description: 'Lock the November placements with the agency before the rate rises.',
        status: 'COMPLETED', priority: 'MEDIUM', assigneeId: 'u2',
        progress: 100, deadline: daysFromNow(-6), createdAt: hoursAgo(150),
        activity: [
          act('t9', 'CREATED', 'u2', hoursAgo(150)),
          act('t9', 'ASSIGNED', 'u2', hoursAgo(150), { to: 'u2' }),
          act('t9', 'STATUS_CHANGED', 'u2', hoursAgo(130), { from: 'IN_PROGRESS', to: 'COMPLETED' })
        ]
      }),
      task({
        id: 't10', projectId: 'p1',
        title: 'Confirm Budget Approval',
        description: 'Waiting on finance to sign off the additional 15% for December.',
        status: 'BLOCKED', priority: 'URGENT', assigneeId: 'u3',
        progress: 40, deadline: daysFromNow(-4), createdAt: hoursAgo(140),
        activity: [
          act('t10', 'CREATED', 'u2', hoursAgo(140)),
          act('t10', 'ASSIGNED', 'u2', hoursAgo(140), { to: 'u3' }),
          act('t10', 'STATUS_CHANGED', 'u3', hoursAgo(50), { from: 'IN_PROGRESS', to: 'BLOCKED' })
        ]
      }),
      task({
        id: 't11', projectId: 'p1',
        title: 'Get Legal Sign-off on Claims',
        description: 'Two performance claims in the carousel copy need legal review.',
        status: 'BLOCKED', priority: 'HIGH', assigneeId: 'u2',
        progress: 20, deadline: daysFromNow(3), createdAt: hoursAgo(88),
        activity: [
          act('t11', 'CREATED', 'u2', hoursAgo(88)),
          act('t11', 'ASSIGNED', 'u2', hoursAgo(88), { to: 'u2' }),
          act('t11', 'STATUS_CHANGED', 'u2', hoursAgo(34), { from: 'TODO', to: 'BLOCKED' })
        ]
      }),
      task({
        id: 't12', projectId: 'p1',
        title: 'Run Influencer Outreach Pilot',
        description: 'Cancelled for Q4 — the budget moved to paid social.',
        status: 'CANCELLED', priority: 'LOW', assigneeId: 'u4',
        progress: 15, deadline: null, createdAt: hoursAgo(100),
        activity: [
          act('t12', 'CREATED', 'u2', hoursAgo(100)),
          act('t12', 'ASSIGNED', 'u2', hoursAgo(100), { to: 'u4' }),
          act('t12', 'STATUS_CHANGED', 'u2', hoursAgo(44), { from: 'TODO', to: 'CANCELLED' })
        ]
      }),

      /* --- New Website Launch (p2) -------------------------------------- */
      task({
        id: 't13', projectId: 'p2',
        title: 'Finalize Sitemap',
        description: 'Agree the top-level navigation before the wireframes start.',
        status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u4',
        progress: 50, deadline: daysFromNow(7), createdAt: hoursAgo(58),
        activity: [
          act('t13', 'CREATED', 'u2', hoursAgo(58)),
          act('t13', 'ASSIGNED', 'u2', hoursAgo(58), { to: 'u4' }),
          act('t13', 'STATUS_CHANGED', 'u4', hoursAgo(24), { from: 'TODO', to: 'IN_PROGRESS' })
        ]
      }),
      task({
        id: 't14', projectId: 'p2',
        title: 'Write Homepage Copy',
        description: 'Hero, three sections and the footer CTA. Match the new tone guide.',
        status: 'TODO', priority: 'MEDIUM', assigneeId: 'u2',
        progress: 0, deadline: daysFromNow(10), createdAt: hoursAgo(50),
        activity: [
          act('t14', 'CREATED', 'u2', hoursAgo(50)),
          act('t14', 'ASSIGNED', 'u2', hoursAgo(50), { to: 'u2' })
        ]
      }),

      /* --- Brand Refresh 2027 (p4) -------------------------------------- */
      task({
        id: 't15', projectId: 'p4',
        title: 'Audit Existing Brand Assets',
        description: 'Inventory every logo lockup, colour and template still in circulation.',
        status: 'TODO', priority: 'MEDIUM', assigneeId: 'u3',
        progress: 5, deadline: daysFromNow(14), createdAt: hoursAgo(36),
        activity: [
          act('t15', 'CREATED', 'u2', hoursAgo(36)),
          act('t15', 'ASSIGNED', 'u2', hoursAgo(36), { to: 'u3' })
        ]
      }),
      task({
        id: 't16', projectId: 'p4',
        title: 'Shortlist Design Agencies',
        description: 'Five agencies, with a one-page rationale and an indicative budget for each.',
        status: 'REVIEW', priority: 'LOW', assigneeId: 'u2',
        progress: 70, deadline: daysFromNow(-5), createdAt: hoursAgo(130),
        activity: [
          act('t16', 'CREATED', 'u2', hoursAgo(130)),
          act('t16', 'ASSIGNED', 'u2', hoursAgo(130), { to: 'u2' }),
          act('t16', 'STATUS_CHANGED', 'u2', hoursAgo(38), { from: 'IN_PROGRESS', to: 'REVIEW' })
        ]
      })
    ];

    /* --- Notifications (§8) ---------------------------------------------- */
    var notifications = [
      { id: 'n1', userId: 'u3', type: 'TASK_ASSIGNED',    taskId: 't1',  projectId: 'p1', actorId: 'u2',  read: false, at: hoursAgo(2) },
      { id: 'n2', userId: 'u3', type: 'TASK_REASSIGNED',  taskId: 't10', projectId: 'p1', actorId: 'u2',  read: false, at: hoursAgo(5) },
      { id: 'n3', userId: 'u3', type: 'MENTION',          taskId: 't6',  projectId: 'p1', actorId: 'u4',  read: false, at: hoursAgo(9) },
      { id: 'n4', userId: 'u3', type: 'DUE_SOON',         taskId: 't5',  projectId: 'p1', actorId: null,  read: false, at: hoursAgo(14) },
      { id: 'n5', userId: 'u3', type: 'DEADLINE_CHANGED', taskId: 't15', projectId: 'p4', actorId: 'u2',  read: true,  at: hoursAgo(26) },
      { id: 'n6', userId: 'u3', type: 'OVERDUE',          taskId: 't6',  projectId: 'p1', actorId: null,  read: true,  at: hoursAgo(34) },
      { id: 'n7', userId: 'u4', type: 'TASK_ASSIGNED',    taskId: 't2',  projectId: 'p1', actorId: 'u2',  read: false, at: hoursAgo(7) },
      { id: 'n8', userId: 'u4', type: 'MENTION',          taskId: 't4',  projectId: 'p1', actorId: 'u3',  read: true,  at: hoursAgo(29) }
    ];

    return {
      users: users,
      divisions: divisions,
      projects: projects,
      tasks: tasks,
      notifications: notifications
    };
  }

  global.MockData = {
    build: build,
    daysFromNow: daysFromNow,
    hoursAgo: hoursAgo
  };
}(window));
