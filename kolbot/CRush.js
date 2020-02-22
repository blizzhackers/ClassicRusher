/**
 *   @filename   CRush.js
 *   @author     dzik
 *   @encoding   UTF-8
 *   @version    2016.01.18
 *   @lastchange 2016.06.23
 **/

/**
 * Define here all profile names. For each char in game. profile names are case sensitive.
 * @type {{Rusher: string, BoBarb: string, Helper: string, Rushee: string[]}}
 */
var Profiles = {
    Rusher: "Rusher", // profile name of rushing Sorceress.
    BoBarb: "RushHelper", // profile name of BoBarb
    Helper: "Hammer", // profile name of helping char.
    Rushee: ["Rushee"] // profile names of all Rushees. Rushee leader should be on first position.
};

/**
 * Rush configuration
 * @type {{difference: number, lastQuest: string, radament: boolean, lamesen: boolean, izual: boolean, debug: boolean}}
 */
var RushConfig = {
    difference: 2, // difficulty where finish rushing
    lastQuest: "mephisto", // last quest to be executed
    radament: false, // do Radament quest
    lamesen: false, // do LamEsen's quest
    izual: false, // do Izual quest

    debug: false // use it for debug
};

//noinspection JSUnusedGlobalSymbols
/**
 * Main function executed by Loader.js
 * @returns {boolean}
 */
function CRush() {
    // don't start if we are not 100% in game.
    while (!me.name || !me.gameReady) {
        if (!me.ingame) {
            return false;
        }
        delay(100);
    }

    // check for valid lastQuest setting.
    var validEnds = ["andariel", "radament", "cube", "amulet", "staff", "summoner", "duriel", "lamesen", "travincal", "mephisto", "izual", "diablo"];
    if (validEnds.indexOf(RushConfig.lastQuest) === -1) {
        throw new Error('RushConfig.lastQuest is set to "' + RushConfig.lastQuest + '". Please use one of the following values: "andariel", "radament", "cube", "amulet", "staff", "summoner", "duriel", "lamesen", "travincal", "mephisto", "izual", "diablo"');
    }

    // fix quit list settings for all chars involved.
    var script = getScript("tools/toolsthread.js");
    if (script && script.running) {
        script.stop();
    }
    Config.QuitList = [Profiles.Rusher];
    Config.QuitListMode = 1;
    load("tools/toolsthread.js");

    // move everyone to random spot to avoid char blocking.
    Pather.moveTo(me.x+rand(-3,3), me.y+rand(-3,3));

    if (me.profile.toLowerCase() === Profiles.Rusher.toLowerCase()) {
        Rush();
    } else { // all non rush chars just idle and execute commands via copydata and eval
        //noinspection InfiniteLoopJS
        while(true) {
            delay(1000);
        }
    }
    return true;
}

/**
 * Print all debug information to D2BS console.
 * @param {string} msg
 */
function LOG(msg) {
    if (RushConfig.debug) {
        print("\xFFc;CRush \xFFc0:: " + msg);
    }
}

/**
 * Game event listener
 * @param mode
 * @param param1
 * @param param2
 * @param name1
 * @param name2
 */
function gameEvent(mode, param1, param2, name1, name2) {
    if (mode == 0x00 || mode == 0x01 || mode == 0x03) {
        list = []; // clear current task list and quit.
    }
}

/**
 * Exchange information between profiles. Used by JustDoIt() and Order()
 * sent channel is 1337, answer is 2337.
 * @param {number} mode
 * @param {string} msg
 */
var CopyDataHandler = function(mode, msg) {
    var result, ask;
    if (mode === 1337) {
        ask = JSON.parse(msg);
        result = {
            profile: me.profile,
            name: me.name,
            status: "success",
            command: ask.command,
            time: ask.time,
            result: false
        };
        try {
            if (ask.game !== me.gamename.toLowerCase()) {
                scriptBroadcast("quit");
            } else if (ask.act < me.act) {
                result.result = true;
            } else {
                LOG("Executing \xFFc9" + ask.command + "\xFFc0 have " + ask.time + " second(s) to response.");
                result.result = eval(ask.command);
                if (result.result === undefined) {
                    LOG("Function " + ask.command + " did not returned anything.");
                    result.result = true;
                }
            }
        } catch (e) {
            LOG("Failed to execute \xFFc9" + ask.command);
            result.status = "failed";
            result.result = false;
        } finally {
            if (ask.time > 0) {
                LOG("Responding with \xFFc<" + result.status + " (" + result.result + ")");
                sendCopyData(null, ask.profile, 2337, JSON.stringify(result));
            }
        }
    } else if (mode === 2337) {
        result = JSON.parse(msg);
        switch(result.status) {
            case "success":
                LOG(result.profile + " executed \xFFc9" + result.command + "\xFFc0 and returned \xFFc<" + result.result);
                Execution = result;
                break;
            case "failed":
                LOG("\xFFc1" + result.profile + " failed to execute command");
                Execution = result;
                break;
        }
    }
};
addEventListener('copydata', CopyDataHandler);

var Execution = false;
/**
 * Used to send Message to profile and wait for response.
 * @param {string} profile - Profile name where we send message.
 * @param {string} command - function name executed via eval();
 * @param {number} time - time to wait for response. Return false if no answer.
 * @param {number} act
 * @returns {*} object or false.
 */
function Order(profile, command, time, act) {
    var ask;
    ask = {
        profile: me.profile,
        name: me.name,
        command: command,
        time: time,
        game: me.gamename.toLowerCase(),
        act: act
    };
    var result;
    result = sendCopyData(null, profile, 1337, JSON.stringify(ask));
    if (result === false) {
        D2Bot.start(profile);
        LOG("Starting " + profile);
        delay(100);
    }
    return result;
}

/**
 * Function to control characters via sendcopydata.
 * @param {string} profile - Profile name to communicate with
 * @param {string} command - Function to execute via eval()
 * @param {number} wait - time for Profile to get response passed to function Order()
 * @param act - pass to profiles in what act we are currently for ignoring lower quests
 */
function JustDoIt(profile, command, wait, act) {
    if (act === undefined) {
        act = me.act;
    }
    Execution = false;
    LOG("Requesting function: \xFFc9" + command + "\xFFc0 from " + profile);
    Order(profile, command, wait, act);
    var timeout = getTickCount();
    while(Execution === false && wait > 0) {
        if(getTickCount() - timeout > wait * 1000) {
            LOG("\xFFc1No response from " + profile + " after " + wait + " seconds for \xFFc9" + command + "\xFFc0 - Quiting game.");
            throw new Error("No response from " + profile + " after " + wait + " seconds for " + command + " - Quiting game.");
        }
        delay(1000);
    }
    if (wait > 0) {
        if (Execution.status === "failed") {
            LOG("\xFFc1Profile " + profile + " failed to execute command \xFFc9" + command);
            throw new Error("Profile " + profile + " failed to execute command " + command);
        }
    }
}

/**
 * Return count of all chars in game/party.
 * @returns {number} party size including us self.
 */
var partySize = function() {
    var count = 0;
    var party = getParty();
    do {
        count++;
    } while (party && party.getNext());
    return count;
};

//noinspection JSUnusedGlobalSymbols
/**
 * Return array of quests to be completed.
 * @returns {Array} Array of quest to be completed.
 */
