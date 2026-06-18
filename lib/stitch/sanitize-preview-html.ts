import * as cheerio from 'cheerio';

/** True when href is a real redirect (not placeholder / default). */
export function isActionableRedirect(href: string | undefined | null): boolean {
  if (!href) return false;
  const h = href.trim();
  if (!h) return false;
  const lower = h.toLowerCase();
  if (lower === '#') return false;
  if (lower.startsWith('javascript:')) return false;
  return true;
}

function resolveRedirectHref($: cheerio.CheerioAPI, el: cheerio.Element): string | null {
  const node = $(el);
  const direct = node.attr('href') ?? node.attr('data-href');
  if (isActionableRedirect(direct)) return direct!.trim();

  const nested = node.find('a[href], a[data-href]').first();
  if (nested.length) {
    const nestedHref = nested.attr('href') ?? nested.attr('data-href');
    if (isActionableRedirect(nestedHref)) return nestedHref!.trim();
  }

  const parentLink = node.closest('a[href], a[data-href]');
  if (parentLink.length) {
    const parentHref = parentLink.attr('href') ?? parentLink.attr('data-href');
    if (isActionableRedirect(parentHref)) return parentHref!.trim();
  }

  return null;
}

function isInteractiveChrome($: cheerio.CheerioAPI, el: cheerio.Element): boolean {
  const node = $(el);
  const tag = el.tagName?.toLowerCase() ?? '';
  const role = (node.attr('role') ?? '').toLowerCase();

  if (tag === 'a' || tag === 'button') return true;
  if (role === 'tab' || role === 'link' || role === 'menuitem') return true;

  const cls = (node.attr('class') ?? '').toLowerCase();
  if (/\b(tab|tabs|tablist|tab-bar|nav|navbar|menu|breadcrumb|chip|pill|link)\b/.test(cls)) {
    return true;
  }

  if (tag === 'li' && node.closest('nav, [role="tablist"], [role="menubar"]').length) {
    return true;
  }

  return false;
}

function hasAnyActionableLink($: cheerio.CheerioAPI, root: cheerio.Cheerio<cheerio.Element>): boolean {
  return (
    root.find('a[href], a[data-href]').filter((_, a) => {
      const href = $(a).attr('href') ?? $(a).attr('data-href');
      return isActionableRedirect(href);
    }).length > 0
  );
}

/** Remove tabs, buttons, and links without a real redirect target. */
export function stripNonActionableLinks(html: string): string {
  if (!html.trim()) return html;

  const $ = cheerio.load(html, { xml: false });

  $('a[href], a[data-href]').each((_, el) => {
    const href = $(el).attr('href') ?? $(el).attr('data-href');
    if (!isActionableRedirect(href)) $(el).remove();
  });

  $('button, [role="tab"], [role="menuitem"], [role="link"]').each((_, el) => {
    if (!resolveRedirectHref($, el)) $(el).remove();
  });

  $('[role="tablist"]').each((_, tablist) => {
    $(tablist)
      .children()
      .each((__, child) => {
        if (!resolveRedirectHref($, child)) $(child).remove();
      });
    if (!$(tablist).children().length) $(tablist).remove();
  });

  $('nav').each((_, nav) => {
    $(nav)
      .find('a, button, [role="tab"], [role="menuitem"], li, span, div')
      .each((__, el) => {
        if (!isInteractiveChrome($, el)) return;
        if (!resolveRedirectHref($, el)) $(el).remove();
      });

    $(nav)
      .find('li')
      .each((__, li) => {
        const item = $(li);
        if (!resolveRedirectHref($, li) && !hasAnyActionableLink($, item)) item.remove();
      });

    if (!hasAnyActionableLink($, $(nav)) && !$(nav).text().trim()) $(nav).remove();
  });

  $('[class*="tab"], [class*="Tab"], [class*="nav-item"], [class*="menu-item"]').each((_, el) => {
    if (!isInteractiveChrome($, el)) return;
    if (!resolveRedirectHref($, el)) $(el).remove();
  });

  $('nav, [role="tablist"], [role="navigation"]').each((_, container) => {
    const node = $(container);
    if (!hasAnyActionableLink($, node)) node.remove();
  });

  return $.html();
}

const SANITIZE_SCRIPT = `
<script>
(function () {
  function ok(href) {
    if (!href) return false;
    var h = href.trim();
    if (!h || h === '#') return false;
    if (h.toLowerCase().indexOf('javascript:') === 0) return false;
    return true;
  }
  function hasRedirect(el) {
    if (!el) return false;
    if (ok(el.getAttribute('href')) || ok(el.getAttribute('data-href'))) return true;
    var a = el.querySelector('a[href], a[data-href]');
    if (a && (ok(a.getAttribute('href')) || ok(a.getAttribute('data-href')))) return true;
    var p = el.closest('a[href], a[data-href]');
    return p && (ok(p.getAttribute('href')) || ok(p.getAttribute('data-href')));
  }
  document.querySelectorAll('a[href], a[data-href]').forEach(function (el) {
    if (!ok(el.getAttribute('href')) && !ok(el.getAttribute('data-href'))) el.remove();
  });
  document.querySelectorAll('button, [role="tab"], nav li').forEach(function (el) {
    if (!hasRedirect(el)) el.remove();
  });
  document.querySelectorAll('[role="tablist"], nav').forEach(function (el) {
    if (!el.querySelector('a[href], a[data-href]') && !el.textContent.trim()) el.remove();
  });
})();
</script>
`.trim();

const PREVIEW_STYLE =
  '<style data-bridgeview-preview>body{margin:0}[role="tablist"]:empty,nav:empty{display:none!important}</style>';

/** Prepare sanitized HTML document for iframe preview. */
export function preparePreviewHtml(html: string): string {
  if (!html.trim()) return '';

  const cleaned = stripNonActionableLinks(html);
  const injected = `${PREVIEW_STYLE}\n${SANITIZE_SCRIPT}`;

  if (cleaned.includes('<html')) {
    if (cleaned.includes('</body>')) {
      return cleaned.replace('</body>', `${injected}\n</body>`);
    }
    return `${cleaned}\n${injected}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${PREVIEW_STYLE}
</head>
<body>
${cleaned}
${SANITIZE_SCRIPT}
</body>
</html>`;
}
