/* S06 — Projects list (docs/02 S06).

   Cards are grouped by division so the answer to "why can I see this?" is on
   the screen: a User sees one group, a Supervisor sees their division, Super
   Admin sees the whole company. UI.projectCard is shared with the dashboard —
   the two screens must never drift apart. */

(function (global) {
  'use strict';

  var Views = global.Views = global.Views || {};

  function group(division, projects) {
    var UI = global.UI;
    return UI.el('section', { class: 'project-group' }, [
      UI.el('header', { class: 'project-group__head' }, [
        UI.icon('layers', 16),
        UI.el('h2', { class: 'project-group__name', text: division ? division.name : 'No division' }),
        UI.el('span', {
          class: 'project-group__count',
          text: UI.plural(projects.length, 'project')
        })
      ]),
      UI.el('div', { class: 'project-grid' },
        projects.map(function (p) { return UI.projectCard(p); }))
    ]);
  }

  Views.projects = {
    render: function () {
      var UI = global.UI;
      var S = global.AppState;
      var user = S.currentUser();
      /* Archived projects live on the division screen, not here (D52). */
      var projects = S.activeProjects(user.id);

      /* Keep the division order from the dataset rather than the project
         order, so the grouping is stable as projects come and go. */
      var groups = S.visibleDivisions(user.id)
        .map(function (division) {
          return {
            division: division,
            projects: projects.filter(function (p) { return p.divisionId === division.id; })
          };
        })
        .filter(function (g) { return g.projects.length > 0; });

      var body = projects.length
        ? UI.el('div', {}, groups.map(function (g) { return group(g.division, g.projects); }))
        : UI.emptyState({
            icon: 'folder-kanban',
            title: 'No projects yet',
            body: global.Permissions.isManager(user)
              ? 'Create a project inside one of your divisions to start a board.'
              : 'You are not a member of any project yet. A Supervisor adds you to one.'
          });

      return UI.el('div', { class: 'view' }, [
        UI.el('header', { class: 'view__header' }, [
          UI.el('div', {}, [
            UI.el('h1', { class: 'page-title', text: 'Projects' }),
            UI.el('p', {
              class: 'view__subtitle',
              text: projects.length
                ? T('Open a project to work its board. {scope}.', { scope: UI.scopeLine(user) })
                : 'Every project you are allowed to see appears here.'
            })
          ])
        ]),
        body
      ]);
    }
  };
}(window));