var requiredQuests = function () {
    var List = [];
    // request quest states update
    sendPacket(1, 0x40);
    delay((me.ping*2||0) + 500);

    // Act 1 - Sisters to the Slaughter
    if (me.getQuest(7, 0) == false) { List.push("andariel"); }

    // Act 2 - Radament's Lair - (Free one skill)
    //if (!((me.getQuest(9, 0) == true || me.getQuest(9, 1) == true) && me.getQuest(9, 5) == false)) { List.push("radament"); }
    //if (!((me.getQuest(9, 0) == false && me.getQuest(9, 1) == false))) { List.push("radament"); }
    if (me.getQuest(9, 0) == false) { List.push("radament"); }

    // Act 2 - The Horadric Staff
    if (!me.getItem(91) && !me.getQuest(10, 0)) {
        if(!me.getItem("box")) { List.push("cube"); }
        if(!me.getItem("vip")) { List.push("amulet"); }
        if(!me.getItem("msf")) { List.push("staff"); }
    }

    // Act 2 - The Summoner
    if (me.getQuest(13, 0) == false) { List.push("summoner"); }

    // Act 2 - Able to go to Act III
    if (me.getQuest(15, 0) == false) { List.push("duriel"); }

    // Act 3 - Lam Esen's Tome (Free 5 stats)
    if (me.getQuest(17, 0) == false) { List.push("lamesen"); }

    // Act 3 - The Blackened Temple
    if (me.getQuest(21, 0) == false) { List.push("travincal"); }

    // Act 3 - Able to go to Act IV
    if (me.getQuest(23, 0) == false) { List.push("mephisto"); }

    // Act 4 - The Fallen Angel (Free two skills)
    if (me.getQuest(25, 0) == false) { List.push("izual"); }

    // Act 4 - Terror's End
    if (me.getQuest(26, 0) == false && me.diff < 2) { List.push("diablo"); }

    return List;
};

/**
 * Global variables
 */
var Rush, list;
var CharsInGame = Profiles.Rushee.length + !!Profiles.Rusher + (Profiles.BoBarb === Profiles.Helper ? 1 : 2);

/**
 * Main logic of rush. Executed by RushSorc.
 * @return {boolean}
 */
