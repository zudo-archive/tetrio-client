const {ipcMain} = require("electron");

const discord = require("discord-rich-presence")("698510281860448277");

const rpData = {
    username: "",
    rank: "",
    rating: 0,
    currentMenu: "home",
    ingameSince: null,
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
        case "tetra":
        case "tetra_records":
        case "tetra_me":
            return "Watching a replay";
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
    if (!rpData.rank) return;
    console.log(rpData)
    discord.updatePresence({
        state: rpData.matchmakingSince ? "Matchmaking in Tetra League" : (rpData.ingameSince ? getGameTypeString(rpData.currentMenu) : getMenuTypeString(rpData.currentMenu)),
        details: "Logged in as " + rpData.username.toUpperCase(),
        largeImageKey: "logo",
        smallImageKey: rpData.rank.replace("-", "_m").replace("+", "_p"),
        smallImageText: "Rank " + rpData.rank.toUpperCase() + " (" + rpData.rating + ")",
        startTimestamp: rpData.ingameSince || rpData.matchmakingSince
    });
}

ipcMain.on("user", (ev, user) => {
    rpData.username = user.username;
    rpData.rank = user.league.rank;
    rpData.rating = Math.floor(user.league.rating)

    updateRichPresence();
});

ipcMain.on("matchmaking", (ev, matchmaking) => {
    if (matchmaking && !rpData.matchmakingSince) {
        if (!rpData.matchmakingSince) {
            rpData.matchmakingSince = Math.floor(Date.now() / 1000);
        }
    } else {
        rpData.matchmakingSince = null;
    }

    updateRichPresence();
});

ipcMain.on("game state", (ev, state) => {
    rpData.currentMenu = state.currentMenu;
    if (state.ingame) {
        if (!rpData.ingameSince) {
            rpData.ingameSince = Math.floor(Date.now() / 1000);
        }
    } else {
        rpData.ingameSince = null;
    }
    updateRichPresence();
});
