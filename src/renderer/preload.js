const {ipcRenderer} = require("electron");

const oldxhr = global.XMLHttpRequest;

global.tio_desktop_config = {
    get(key) {
        return ipcRenderer.sendSync("get config", key);
    },
    set(key, value) {
        ipcRenderer.send("set config", {
            key, value
        });
    }
}

global.XMLHttpRequest = new Proxy(oldxhr, {
    construct(target, args) {
        const xhr = new target(...args);
        xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState === 4 && (xhr.responseType === "text" || xhr.responseType === "")) {
                console.log(xhr.responseURL, xhr.responseText);

                switch (new URL(xhr.responseURL).pathname) {
                    case "/api/users/me":
                        const userData = JSON.parse(xhr.responseText);
                        if (userData.success) {
                            if (userData.user.role === "anon") {
                                ipcRenderer.send("user", {
                                    username: userData.user.username + " (anon)",
                                    records: {
                                        "40l": {
                                            record: null,
                                            rank: null
                                        },
                                        blitz: {
                                            record: null,
                                            rank: null
                                        }
                                    },
                                    league: {
                                        rank: "z",
                                        rating: 0
                                    }
                                });
                            } else {
                                const userID = userData.user._id;
                                fetch("/api/users/" + userID, {
                                    headers: {
                                        "Authorization": "Bearer " + localStorage.getItem("userToken")
                                    }
                                }).then(res => res.json()).then(user => {
                                    if (user.success) {
                                        ipcRenderer.send("user", user.user);
                                    }
                                });
                            }
                        }
                        break;
                }
            }
        })
        return xhr;
    }
});

// add credit to about page
window.addEventListener("load", () => {
    const aboutdiv = document.querySelector("[data-menuview=about] > .centered_block:first-child");
    const lastdiv = aboutdiv.querySelector(".credit_title:last-child")
    const div1 = document.createElement("div");
    div1.classList.add("credit_title");
    div1.innerText = "UNOFFICIAL DESKTOP CLIENT BY"
    const div2 = document.createElement("div");
    div2.classList.add("credit_owner");
    div2.innerText = "ZUDO";
    aboutdiv.insertBefore(div1, lastdiv);
    aboutdiv.insertBefore(div2, lastdiv);
});

function createCheckbox(name, title, config) {
    const cb = document.createElement("div");
    cb.classList.add("checkbox", "ns");
    cb.innerText = name;
    cb.title = title;
    cb.addEventListener("click", () => {
        tio_desktop_config.set(config, !tio_desktop_config.get(config));

        if (tio_desktop_config.get(config)) {
            cb.classList.add("checked");
        } else {
            cb.classList.remove("checked");
        }
    });

    if (tio_desktop_config.get(config)) {
        cb.classList.add("checked");
    }

    return cb;
}

// add game type info
let currentMenu = "home";
let ingame = false;
let matchmaking = false;

// add video config
window.addEventListener("load", () => {
    const configdiv = document.querySelector("[data-menuview=config]");
    const firstblock = configdiv.querySelector(".scroller_block:first-child");

    const newblock = document.createElement("div");

    newblock.classList.add("scroller_block");

    const blockhead = document.createElement("h1");
    blockhead.classList.add("ns");
    blockhead.innerText = "DESKTOP CLIENT OPTIONS";

    const restartWarning = document.createElement("p");
    restartWarning.classList.add("csub", "ns");
    restartWarning.innerText = "Changes here will not take effect until the client is restarted.";

    newblock.appendChild(blockhead);
    newblock.appendChild(createCheckbox(
        "enable vsync",
        "Sync game refresh rate to your monitor's refresh rate. May reduce tearing at the cost of performance.",
        "video.vsync"));
    newblock.appendChild(createCheckbox(
        "enable frame rate limit",
        "Limits the game's maximum frame rate. Enable this if animations look off.",
        "video.frame_limit"));
    newblock.appendChild(createCheckbox(
        "enable rich presence",
        "Display game information as your Discord status.",
        "discord.enabled"));
    newblock.appendChild(restartWarning);
    configdiv.insertBefore(newblock, firstblock);

    const menuObserver = new MutationObserver(mutations => {
        if (mutations[0].type === "attributes" && mutations[0].attributeName === "data-menu-type") {
            const el = mutations[0].target;
            currentMenu = el.dataset.menuType;
            ipcRenderer.send("game state", {
                ingame, currentMenu
            })
        }
    });

    menuObserver.observe(document.getElementById("menus"), {
        attributes: true
    });

    const bodyObserver = new MutationObserver(mutations => {
        if (mutations[0].type === "attributes" && mutations[0].attributeName === "class") {
            ingame = mutations[0].target.classList.contains("ingame");
            if (mutations[0].target.classList.contains("matchmaking")) {
                if (!matchmaking) {
                    ipcRenderer.send("matchmaking", true);
                    matchmaking = true;
                }
            } else {
                ipcRenderer.send("matchmaking", false);
                matchmaking = false;
            }
            ipcRenderer.send("game state", {
                ingame, currentMenu,
            });
        }
    });

    bodyObserver.observe(document.body, {
        attributes: true
    });
})
