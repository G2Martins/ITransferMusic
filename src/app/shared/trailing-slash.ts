import { DefaultUrlSerializer, UrlTree } from '@angular/router';

/**
 * GitHub Pages serves every prerendered route as `<path>/index.html`, so `/projetos/x` answers with a 301 to
 * `/projetos/x/`. Writing the slash in every router-generated link avoids that redirect (crawl budget, latency,
 * clean shared URLs).
 */
export class TrailingSlashSerializer extends DefaultUrlSerializer {
  /**
   * Location strips the trailing slash on page loads, but navigateByUrl('/x/?a=1') reaches the parser as is and the
   * router would read the slash as an extra empty segment (no route matches). Strip it here, for every caller.
   */
  override parse(url: string): UrlTree {
    return super.parse(url.replace(/^([^?#]*[^/?#])\/(?=[?#]|$)/, '$1'));
  }

  override serialize(tree: UrlTree): string {
    const [, path, rest] = super.serialize(tree).match(/^([^?#]*)(.*)$/)!;
    const done = path.endsWith('/') || /\.[a-z0-9]+$/i.test(path);
    return (done ? path : `${path}/`) + rest;
  }
}
