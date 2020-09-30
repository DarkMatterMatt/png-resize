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
            return await fetch("https://cors-anywhere.herokuapp.com/" + url);
        }
    }

    const strToDOM = str => {
        const wrapper= document.createElement("div");
        wrapper.innerHTML = str;
        return wrapper.firstChild;
    }

    const onSubmit = async ev => {
        const width = Number.parseInt($width.value);
        const emojiOrUrl = $emojiUrl.value;

        // check for emoji
        const resolvedEmojiUrl = getUrlForEmoji(emojiOrUrl);
        if (resolvedEmojiUrl != null) {
            await process(new URL(resolvedEmojiUrl), width);
            return;
        }

        // check for url
        let url;
        try {
            url = new URL(emojiOrUrl);
        }
        catch (err) {
            // invalid
            alert("Invalid emoji/URL");
            return;
        }

        await process(url, width);
    };

    const getUrlForEmoji = name => {
        const shortcut = allShortcuts.find(s => s.shortcuts.includes(name));
        if (shortcut != null) {
            name = shortcut.emoji;
        }
        const emoji = allEmoji.find(e => e.names.includes(name));
        const imgHtml = twemoji.parse(emoji ? emoji.surrogates : name, {
            ext: ".svg",
            folder: "svg",
        });
        if (imgHtml === name) {
            return null;
        }
        return strToDOM(imgHtml, "text/html").src;
    };

    const process = async (url, width) => {
        const blob = await corsFetch(url).then(r => r.blob());
        const reader = new FileReader();
        reader.readAsDataURL(blob); 
        reader.onloadend = () => {
            const image = document.createElement("img");
            image.src = reader.result;
            image.onload = async ev => {
                if (Number.isNaN(width)) {
                    width = image.width;
                }
                const canvas = new OffscreenCanvas(width, width / image.width * image.height);
                const context = canvas.getContext("2d");
        
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const blob = await canvas.convertToBlob();
                $img.src = URL.createObjectURL(blob);
            }
        }
    };

    onSubmit();
    $form.addEventListener("submit", onSubmit);
})();