Rush = function () {
    // lets start game event listener what will handle game exits in case something goes wrong.
    addEventListener("gameevent", gameEvent);
    // lets declare variables what we will use mostly.
    var timeout, i, returnSpot, moveIntoPos, fill, missing,
        diff = ["Normal", "Nightmare", "Hell"][me.diff];

    // before we start we need wait for full team.
    timeout = getTickCount();
    fill = partySize();
    while (fill < CharsInGame) {
        // return false after 3 min waiting in game.
        if(getTickCount() - timeout > 3*60*1000) {
            return false;
        }
        delay(1000);
        missing = CharsInGame-fill;
        me.overhead("Waiting for " + missing + " char" + (missing === 1 ? "" : "s") + ".");
        fill = partySize();
    }

    delay(5000);

    // we got all chars in game lets see what quests we need to do.
    JustDoIt(Profiles.Rushee[0], "requiredQuests()", 20, 6); // walk around to always execute by rushee
    if (Execution.status === "failed") {
        throw new Error(Profiles.Rusher + " - Get list failed.");
    }
    list = Execution.result;
    if (me.diff === RushConfig.difference) {
        var pos = list.indexOf(RushConfig.lastQuest) + 1;
        if (pos > 0 && pos < list.length) {
            list.splice(pos, list.length - pos + 1)
        }
    }

    /**
     * Andariel.
     */
    if (list.indexOf("andariel") >= 0) {
        JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(6, 0)", 10);
        if (Execution.status === "success" && Execution.result === false) { // Andariel need to die!
            Commands.beforeStart(1);
            D2Bot.printToConsole("Starting: " + diff + " Andariel.", 7);
            Commands.callPrecast(35, 1, false);

            // EXECUTE
            for (i = 0; i < 3; i++) {
                if (!Pather.journeyTo(37, true)) {
                    if (i === 2) {
                        throw new Error(Profiles.Rusher + " - Failed move to Catacombs lvl 4.");
                    }
                    Packet.flash(me.gid);
                    delay(500);
                }
            }
            if (!Pather.moveTo(22582, 9612)) { // spot next to entrance
                throw new Error(Profiles.Rusher + " - Failed move to portal position.");
            }
            Pather.makePortal(false);
            JustDoIt(Profiles.Rushee[0], "Pather.usePortal(" + me.area + ",'" + me.name + "')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed to take portal to Catacombs lvl 4.");
            }

            Pather.moveTo(22542, 9554, 3); // spot next to andy
            Pather.makePortal(false);
            JustDoIt(Profiles.Helper, "Pather.usePortal(" + me.area + ",'" + me.name + "')", 20);
            JustDoIt(Profiles.Helper, "Attack.kill(156)", 0);
            Attack.kill(156);
            delay(100);
            JustDoIt(Profiles.Helper, "Pather.usePortal(1,'" + me.name + "')", 20);

            Pather.moveTo(22582, 9612); // spot next to entrance
            Pather.makePortal(true);

            JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(1,'" + me.name + "')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go back to Town.");
            }
        }
        for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
            JustDoIt(Profiles.Rushee[i], "Commands.townieTravel('warriv', 2, 0x0D36)", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go to A2.");
            }
        }
        Pather.usePortal(1, me.name);
    }

    /**
     * Radament. (bonus quest)
     */
    if (RushConfig.radament && list.indexOf("radament") >= 0) {
        var radaCoords, rada, radaPreset;
        moveIntoPos = function (unit, range) {
            var i, coordx, coordy,
                coords = [],
                angle = Math.round(Math.atan2(me.y - unit.y, me.x - unit.x) * 180 / Math.PI),
                angles = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 105, -105, 120, -120, 135, -135, 150, -150, 180];

            for (i = 0; i < angles.length; i += 1) {
                coordx = Math.round((Math.cos((angle + angles[i]) * Math.PI / 180)) * range + unit.x);
                coordy = Math.round((Math.sin((angle + angles[i]) * Math.PI / 180)) * range + unit.y);

                try {
                    //noinspection JSBitwiseOperatorUsage
                    if (!(getCollision(unit.area, coordx, coordy) & 0x1)) {
                        coords.push({
                            x: coordx,
                            y: coordy
                        });
                    }
                } catch (e) {

                }
            }

            if (coords.length > 0) {
                coords.sort(Sort.units);

                return Pather.moveToUnit(coords[0]);
            }

            return false;
        };

        Commands.beforeStart(2);
        D2Bot.printToConsole("Starting: " + diff + " Radament (bonus quest).", 6);
        Commands.callPrecast(48, 40, true);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(49, true)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to A2 Sewers Level 3.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }

        radaPreset = getPresetUnit(49, 2, 355);
        radaCoords = {
            area: 49,
            x: radaPreset.roomx * 5 + radaPreset.x,
            y: radaPreset.roomy * 5 + radaPreset.y
        };

        if (!moveIntoPos(radaCoords, 50)) {
            throw new Error(Profiles.Rusher + " - Failed move to Radament Spot.");
        }

        for (i = 0; i < 3; i += 1) {
            rada = getUnit(1, 229);
            if (rada) {
                break;
            }
            delay(500);
        }

        if (rada) {
            moveIntoPos(rada, 60);
        } else {
            throw new Error(Profiles.Rusher + " - Radament unit not found.");
        }

        returnSpot = {
            x: me.x,
            y: me.y
        };

        Pather.makePortal(false); // portal for rushee.
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to A2 Sewers Level 3.");
        }

        Pather.moveToUnit(radaCoords);
        Pather.makePortal(false);

        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.securePosition("+me.x+","+me.y+",30, 3000)", 0);
        Attack.securePosition(me.x, me.y, 30, 3000);
        //Commands.getBoss(229); // Radament
        JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);

        Pather.moveToUnit(returnSpot);
        Pather.makePortal(false);
        Pather.moveToUnit(radaCoords);
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }

        Pather.makePortal(true); // go back to town we don't need to be there anymore.
        
        for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
            JustDoIt(Profiles.Rushee[i], "Pather.usePortal(49,'"+me.name+"')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go to A2 Sewers Level 3 for Book.");
            }
            JustDoIt(Profiles.Rushee[i], "Commands.getBook()", 40);

            JustDoIt(Profiles.Rushee[i], "Commands.leaveArea(40,'"+me.name+"')", 40);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go back to Town.");
            }
            // Just send them to Atma and get next one.
            JustDoIt(Profiles.Rushee[i], "Commands.townieTalk('atma', 2)", (i===0?30:0) );
        }
        //JustDoIt(Profiles.Rushee[0], "Commands.displayQuest(9, 'After talking to atma.')", 30);
    }

    /**
     * Cube.
     */
    if (list.indexOf("cube") >= 0) {
        Commands.beforeStart(2);
        D2Bot.printToConsole("Starting: " + diff + " Cube.", 6);
        Commands.callPrecast(57, 40, false);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(60, true)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to Halls Of The Dead Level 3.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }
        if(!Pather.moveToPreset(me.area, 2, 354)) {
            throw new Error(Profiles.Rusher + " - Failed move to  Cube chest.");
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.clear(30)", 0);
        Attack.clear(30);
        delay(100);
        Pather.moveToPreset(me.area, 2, 354); // move to chest
        JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);

        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Rushee[0], "Commands.getQuestItem(549, 354)", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go get Cube.");
        }
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
        Pather.usePortal(40, me.name);
    }

    /**
     * TODO: improve clearing for skeletons...
     * Amulet.
     */
    if (list.indexOf("amulet") >= 0) {
        Commands.beforeStart(2);
        D2Bot.printToConsole("Starting: " + diff + " Amulet.", 6);
        Commands.callPrecast(44, 40, false);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(61, true)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to Claw Viper Temple Level 2.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }
        if (!Pather.moveTo(15046, 14055)) {
            throw new Error(Profiles.Rusher + " - Failed move to Amulet altar.");
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.securePosition("+me.x+","+me.y+",8,5000)", 0);
        Attack.securePosition(me.x, me.y, 6, 5000, true);
        Pather.moveTo(15046, 14045);
        Pather.makePortal(true);
        JustDoIt(Profiles.Helper, "Pather.moveTo(15044, 14045)", 0);
        JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 30);

        JustDoIt(Profiles.Rushee[0], "Pather.usePortal(61,'"+me.name+"')", 20);
        JustDoIt(Profiles.Rushee[0], "Commands.getQuestItem(521, 149)", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed to get Amulet.");
        }
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
    }

    /**
     * Staff.
     */
    if (list.indexOf("staff") >= 0) {
        Commands.beforeStart(2);
        D2Bot.printToConsole("Starting: " + diff + " Staff.", 6);
        Commands.callPrecast(43, 40, false);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(64)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to Maggot Lair Level 3.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }
        if (!Pather.moveToPreset(me.area, 2, 356)) {
            throw new Error(Profiles.Rusher + " - Failed move to Staff chest.");
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.clear(30)", 0);
        if (me.diff === 2) {
            Commands.getBoss(284);
        } else {
            Attack.clear(30);
        }
        JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);

        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Rushee[0], "Commands.getQuestItem(92, 356)", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go get Staff.");
        }
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
        Pather.usePortal(40, me.name);
    }

    /**
     * Transmute Staff.
     */
    // Ask Rushee to transmute staff. Return true if we have Staff or we are higher than Act 2.
    JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(10, 0)", 10);
    if (Execution.status === "success" && Execution.result === false) { // did not finished staff yet
        JustDoIt(Profiles.Rushee[0], "Commands.cubeStaff()", 40);
        if (Execution.result === false) { //
            throw new Error(Execution.profile + " failed cube Staff.");
        }
    }
    else if (Execution.status === "failed") {
        throw new Error(Execution.profile + " did not return quest result for: " + Execution.command);
    }

    /**
     * Summoner.
     */
    if (list.indexOf("summoner") >= 0) {
        Commands.beforeStart(2);
        D2Bot.printToConsole("Starting: " + diff + " Summoner.", 6);
        // To be sure we talk with Drognan before continue.
        JustDoIt(Profiles.Rushee[0], "Commands.townieTalk('drognan', 2)", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed talk to Drognan.");
        }
        Commands.callPrecast(74, 40, false);

        // EXECUTE
        var journal,
            preset = getPresetUnit(me.area, 2, 357),
            spot = {};

        switch (preset.roomx * 5 + preset.x) {
            case 25011:
                spot = {x: 25081, y: 5446};
                break;
            case 25866:
                spot = {x: 25830, y: 5447};
                break;
            case 25431:
                switch (preset.roomy * 5 + preset.y) {
                    case 5011:
                        spot = {x: 25449, y: 5081};
                        break;
                    case 5861:
                        spot = {x: 25447, y: 5822};
                        break;
                }
                break;
        }

        if (!Pather.moveToUnit(spot)) {
            throw new Error(Profiles.Rusher + " - Failed move to Summoner.");
        }

        Pather.makePortal(false); // portal for rushee.
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to Arcane Sanctuary.");
        }

        Pather.moveToPreset(me.area, 2, 357); // move to summoner and make portal for helper.
        Pather.makePortal(false);

        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.kill(250)", 0);
        Attack.kill(250);
        JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);

        Pather.moveToUnit(spot); // move back to rushee and make portal.
        Pather.makePortal(true);
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
        if (!Pather.usePortal(74, me.name)) {
            throw new Error(Profiles.Rusher + " - Failed move back to Sanctuary.")
        }
        Pather.moveToPreset(me.area, 2, 357);
        journal = getUnit(2, 357);

        for (i = 0; i < 5; i += 1) {
            journal.interact();
            delay(1000);
            me.cancel();

            if (Pather.getPortal(46)) {
                break;
            }
        }

        if (i === 5) {
            throw new Error(Profiles.Rusher + " - Failed to interact with Journal.")
        }
        Pather.usePortal(46);

        JustDoIt(Profiles.Rushee[0], "Commands.townieTalk('atma', 2)", 30);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed talk to Atma.");
        }
    }

    /**
     * Duriel.
     */
    if (list.indexOf("duriel") >= 0) {
        /*
         (14, 3) - talk to Jerhyn.
         (14, 4) - talk to Meshif.
         (14, 0) - go to A3.
         */
        Commands.beforeStart(2);
        // We don't have him killed, cant talk to jerhyn, cant talk to Meshif, cant go to A3.
        JustDoIt(Profiles.Rushee[0], "(Commands.checkQuest(14,3)||Commands.checkQuest(14,4)||Commands.checkQuest(14,0))", 10);
        if (Execution.result === false) {
			//var staff = me.getItem(91);
			//Storage.Inventory.MoveTo(staff);
			JustDoIt(Profiles.Rushee[0],"Storage.Inventory.MoveTo(staff)");
            D2Bot.printToConsole("Starting: " + diff + " Duriel.", 7);
            Commands.callPrecast(46, 40, true);
			//var staff = me.getItem(91);
			//Storage.Inventory.MoveTo(staff);

            // EXECUTE
            for (i = 0; i < 3; i++) {
                if (!Pather.journeyTo(getRoom().correcttomb)) {
                    if (i === 2) {
                        throw new Error(Profiles.Rusher + " - Failed move to Correct Tomb.");
                    }
                    Packet.flash(me.gid);
                    delay(500);
                }
            }
            if (!Pather.moveToPreset(me.area, 2, 152)) {
                throw new Error(Profiles.Rusher + " - Failed move to Orifice.");
            }

            JustDoIt(Profiles.Rushee[0], "!!me.getItem(91)", 20);
            if (Execution.result === true) {
                // We are in orifice room.
                Pather.makePortal(false);
                JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
                JustDoIt(Profiles.Helper, "Attack.clear(25)", 0);
                Attack.clear(25);
                JustDoIt(Profiles.Helper, "Pather.moveToPreset(me.area, 2, 152)", 20);
                JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);
                Pather.moveToPreset(me.area, 2, 152);

                JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
                if (Execution.result === false) {
                    throw new Error(Execution.profile + " failed go to Tomb.");
                }
                JustDoIt(Profiles.Rushee[0], "Commands.placeStaff()", 30);
                if (Execution.result === false) {
                    throw new Error(Execution.profile + " failed go place Staff.");
                }
                JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40,'"+me.name+"')", 40);
                if (Execution.result === false) {
                    throw new Error(Execution.profile + " failed go back to Town.");
                }
            }
            timeout = getTickCount();
            while (!getUnit(2, 100)) {
                if (getTickCount() - timeout > 40000) {
                    throw new Error(Profiles.Rusher + " cannot find chamber entrance. Rushee failed ?")
                }
                delay(500);
            }
            Pather.useUnit(2, 100, 73);

            // We are in chamber.
            Pather.makePortal(false);
            JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
            JustDoIt(Profiles.Helper, "Attack.kill(211)", 0);
            Attack.kill(211);
            JustDoIt(Profiles.Helper, "Pather.usePortal(40,'"+me.name+"')", 20);

            // WALKS TO TYRAEL.
            Pather.teleport = false;
            Pather.moveTo(22579, 15706);
            Pather.teleport = true;
            Pather.moveTo(22577, 15649, 10);
            Pather.moveTo(22577, 15609, 10);
            Pather.makePortal(true);

            JustDoIt(Profiles.Rushee[0], "Pather.usePortal(73, '"+me.name+"')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go to Chamber.");
            }
            //JustDoIt(Profiles.Rushee[0], "Commands.displayQuest(14, 'before tyrael talk.')", 2);
            JustDoIt(Profiles.Rushee[0], "Commands.tyraelTalk()", 40);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed talk to Tyrael.");
            }
            JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(40, '"+me.name+"')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go back to Town.");
            }
            //JustDoIt(Profiles.Rushee[0], "Commands.displayQuest(14, 'after tyrael talk.')", 2);

            if(Profiles.Rushee.length > 1) {
                for (i = 1; i < Profiles.Rushee.length; i++) {
                    JustDoIt(Profiles.Rushee[i], "Commands.townieTalk('jerhyn', 2, 'palace')", 0);
                    delay((me.ping*2||0) + 200);
                }
            }
            JustDoIt(Profiles.Rushee[0], "Commands.townieTalk('jerhyn', 2, 'palace')", 40);
            if (Execution.status === "failed" || Execution.result === false) {
                throw new Error(Execution.profile + " failed talk to Jerhyn.");
            }
        }

        JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(14, 3)", 10); // mark as false once we talk to Jerhyn.
        if (Execution.result === true) {
            // talk to Jerhyn
            if(Profiles.Rushee.length > 1) {
                for (i = 1; i < Profiles.Rushee.length; i++) {
                    JustDoIt(Profiles.Rushee[i], "Commands.townieTalk('jerhyn', 2, 'palace')", 0);
                    delay((me.ping*2||0) + 200);
                }
            }
            JustDoIt(Profiles.Rushee[0], "Commands.townieTalk('jerhyn', 2, 'palace')", 40);
            if (Execution.status === "failed" || Execution.result === false) {
                throw new Error(Execution.profile + " failed talk to Jerhyn.");
            }
        }
        //JustDoIt(Profiles.Rushee[0], "Commands.displayQuest(14, 'after Jerhyn talk.')", 2);

        JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(14, 4)", 10); // mark as false once we talk to Meshif.
        if (Execution.result === true) {
            // talk to Meshif
            for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
                JustDoIt(Profiles.Rushee[i], "Commands.townieTravel('meshif', 3, 0x0D38)", 30);
                if (Execution.result === false) {
                    throw new Error(Execution.profile + " failed go to A2.");
                }
            }
        }
        //JustDoIt(Profiles.Rushee[0], "Commands.displayQuest(14, 'after Meshif travel to A3.')", 2);
    }

    /**
     * Lam Esen's Tome. (bonus quest)
     */
    if (RushConfig.lamesen && list.indexOf("lamesen") >= 0) {
        JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(15, 0)", 10);
        if (Execution.result === true) {
            // Get Free Lam essen quest.
            D2Bot.printToConsole("Starting: " + diff + " Lam Esen's Tome (bonus quest).", 6);
            JustDoIt(Profiles.Rushee[0], "Commands.lamEsenTome()", 30);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed to get Five stat points.");
            }
        }
    }

    /**
     * Travincal.
     */
    if (list.indexOf("travincal") >= 0) {
        Commands.beforeStart(3);
        D2Bot.printToConsole("Starting: " + diff + " Travincal.", 6);
        Commands.callPrecast(83, 75, true);

        var coords = [me.x, me.y];

        // go to spot and leave there char.
        Pather.moveTo(coords[0] + 23, coords[1] - 102);
        Pather.makePortal(false);
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to Chamber.");
        }

        // go to travincal and kill them all.
        Pather.moveTo(coords[0] + 30, coords[1] - 134);
        Pather.moveTo(coords[0] + 86, coords[1] - 130);
        Pather.moveTo(coords[0] + 77, coords[1] - 94);
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Attack.securePosition("+me.x+","+me.y+",40,3000)", 0);
        //JustDoIt(Profiles.Helper, "Commands.clearTravi()", 0);
        // hell, helper is not barb, call for him to help clearing.
        if (me.diff === 2 && Profiles.Helper !== Profiles.BoBarb) {
            JustDoIt(Profiles.BoBarb, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
            JustDoIt(Profiles.BoBarb, "Attack.securePosition("+me.x+","+me.y+",40,3000)", 0);
            //JustDoIt(Profiles.BoBarb, "Commands.clearTravi()", 0);
        }
        // lets make sorc killing only what is required to finish quest.
        Attack.securePosition(coords[0] + 71, coords[1] - 94, 40, 3000);
        //Commands.clearTravi();
        JustDoIt(Profiles.Helper, "Pather.usePortal(75,'"+me.name+"')", 20);
        // hell, helper is not barb, send him back to town.
        if (me.diff === 2 && Profiles.Helper !== Profiles.BoBarb) {
            JustDoIt(Profiles.BoBarb, "Pather.usePortal(75,'"+me.name+"')", 20);
        }

        // go back to rushee.
        Pather.moveTo(coords[0] + 71, coords[1] - 94);
        Pather.moveTo(coords[0] + 86, coords[1] - 130);
        Pather.moveTo(coords[0] + 30, coords[1] - 134);
        Pather.moveTo(coords[0] + 23, coords[1] - 102);
        Pather.makePortal(true); // leave area anyway
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(75,'"+me.name+"')", 45);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
        for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
            JustDoIt(Profiles.Rushee[i], "Commands.townieTalk('deckard cain', 3, 'cain')", 30);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed talk to Cain.");
            }
        }
        JustDoIt(Profiles.Rushee[0], "Commands.checkQuest(21, 0)", 10);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed to complete Travincal.");
        }
    }

    /**
     * Mephisto.
     */
    if (list.indexOf("mephisto") >= 0) {
        // lets move all of them closer
        for (i = Profiles.Rushee.length - 1; i >= 1; i--) {
            JustDoIt(Profiles.Rushee[i], "Town.move('portalspot')", 0, 6);
            delay((me.ping*2||0) + 500);
        }

        Commands.beforeStart(3);
        D2Bot.printToConsole("Starting: " + diff + " Mephisto.", 7);
        // To be sure we talk with Deckard Cain before continue.
        JustDoIt(Profiles.Rushee[0], "Commands.townieTalk('deckard cain', 3, 'cain')", 30);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed talk to Drognan.");
        }
        Commands.callPrecast(101, 75, true);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(102)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to Durance Of Hate Level 3.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }

        // Don't do this if we already killed Mephisto.
        Pather.moveTo(17692, 8023);
        Pather.makePortal(false);
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to Durance Of Hate Level 3.");
        }

        /*
         Tp near Red Portal.
         Call for helper.
         Send him closer to Mephisto.
         Go and help killing him.
         Move back stairs and spawn tp.
         Send helper back.
         Go back to rushee and spawn portal.
         Go back near Red portal.
         Spawn TP.
         Execute Mephisto exit.

         (17588, 8069) - next to Red Portal.
         (17563, 8072) - next to Mephisto stairs down.
        */
        Pather.moveTo(17588, 8069);
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Pather.moveTo(17578, 8072)", 15);
        JustDoIt(Profiles.Helper, "Attack.kill(242)", 0);
        Attack.kill(242);
        JustDoIt(Profiles.Helper, "Pather.usePortal(75,'"+me.name+"')", 20);

        Pather.moveTo(17692, 8023);
        Pather.makePortal(false);
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(75,'"+me.name+"')", 45);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }

        // Do it always.
        Pather.moveTo(17588, 8069);
        Pather.makePortal(false);
        // send all rushees one by one.
        for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
            JustDoIt(Profiles.Rushee[i], "Pather.usePortal(" + me.area + ",'" + me.name + "')", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go to Durance Of Hate Level 3 second time.");
            }
            JustDoIt(Profiles.Rushee[i], "Pather.moveTo(17591, 8070)", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed go to Red Portal.");
            }
            JustDoIt(Profiles.Rushee[i], "Pather.usePortal(null)", 20);
            if (Execution.result === false) {
                throw new Error(Execution.profile + " failed use Red Portal.");
            }
        }
        Pather.moveTo(17591, 8070);
        Pather.usePortal(null);
    }

    /**
     * Izual. (bonus quest)
     */
    if (RushConfig.izual && list.indexOf("izual") >= 0) {
        var izualCoords, izual, izualPreset;
        moveIntoPos = function (unit, range) {
            var i, coordx, coordy,
                coords = [],
                angle = Math.round(Math.atan2(me.y - unit.y, me.x - unit.x) * 180 / Math.PI),
                angles = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 105, -105, 120, -120, 135, -135, 150, -150, 180];

            for (i = 0; i < angles.length; i += 1) {
                coordx = Math.round((Math.cos((angle + angles[i]) * Math.PI / 180)) * range + unit.x);
                coordy = Math.round((Math.sin((angle + angles[i]) * Math.PI / 180)) * range + unit.y);

                try {
                    //noinspection JSBitwiseOperatorUsage
                    if (!(getCollision(unit.area, coordx, coordy) & 0x1)) {
                        coords.push({
                            x: coordx,
                            y: coordy
                        });
                    }
                } catch (e) {

                }
            }
            if (coords.length > 0) {
                coords.sort(Sort.units);
                return Pather.moveToUnit(coords[0]);
            }
            return false;
        };

        Commands.beforeStart(4);
        D2Bot.printToConsole("Starting: " + diff + " Izual (bonus quest).", 6);
        Commands.callPrecast(106, 103, false);

        // EXECUTE
        for (i = 0; i < 3; i++) {
            if (!Pather.journeyTo(105)) {
                if (i === 2) {
                    throw new Error(Profiles.Rusher + " - Failed move to Plains Of Despair.");
                }
                Packet.flash(me.gid);
                delay(500);
            }
        }

        izualPreset = getPresetUnit(105, 1, 256);
        izualCoords = {
            area: 105,
            x: izualPreset.roomx * 5 + izualPreset.x,
            y: izualPreset.roomy * 5 + izualPreset.y
        };
        if (!moveIntoPos(izualCoords, 50)) {
            throw new Error(Profiles.Rusher + " - Failed move to Izual.");
        }

        for (i = 0; i < 3; i += 1) {
            izual = getUnit(1, 256);
            if (izual) {
                break;
            }
            delay(500);
        }

        if (izual) {
            moveIntoPos(izual, 60);
        } else {
            throw new Error(Profiles.Rusher + " - Izual unit not found.");
        }

        returnSpot = {
            x: me.x,
            y: me.y
        };

        Pather.makePortal(false); // portal for rushee.
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to Plains Of Despair.");
        }

        Pather.moveToUnit(izualCoords); // move to izual and make portal for helper.
        Pather.makePortal(false);

        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        JustDoIt(Profiles.Helper, "Attack.kill(256)", 0);
        Commands.getBoss(256); // Izual
        JustDoIt(Profiles.Helper, "Pather.usePortal(103,'"+me.name+"')", 20);

        Pather.moveToUnit(returnSpot);
        Pather.makePortal(true);
        JustDoIt(Profiles.Rushee[0], "Commands.leaveArea(103,'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go back to Town.");
        }
        for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
            JustDoIt(Profiles.Rushee[i], "Commands.townieTalk('tyrael', 4)", 40);
            if (Execution.status === "failed" || Execution.result === false) {
                throw new Error(Execution.profile + " failed talk to Tyrael.");
            }
        }
    }

    /**
     * Diablo.
     */
    if (list.indexOf("diablo") >= 0) {
        Commands.beforeStart(4);
        D2Bot.printToConsole("Starting: " + diff + " Diablo.", 7);
        Commands.callPrecast(107, 103, true);

        var currentLayout;
        Pather.moveTo(7790, 5544);

        /*
        Go to position.
        Make TP for helper.
        Open last Seal.
        Go back to spot.
        Kill.
         */

        // Grand Vizier of Chaos
        currentLayout = Commands.getLayout(396, 5275);
        if (currentLayout === 1) {
            Pather.moveTo(7681, 5293);              // "Y" LAYOUT
        } else {
            Pather.moveTo(7692, 5316);              // "L" LAYOUT
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Commands.getBoss(getLocaleString(2851))", 0);
        if (!Commands.openSeal(395)) {
            throw new Error(Profiles.Rusher + " - Failed to open Seal: 395");
        }
        if (!Commands.openSeal(396)) {
            throw new Error(Profiles.Rusher + " - Failed to open Seal: 396");
        }

        if (currentLayout === 1) {
            Pather.moveTo(7681, 5293);              // "Y" LAYOUT
        } else {
            Pather.moveTo(7692, 5316);              // "L" LAYOUT
        }

        if (!Commands.getBoss(getLocaleString(2851))) {
            throw new Error(Profiles.Rusher + " - Failed to kill Grand Vizier of Chaos");
        }
        delay((me.ping*2||0) + 100);
        JustDoIt(Profiles.Helper, "Pather.usePortal(103,'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " go back to Town.");
        }

        // Lord De Seis
        currentLayout = Commands.getLayout(394, 7773);
        if (currentLayout === 1) {
            Pather.moveTo(7778, 5224);              // "Z" LAYOUT
        } else {
            Pather.moveTo(7780, 5185);              // "S" LAYOUT
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Commands.getBoss(getLocaleString(2852))", 0);
        if (!Commands.openSeal(394)) {
            throw new Error(Profiles.Rusher + " - Failed to open Seal: 394");
        }

        if (currentLayout === 1) {
            Pather.moveTo(7778, 5224);              // "Z" LAYOUT
        } else {
            Pather.moveTo(7780, 5185);              // "S" LAYOUT
        }

        if (!Commands.getBoss(getLocaleString(2852))) {
            throw new Error(Profiles.Rusher + " - Failed to kill Lord De Seis");
        }
        delay((me.ping*2||0) + 100);
        JustDoIt(Profiles.Helper, "Pather.usePortal(103,'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " go back to Town.");
        }

        // Infector of Souls
        currentLayout = Commands.getLayout(392, 7893);
        if (currentLayout === 1) {
            Pather.moveTo(7922, 5292);              // "X" LAYOUT
        } else {
            Pather.moveTo(7927, 5280);              // "J" LAYOUT
        }
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Commands.getBoss(getLocaleString(2853))", 0);
        if (!Commands.openSeal(392)) {
            throw new Error(Profiles.Rusher + " - Failed to open Seal: 392");
        }
        if (!Commands.openSeal(393)) {
            throw new Error(Profiles.Rusher + " - Failed to open Seal: 393");
        }

        if (currentLayout === 1) {
            Pather.moveTo(7922, 5292);              // "X" LAYOUT
        } else {
            Pather.moveTo(7927, 5280);              // "J" LAYOUT
        }

        if (!Commands.getBoss(getLocaleString(2853))) {
            throw new Error(Profiles.Rusher + " - Failed to kill Infector of Souls.");
        }
        delay((me.ping*2||0) + 100);
        JustDoIt(Profiles.Helper, "Pather.usePortal(103,'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " go back to Town.");
        }

        // Diablo
        Pather.moveTo(7763, 5267);
        Pather.makePortal(false);
        JustDoIt(Profiles.Rushee[0], "Pather.usePortal("+me.area+",'"+me.name+"')", 20);
        if (Execution.result === false) {
            throw new Error(Execution.profile + " failed go to Chaos Sanctuary.");
        }
        Pather.moveTo(7792, 5292);
        Pather.makePortal(false);
        JustDoIt(Profiles.Helper, "Pather.usePortal("+me.area+",'"+me.name+"')", 10);
        JustDoIt(Profiles.Helper, "Commands.getBoss(243)", 0);
        if (!Commands.getBoss(243)) {
            throw new Error(Profiles.Rusher + " - Failed to kill Diablo.");
        }
    }
    
    D2Bot.printToConsole(diff + " Classic Rush - Done.", 5);

    // quit game one by one.
    JustDoIt(Profiles.BoBarb, "scriptBroadcast('quit')", 0, 6); // BoBarb exit.
    delay(1000);
    JustDoIt(Profiles.Helper, "scriptBroadcast('quit')", 0, 6); // Helper exit.
    delay(1000);
    if(me.act === 4) {
        if(me.diff < 2) {
            for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
                JustDoIt(Profiles.Rushee[i], "D2Bot.restart(true)", 0, 6); // restart all rushees
            }
        } else {
            for (i = Profiles.Rushee.length - 1; i >= 0; i--) {
                JustDoIt(Profiles.Rushee[i], "D2Bot.stop(true)", 0, 6); // restart all rushees
            }
        }
    } else {
        JustDoIt(Profiles.Rushee[0], "scriptBroadcast('quit')", 0, 6); // Quests not finished. Force him to quit.
    }

    return true;
};

