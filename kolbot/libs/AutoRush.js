var AutoRush = {
	/*
########################################################
		AutoRush for kolbot

		Classic rush system for act1 normal - act3 hell
	*/

	Rusher: {
		profile: "AutoRusher",
		charName: "kolxii-d"
	},

	Helper: {
		profile: "AutoRushHelper",
		charName: "kolxii-c"
	},

	// Leechers: { "profile 1": [list of character infos], "profile 2": [list of character infos]... }

	Leechers: {
		"AutoRushee": [
			{account: "kol12x-at", password: "", realm: "europe", charName: "kolxiix-at", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		],
		"AutoRushee2": [
			{account: "kol12x-au", password: "", realm: "europe", charName: "kolxiix-au", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		],
		"AutoRushee3": [
			{account: "kol12x-av", password: "", realm: "europe", charName: "kolxiix-av", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		],
		"AutoRushee4": [
			{account: "kol12x-aw", password: "", realm: "europe", charName: "kolxiix-aw", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		],
		"AutoRushee5": [
			{account: "kol12x-ax", password: "", realm: "europe", charName: "kolxiix-ax", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		],
		"AutoRushee6": [
			{account: "kol12x-ay", password: "", realm: "europe", charName: "kolxiix-ay", charClass: "paladin", ladder: true, expansion: false, hardcore: false}
		]
	},

	Target: [2, 4], // Format - difficulty (0, 1, 2), act (1, 2, 3, 4)

	/*
########################################################
	*/

	RushInfo: {
		create: function () {
			var obj, string;

			obj = {
				lastSequence: "",
				doneCharacters: []
			};

			string = JSON.stringify(obj);

			Misc.fileAction("data/AutoRush/RushInfo.json", 1, string);

			return obj;
		},

		read: function () {
			var obj, string;

			if (!FileTools.exists("data/AutoRush/RushInfo.json")) {
				this.create();
			}

			string = Misc.fileAction("data/AutoRush/RushInfo.json", 0);

			try {
				obj = JSON.parse(string);
			} catch (readError) {
				this.create();
			}

			if (obj) {
				return obj;
			}

			return {
				lastSequence: "",
				doneCharacters: []
			};
		},

		update: function (stat, value) {
			var obj, string;

			obj = this.read();
			obj[stat] = value;
			string = JSON.stringify(obj);

			Misc.fileAction("data/AutoRush/RushInfo.json", 1, string);
		}
	},

	// Get the next available character's info index from Leechers[profile] array
	getInfo: function (profile) {
		if (!profile) {
			profile = me.profile;
		}

		var i, j,
			rushInfo = this.RushInfo.read();

		for (i in this.Leechers) {
			if (this.Leechers.hasOwnProperty(i) && this.Leechers[i] instanceof Array && i === profile) {
				for (j = 0; j < this.Leechers[i].length; j += 1) {
					if (rushInfo.doneCharacters.indexOf(this.Leechers[i][j].charName) === -1) {
						return this.Leechers[i][j];
					}
				}
			}
		}

		return false;
	},

	getQuester: function () {
		var i, j,
			rushInfo = this.RushInfo.read();

		for (i in this.Leechers) {
			if (this.Leechers.hasOwnProperty(i) && this.Leechers[i] instanceof Array) {
				for (j = 0; j < this.Leechers[i].length; j += 1) {
					if (rushInfo.doneCharacters.indexOf(this.Leechers[i][j].charName) === -1) {
						return i;
					}
				}
			}
		}

		return false;
	},

	getRushees: function () {
		var i, j,
			rushees = [],
			rushInfo = this.RushInfo.read();

		for (i in this.Leechers) {
			if (this.Leechers.hasOwnProperty(i) && this.Leechers[i] instanceof Array) {
				for (j = 0; j < this.Leechers[i].length; j += 1) {
					if (rushInfo.doneCharacters.indexOf(this.Leechers[i][j].charName) === -1) {
						rushees.push(this.Leechers[i][j].charName);

						break;
					}
				}
			}
		}

		return rushees;
	},

	finishRush: function () {
		var rushInfo, charArray;

		rushInfo = this.RushInfo.read();
		charArray = rushInfo.doneCharacters;

		if (charArray.indexOf(me.charname) === -1) {
			charArray.push(me.charname);
			this.RushInfo.update("doneCharacters", charArray);
		}

		return true;
	}
};