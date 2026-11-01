// Presentation only: retain device/draft state while grouping related tools.
const tabs = [...document.querySelectorAll('[data-workspace-tab]')];
const panels = { firmware: document.getElementById('firmware-view'), stock: document.getElementById('stock-tools') };
function select(view, focus = false) {
  if (tabs.some(tab => tab.disabled)) return; // Keep an active transfer visible.
  for (const tab of tabs) {
    const active = tab.dataset.workspaceTab === view;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  }
  for (const [name, panel] of Object.entries(panels)) panel.hidden = name !== view;
}
function fromHash() {
  const target = document.getElementById(location.hash.slice(1));
  const view = target && panels.stock.contains(target) ? 'stock' : 'firmware';
  select(view);
  if (target) {
    for (let node = target.parentElement; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    select(tab.dataset.workspaceTab);
    history.replaceState(null, '', tab.dataset.workspaceTab === 'stock' ? '#stock-tools' : '#firmware-title');
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (tabs.indexOf(tab)+(event.key === 'ArrowRight' ? 1 : -1)+tabs.length)%tabs.length;
    if (!tabs[index].disabled) { tabs[index].click(); tabs[index].focus(); }
  });
}
window.addEventListener('hashchange', fromHash);
fromHash();