/**
 * Define variable for all extra functions used in script.
 */
var Commands = {};

/**
 * Executed at beginning of every script. Move chars to defined town, send them to healer, buy potions and finally move to portal spot.
 * @param town
 */
Commands.beforeStart = function(town) {
    // all chars go to defined town.
    JustDoIt(Profiles.Rushee[0], "Town.goToTown("+town+", true)", 40, 6);
    JustDoIt(Profiles.BoBarb, "Town.goToTown("+town+", true)", 40, 6);
    JustDoIt(Profiles.Helper, "Town.goToTown("+town+", true)", 40, 6);

    JustDoIt(Profiles.Rushee[0], "Town.heal()", 0, 6);
    JustDoIt(Profiles.BoBarb, "Town.heal()", 40, 6);
    JustDoIt(Profiles.Helper, "Town.heal()", 40, 6);
    JustDoIt(Profiles.BoBarb, "Town.repair()", 50, 6);
    JustDoIt(Profiles.Helper, "Town.repair()", 50, 6);
    JustDoIt(Profiles.BoBarb, "Town.buyPotions()", 40, 6);
    JustDoIt(Profiles.Helper, "Town.buyPotions()", 40, 6);

    JustDoIt(Profiles.Rushee[0], "Town.move('portalspot')", 0, 6);
    JustDoIt(Profiles.BoBarb, "Town.move('portalspot')", 20, 6);
    JustDoIt(Profiles.Helper, "Town.move('portalspot')", 20, 6);

    Town.goToTown(town, true);
    Town.doChores();
};

