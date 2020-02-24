function AutoRusher() {
	include("AutoRush.js");
////////
	var i, j, lastSequence, rushees,
		sequence = ["andariel", "cube", "amulet", "staff", "summoner", "duriel", "travincal", "mephisto", "diablo"],
		helper = AutoRush.Helper.charName;

////////
	this.playerIn = function (area) {
		if (!area) {
			area = me.area;
		}

		var party = getParty();

		if (party) {
			do {
				if (party.name !== me.name && party.name !== helper && party.area === area) {
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
				if (party.name !== me.name && party.name !== helper && party.area < area) {
					return false;
				}
			} while (party.getNext());
		}

		return true;
	};

	this.doAtma = function () {
		var atma = getUnit(1, NPC.Atma);

		if (atma) {
			atma.openMenu();
			me.cancel();
		}
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

	// Move through different positions until monster unit is in range
	// Prevents 'cannot complete quest' situations
	this.getPosition = function (coordList, monIds) {
		if (typeof monIds === "number") {
			monIds = [monIds];
		}

		var i, j;

		for (i = 0; i < coordList.length; i += 2) {
			Pather.moveTo(coordList[i], coordList[i + 1]);

			for (j = 0; j < monIds.length; j += 1) {
				if (!getUnit(1, monIds[j])) {
					break;
				}
			}

			if (j === monIds.length) {
				return true;
			}
		}

		return false;
	};

	this.andariel = function () {
		Town.doChores();
		Pather.useWaypoint(35);
		Precast.doPrecast(true);

		if (!Pather.moveToExit([36, 37], true)) {
			throw new Error("andy failed");
		}

		this.getPosition([22592, 9598, 22583, 9578, 22569, 9577], 156);
		Pather.makePortal();

		var myPos = {x: me.x, y: me.y},
			dodge = false;

		if (Config.Dodge) {
			dodge = Config.Dodge;
			Config.Dodge = false;
		}

		Attack.securePosition(me.x, me.y, 25, 3000);

		Config.Dodge = dodge;

		say("1");

		while (!this.playerIn()) {
			Pather.moveToUnit(myPos);
			delay(250);
		}

		Attack.kill(156);
		say("andy dead");
		Pickit.pickItems();
		Pather.moveTo(22587, 9577);
		Pather.usePortal(null, me.name);
		say("a2");
		Pather.useWaypoint(40);

		while (!this.playersInAct(2)) {
			delay(500);
		}

		return true;
	};

	this.cube = function () {
		if (me.diff === 0) {
			Pather.useWaypoint(57);
			Precast.doPrecast(true);

			if (!Pather.moveToExit(60, true) || !Pather.moveToPreset(me.area, 2, 354)) {
				throw new Error("cube failed");
			}

			Pather.makePortal();
			Attack.securePosition(me.x, me.y, 25, 3000);
			say("1");

			while (!this.playerIn()) {
				delay(250);
			}

			while (this.playerIn()) {
				delay(250);
			}

			Pather.usePortal(null, me.name);
			this.doAtma();
		}

		return true;
	};

	this.amulet = function () {
		Town.doChores();
		Pather.useWaypoint(44);
		Precast.doPrecast(true);

		if (!Pather.moveToExit([45, 58, 61], true)) {
			throw new Error("amulet failed");
		}

		Pather.moveTo(15042, 14067);
		Pather.makePortal();
		Attack.clear(50);
		//Attack.securePosition(me.x, me.y, 25, 3000);
		Pather.moveTo(15044, 14045);
		Pather.makePortal();
		say("1");

		while (!this.playerIn()) {
			delay(250);
		}

		while (this.playerIn()) {
			delay(100);
		}

		Pather.usePortal(null, me.name);
		this.doAtma();

		return true;
	};

	this.staff = function () {
		Town.doChores();
		Pather.useWaypoint(43);
		Precast.doPrecast(true);

		if (!Pather.moveToExit([62, 63, 64], true) || !Pather.moveToPreset(me.area, 2, 356)) {
			throw new Error("staff failed");
		}

		Pather.makePortal();
		Attack.securePosition(me.x, me.y, 25, 3000);
		Pather.moveToPreset(me.area, 2, 356);
		say("1");

		while (!this.playerIn()) {
			delay(100);
		}

		while (this.playerIn()) {
			//Attack.clear(30);
			delay(100);
		}

		Pather.usePortal(null, me.name);
		this.doAtma();

		return true;
	};

	this.summoner = function () {
		Town.doChores();
		Pather.useWaypoint(74);
		Precast.doPrecast(true);

		var preset = getPresetUnit(me.area, 2, 357),
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
			throw new Error("summoner failed");
		}

		Pather.makePortal();

		if (me.diff < 2) {
			Attack.securePosition(me.x, me.y, 25, 3000);
		} else {
			Attack.clear(25);
		}

		say("1");

		while (!this.playerIn()) {
			Pather.moveToUnit(spot);
			Attack.clear(20);
			delay(250);
		}

		Attack.kill(250);
		say("summoner dead");
		Pickit.pickItems();
		Pather.moveToUnit(spot);

		if (!Pather.usePortal(null, me.name)) {
			Town.goToTown();
		}

		while (this.playerIn(74)) {
			delay(250);
		}

		return true;
	};

	this.duriel = function () {
		this.killDuriel = function () {
			var i, target;

			for (i = 0; i < 3; i += 1) {
				target = getUnit(1, 211);

				if (target) {
					break;
				}

				delay(500);
			}

			if (!target) {
				throw new Error("Duriel not found.");
			}

			for (i = 0; i < 300; i += 1) {
				if (!me.getState(121)) {
					Skill.cast(Config.AttackSkill[1], ClassAttack.skillHand[1], target);
				} else {
					if (Config.AttackSkill[2] > -1) {
						Skill.cast(Config.AttackSkill[2], ClassAttack.skillHand[2], target);
					} else {
						delay(300);
					}
				}

				if (target.mode === 0 || target.mode === 12) {
					return true;
				}

				if (getDistance(me, target) <= 10) {
					Pather.moveTo(22638, me.y < target.y ? 15722 : 15693);
				}
			}

			return target.mode === 0 || target.mode === 12;
		};

		if (me.inTown) {
			Town.doChores();
			Pather.useWaypoint(46);
		}

		Precast.doPrecast(true);

		if (!Pather.moveToExit(getRoom().correcttomb, true) || !Pather.moveToPreset(me.area, 2, 152)) {
			throw new Error("duriel failed");
		}

		Pather.makePortal();
		Attack.securePosition(me.x, me.y, 25, 3000);
		say("1");

		while (!getUnit(2, 100)) {
			delay(1000);
		}

		Pather.useUnit(2, 100, 73);
		Pather.makePortal();
		this.killDuriel();
		Pickit.pickItems();
		delay(2500);

		Pather.teleport = false;

		Pather.moveTo(22577, 15645);

		Pather.teleport = true;

		Pather.moveTo(22577, 15609);
		Pather.makePortal();
		say("1");

		while (!this.playerIn()) {
			delay(250);
		}

		Pather.usePortal(null, me.name);

		/*Pather.useWaypoint(52);
		Pather.moveToExit([51, 50], true);
		Pather.moveTo(10012, 5047);
		Town.goToTown();*/

		say("a3");
		Town.move("waypoint");
		Town.goToTown(3);
		Town.doChores();

		while (!this.playersInAct(3)) {
			delay(500);
		}

		return true;
	};

	this.travincal = function () {
		Town.doChores();

		while (!this.playersInAct(3)) {
			delay(500);
		}

		Pather.useWaypoint(83);

		var myPos,
			coords = {x: me.x, y: me.y},
			positions = [coords.x + 32, coords.y - 78,
						coords.x - 72, coords.y + 31,
						coords.x + 81, coords.y - 135];

		Pather.useWaypoint(101);
		Precast.doPrecast(true);
		Pather.moveToExit([100, 83], false);
		Pather.makePortal();

		while (!getUnit(0, helper)) {
			delay(1000);
		}

		Pather.moveToExit(83, true);

		if (me.diff < 2) {
			this.getPosition(positions, [getLocaleString(2863), getLocaleString(2862), getLocaleString(2860)]);
			Attack.securePosition(me.x, me.y, 25, 3000);
		}

		Pather.makePortal();

		myPos = {x: me.x, y: me.y};

		say("1");

		if (me.diff < 2) {
			while (!this.playerIn()) {
				Pather.moveToUnit(myPos);
				delay(250);
			}
		}

		Pather.moveTo(coords.x + 97, coords.y - 68);

		if (me.diff === 2) {
			Attack.clearList(this.buildList(0));
		} else {
			try {
				Attack.kill(getLocaleString(2863));
				Attack.kill(getLocaleString(2862));
				Attack.kill(getLocaleString(2860));
			} catch (e) {

			} finally {
				say("trav dead");
			}
		}

		Pather.moveToUnit(myPos);
		Pather.usePortal(null, me.name);

		while (!getUnit(0, helper)) {
			delay(1000);
		}

		return true;
	};

	this.mephisto = function () {
		Town.doChores();
		Pather.useWaypoint(101);
		Precast.doPrecast(true);
		Pather.moveToExit(102, true);
		Pather.moveTo(17591, 8070);

		var monsta, dodge,
			monList = [];

		monsta = getUnit(1);

		if (monsta) {
			do {
				if (Attack.checkMonster(monsta) && getDistance(monsta, 17627, 8070) <= 30) {
					monList.push(copyUnit(monsta));
				}
			} while (monsta.getNext());
		}

		if (monList.length && me.diff < 2) {
			Pather.moveTo(17627, 8070);
			Pather.makePortal();
			Attack.clearList(monList);
		}

		Pather.moveTo(17591, 8070);

		if (me.diff < 2) {
			monsta = getUnit(1, "hydra");

			if (monsta) {
				do {
					while (monsta.mode !== 0 && monsta.mode !== 12 && monsta.hp > 0) {
						delay(500);
					}
				} while (monsta.getNext());
			}
		}

		Pather.moveTo(17591, 8070);
		Pather.makePortal();
		say("1");

		while (!this.playerIn()) {
			Pather.moveTo(17591, 8070);
			delay(250);
		}

		if (Config.Dodge) {
			dodge = Config.Dodge;
			Config.Dodge = false;
		}

		Attack.kill(242);

		Config.Dodge = dodge;

		Pickit.pickItems();
		say("a4");
		Pather.moveTo(17591, 8070);
		delay(2000);
		Pather.usePortal(null);

		while (!this.playersInAct(4)) {
			delay(500);
		}

		return true;
	};

	this.diablo = function () {
		this.getLayout = function (seal, value) {
			var sealPreset = getPresetUnit(108, 2, seal);

			if (!seal) {
				throw new Error("Seal preset not found. Can't continue.");
			}

			if (sealPreset.roomy * 5 + sealPreset.y === value || sealPreset.roomx * 5 + sealPreset.x === value) {
				return 1;
			}

			return 2;
		};

		this.initLayout = function () {
			this.vizLayout = this.getLayout(396, 5275);
			this.seisLayout = this.getLayout(394, 7773);
			this.infLayout = this.getLayout(392, 7893);
		};

		this.getBoss = function (name) {
			var i, boss,
				glow = getUnit(2, 131);

			for (i = 0; i < (name === getLocaleString(2853) ? 14 : 12); i += 1) {
				boss = getUnit(1, name);

				if (boss) {
					if (name === getLocaleString(2852)) {
						this.chaosPreattack(getLocaleString(2852), 8);
					}

					Attack.kill(name);
					Pickit.pickItems();

					return true;
				}

				delay(250);
			}

			return !!glow;
		};

		this.chaosPreattack = function (name, amount) {
			var i, n, target, positions;

			switch (me.classid) {
			case 0:
				break;
			case 1:
				break;
			case 2:
				break;
			case 3:
				target = getUnit(1, name);

				if (!target) {
					return;
				}

				positions = [[6, 11], [0, 8], [8, -1], [-9, 2], [0, -11], [8, -8]];

				for (i = 0; i < positions.length; i += 1) {
					if (Attack.validSpot(target.x + positions[i][0], target.y + positions[i][1])) { // check if we can move there
						Pather.moveTo(target.x + positions[i][0], target.y + positions[i][1]);
						Skill.setSkill(Config.AttackSkill[2], 0);

						for (n = 0; n < amount; n += 1) {
							Skill.cast(Config.AttackSkill[1], 1);
						}

						break;
					}
				}

				break;
			case 4:
				break;
			case 5:
				break;
			case 6:
				break;
			}
		};

		this.openSeal = function (id) {
			Pather.moveToPreset(108, 2, id, 4);

			var i, tick,
				seal = getUnit(2, id);

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

		//
		while (!this.playersInAct(4)) {
			delay(500);
		}

		Town.doChores();
		Pather.useWaypoint(107);
		Precast.doPrecast(true);
		Pather.moveTo(7790, 5544);
		this.initLayout();

		if (!this.openSeal(395) || !this.openSeal(396)) {
			throw new Error("Failed to open seals");
		}

		if (this.vizLayout === 1) {
			Pather.moveTo(7691, 5292);
		} else {
			Pather.moveTo(7695, 5316);
		}

		Pather.makePortal();

		try {
			this.getBoss(getLocaleString(2851));
		} catch (vizE) {

		}

		if (!this.openSeal(394)) {
			throw new Error("Failed to open seals");
		}

		if (this.seisLayout === 1) {
			Pather.moveTo(7771, 5196);
		} else {
			Pather.moveTo(7798, 5186);
		}

		Pather.makePortal();

		try {
			this.getBoss(getLocaleString(2852));
		} catch (seisE) {

		}

		if (!this.openSeal(392) || !this.openSeal(393)) {
			throw new Error("Failed to open seals");
		}

		if (this.infLayout === 1) {
			delay(1);
		} else {
			Pather.moveTo(7928, 5295); // temp
		}

		Pather.makePortal();

		try {
			this.getBoss(getLocaleString(2853));
		} catch (infE) {

		}

		if (!Pather.moveTo(7763, 5267)) {
			throw new Error("FAIRUUU~~");
		}

		Pather.makePortal();
		say("1");

		while (!this.playerIn()) {
			delay(250);
		}

		while (!getUnit(1, 243)) {
			delay(500);
		}

		Attack.kill(243);
		Pickit.pickItems();

		if (!Pather.usePortal(null, me.name)) {
			Town.goToTown();
		}

		return true;
	};

	// START
	addEventListener("chatmsg", 
		function (who, msg) {
			if (msg === "fail") {
				D2Bot.printToConsole("Quest failed - new game", 9);
				quit();
			}
		});

	rushees = AutoRush.getRushees();

	for (i = 0; i < rushees.length; i += 1) {
		while (!Misc.inMyParty(rushees[i])) {
			delay(500);
		}
	}

	lastSequence = AutoRush.RushInfo.read().lastSequence;

	if (lastSequence) {
		while (sequence[0] !== lastSequence) {
			sequence.shift();
		}
	}

	for (i = 0; i < sequence.length; i += 1) {
		for (j = 0; j < 3; j += 1) {
			try {
				if (this[sequence[i]]()) {
					break;
				}
			} catch (e) {
				Town.goToTown();
				print(e);
			}
		}

		if (j === 3) {
			throw new Error("Rush sequence failed");
		}

		if (AutoRush.Target.length && me.diff === AutoRush.Target[0] && me.act === AutoRush.Target[1]) {
			AutoRush.RushInfo.update("lastSequence", "");
			say("finish");
			delay(2000);
			quit();

			return true;
		}

		AutoRush.RushInfo.update("lastSequence", sequence[i]);
	}

	AutoRush.RushInfo.update("lastSequence", "");
	say("exit");
	delay(2000);

	return true;
}