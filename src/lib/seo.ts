import { LOCALES, localeInfo, localePath, type Locale } from '~/i18n';
import { LICENSE_URL, REPO_URL } from '~/site';

/** Safe in inline JSON scripts, including translated text containing HTML delimiters. */
export const jsonForHtml = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

export const homeStructuredData = (site: URL, locale: Locale, title: string, description: string) => {
  const absolute = (path: string): string => new URL(path, site).href;
  const home = absolute('/');
  const url = absolute(localePath(locale));
  const softwareId = `${home}#source-code`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        url: home,
        name: 'Varin',
        inLanguage: LOCALES.map((info) => info.htmlLang),
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: localeInfo(locale).htmlLang,
        isPartOf: { '@id': `${home}#website` },
        mainEntity: { '@id': softwareId },
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': softwareId,
        name: 'Varin',
        description,
        url: home,
        codeRepository: REPO_URL,
        license: LICENSE_URL,
      },
    ],
  };
};

export const xmlEscape = (value: string): string => value.replace(/[<>&"']/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[char]!);