/**
 * Request BO on defined area if we don't have it yet or it expired.
 * @param area
 * @param town
 * @param force force BO precast
 */
Commands.callPrecast = function(area, town, force) {
    // BO + PRECAST
    Pather.useWaypoint(area, true);
    if (me.getState(32) === false || force) {
        Pather.makePortal(false);
        Pather.moveTo(me.x + 6, me.y + 6);
        if(Profiles.BoBarb !== Profiles.Helper) {
            JustDoIt(Profiles.Helper, "Pather.usePortal("+area+",'"+me.name+"')", 20, 6);
            JustDoIt(Profiles.Helper, "Pather.moveTo(" + me.x + " + 3, " + me.y + " + 3)", 20, 6);
        }
        JustDoIt(Profiles.BoBarb, "Pather.usePortal("+area+",'"+me.name+"')", 20, 6);
        JustDoIt(Profiles.Helper, "Pather.moveTo(" + me.x + " + 3, " + me.y + " + 6)", 20, 6);
        JustDoIt(Profiles.BoBarb, "Precast.doPrecast(true)", 10, 6);
        JustDoIt(Profiles.BoBarb, "Pather.usePortal("+town+",'"+me.name+"')", 20, 6);
        if(Profiles.BoBarb !== Profiles.Helper) {
            JustDoIt(Profiles.Helper, "Precast.doPrecast(true)", 10, 6);
            JustDoIt(Profiles.Helper, "Pather.usePortal("+town+",'"+me.name+"')", 20, 6);
        }
    }
    Precast.doPrecast(true);
};

