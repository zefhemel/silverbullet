const getUrlPrefix = () : string => {
    const prefix : string = Deno.env.get("SB_URL_PREFIX") ??
      (globalThis.silverBulletConfig ?
       globalThis.silverBulletConfig.urlPrefix
       : null) ?? '';
    if (prefix === '') {
        return '';
    }

    let result = prefix;
    if (!prefix.startsWith('/')) {
        result = '/' + result;
    }
    if (prefix.endsWith('/')) {
        result = result.replace(/\/*$/, '');
    }

    return result;
};

export const urlPrefix: string = getUrlPrefix();

const toRealUrlObject = (url : URL) : URL => {
    const parsedUrl = new URL(url);
    if (typeof location !== 'undefined' && parsedUrl.origin == location.origin) {
        if (parsedUrl.pathname.startsWith(urlPrefix)) {
            //console.trace("Path starts with prefix already: ", url);
        }

        parsedUrl.pathname = urlPrefix + parsedUrl.pathname;
        //console.trace("Converted full URL ", url, parsedUrl.href)
        return parsedUrl;
    } else {
        //console.trace("Don't know how to deal with cross origin path: ", url);
        return url;
    }
}

export const toRealUrl = <T extends (string | URL)>(url : T) : T => {
    if (typeof url === 'string') {
        const stringUrl = url as string;
        if (stringUrl.startsWith('http://') || stringUrl.startsWith('https://')) {
            return toRealUrlObject(new URL(stringUrl)).href as T;
        }
        else if (!stringUrl.startsWith('/')) {
            //console.trace("Don't know how to deal with relative path: ", url);
            return url;
        } else {
            if (url.startsWith(urlPrefix)) {
                //console.trace("Path starts with prefix already: ", url);
            }
            //console.trace("Converted absolute path ", url, urlPrefix + stringUrl)
            return (urlPrefix + stringUrl) as T;
        }
    }
    else if (url.protocol === 'http:' || url.protocol === 'https:') {
        return toRealUrlObject(url) as T;
    }
    else {
        return url;
    }
};

export const toInternalUrl = (url : string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname.startsWith(urlPrefix)) {
            parsedUrl.pathname = parsedUrl.pathname.substr(urlPrefix.length);
            return parsedUrl.href;
        }
        else {
            //console.trace("Don't know how to deal with non-prefix: ", url);
            return url;
        }
    } else if (url.startsWith(urlPrefix)) {
        return url.substr(urlPrefix.length);
    }
    else {
        //console.trace("Don't know how to deal with non-prefix: ", url);
        return url;
    }
};
