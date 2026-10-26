/* ===========================================================================
   The dialogs that act on a division (docs/03 Flow E · docs/02 S04, S11).

   Two screens open these — S04 Divisions and S11 Division Management — so
   they belong to neither view file (D65). Same split the rest of the codebase
   uses: UI draws, *Actions mutate, a view owns a screen, and a dialog two
   screens share lives on its own.

   Every picker here lists active people only (D61): a deactivated person is
   out of every people picker in the prototype.
   =========================================================================== */

(function (global) {
  'use strict';

  /* A Menu of people. Used by the supervisor pickers, both Add Member
     buttons, and the Create project member picker. */
  function peoplePicker(trigger, config) {
    var UI = global.UI;
    var S = global.AppState;
    var P = global.Permissions;

    global.Menu.toggle(trigger, function () {
      var people = (config.people || []).filter(S.isActive);
      if (!people.length) {
        return [UI.el('p', { class: 'picker-note', text: config.empty })];
      }
      return [global.Menu.section(config.section)].concat(
        people.map(function (person) {
          return global.Menu.item({
            label: person.name,
            sublabel: P.ROLE_LABEL[person.role] + (config.sublabel ? config.sublabel(person) : ''),
            leading: UI.avatar(person, { size: 'sm' }),
            checked: config.checked ? config.checked(person) : false,
            onclick: function () { config.onpick(person); }
          });
        })
      );
    }, { placement: config.placement || 'bottom-end', width: 280, label: config.section });
  }

  /* Anyone who is allowed to supervise a division. Promoting a User into this
     list is S10's job, which is what the empty-state copy points at. */
  function supervisorCandidates() {
    return global.AppState.activeUsers().filter(function (u) {
      return u.role === 'SUPERVISOR' || u.role === 'SUPER_ADMIN';
    });
  }

  /* A <button> that opens a people picker and shows who is currently chosen.
     Shared by the New division dialog and Assign supervisor. */
  function supervisorControl(config) {
    var UI = global.UI;
    var chosen = config.value ? global.AppState.getUser(config.value) : null;

    var trigger = UI.el('button', {
      class: 'td-select td-select--input',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      onclick: function () {
        peoplePicker(trigger, {
          section: 'Supervisors',
          people: supervisorCandidates(),
          empty: 'Nobody is a Supervisor yet. Change someone’s role in User Management first.',
          checked: function (p) { return p.id === config.value; },
          onpick: config.onpick
        });
      }
    }, [
      chosen
        ? UI.el('span', { class: 'td-person' }, [
            UI.avatar(chosen, { size: 'sm' }),
            UI.el('span', { text: chosen.name })
          ])
        : UI.el('span', { class: 'td-select__placeholder', text: 'Choose a supervisor' }),
      UI.icon('chevron-down', 16)
    ]);

    return trigger;
  }

  /* --- Flow E: new division ---------------------------------------------
     Module-level draft because Modal repaints its body through render(),
     exactly as the two drawers repaint theirs. */
  var draft = null;

  function openNew(options) {
    var UI = global.UI;
    options = options || {};

    draft = { name: '', supervisorId: null, submitted: false };

    function errors() {
      var out = {};
      if (!draft.name.trim()) out.name = 'A division needs a name.';
      if (!draft.supervisorId) out.supervisor = 'Every division has one supervisor.';
      return out;
    }

    function body() {
      var nameInput = UI.el('input', {
        class: 'input', id: 'nd-name', type: 'text',
        placeholder: 'e.g. Customer Success', autocomplete: 'off',
        oninput: function (event) {
          draft.name = event.target.value;
          if (draft.submitted && draft.name.trim()) UI.setFieldError(nameField, null);
        }
      });
      nameInput.value = draft.name;

      var nameField = UI.field({
        label: 'Division name', id: 'nd-name', name: 'name', required: true, control: nameInput
      });

      var supervisorField = UI.field({
        label: 'Supervisor', name: 'supervisor', required: true,
        control: supervisorControl({
          value: draft.supervisorId,
          onpick: function (person) {
            draft.supervisorId = person.id;
            global.Modal.refresh();
          }
        }),
        hint: 'They become the first member and see every project in the division.'
      });

      var bad = draft.submitted ? errors() : {};
      requestAnimationFrame(function () {
        if (bad.name) UI.setFieldError(nameField, bad.name);
        if (bad.supervisor) UI.setFieldError(supervisorField, bad.supervisor);
      });

      return UI.frag([nameField, supervisorField]);
    }

    global.Modal.open({
      title: 'New division',
      body: 'Divisions group the projects a supervisor is responsible for.',
      confirmLabel: 'Create Division',
      render: body,
      onConfirm: function () {
        var bad = errors();
        if (Object.keys(bad).length) {
          draft.submitted = true;
          global.Modal.refresh();
          return false;     /* stay open so the marks can be read */
        }
        var created = global.DivisionActions.create(draft);
        if (!created) return false;
        if (options.onCreated) options.onCreated(created);
        return true;
      }
    });
  }

  /* --- Edit division (S11) ----------------------------------------------- */
  function openEdit(division) {
    var UI = global.UI;
    var value = division.name;

    global.Modal.open({
      title: T('Edit {name}', { name: division.name }),
      body: 'Renaming a division does not touch its members or its projects.',
      confirmLabel: 'Save Changes',
      render: function () {
        var input = UI.el('input', {
          class: 'input', id: 'ed-name', type: 'text', autocomplete: 'off',
          oninput: function (event) {
            value = event.target.value;
            if (value.trim()) UI.setFieldError(field, null);
          }
        });
        input.value = value;

        var field = UI.field({
          label: 'Division name', id: 'ed-name', name: 'name', required: true, control: input
        });
        return field;
      },
      onConfirm: function () {
        if (!value.trim()) {
          UI.setFieldError(
            global.Modal.dialog().querySelector('[data-field="name"]'),
            'A division needs a name.'
          );
          return false;
        }
        global.DivisionActions.rename(division.id, value);
        return true;
      }
    });
  }

  /* --- Assign supervisor (S11) -------------------------------------------
     docs/04 gives this row to Super Admin alone, which is why S05 points here
     rather than offering its own control. */
  function openAssignSupervisor(division) {
    var UI = global.UI;
    var S = global.AppState;
    var current = S.getUser(division.supervisorId);
    var picked = division.supervisorId;

    global.Modal.open({
      title: T('Supervisor for {name}', { name: division.name }),
      body: current
        ? T('{name} supervises it today. A new supervisor joins the division and sees every project in it.', {
            name: current.name })
        : 'This division has no supervisor, so nobody but a Super Admin can see it.',
      confirmLabel: 'Assign Supervisor',
      render: function () {
        return UI.field({
          label: 'Supervisor', name: 'supervisor', required: true,
          control: supervisorControl({
            value: picked,
            onpick: function (person) {
              picked = person.id;
              global.Modal.refresh();
            }
          }),
          hint: current
            ? T('{name} stays a member of {division}. Remove them from the division itself if they should no longer see it.', {
                name: current.name, division: division.name })
            : 'Only a Supervisor or Super Admin can be chosen.'
        });
      },
      onConfirm: function () {
        if (!picked) {
          UI.setFieldError(
            global.Modal.dialog().querySelector('[data-field="supervisor"]'),
            'Pick who supervises this division.'
          );
          return false;
        }
        if (picked === division.supervisorId) return true;
        return global.DivisionActions.assignSupervisor(division.id, picked) !== false;
      }
    });
  }

  /* --- Archive (S11) -----------------------------------------------------
     A division with live projects is refused by DivisionActions before the
     confirmation is ever worth showing (D63), the same way removing a member
     who still holds work is refused in Wave 6. */
  function confirmArchive(division) {
    var S = global.AppState;
    var live = S.getState().projects.filter(function (p) {
      return p.divisionId === division.id && p.status !== 'ARCHIVED';
    });

    if (live.length) {
      global.DivisionActions.archive(division.id);   /* refuses and names the rule */
      return;
    }

    global.Confirm.open({
      title: T('Archive {name}?', { name: division.name }),
      body: 'It leaves the divisions list and the scope line. Its members keep their ' +
        'accounts, nothing is deleted, and you can restore it from this screen.',
      confirmLabel: 'Archive Division',
      variant: 'destructive',
      onConfirm: function () { global.DivisionActions.archive(division.id); }
    });
  }

  global.DivisionForms = {
    peoplePicker: peoplePicker,
    supervisorCandidates: supervisorCandidates,
    openNew: openNew,
    openEdit: openEdit,
    openAssignSupervisor: openAssignSupervisor,
    confirmArchive: confirmArchive
  };
}(window));