/**
 * Send Rushee back to defined area (town area). Revive if dead and move to portalspot.
 * @param area - Area where sent rushee.
 * @param name - Name of portal owner to use.
 */
Commands.leaveArea = function (area, name) {
    while(!me.inTown) {
        while (me.mode === 0) {
            delay(100);
        }
        if (me.mode === 17) {
            me.revive();
            while (!me.inTown) {
                delay(100);
            }
            Town.move("portalspot");
            return true;
        }
        Pather.usePortal(area, name);
    }
    return true;
};

/**
 * Use travel menu to change acts. Usage for Warriv -> A2 and Meshif -> A3.
 * @param name - Name of npc to talk. Also portal spot name.
 * @param act - Act of NPC to use.
 * @param menu - Menu ID to use.
 * @returns {boolean}
 */
Commands.townieTravel = function (name, act, menu){
    // 0x0D36 - warriv
    // 0x0D38 - meshif
    if (me.act >= act) {
        return true;
    }
    Town.move(name);
    var npc = getUnit(1, name);
    if (!npc || !npc.openMenu()) {
        return false;
    }
    Misc.useMenu(menu);
    return true;
};

/**
 * Used to talk with NPC. In most cases to send quest messages and complete quests.
 * @param who - NPC name.
 * @param act - NPC act.
 * @param where - optional Town spot. If not defined where = who
 * @returns {boolean}
 */
