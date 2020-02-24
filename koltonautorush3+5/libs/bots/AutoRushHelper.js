// this is intended for classic
function AutoRushHelper() {
	include("autorush.js");

	var i, leaderRoster, portal, tpGid, preset, pos,
		doneAreas = [],
		presetList = [396, 394, 392, 255],
		leader = AutoRush.Rusher.charName;

	this.findPlayer = function (name) {
		var party = getParty();

		if (party) {
			do {
				if (party.name !== me.name && party.name === name) {
					return party;
				}
			} while (party.getNext());
		}

		return false;
	};

	this.playerIn = function (area) {
		if (!area) {
			area = me.area;
		}

		var party = getParty();

		if (party) {
			do {
				if (party.name !== me.name && party.name !== leader && party.area === area) {
					return true;
				}
			} while (party.getNext());
		}

		return false;
	};

	this.playersInAct = function (act) {
		var area, party,
			areas = [0, 1, 40, 75, 103, 109];

		if (!act) {
			act = me.act;
		}

		area = areas[act];
		party = getParty();

		if (party) {
			do {
				if (party.name !== me.name && party.name !== leader && party.area < area) {
					return false;
				}
			} while (party.getNext());
		}

		return true;
	};

	this.buildList = function (checkColl) {
		var monsterList = [],
			monster = getUnit(1);

		if (monster) {
			do {
				if ([345, 346, 347].indexOf(monster.classid) > -1 && Attack.checkMonster(monster) && (!checkColl || !checkCollision(me, monster, 0x1))) {
					monsterList.push(copyUnit(monster));
				}
			} while (monster.getNext());
		}

		return monsterList;
	};

	// START
	//addEventListener("gameevent", AutoRush.quitEvent);
	Town.goToTown(1);
	Town.doChores(); // might be needed in other places too
	Town.move("portalspot");

	while (!leaderRoster) {
		leaderRoster = this.findPlayer(leader);

		delay(500);
	}

MainLoop:
	while (true) {
MainSwitch:
		switch (leaderRoster.area) {
		case 37: // cata 4
			if (me.area !== 1) {
				Town.goToTown(1);
				Town.move("portalspot");
			}

			if (doneAreas.indexOf(leaderRoster.area) > -1) {
				break;
			}

			if (Pather.usePortal(37, leader)) {
				doneAreas.push(leaderRoster.area);
				Attack.securePosition(me.x, me.y, 25, 3000);

				while (leaderRoster.area === me.area && !this.playerIn()) {
					delay(250);
				}

				Attack.kill(156);

				if (!Pather.usePortal(null, leader)) {
					Town.goToTown(2);
				}

				Town.move("portalspot");
			}

			break;
		case 40:
			if (me.area !== 40) {
				Town.goToTown(2);
				Town.move("portalspot");
			}

			break;
		case 60: // halls of the dead 3
		case 61: // claw viper 2
		case 64: // maggot 3
		case 74: // arcane
		case 66: // orifice!
		case 67:
		case 68:
		case 69:
		case 70:
		case 71:
		case 72:
		case 73: // duriel's lair
			if (me.area !== 40) {
				Town.goToTown(2);
				Town.move("portalspot");
			}

			if (doneAreas.indexOf(leaderRoster.area) > -1) {
				break;
			}

			if (Pather.usePortal(leaderRoster.area, leader)) {
				doneAreas.push(leaderRoster.area);

				pos = {x: me.x, y: me.y};

				Attack.clear(me.area === 61 ? 60 : 25);
				Pather.moveToUnit(pos);
				Precast.doPrecast(true);

				while (leaderRoster.area === me.area && !this.playerIn()) {
					Attack.clear(me.area === 61 ? 60 : 25);
					Pather.moveToUnit(pos);
					delay(200);
				}

				switch (me.area) {
				case 73: // kill duriel
					Attack.kill(211);
					Town.goToTown();
					Town.doChores();
					Town.goToTown(3);

					break MainSwitch;
				}

				while (leaderRoster.area === me.area) {
					Attack.clear(25);
					Pather.moveToUnit(pos);
					delay(200);
				}

				if (!Pather.usePortal(null, leader)) {
					Town.goToTown(me.area === 73 ? 3 : undefined);
				}
			}

			break;
		case 75:
			if (me.area !== 75) {
				Town.goToTown(3);
				Town.move("portalspot");
			}

			break;
		case 100: // durance 1 -> travincal
			if (me.area !== 75) {
				Town.goToTown(3);
				Town.move("portalspot");
			}

			if (doneAreas.indexOf(leaderRoster.area) > -1) {
				break;
			}

			if (Pather.usePortal(leaderRoster.area, leader)) {
				doneAreas.push(leaderRoster.area);

				while (!this.playerIn(83)) {
					delay(100);
				}

				Pather.moveToExit(83, true);

				if (me.diff === 2) {
					Attack.clearList(this.buildList(0));
					say("trav dead");
				} else {
					try {
						Attack.kill(getLocaleString(2863));
						Attack.kill(getLocaleString(2862));
						Attack.kill(getLocaleString(2860));
					} catch (e) {

					}
				}

				while (this.playerIn(83)) {
					delay(100);
				}

				Town.goToTown(3);
			}

			break;
		case 102: // mephisto
			if (me.area !== 75) {
				Town.goToTown(3);
				Town.move("portalspot");
			}

			portal = Pather.getPortal(102, leader);

			if (portal && portal.gid !== tpGid) {
				tpGid = portal.gid;

				Pather.usePortal(102, leader);

				if (me.x > 17601) {
					Attack.clear(30);
				} else {
					while (!this.playerIn()) {
						Attack.clear(20);
						delay(250);
					}

					switch (me.area) {
					case 102: // kill mephisto
						Attack.kill(242);

						break;
					}

					while (this.playerIn()) {
						delay(250);
					}

					if (!Pather.usePortal(null, leader)) {
						Town.goToTown(me.area === 103 ? 4 : undefined);
					}

					while (!this.playersInAct(4)) {
						delay(500);
					}
				}
			}

			break;
		case 103:
			if (me.area !== 103) {
				Town.goToTown(4);
				Town.move("portalspot");
			}

			break;
		case 108: // diablo (gid method)
			if (me.area !== 103) {
				Town.goToTown(4);
				Town.move("portalspot");
			}

			portal = Pather.getPortal(108, leader);

			if (portal && portal.gid !== tpGid) {
				tpGid = portal.gid;

				Pather.usePortal(108, leader);

				for (i = 0; i < presetList.length; i += 1) {
					preset = getPresetUnit(108, 2, presetList[i]);

					if (preset && getDistance(me, preset.roomx * 5 + preset.x, preset.roomy * 5 + preset.y) < 75) {
						break;
					}

					preset = {id: null};
				}

				print(preset.id);

				switch (preset.id) {
				case 396: // vizier
					// might need to be expanded to prevent endless loop
					while (!getUnit(1, getLocaleString(2851))) {
						delay(500);
					}

					try {
						Attack.kill(getLocaleString(2851));
					} catch (vizE) {

					}

					break;
				case 394: // de seis
					// might need to be expanded to prevent endless loop
					while (!getUnit(1, getLocaleString(2852))) {
						delay(500);
					}

					try {
						Attack.kill(getLocaleString(2852));
					} catch (seisE) {

					}

					break;
				case 392: // infector
					// might need to be expanded to prevent endless loop
					while (!getUnit(1, getLocaleString(2853))) {
						delay(500);
					}

					try {
						Attack.kill(getLocaleString(2853));
					} catch (infE) {

					}

					break;
				case 255: // diablo
					// might need to be expanded to prevent endless loop
					while (!getUnit(1, 243)) {
						delay(500);
					}

					while (!this.playerIn()) {
						delay(250);
					}

					if (Attack.kill(243)) {
						while (this.playersInAct(4)) {
							delay(500);
						}
						
						break MainLoop;
					}

					break;
				}
			}

			break;
		}

		if (AutoRush.Target.length && me.diff === AutoRush.Target[0] && me.act === AutoRush.Target[1]) {
			quit();

			return true;
		}

		delay(500);
	}

	return true;
}