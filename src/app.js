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

if (discordEnabled) {
    require("./main/discord");
}

let win;

ipcMain.on("get config", (ev, key) => {
    ev.returnValue = store.get(key);
});

ipcMain.on("set config", (ev, data) => {
    store.set(data.key, data.value);
});


if (!store.get("video.vsync")) {
    console.log("Disabling VSync");
    app.commandLine.appendSwitch("--disable-gpu-vsync");
}

if (!store.get("video.frame_limit")) {
    console.log("Disabling frame limit");
    app.commandLine.appendSwitch("--disable-frame-rate-limit");
}

app.on("ready", () => {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: join(__dirname, "renderer/preload.js")
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