Commands.townieTalk = function (who, act, where) {
    if (me.act !== act) {
        return false;
    }
    if (where === undefined) {
        where = who;
    }
    var npc = getUnit(1, who);
    if (!npc) {
        Town.move(where);
    }
    npc = getUnit(1, who);
    if (!npc || !npc.openMenu()) {
        return false;
    }
    me.cancel();
    Town.move("portalspot");
    return true;
};

/**
 * Used to open chest and get item.
 * @param classid - item classId to pick.
 * @param chestid - chest classId to open.
 * @returns {boolean}
 */
Commands.getQuestItem = function (classid, chestid) {
    var chest, item, tick = getTickCount();
    if (me.getItem(classid)) {
        return true;
    }
    if (me.inTown) {
        return false;
    }
    chest = getUnit(2, chestid);
    if (!chest) {
        return false;
    }
    Misc.openChest(chest);
    item = getUnit(4, classid);
    if (!item) {
        if (getTickCount() - tick < 500) {
            delay(500);
        }
        return false;
    }
    return Pickit.pickItem(item);
};

/**
 * Cube staff if we have all ingredients.
 * @returns {boolean}
 */
Commands.cubeStaff = function () {
    if (me.act > 2) {
        return true;
    }
    var staff = me.getItem("vip"),
        amulet = me.getItem("msf");
    if (!staff || !amulet) {
        return !!me.getItem(91);
    }
    Cubing.openCube();
    Storage.Cube.MoveTo(amulet);
    Storage.Cube.MoveTo(staff);
    transmute();
    delay((me.ping*2||0) + 500);
    Cubing.emptyCube();
    me.cancel();
    return !!me.getItem(91);
};

/**
 * Place cubed staff in orifice.
 * @returns {boolean}
 */
Commands.placeStaff = function() {
    var staff, item,
        tick = getTickCount(),
        orifice = getUnit(2, 152);
    if (!orifice) {
        return false;
    }
    Misc.openChest(orifice);
    staff = me.getItem(91);
    if (!staff) {
        if (getTickCount() - tick < 500) {
            delay(500);
        }
        return false;
    }
    staff.toCursor();
    submitItem();
    delay((me.ping*2||0) + 750);
    item = me.findItem(-1, 0, 3);
    if (item && item.toCursor()) {
        Storage.Inventory.MoveTo(item);
    }
    return true;
};

/**
 * Used to talk to Tyrael after killing Duriel.
 * @returns {boolean}
 */
Commands.tyraelTalk = function () {
    var i, npc = getUnit(1, "tyrael");
    if (!npc) {
        return false;
    }
    for (i = 0; i < 3; i += 1) {
        if (getDistance(me, npc) > 3) {
            Pather.moveToUnit(npc);
        }
        npc.interact();
        delay((me.ping*2||0) + 1000);
        me.cancel();
        if (Pather.getPortal(null)) {
            me.cancel();
            break;
        }
    }
    return !!Pather.getPortal(null);
};

/**
 * Part of diablo script - determine seals layout.
 * @param seal - seal classid.
 * @param value - one of the coords.
 * @returns {number}
 */
Commands.getLayout = function (seal, value) {
    var sealPreset = getPresetUnit(108, 2, seal);
    if (!seal) {
        throw new Error("Seal preset not found. Can't continue.");
    }
    if (sealPreset.roomy * 5 + sealPreset.y === value || sealPreset.roomx * 5 + sealPreset.x === value) {
        return 1;
    }
    return 2;
};

/**
 * Part of diablo script - Open seals in Chaos Sanctuary.
 * @param id - seal classid
 * @returns {boolean} opened seal.
 */
Commands.openSeal = function (id) {
    Pather.moveToPreset(108, 2, id, 4);
    var i, tick, seal = getUnit(2, id);

    if (seal) {
        for (i = 0; i < 3; i += 1) {
            seal.interact();
            tick = getTickCount();
            while (getTickCount() - tick < 500) {
                if (seal.mode) {
                    return true;
                }
                delay(10);
            }
        }
    }
    return false;
};

/**
 * Part of diablo script - Precast skill on coords, kill boss once he spawn. Rush sorc cast static if monster is cold immune.
 * @param name - localeString or classid
 * @returns {boolean}
 */
Commands.getBoss = function (name) {
    var i, boss, staticRange;

    for (i = 0; i < (name === getLocaleString(2853) ? 28 : 24); i += 1) {
        boss = getUnit(1, name);
        staticRange = Math.floor((me.getSkill(42, 1) + 4) * 2 / 3);

        if (boss) {
            if (me.classid === 1 && boss.getStat(43) > 99) { // cold immune handling
                while (boss.hp > 0) {
                    if (getDistance(me, boss) > staticRange || checkCollision(me, boss, 0x4)) {
                        if (!Attack.getIntoPosition(boss, staticRange, 0x4)) {
                            Skill.cast(Config.AttackSkill[3], 0, me.x+rand(-2,2), me.y+rand(-2,2));
                        }
                    }
                    Skill.cast(42, 0); // static
                }
                return true;
            }
            return Attack.kill(name);
        } else {
            Skill.cast(Config.AttackSkill[3], 0, me.x+rand(-2,2), me.y+rand(-2,2));
        }
        delay(250);
    }
    return false;
};

/**
 * Free Lam Essen's quest.
 * @returns {boolean}
 */
