(async () => {
    const $form = document.getElementById("form");
    const $img = document.getElementById("img");
    const $result = document.getElementById("result");
    const $width = document.getElementById("width");
    const $emojiUrl = document.getElementById("emoji-url");

    const [allEmoji, allShortcuts] = await Promise.all([
        fetch("emoji.json").then(r => r.json()).then(j => Object.values(j).flat()),
        fetch("shortcuts.json").then(r => r.json()),
    ]);

    const corsFetch = async url => {
        try {
            return await fetch(url);
        }
        catch (err) {
            if (err.message !== "Failed to fetch") {
                throw err;
            }
            // ignore CORS
            console.warn("Retrying fetch, bypassing CORS");
            return await fetch("https://cors-anywhere.herokuapp.com/" + url);
        }
    }

    const strToDOM = str => {
        const wrapper= document.createElement("div");
        wrapper.innerHTML = str;
        return wrapper.firstChild;
    }

    const onSubmit = async ev => {
        ev.preventDefault();

        const width = Number.parseInt($width.value);
        const emojiOrUrl = $emojiUrl.value;
        await process(emojiOrUrl, width);
    };

    const resolveShortcutForName = s => {
        const shortcut = allShortcuts.find(s => s.shortcuts.includes(s));
        return shortcut ? shortcut.emoji : null;
    };

    const resolveNameForSurrogates = n => {
        const emoji = allEmoji.find(e => e.names.includes(n));
        return emoji ? emoji.surrogates : null;
    };

    const resolveSurrogatesForUrl = s => {
        const imgHtml = twemoji.parse(s, {
            ext: ".svg",
            folder: "svg",
        });
        if (imgHtml === s) {
            return null;
        }
        return strToDOM(imgHtml, "text/html").src;
    };

    const resolveForUrl = str => {
        try {
            return new URL(str).href;
        }
        catch (err) {
            // invalid URL
        }

        let result = resolveShortcutForName(str);
        result = resolveNameForSurrogates(result || str);
        return resolveSurrogatesForUrl(result || str);
    }

    const createPromise = () => {
        let resolve, reject;
        const promise = new Promise((resolve_, reject_) => {
            resolve = resolve_;
            reject = reject_;
        });
        return [promise, resolve, reject];
    }

    const loadImage = async src => {
        const [promise, resolve, reject] = createPromise();
        const image = document.createElement("img");
        image.onload = ev => resolve(ev.target);
        image.onerror = ev => reject(ev);
        image.src = src;
        return promise;
    };

    const process = async (emojiOrUrl, width) => {
        // resolve input string to url
        const url = resolveForUrl(emojiOrUrl);
        if (url == null) {
            alert("Invalid emoji/URL");
            return;
        }

        // fetch the url
        const response = await corsFetch(url);
        if (!response.ok) {
            alert("Failed fetching URL. HTTP status code: " + response.status);
            return;
        }

        // create an image element (for width, height, and to draw on the canvas)
        const blob = await response.blob();
        const src = URL.createObjectURL(blob);
        const image = await loadImage(src);

        // default width is unscaled
        if (Number.isNaN(width)) {
            width = image.width;
        }

        // create canvas with the requested dimensions & draw image onto canvas (perform scaling)
        const canvas = new OffscreenCanvas(width, width / image.width * image.height);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

        // convert canvas to a png & set the output image
        const scaledBlob = await canvas.convertToBlob();
        $img.src = URL.createObjectURL(scaledBlob);
    };

    process($emojiUrl.value, Number.parseInt($width.value));
    $form.addEventListener("submit", onSubmit);
})();
