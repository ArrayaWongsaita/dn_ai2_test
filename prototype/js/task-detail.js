/* ===========================================================================
   S08 Task Detail — the body of the right-hand drawer (docs/02 S08).

   The shell (slide-in, overlay, ESC, focus trap) is Drawer in interactions.js;
   every state change is a TaskActions verb. This file only draws, and gates
   each control on Permissions.canEditField (docs/04 §Limited edit).

   The drawer is driven by state, not by a call: docs/08 §4 makes
   selectedTaskId non-null mean "the drawer is open", so sync() is all app.js
   has to call. That is why #/tasks/:taskId needs no extra wiring, and why
   Wave 5 can open the drawer from a My Tasks row with a plain setState.

   A committed action re-renders the whole body — the same approach the board
   takes. Two module variables keep that honest: drafts survives the re-render
   so unsaved text is never lost, and scrollMemory puts the reader back where
   they were. Typing never calls setState, so a re-render only ever follows a
   commit.
   =========================================================================== */

(function (global) {
  'use strict';

  var drafts = { taskId: null, userId: null, description: '', descriptionOpen: false, comment: '' };
  var scrollMemory = { taskId: null, top: 0 };
  var pendingScroll = null;   /* 'comments' right after one is added */

  /* Closing usually navigates, and a hashchange lands asynchronously — the
     board re-renders and replaces the very card focus should return to. sync()
     runs after every render, so it is the one deterministic place to finish
     handing focus back. */
  var focusBack = null;

  function handBackFocus() {
    if (!focusBack) return;
    var card = document.querySelector('[data-task-id="' + focusBack + '"]');
    focusBack = null;
    if (card && (!document.activeElement || document.activeElement === document.body)) card.focus();
  }

  /* Keyed on the reader as well as the task: switching persona mid-demo must
     not hand the next persona a half-written comment. */
  function resetDrafts(taskId, userId) {
    drafts = {
      taskId: taskId, userId: userId || null,
      description: '', descriptionOpen: false, comment: '',
      title: '', titleOpen: false
    };
    scrollMemory = { taskId: taskId, top: 0 };
    pendingScroll = null;
  }

  /* --- Small shared pieces ------------------------------------------------ */

  /* Seeded descriptions are plain text; anything saved from the editor is
     HTML. Only treat a value as markup when it actually looks like markup. */
  function setRich(node, value) {
    var text = value || '';
    if (/<[a-z][\s\S]*>/i.test(text)) node.innerHTML = text;
    else node.textContent = text;
    return node;
  }

  function fieldRow(label, control) {
    var UI = global.UI;
    return UI.el('div', { class: 'td-field' }, [
      UI.el('span', { class: 'td-field__label', text: label }),
      UI.el('div', { class: 'td-field__value' }, control)
    ]);
  }

  /* docs/04: hide what a role cannot use — except where a disabled state
     teaches the rule. Priority and deadline are exactly those two cases. */
  function locked(children, reason) {
    var UI = global.UI;
    return UI.el('span', { class: 'td-locked', title: reason }, [
      children,
      UI.icon('lock', 13),
      UI.el('span', { class: 'sr-only', text: reason })
    ]);
  }

  function sectionHead(title, count, action) {
    var UI = global.UI;
    return UI.el('div', { class: 'td-section__head' }, [
      UI.el('h3', { class: 'td-section__title', text: title }),
      count === null || count === undefined
        ? null
        : UI.el('span', { class: 'td-section__count', text: String(count) }),
      UI.el('span', { class: 'spacer' }),
      action || null
    ]);
  }

  function section(title, count, action, children) {
    return global.UI.el('section', { class: 'td-section' }, [
      sectionHead(title, count, action),
      children
    ]);
  }

  /* --- Title (D56 closes D27) --------------------------------------------
     Read-only for a User per the docs/04 Limited-edit table; click-to-edit for
     a manager, now that the Create Task form has settled what a title control
     looks like. Esc closes the drawer as it always has (D30), so the editor
     offers an explicit Cancel rather than pretending to intercept it. */
  function titleControl(c) {
    var UI = global.UI;
    var P = global.Permissions;

    if (!P.canEditField('title', { user: c.user, task: c.task })) {
      return UI.el('h2', { class: 'td-head__title', text: c.task.title });
    }

    if (!drafts.titleOpen) {
      return UI.el('h2', { class: 'td-head__title' }, UI.el('button', {
        class: 'td-title-edit',
        type: 'button',
        title: 'Rename this task',
        onclick: function () {
          drafts.title = c.task.title;
          drafts.titleOpen = true;
          refresh();
        }
      }, [UI.el('span', { text: c.task.title }), UI.icon('pencil', 14)]));
    }

    function commit() {
      var next = drafts.title;
      drafts.titleOpen = false;
      /* setTitle re-renders on success; a refusal has to repaint by itself. */
      if (!global.TaskActions.setTitle(c.task.id, next)) refresh();
    }

    function cancel() {
      drafts.titleOpen = false;
      drafts.title = '';
      refresh();
    }

    var input = UI.el('input', {
      class: 'input td-title-input',
      type: 'text',
      'aria-label': 'Task title',
      oninput: function (event) { drafts.title = event.target.value; },
      onkeydown: function (event) {
        if (event.key === 'Enter') { event.preventDefault(); commit(); }
      }
    });
    input.value = drafts.title;

    return UI.el('div', { class: 'td-head__rename' }, [
      input,
      UI.el('button', {
        class: 'btn btn--primary btn--sm', type: 'button', onclick: commit
      }, 'Save'),
      UI.el('button', {
        class: 'btn btn--ghost btn--sm', type: 'button', onclick: cancel
      }, 'Cancel')
    ]);
  }

  /* --- Header (task 4.2) -------------------------------------------------- */
  function header(c) {
    var UI = global.UI;

    return UI.el('header', { class: 'td-head' }, [
      UI.el('div', { class: 'td-head__top' }, [
        UI.statusBadge(c.task.status),
        UI.priorityBadge(c.task.priority),
        UI.el('span', { class: 'spacer' }),
        UI.el('button', {
          class: 'btn btn--icon',
          type: 'button',
          title: 'Close (Esc)',
          'aria-label': 'Close task detail',
          onclick: function () { requestClose(); }
        }, UI.icon('x', 18))
      ]),

      titleControl(c),

      UI.el('p', { class: 'td-head__meta' }, [
        UI.el('a', {
          class: 'td-head__link',
          href: '#/projects/' + c.project.id,
          text: c.project.name,
          title: T('Open the {name} board', { name: c.project.name })
        }),
        UI.el('span', { class: 'td-head__dot' }),
        UI.el('span', { text: c.division ? c.division.name : 'No division' }),
        UI.el('span', { class: 'td-head__dot' }),
        UI.el('span', {
          text: T('Created by {name}', { name: c.creator ? c.creator.name : T('someone') }) +
            ' · ' + UI.formatDate(c.task.createdAt)
        })
      ])
    ]);
  }

  /* --- Status / Priority / Deadline / Assignee (tasks 4.3, 4.5, 4.6) ----- */
  function statusControl(c) {
    var UI = global.UI;
    var S = global.AppState;

    /* Every role may change status (docs/04). Cancelled has no column, so this
       dropdown is its only way in and out (docs/01 §7). */
    var trigger = UI.el('button', {
      class: 'td-select',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: 'Change status',
      onclick: function () {
        global.Menu.toggle(trigger, function () {
          return S.STATUSES.map(function (status) {
            return global.Menu.item({
              label: UI.STATUS_LABEL[status],
              leading: UI.el('span', { class: 'td-dot td-dot--' + status.toLowerCase() }),
              sublabel: status === 'COMPLETED' ? 'Sets progress to 100%' : null,
              checked: status === c.task.status,
              onclick: function () { global.TaskActions.moveTask(c.task.id, status); }
            });
          });
        }, { placement: 'bottom-start', width: 248, label: 'Change status' });
      }
    }, [UI.statusBadge(c.task.status), UI.icon('chevron-down', 16)]);

    return trigger;
  }

  function priorityControl(c) {
    var UI = global.UI;
    var P = global.Permissions;

    if (!P.canEditField('priority', { user: c.user, task: c.task })) {
      return locked(UI.priorityBadge(c.task.priority), P.LOCK_REASON.priority);
    }

    var trigger = UI.el('button', {
      class: 'td-select',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: 'Change priority',
      onclick: function () {
        global.Menu.toggle(trigger, function () {
          return ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(function (priority) {
            return global.Menu.item({
              label: UI.PRIORITY_LABEL[priority],
              leading: UI.el('span', { class: 'td-dot td-dot--' + priority.toLowerCase() }),
              checked: priority === c.task.priority,
              onclick: function () { global.TaskActions.setPriority(c.task.id, priority); }
            });
          });
        }, { placement: 'bottom-start', width: 220, label: 'Change priority' });
      }
    }, [UI.priorityBadge(c.task.priority), UI.icon('chevron-down', 16)]);

    return trigger;
  }

  function deadlineControl(c) {
    var UI = global.UI;
    var P = global.Permissions;
    var chip = UI.deadlineChip(c.task) ||
      UI.el('span', { class: 'text-muted text-sm', text: 'No deadline' });

    if (!P.canEditField('deadline', { user: c.user, task: c.task })) {
      return locked(chip, P.LOCK_REASON.deadline);
    }

    var input = UI.el('input', {
      class: 'input td-date',
      type: 'date',
      title: 'Change the deadline',
      'aria-label': 'Deadline',
      onchange: function (event) {
        global.TaskActions.setDeadline(c.task.id, UI.fromDateInputValue(event.target.value));
      }
    });
    input.value = UI.toDateInputValue(c.task.deadline);

    return UI.el('span', { class: 'td-deadline' }, [
      input,
      chip,
      c.task.deadline
        ? UI.el('button', {
            class: 'btn btn--ghost btn--sm',
            type: 'button',
            title: 'Remove the deadline',
            onclick: function () { global.TaskActions.setDeadline(c.task.id, null); }
          }, 'Clear')
        : null
    ]);
  }

  /* Reassign: project members only (docs/01 §5 rule 6), current assignee
     marked, then a confirmation before the change (docs/03 Flow B step 5). */
  function assigneeControl(c) {
    var UI = global.UI;
    var P = global.Permissions;
    var S = global.AppState;

    var who = UI.el('span', { class: 'td-person' }, [
      UI.avatar(c.assignee, { size: 'sm' }),
      UI.el('span', { text: c.assignee ? c.assignee.name : 'Unassigned' }),
      c.assignee && c.assignee.id === c.user.id
        ? UI.el('span', { class: 'td-person__you', text: 'you' })
        : null
    ]);

    /* A User opening someone else's task gets the name read-only and no
       Reassign action at all (task 4.6). */
    if (!P.canEditField('assignee', { user: c.user, task: c.task })) return who;

    var trigger = UI.el('button', {
      class: 'btn btn--secondary btn--sm',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: 'Hand this task to another project member',
      onclick: function () {
        global.Menu.toggle(trigger, function () {
          var items = [global.Menu.section('Project members')];
          c.members.forEach(function (member) {
            items.push(global.Menu.item({
              label: member.name,
              sublabel: P.ROLE_LABEL[member.role],
              leading: UI.avatar(member, { size: 'sm' }),
              checked: member.id === c.task.assigneeId,
              title: member.id === c.task.assigneeId
                ? T('{name} already has this task', { name: member.name })
                : T('Reassign to {name}', { name: member.name }),
              onclick: function () {
                if (member.id === c.task.assigneeId) {
                  global.Toast.info(T('Already assigned to {name}', { name: member.name }));
                  return;
                }
                global.Confirm.open({
                  lead: UI.avatar(member, { size: 'lg' }),
                  title: T('Reassign this task to {name}?', { name: member.name }),
                  body: T('{title} moves from {from} to {to}. {to} becomes the single main assignee.', {
                    title: c.task.title, from: c.assignee ? c.assignee.name : T('nobody'), to: member.name }),
                  confirmLabel: 'Reassign',
                  onConfirm: function () { global.TaskActions.reassign(c.task.id, member.id); }
                });
              }
            }));
          });
          return items;
        }, { placement: 'bottom-start', width: 268, label: 'Reassign task' });
      }
    }, [UI.icon('switch', 14), 'Reassign']);

    return UI.el('span', { class: 'td-assignee' }, [who, trigger]);
  }

  function fields(c) {
    var UI = global.UI;

    return UI.el('div', { class: 'td-fields' }, [
      fieldRow('Status', statusControl(c)),
      fieldRow('Priority', priorityControl(c)),
      fieldRow('Assignee', assigneeControl(c)),
      fieldRow('Deadline', deadlineControl(c)),
      collaboratorsRow(c)
    ]);
  }

  /* docs/04 keeps collaborators read-only for a User; a manager edits them
     with the same chips-and-Add control the Create Task form uses (D56).
     Adding one appends no activity event — docs/07 §6 has no type for it. */
  function collaboratorsRow(c) {
    var UI = global.UI;
    var P = global.Permissions;

    if (!P.canEditField('collaborators', { user: c.user, task: c.task })) {
      if (!c.collaborators.length) return null;
      return fieldRow('Collaborators', UI.el('span', { class: 'td-person' }, [
        UI.avatarStack(c.collaborators, { max: 4 }),
        UI.el('span', {
          text: c.collaborators.map(function (u) { return u.name; }).join(', ')
        })
      ]));
    }

    var chosen = c.task.collaboratorIds || [];
    var available = c.members.filter(function (m) {
      return m.id !== c.task.assigneeId && chosen.indexOf(m.id) === -1;
    });

    var chips = c.collaborators.map(function (member) {
      return UI.el('button', {
        class: 'filter-chip',
        type: 'button',
        title: T('Remove {name}', { name: member.name }),
        onclick: function () {
          global.TaskActions.setCollaborators(c.task.id, chosen.filter(function (id) {
            return id !== member.id;
          }));
        }
      }, [UI.avatar(member, { size: 'sm' }), UI.el('span', { text: member.name }), UI.icon('x', 14)]);
    });

    /* One pick per open: Menu.item closes the panel before it fires. */
    var add = UI.el('button', {
      class: 'btn btn--secondary btn--sm',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      disabled: available.length ? null : 'disabled',
      title: available.length
        ? 'Add a collaborator'
        : 'Every other project member is already on this task',
      onclick: function () {
        global.Menu.toggle(add, function () {
          return [global.Menu.section('Project members')].concat(
            available.map(function (member) {
              return global.Menu.item({
                label: member.name,
                sublabel: P.ROLE_LABEL[member.role],
                leading: UI.avatar(member, { size: 'sm' }),
                onclick: function () {
                  global.TaskActions.setCollaborators(c.task.id, chosen.concat([member.id]));
                }
              });
            })
          );
        }, { placement: 'bottom-start', width: 260, label: 'Add a collaborator' });
      }
    }, [UI.icon('user-plus', 14), 'Add']);

    return fieldRow('Collaborators', UI.el('div', { class: 'chip-row' },
      chips.concat([
        chips.length ? null : UI.el('span', { class: 'chip-row__empty', text: 'Nobody else' }),
        add
      ])));
  }

  /* --- Progress (task 4.4, docs/05 §5) ----------------------------------- */
  function progressSection(c) {
    var UI = global.UI;
    var QUICK = [0, 25, 50, 75, 100];

    var bar = UI.progressBar(c.task.progress, {
      label: T('{title} progress', { title: c.task.title }),
      showValue: false
    });
    var value = UI.el('span', { class: 'td-progress__value', text: c.task.progress + '%' });

    /* While the slider is dragged only the bar and the number move — no
       setState, so one drag appends one activity event, not twenty. */
    function preview(next) {
      var fill = bar.querySelector('.progress__fill');
      if (fill) fill.style.width = next + '%';
      bar.setAttribute('aria-valuenow', next);
      value.textContent = next + '%';
    }

    var range = UI.el('input', {
      class: 'range',
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      'aria-label': 'Progress percentage',
      oninput: function (event) { preview(Number(event.target.value)); },
      onchange: function (event) {
        global.TaskActions.setProgress(c.task.id, Number(event.target.value));
      }
    });
    range.value = String(c.task.progress);

    return section('Progress', null, null, UI.el('div', { class: 'td-progress' }, [
      UI.el('div', { class: 'td-progress__top' }, [bar, value]),
      range,
      UI.el('div', { class: 'td-progress__quick' }, QUICK.map(function (step) {
        return UI.el('button', {
          class: 'td-chip' + (step === c.task.progress ? ' is-active' : ''),
          type: 'button',
          title: T('Set progress to {n}%', { n: step }),
          onclick: function () { global.TaskActions.setProgress(c.task.id, step); }
        }, step + '%');
      })),
      c.task.status === 'COMPLETED'
        ? UI.el('p', {
            class: 'td-note',
            text: 'This task is Completed. Lowering progress leaves the status alone — ' +
              'only moving a task into Completed forces 100%.'
          })
        : null
    ]));
  }

  /* --- Description (task 4.7, docs/05 §6) --------------------------------
     A real contenteditable driven by document.execCommand. Deprecated, but it
     works in every browser straight from file:// and needs no library, which
     is exactly the trade docs/08 §7 offers for the prototype. */
  function descriptionSection(c) {
    var UI = global.UI;
    var canEdit = global.Permissions.canEditField('description', { user: c.user, task: c.task });

    if (!drafts.descriptionOpen) {
      var read = UI.el(canEdit ? 'button' : 'div', {
        class: 'td-desc' + (c.task.description ? '' : ' is-empty'),
        type: canEdit ? 'button' : null,
        title: canEdit ? 'Click to edit the description' : null,
        onclick: canEdit ? function () { openEditor(c.task); } : null
      });
      if (c.task.description) setRich(read, c.task.description);
      else read.textContent = T(canEdit
        ? 'No description yet — click to add one'
        : 'No description');

      return section('Description', null,
        canEdit
          ? UI.el('button', {
              class: 'btn btn--ghost btn--sm',
              type: 'button',
              onclick: function () { openEditor(c.task); }
            }, [UI.icon('pencil', 14), 'Edit'])
          : null,
        read);
    }

    /* --- edit mode --- */
    var area = UI.el('div', {
      class: 'rte__area',
      contenteditable: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Description',
      oninput: function (event) { drafts.description = event.target.innerHTML; }
    });
    setRich(area, drafts.description);

    var imagePicker = UI.el('input', {
      class: 'td-file-input',
      type: 'file',
      accept: 'image/*',
      onchange: function (event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (done) {
          area.focus();
          document.execCommand('insertImage', false, done.target.result);
          drafts.description = area.innerHTML;
        };
        reader.readAsDataURL(file);
      }
    });

    /* mousedown is where the selection would be lost — swallow it so the
       caret stays inside the editable while the command runs. */
    function toolButton(label, iconName, run) {
      return UI.el('button', {
        class: 'rte__tool',
        type: 'button',
        title: label,
        'aria-label': label,
        onmousedown: function (event) { event.preventDefault(); },
        onclick: function () { area.focus(); run(); drafts.description = area.innerHTML; }
      }, UI.icon(iconName, 15));
    }

    function exec(command, argument) {
      try { document.execCommand(command, false, argument || null); } catch (e) { /* older engines */ }
    }

    return section('Description', null, null, UI.el('div', { class: 'rte' }, [
      UI.el('div', { class: 'rte__toolbar', role: 'toolbar', 'aria-label': 'Formatting' }, [
        toolButton('Bold', 'bold', function () { exec('bold'); }),
        toolButton('Italic', 'italic', function () { exec('italic'); }),
        UI.el('span', { class: 'rte__sep' }),
        toolButton('Bullet list', 'list', function () { exec('insertUnorderedList'); }),
        toolButton('Numbered list', 'list-ordered', function () { exec('insertOrderedList'); }),
        UI.el('span', { class: 'rte__sep' }),
        toolButton('Link', 'link', function () {
          var url = global.prompt('Link URL', 'https://');
          if (url) exec('createLink', url);
        }),
        toolButton('Image', 'image', function () { imagePicker.click(); })
      ]),
      area,
      imagePicker,
      UI.el('div', { class: 'rte__actions' }, [
        UI.el('span', { class: 'td-note', text: 'Saved to prototype state only.' }),
        UI.el('span', { class: 'spacer' }),
        UI.el('button', {
          class: 'btn btn--secondary btn--sm',
          type: 'button',
          onclick: function () { closeEditor(); }
        }, 'Cancel'),
        UI.el('button', {
          class: 'btn btn--primary btn--sm',
          type: 'button',
          onclick: function () {
            var html = drafts.description;
            drafts.descriptionOpen = false;
            if (!global.TaskActions.setDescription(c.task.id, html)) refresh();
          }
        }, 'Save')
      ])
    ]));
  }

  function openEditor(task) {
    drafts.descriptionOpen = true;
    drafts.description = task.description || '';
    refresh();
  }

  function closeEditor() {
    drafts.descriptionOpen = false;
    drafts.description = '';
    refresh();
  }

  /* --- Attachments (task 4.8, docs/08 §8) -------------------------------- */
  function attachmentsSection(c) {
    var UI = global.UI;
    var S = global.AppState;
    var files = c.task.attachments || [];
    var canAdd = global.Permissions.can('addAttachment', { user: c.user, task: c.task });

    var picker = UI.el('input', {
      class: 'td-file-input',
      type: 'file',
      onchange: function (event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;

        /* Images get a local data URL so the thumbnail is real; anything else
           records a name and a size. Nothing is uploaded anywhere. */
        if (/^image\//.test(file.type || '')) {
          var reader = new FileReader();
          reader.onload = function (done) {
            global.TaskActions.addAttachment(c.task.id, {
              name: file.name, size: file.size, url: done.target.result
            });
          };
          reader.readAsDataURL(file);
        } else {
          global.TaskActions.addAttachment(c.task.id, {
            name: file.name, size: file.size, url: null
          });
        }
      }
    });

    var list = files.length
      ? UI.el('ul', { class: 'td-files' }, files.map(function (file) {
          var uploader = S.getUser(file.uploadedById);
          var isImage = /^data:image\//.test(file.url || '');
          return UI.el('li', { class: 'td-file' }, [
            isImage
              ? UI.el('img', { class: 'td-file__thumb', src: file.url, alt: file.name })
              : UI.el('span', { class: 'td-file__icon' }, UI.icon('file-text', 18)),
            UI.el('span', { class: 'td-file__text' }, [
              UI.el('span', { class: 'td-file__name', text: file.name }),
              UI.el('span', {
                class: 'td-file__meta',
                text: file.size + ' · ' + (uploader ? uploader.name : T('someone')) +
                  ' · ' + UI.relativeTime(file.at)
              })
            ])
          ]);
        }))
      : UI.el('p', { class: 'td-empty', text: 'No attachments yet.' });

    return section('Attachments', files.length,
      canAdd
        ? UI.el('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            title: 'Attach a file — previewed locally, never uploaded',
            onclick: function () { picker.click(); }
          }, [UI.icon('upload', 14), 'Add file'])
        : null,
      [list, picker]);
  }

  /* --- Comments (task 4.9, docs/05 §7) ----------------------------------- */
  function commentsSection(c) {
    var UI = global.UI;
    var S = global.AppState;
    var comments = c.task.comments || [];
    var canComment = global.Permissions.can('comment', { user: c.user, task: c.task });

    var list = comments.length
      ? UI.el('ul', { class: 'td-comments' }, comments.map(function (comment) {
          var author = S.getUser(comment.authorId);
          return UI.el('li', { class: 'td-comment', dataset: { commentId: comment.id } }, [
            UI.avatar(author, { size: 'sm' }),
            UI.el('div', { class: 'td-comment__body' }, [
              UI.el('p', { class: 'td-comment__head' }, [
                UI.el('b', { text: author ? author.name : 'Someone' }),
                UI.el('span', { class: 'td-comment__time', text: UI.relativeTime(comment.at) })
              ]),
              UI.el('p', { class: 'td-comment__text', text: comment.body })
            ])
          ]);
        }))
      : UI.el('p', { class: 'td-empty', text: 'No comments yet. Start the conversation below.' });

    if (!canComment) return section('Comments', comments.length, null, list);

    var send = UI.el('button', {
      class: 'btn btn--primary btn--sm',
      type: 'button',
      disabled: drafts.comment.trim() ? null : true,
      onclick: function () { submit(); }
    }, [UI.icon('send', 14), 'Add Comment']);

    var input = UI.el('textarea', {
      class: 'textarea td-comment-input',
      rows: '3',
      placeholder: 'Write a comment…',
      'aria-label': 'Write a comment',
      oninput: function (event) {
        drafts.comment = event.target.value;
        /* Toggled here rather than through a re-render — typing must never
           cost a render, or every keystroke would rebuild the drawer. */
        if (drafts.comment.trim()) send.removeAttribute('disabled');
        else send.setAttribute('disabled', '');
      },
      onkeydown: function (event) {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submit();
        }
      }
    });
    input.value = drafts.comment;

    /* Clear the draft *before* committing: addComment calls setState, which
       repaints the drawer, and a repaint reads drafts — clearing afterwards
       would put the posted text straight back into the box. */
    function submit() {
      var text = drafts.comment;
      if (!text.trim()) return;

      drafts.comment = '';
      pendingScroll = 'comments';

      if (!global.TaskActions.addComment(c.task.id, text)) {
        drafts.comment = text;        /* refused — hand the text back */
        pendingScroll = null;
        refresh();
      }
    }

    return section('Comments', comments.length, null, [
      list,
      UI.el('div', { class: 'td-comment-form' }, [
        UI.avatar(c.user, { size: 'sm' }),
        UI.el('div', { class: 'td-comment-form__fields' }, [
          input,
          UI.el('div', { class: 'td-comment-form__actions' }, [
            UI.el('span', { class: 'td-note', text: 'Cmd/Ctrl + Enter to post' }),
            UI.el('span', { class: 'spacer' }),
            send
          ])
        ])
      ])
    ]);
  }

  /* --- Activity (task 4.10, docs/07 §6) ---------------------------------
     Wording comes from UI.activitySentence, the same helper the dashboard's
     Recently Updated list reads, so an event never reads two ways. */
  var EVENT_ICON = {
    CREATED: 'plus',
    ASSIGNED: 'user',
    STATUS_CHANGED: 'arrow-right',
    PROGRESS_CHANGED: 'trending-up',
    REASSIGNED: 'switch',
    DEADLINE_CHANGED: 'calendar',
    COMMENT_ADDED: 'message-square'
  };

  function activitySection(c) {
    var UI = global.UI;
    var S = global.AppState;

    /* Seeded newest last; the timeline reads newest first (docs/07 §6). */
    var events = (c.task.activity || []).map(function (event, index) {
      return { event: event, index: index };
    }).sort(function (a, b) {
      var diff = new Date(b.event.at) - new Date(a.event.at);
      return diff !== 0 ? diff : b.index - a.index;
    });

    var byId = {};
    (c.task.comments || []).forEach(function (comment) { byId[comment.id] = comment; });

    var rows = events.map(function (entry) {
      var event = entry.event;
      var actor = S.getUser(event.actorId);
      var quoted = event.type === 'COMMENT_ADDED' ? byId[event.commentId] : null;

      return UI.el('li', { class: 'td-event', dataset: { type: event.type } }, [
        UI.el('span', { class: 'td-event__icon' }, UI.icon(EVENT_ICON[event.type] || 'dot', 14)),
        UI.el('div', { class: 'td-event__body' }, [
          UI.el('p', { class: 'td-event__text' }, [
            actor ? UI.avatar(actor, { size: 'sm' }) : null,
            UI.el('span', { text: UI.activitySentence(event) })
          ]),
          quoted
            ? UI.el('p', { class: 'td-event__quote', text: '“' + quoted.body + '”' })
            : null
        ]),
        UI.el('span', {
          class: 'td-event__time',
          title: UI.formatDateTime(event.at),
          text: UI.relativeTime(event.at)
        })
      ]);
    });

    return section('Activity', events.length, null,
      rows.length
        ? UI.el('ul', { class: 'td-timeline' }, rows)
        : UI.el('p', { class: 'td-empty', text: 'Nothing has happened on this task yet.' }));
  }

  /* --- Body -------------------------------------------------------------- */
  function render(task) {
    var UI = global.UI;
    var S = global.AppState;
    var project = S.getProject(task.projectId);

    var c = {
      task: task,
      user: S.currentUser(),
      project: project,
      division: S.getDivision(project.divisionId),
      assignee: S.getUser(task.assigneeId),
      creator: S.getUser(task.createdById),
      /* Active members only: a deactivated person is out of every picker (D61). */
      members: S.assignableMembers(project.id),
      collaborators: (task.collaboratorIds || []).map(S.getUser).filter(Boolean)
    };

    var body = UI.el('div', {
      class: 'td-body',
      onscroll: function (event) {
        scrollMemory = { taskId: task.id, top: event.target.scrollTop };
      }
    }, [
      fields(c),
      progressSection(c),
      descriptionSection(c),
      attachmentsSection(c),
      commentsSection(c),
      activitySection(c)
    ]);

    /* Put the reader back where they were, then honour whatever the last
       action asked to be brought into view. */
    requestAnimationFrame(function () {
      if (!body.isConnected) return;
      if (scrollMemory.taskId === task.id) body.scrollTop = scrollMemory.top;

      if (pendingScroll === 'comments') {
        var last = body.querySelector('.td-comment:last-child');
        if (last) last.scrollIntoView({ block: 'nearest' });
        pendingScroll = null;
      }

      if (drafts.descriptionOpen) {
        var area = body.querySelector('.rte__area');
        if (area && !body.contains(document.activeElement)) area.focus();
      }

      /* The rename input lives in the header, not the body — reach it through
         the panel the drawer owns. */
      if (drafts.titleOpen) {
        var panel = global.Drawer.panel();
        var rename = panel && panel.querySelector('.td-title-input');
        if (rename && document.activeElement !== rename) rename.focus();
      }
    });

    return UI.el('div', { class: 'td' }, [header(c), body]);
  }

  /* --- Open / close ------------------------------------------------------ */

  /* An unsaved edit is a description editor holding changed text, or a comment
     half written. docs/05 §2 guards the overlay click on exactly this. */
  function hasUnsaved() {
    var task = drafts.taskId ? global.AppState.getTask(drafts.taskId) : null;
    if (!task) return false;
    if (drafts.descriptionOpen && (drafts.description || '') !== (task.description || '')) return true;
    if (drafts.titleOpen && (drafts.title || '') !== (task.title || '')) return true;
    return !!drafts.comment.trim();
  }

  /* Repaint without touching the store — used by the editor's own open/cancel,
     which change nothing a subscriber would care about. */
  function refresh() {
    var task = drafts.taskId ? global.AppState.getTask(drafts.taskId) : null;
    if (!task || !isMine()) return;
    global.Drawer.open(config(task));
  }

  function config(task) {
    return {
      key: 'task:' + task.id,
      label: T('Task detail — {title}', { title: task.title }),
      render: function () { return render(task); },
      hasUnsavedEdits: hasUnsaved,
      onBlockedClose: function (panel) {
        global.Drawer.nudge(panel);
        global.Toast.warning('You have unsaved edits', {
          detail: 'Save or cancel them first — or press Esc to close and discard.'
        });
      },
      onClose: afterClose,
      returnFocusTo: function () {
        return document.querySelector('[data-task-id="' + task.id + '"]');
      }
    };
  }

  /* ESC and the X close unconditionally and discard drafts — docs/05 §2
     attaches the unsaved-edit condition to the overlay alone. */
  function isMine() {
    var key = global.Drawer.key();
    return !!key && key.indexOf('task:') === 0;
  }

  function requestClose() { global.Drawer.close(); }

  function afterClose() {
    var S = global.AppState;
    var match = global.Router.current();
    focusBack = drafts.taskId;
    resetDrafts(null, null);

    /* On #/tasks/:id the drawer owns the URL, so closing steps back to the
       board. Opened from anywhere else, dropping the selection is enough. */
    if (match && match.deepLinkTask && match.params.projectId) {
      global.Router.navigate('#/projects/' + match.params.projectId);
    } else if (S.getState().selectedTaskId) {
      S.setState({ selectedTaskId: null });
    }
  }

  /* The single entry point: app.js calls this after every render. */
  function sync() {
    var S = global.AppState;
    var user = S.currentUser();
    var id = S.getState().selectedTaskId;
    var task = user && id && S.canSeeTask(user.id, id) ? S.getTask(id) : null;

    if (!task) {
      /* Close only a drawer this module owns — the Create Task drawer shares the
         same singleton and must survive a render that has no selected task
         (D48). */
      if (isMine()) global.Drawer.close({ silent: true });
      if (drafts.taskId) resetDrafts(null, null);
      handBackFocus();
      return;
    }

    if (drafts.taskId !== task.id || drafts.userId !== user.id) resetDrafts(task.id, user.id);
    global.Drawer.open(config(task));
  }

  global.TaskDetail = {
    sync: sync,
    requestClose: requestClose,
    hasUnsavedEdits: hasUnsaved,
    refresh: refresh
  };
}(window));
