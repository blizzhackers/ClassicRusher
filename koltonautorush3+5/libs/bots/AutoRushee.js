function AutoRushee() {
	include("AutoRush.js");

	var leader, target, act,
		andyCheck, travCheck, summonerCheck,
		leaderName = AutoRush.Rusher.charName,
		quester = me.profile === AutoRush.getQuester(),
		actions = [];

	this.findLeader = function (name) {
		var party = getParty(name);

		if (party) {
			return party;
		}

		return false;
	};

	// Get leader's act from Party Unit
	this.checkLeaderAct = function (unit) {
		if (unit.area <= 39) {
			return 1;
		}

		if (unit.area >= 40 && unit.area <= 74) {
			return 2;
		}

		if (unit.area >= 75 && unit.area <= 102) {
			return 3;
		}

		if (unit.area >= 103 && unit.area <= 108) {
			return 4;
		}

		return 5;
	};

	this.checkQuest = function (id, state) {
		sendPacket(1, 0x40);
		delay(500);

		return me.getQuest(id, state);
	};

	this.getQuestItem = function (classid, chestid) {
		var chest, item;

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
			return false;
		}

		return Pickit.pickItem(item) && delay(1000);
	};

	this.checkQuestMonster = function (classid) {
		var monster = getUnit(1, classid);

		if (monster) {
			while (monster.mode !== 0 && monster.mode !== 12) {
				delay(500);
			}

			return true;
		}

		return false;
	};

	this.tyraelTalk = function () {
		var i,
			npc = getUnit(1, NPC.Tyrael);

		if (!npc) {
			return false;
		}

		for (i = 0; i < 10; i += 1) {
			if (i % 2 === 0) {
				Pather.moveTo(npc.x, npc.y + 6);
			}

			if (getDistance(me, npc) > 3) {
				Pather.moveToUnit(npc);
			}

			npc.interact();
			delay(1000);
			me.cancel();

			if (Pather.usePortal(null)) {
				return true;
			}
		}

		return false;
	};

	this.cubeStaff = function () {
		var staff = me.getItem("vip"),
			amulet = me.getItem("msf");

		if (!staff || !amulet) {
			return false;
		}

		Storage.Cube.MoveTo(amulet);
		Storage.Cube.MoveTo(staff);
		Cubing.openCube();
		transmute();
		delay(750 + me.ping);
		Cubing.emptyCube();
		me.cancel();

		return true;
	};

	this.placeStaff = function () {
		var staff,
			orifice = getUnit(2, 152);

		if (!orifice) {
			return false;
		}

		Misc.openChest(orifice);

		staff = me.getItem(91);

		if (!staff) {
			return false;
		}

		staff.toCursor();
		submitItem();
		delay(750 + me.ping);

		return true;
	};

	this.changeAct = function (act) {
		var npc,
			preArea = me.area;

		if (me.playertype != 1 && me.mode === 17) {
			me.revive();

			while (!me.inTown) {
				delay(500);
			}
		}

		if (me.act === act) {
			return true;
		}

		try {
			switch (act) {
			case 2:
				if (me.act >= 2) {
					break;
				}

				Town.move(NPC.Warriv);

				npc = getUnit(1, 155);

				if (!npc || !npc.openMenu()) {
					return false;
				}

				Misc.useMenu(0x0D36);

				break;
			case 3:
				if (me.act >= 3) {
					break;
				}

				Town.move("palace");

				npc = getUnit(1, 201);

				if (!npc || !npc.openMenu()) {
					Pather.moveTo(5166, 5206);

					return false;
				}

				me.cancel();
				Town.move(NPC.Meshif);

				npc = getUnit(1, 210);

				if (!npc || !npc.openMenu()) {
					return false;
				}

				Misc.useMenu(0x0D38);

				break;
			case 4:
				if (me.act >= 4) {
					break;
				}

				if (me.inTown) {
					Town.move(NPC.Cain);

					npc = getUnit(1, 245);

					if (!npc || !npc.openMenu()) {
						return false;
					}

					me.cancel();
					Pather.usePortal(102, leaderName);
				}

				delay(1500);

				target = getUnit(2, 342);

				if (target) {
					Pather.moveTo(target.x - 3, target.y - 1);
				}

				Pather.usePortal(null);

				break;
			case 5:
				if (me.act >= 5) {
					break;
				}

				Town.move(NPC.Tyrael);

				npc = getUnit(1, NPC.Tyrael);

				if (!npc || !npc.openMenu()) {
					return false;
				}

				me.cancel();

				try {
					Pather.useUnit(2, 566, 109);
				} catch (a5e) {

				}

				break;
			}

			delay(1000 + me.ping * 2);

			while (!me.area) {
				delay(500);
			}

			if (me.area === preArea) {
				me.cancel();
				Town.move("portalspot");
				say("Act change failed.");

				return false;
			}

			if (AutoRush.Target.length && me.diff === AutoRush.Target[0] && me.act === AutoRush.Target[1]) {
				AutoRush.finishRush();
				D2Bot.restart();

				return true;
			}

			say("Act change done.");
		} catch (e) {
			return false;
		}

		return true;
	};

	// START
	//addEventListener("gameevent", AutoRush.quitEvent);
	addEventListener("chatmsg",
		function (who, msg) {
			switch (msg) {
			case "andy dead":
				andyCheck = true;

				break;
			case "summoner dead":
				summonerCheck = true;

				break;
			case "trav dead":
				travCheck = true;

				break;
			default:
				if (who === leaderName) {
					actions.push(msg);
				}

				break;
			}
		});

	while (!leader) {
		leader = this.findLeader(leaderName);

		delay(500);
	}

	say("Leader found.");
	Town.move("portalspot");

	while (true) {
		try {
			if (actions.length) {
				switch (actions[0]) {
				case "1":
					while (!leader.area) {
						delay(500);
					}

					if (!quester) {
						actions.shift();

						break;
					}

					act = this.checkLeaderAct(leader);

					if (me.act !== act) {
						Town.goToTown(act);
						Town.move("portalspot");
					}

					switch (leader.area) {
					case 37: // Catacombs level 4
						if (!Pather.usePortal(37, leaderName)) {
							break;
						}

						target = Pather.getPortal(null, leaderName);

						if (target) {
							Pather.walkTo(target.x, target.y);
						}

						while (!andyCheck) {
							delay(500);
						}

						if (me.playertype != 1 && me.mode === 17) {
							me.revive();

							while (!me.inTown) {
								delay(500);
							}
						} else {
							Pather.usePortal(1, leaderName);
						}

						if (!this.checkQuest(6, 4)) {
							say("fail");
							quit();
						}

						actions.shift();

						break;
					case 60: // Halls of the Dead level 3
						Pather.usePortal(60, leaderName);
						this.getQuestItem(549, 354);
						Pather.usePortal(40, leaderName);

						actions.shift();

						break;
					case 61: // Claw Viper Temple level 2
						if (!this.getQuestItem(521)) {
							Pather.usePortal(61, leaderName);
							this.getQuestItem(521, 149);
							Pather.usePortal(40, leaderName);
						}

						Town.move(NPC.Drognan);

						target = getUnit(1, NPC.Drognan);

						if (target && target.openMenu()) {
							actions.shift();
							me.cancel();
							say("drognan done");
						}

						Town.move("portalspot");

						break;
					case 64: // Maggot Lair level 3
						Pather.usePortal(64, leaderName);
						this.getQuestItem(92, 356);
						delay(500);
						Pather.usePortal(40, leaderName);
						this.cubeStaff();

						actions.shift();

						break;
					case 74: // Arcane Sanctuary
						Pather.usePortal(74, leaderName);

						while (!summonerCheck) {
							delay(500);
						}

						if (me.playertype != 1 && me.mode === 17) {
							me.revive();

							while (!me.inTown) {
								delay(500);
							}
						} else {
							Pather.usePortal(40, leaderName);
						}

						if (!this.checkQuest(13, 2)) {
							say("fail");
							quit();
						}

						Town.move(NPC.Atma);

						target = getUnit(1, NPC.Atma);

						if (target) {
							target.openMenu();
							me.cancel();
						}

						Town.move("portalspot");
						actions.shift();

						break;
					case 66: // Tal Rasha's Tombs
					case 67:
					case 68:
					case 69:
					case 70:
					case 71:
					case 72:
						Pather.usePortal(null, leaderName);
						this.placeStaff();
						Pather.usePortal(40, leaderName);

						actions.shift();

						break;
					case 73: // Duriel's Lair
						Pather.usePortal(73, leaderName);
						this.tyraelTalk();

						actions.shift();

						break;
					case 83: // Travincal
						if (me.inTown) {
							if (!Pather.usePortal(83, leaderName)) {
								me.cancel();

								break;
							}

							target = Pather.getPortal(null, leaderName);

							if (target) {
								Pather.walkTo(target.x, target.y);
							}
						}

						if (!me.inTown) {
							while (!travCheck) {
								delay(500);
							}

							if (me.playertype != 1 && me.mode === 17) {
								me.revive();

								while (!me.inTown) {
									delay(500);
								}
							} else {
								Pather.usePortal(75, leaderName);
							}
						}

						if (me.inTown) {
							Town.move("cain");

							target = getUnit(1, NPC.Cain);

							if (target) {
								target.openMenu();
								me.cancel();
							}

							Town.move("portalspot");

							if (!this.checkQuest(21, 0)) {
								say("fail");
								quit();
							}

							actions.shift();
						}

						break;
					case 102: // Durance of Hate level 3
						if (me.area === 75) {
							Pather.usePortal(102, leaderName);
						}

						if (me.area === 102) {
							//this.checkQuestMonster(242);
							while (leader.area === me.area) {
								delay(500);
							}

							if (me.playertype != 1 && me.mode === 17) {
								me.revive();

								while (!me.inTown) {
									delay(500);
								}

								Town.move("portalspot");
								Pather.usePortal(102, leaderName);
							}

							actions.shift();
						}

						break;
					case 108: // Chaos Sanctuary
						Pather.usePortal(108, leaderName);

						while (!getUnit(1, 243)) {
							delay(500);
						}

						Pather.moveTo(7763, 5267);
						this.checkQuestMonster(243);

						if (me.gametype === 0) {
							D2Bot.restart();
						} else {
							if (me.playertype != 1 && me.mode === 17) {
								me.revive();

								while (!me.inTown) {
									delay(500);
								}
							}

							Pather.usePortal(103, leaderName);
						}

						actions.shift();

						break;
					}

					break;
				/*case "finish":
					AutoRush.finishRush();
					D2Bot.restart();

					break;*/
				case me.name + " quest":
					say("I am quester.");

					quester = true;

					actions.shift();

					break;
				case "quit":
					quit();

					break;
				case "exit":
					D2Bot.restart();

					break;
				case "a2":
					if (!this.changeAct(2)) {
						break;
					}

					target = getUnit(1, NPC.Jerhyn);

					if (target) {
						target.openMenu();
					}

					me.cancel();

					if (quester) {
						Town.move("portalspot");
					} else {
						Town.move("palace");
					}

					actions.shift();

					break;
				case "a3":
					if (!this.changeAct(3)) {
						break;
					}

					Town.move("portalspot");
					actions.shift();

					break;
				case "a4":
					if (!this.changeAct(4)) {
						break;
					}

					Town.move("portalspot");
					actions.shift();

					break;
				case "a5":
					if (!this.changeAct(5)) {
						break;
					}

					Town.move("portalspot");
					actions.shift();

					break;
				}
			}
		} catch (e) {
			if (me.playertype != 1 && me.mode === 17) {
				me.revive();

				while (!me.inTown) {
					delay(500);
				}
			}
		}

		if (getUIFlag(0x17)) {
			me.cancel();
		}

		delay(500);
	}

	return true;
}