const {app, BrowserWindow, ipcMain, shell} = require("electron");
const {join} = require("path");
const Store = require("electron-store");

const store = new Store({
    defaults: {
        discord: {
            enabled: true
        },
        video: {
            vsync: false,
            frame_limit: false
        }
    }
});

const discordEnabled = store.get("discord.enabled");
let discord;

if (discordEnabled) {
    discord = require("discord-rich-presence")("698510281860448277");
}

let win;

if (!store.get("video.vsync")) {
    console.log("Disabling VSync");
    app.commandLine.appendSwitch("--disable-gpu-vsync");
}

if (!store.get("video.frame_limit")) {
    console.log("Disabling frame limit");
    app.commandLine.appendSwitch("--disable-frame-rate-limit");
}

const rpData = {
    username: "",
    rank: "",
    rating: 0,
    ingame: false,
    currentMenu: "home",
    matchmakingSince: null
}

function getGameTypeString(menu) {
    switch (menu) {
        case "40l":
            return "Playing a 40 Line game";
        case "blitz":
            return "Playing a Blitz game";
        case "custom":
            return "In a solo game";
        default:
            return "In a multiplayer game";
    }
}

function getMenuTypeString(menu) {
    switch (menu) {
        case "lobby":
            return "In a multiplayer lobby";
        case "custom":
        case "blitz":
        case "40l":
            return "Setting up a solo game";
        case "endleague":
            return "Finishing a Tetra League match";
        default:
            return "In a menu";
    }
}

function updateRichPresence() {
    if (!discord) return;
    console.log(rpData)
    discord.updatePresence({
        state: rpData.matchmakingSince ? "Matchmaking in Tetra League" : (rpData.ingame ? getGameTypeString(rpData.currentMenu) : getMenuTypeString(rpData.currentMenu)),
        details: "Logged in as " + rpData.username,
        largeImageKey: "logo",
        smallImageKey: rpData.rank.replace("-", "_m").replace("+", "_p"),
        smallImageText: "Rank " + rpData.rank.toUpperCase() + " (" + rpData.rating + ")",
        startTimestamp: rpData.matchmakingSince
    });
}

ipcMain.on("user", (ev, user) => {
    rpData.username = user.username;
    rpData.rank = user.league.rank;
    rpData.rating = Math.floor(user.league.rating)

    updateRichPresence();
});

ipcMain.on("matchmaking", (ev, matchmaking) => {
    if (matchmaking) {
        rpData.matchmakingSince = Math.floor(Date.now() / 1000)
    } else {
        rpData.matchmakingSince = null
    }

    updateRichPresence();
});

ipcMain.on("game state", (ev, state) => {
    rpData.currentMenu = state.currentMenu;
    rpData.ingame = state.ingame;
    updateRichPresence();
});

ipcMain.on("get config", (ev, key) => {
    ev.returnValue = store.get(key);
});

ipcMain.on("set config", (ev, data) => {
    store.set(data.key, data.value);
});

app.on("ready", () => {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: join(__dirname, "preload.js")
        },
        title: "TETR.IO Desktop Client [UNOFFICIAL]"
    });

    win.setIcon(join(__dirname, "tetrio.ico"));

    win.setMenuBarVisibility(false);
    // win.webContents.openDevTools();

    win.loadURL("https://tetr.io");

    win.on("page-title-updated", event => {
        event.preventDefault();
    });

    win.webContents.on("new-window", (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    win.webContents.on("did-finish-load", () => {
        win.webContents.executeJavaScript("console.log('hello, world')")
    })
});
