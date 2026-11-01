const workspaceBase = new URL('./', import.meta.url);
// Shared same-tab navigation; each workspace owns its unsaved-change guard.
class EdgeNavigation extends HTMLElement {
  connectedCallback() {
    if (this.childElementCount) return;
    const studio = this.getAttribute('active') === 'studio';
    const brand = document.createElement('a');
    brand.className = 'edge-suite-brand';
    brand.href = new URL(studio ? 'studio/' : './', workspaceBase).href;
    brand.setAttribute('aria-label', 'Edge workspace home');
    brand.innerHTML = '<span class="edge-wordmark">EDGE<span class="edge-wordmark-slash">/</span></span><span class="edge-suite-caption">KEYBOARD<br>WORKSPACE</span>';
    if (studio) brand.addEventListener('click', event => event.preventDefault());
    const nav = document.createElement('nav');
    nav.className = 'edge-suite-nav';
    nav.setAttribute('aria-label', 'Workspace');
    for (const [label, href, active] of [['Firmware', '/', !studio], ['Studio', '/studio/', studio]]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = new URL(href === '/' ? './' : href.slice(1), workspaceBase).href;
      if (active) {
        link.setAttribute('aria-current', 'page');
        link.addEventListener('click', event => event.preventDefault());
      }
      nav.append(link);
    }
    this.append(brand, nav);
  }
}
if (!customElements.get('edge-navigation')) customElements.define('edge-navigation', EdgeNavigation);

// Pages publish only a dirty flag; mappings remain owned by the device/editor.
(() => {
  let unsaved = false;
  let destination = null;
  document.addEventListener('edge-unsaved-changes', event => {
    unsaved = event.detail === true;
  });
  window.addEventListener('beforeunload', event => {
    if (!unsaved) return;
    event.preventDefault();
    event.returnValue = '';
  });
  const dialog = document.createElement('dialog');
  dialog.className = 'edge-dialog edge-leave-dialog';
  dialog.setAttribute('aria-labelledby', 'edge-leave-heading');
  dialog.innerHTML = '<div class="edge-dialog-heading"><h2 id="edge-leave-heading">Leave without saving?</h2></div><p>Your changes have not been saved to the keyboard. Save before leaving to keep them after a restart.</p><div class="edge-dialog-actions"><button type="button" class="edge-button" autofocus>Stay here</button><button type="button" class="edge-button edge-button-danger">Leave page</button></div>';
  const [stay, leave] = dialog.querySelectorAll('button');
  stay.addEventListener('click', () => dialog.close());
  leave.addEventListener('click', () => {
    const href = destination;
    unsaved = false; // The explicit confirmation replaces the native warning.
    dialog.close();
    if (href) window.location.assign(href);
  });
  dialog.addEventListener('close', () => { destination = null; });
  document.addEventListener('click', event => {
    if (!unsaved || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    destination = url.href;
    if (!dialog.isConnected) document.body.append(dialog);
    if (!dialog.open) dialog.showModal();
  });
})();

class EdgeRiskNotice extends HTMLElement {
  connectedCallback() {
    if (this.childElementCount) return;
    this.className = 'edge-risk-notice';
    const risk = new URL('risk.html', workspaceBase).href;
    const roadmap = new URL('roadmap.html', workspaceBase).href;
    this.innerHTML = `<strong>EXPERIMENTAL — ENTIRELY AT YOUR OWN RISK</strong><span>Firmware, website, tools and instructions may leave your keyboard unusable, erase settings or interrupt input. Recovery may require a programmer and may fail. No warranty; no liability to the extent permitted by law. Independent project, not endorsed by Lofree.</span><nav><a href="${risk}" target="_blank" rel="noopener">Read the full risk notice ↗</a><a href="${roadmap}" target="_blank" rel="noopener">Roadmap ↗</a><span class="edge-project-version"></span></nav>`;
    fetch(new URL('version.json', workspaceBase)).then(r => r.ok ? r.json() : null).then(v => {
      if(v?.version) this.querySelector('.edge-project-version').textContent = 'Tools v'+v.version;
    }).catch(() => {});
  }
}
if (!customElements.get('edge-risk-notice')) customElements.define('edge-risk-notice', EdgeRiskNotice);