Commands.lamEsenTome = function() {
    var npc;
    Town.goToTown(3, true);
    npc = getUnit(1, "alkor");
    if (!npc) {
        Town.move("alkor");
        npc = getUnit(1, "alkor");
    }
    if (!npc) {
        return false;
    }
    //this.displayQuest(17, "Before Completing Lam Esen's Tome.");
    sendPacket(1, 0x31, 4, npc.gid, 4, 0x0234);
    //this.displayQuest(17, "After Completing Lam Esen's Tome.");
    return true;
};

/**
 * Grab book from radament and use it.
 * Quest:9 0=0, 1=1, 2=0, 3=0, 4=1, 5=1, 6=0, 7=0, 8=0, 9=0, 10=0, 11=0, 12=0, 13=1, 14=0, 15=0, Before picking book.
 * Quest:9 0=0, 1=1, 2=0, 3=0, 4=1, 5=1, 6=0, 7=0, 8=0, 9=0, 10=0, 11=0, 12=0, 13=1, 14=0, 15=0, Before using book.
 * Quest:9 0=0, 1=1, 2=0, 3=0, 4=1, 5=0, 6=0, 7=0, 8=0, 9=0, 10=0, 11=0, 12=0, 13=1, 14=0, 15=0, After using book.
 * Quest:9 0=1, 1=0, 2=0, 3=0, 4=1, 5=0, 6=0, 7=0, 8=0, 9=0, 10=0, 11=0, 12=0, 13=1, 14=0, 15=0, After talking to atma.
 * @returns {boolean}
 */
Commands.getBook = function() {
    var target;
    while (true) {
        target = getUnit(4, 552);
        if (!target) {
            return false;
        }
        Pickit.pickItem(target);
        delay(250);
        if (me.getItem(552)) {
            //this.displayQuest(9, "Before using book.");
            clickItem(1, me.getItem(552));
            delay(1000);
            //this.displayQuest(9, "After using book.");
            return true;
        }
    }
};

/**
 * Check requested quest states.
 * @param id - Quest id.
 * @param state - Quest state (0-15)
 * @returns {boolean}
 */
Commands.checkQuest = function (id, state) {
    sendPacket(1, 0x40);
    delay((me.ping*2||0) + 1000);
    return !!me.getQuest(id, state);
};

/**
 * Print all quest states for requested quest number to D2Bot console.
 * @param q - quest id
 * @param msg - additional message for better tracking.
 */
Commands.displayQuest = function (q, msg) {
    if (Config.debug === true) {
        sendPacket(1, 0x40);
        delay((me.ping*2||0) + 1000);
        var i, str = "Quest:" + q + " ";
        for (i = 0; i < 16; i++) {
            str = str + " " + i + "=" + me.getQuest(q, i) + ", ";
        }
        str = str + msg;
        return D2Bot.printToConsole(str, 10);
    }
    return true;
};

/**
 * Clear travincal
 * TODO: improve it - check spectype of monster, make sure it finished executing clearing code (rewrite it to custom attack)
 */
Commands.clearTravi = function () {
    var member;
    var monsterList = [];
    var mem1 = getUnit(1, getLocaleString(2863));
    var mem2 = getUnit(1, getLocaleString(2860));
    var mem3 = getUnit(1, getLocaleString(2862));
    if (mem1) monsterList.push(mem1);
    if (mem2) monsterList.push(mem2);
    if (mem3) monsterList.push(mem3);
    D2Bot.printToConsole("Travincal members count: " + monsterList.length);

    var sortThem = function(a, b) {
        var aa = getDistance(me, a);
        var bb = getDistance(me, b);
        return aa - bb;
    };
    while (monsterList.length > 0) {
        monsterList.sort(sortThem);
        member = monsterList.shift();
        D2Bot.printToConsole("Trying to kill: " + member.name);
        Pather.moveToUnit(member);
        Commands.getBoss(member.name);
    }
    //Attack.clearList(monsterList);
};

/**
 * Calculate best possible position to attack with hammers.
 * Target to fastest time from cast to hit.
 * @param unit Attacking unit
 * @returns {boolean}
 */
ClassAttack.getHammerPosition = function(unit) {
    var i, x, y, check,
        baseId = getBaseStat("monstats", unit.classid, "baseid"),
        size = getBaseStat("monstats2", baseId, "sizex");
    var HammerTrajectory = [
        [ -1,   0], [  0,   1], [ -1,   1], [ -2,   1], [ -2,   0], [ -2,  -1], [ -2,  -2], [ -2,  -3], [ -1,  -3], [  0,  -4],
        [  1,  -4], [  2,  -3], [  3,  -3], [  4,  -2], [  4,  -1], [  5,   0], [  5,   1], [  5,   2], [  4,   3], [  4,   4],
        [  3,   5], [  2,   5], [  1,   6], [  0,   6], [ -1,   6], [ -2,   6], [ -3,   5], [ -4,   5], [ -5,   5], [ -5,   4]
        //[ -6,   3], [ -7,   2], [ -7,   1], [ -7,   0], [ -7,  -1], [ -7,  -2], [ -7,  -3], [ -6,  -4], [ -5,  -5], [ -4,  -6],
        //[ -3,  -7], [ -2,  -8], [  0,  -8], [  2,  -8], [  3,  -8], [  4,  -7], [  5,  -7], [  6,  -6], [  7,  -5], [  8,  -4],
        //[  8,  -3], [  9,  -2], [  9,   0], [  9,   2], [  9,   4], [  8,   5], [  7,   7], [  6,   8], [  4,   9], [  2,  10],
        //[  0,  11], [ -2,  10], [ -4,  10], [ -6,   9], [ -8,   8], [ -9,   6], [-10,   5], [-11,   4], [-11,   2], [-12,   0],
        //[-12,  -2], [-11,  -4], [-11,  -5], [-10,  -7], [ -9,  -9], [ -7, -10], [ -6, -11], [ -5, -12], [ -3, -12], [ -2, -12],
        //[  0, -13], [  2, -13]
    ];
    // in case base stat returns something outrageous
    if (typeof size !== "number" || size < 1 || size > 3) {
        size = 3;
    }
    switch (unit.type) {
        case 0: // Player
            x = unit.x;
            y = unit.y;
            HammerTrajectory.slice(0, 3);
            break;
        case 1: // Monster
            x = (unit.mode === 2 || unit.mode === 15) && getDistance(me, unit) < 10 && getDistance(me, unit.targetx, unit.targety) > 5 ? unit.targetx : unit.x;
            y = (unit.mode === 2 || unit.mode === 15) && getDistance(me, unit) < 10 && getDistance(me, unit.targetx, unit.targety) > 5 ? unit.targety : unit.y;
            // improve vs unit size
            HammerTrajectory.slice(0, (size - 1) * 3); // 1: 0*3=0, 2: 1*3=3, 3: 2*3=6
            break;
    }
    for (i = 0; i < HammerTrajectory.length; i += 1) {
        if (getDistance(me, x - HammerTrajectory[i][0], y - HammerTrajectory[i][1]) < 1) {
            return true;
        }
    }
    for (i = 0; i < HammerTrajectory.length; i += 1) {
        check = {
            x: x - HammerTrajectory[i][0],
            y: y - HammerTrajectory[i][1]
        };
        if (Attack.validSpot(check.x, check.y) && !CollMap.checkColl(unit, check, 0x4, 0)) {
            if (ClassAttack.reposition(x - HammerTrajectory[i][0], y - HammerTrajectory[i][1])) {
                return true;
            }
        }
    }
    return false;
};