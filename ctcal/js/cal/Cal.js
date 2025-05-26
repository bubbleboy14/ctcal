cal.Cal = CT.Class({
	CLASSNAME: "cal.Cal",
	_: {
		reschedule: function(slot, schedule, which) {
			var fname = which || "slot";
			this.cal["un" + fname](slot);
			slot.schedule = schedule;
			this.cal[fname](slot);
			this.cal.orient();
		},
		task: function(cb, mode) {
			var oz = this.opts, tdata;
			CT.modal.prompt({
				prompt: "what is this task called?",
				cb: function(tname) {
					CT.modal.prompt({
						isTA: true,
						prompt: "please describe this task",
						cb: function(tdesc) {
							tdata = {
								modelName: "task",
								name: tname,
								description: tdesc,
								editors: [ user.core.get("key") ]
							};
							if (mode)
								tdata.mode = mode;
							cal.util.edit(tdata, function(task) {
								CT.data.add(task);
								oz.on.task && oz.on.task(task);
								cb(task);
							});
						}
					});
				}
			});
		},
		exceptions: function(slot, date) {
			var slotter = this.slot, eslot = function(etype) {
				return function() {
					date.setHours(slot.when.getHours());
					date.setMinutes(slot.when.getMinutes());
					slotter(slot.task, etype, date,
						slot.when.duration, slot.task.task);
				};
			}, bs = "create exception for ", ebz = [
				CT.dom.button(bs + date.toDateString(),
					eslot("exception"), "w1 block")
			], ds = bs + CT.cal.days[date.getDay()] + "s";
			if (slot.schedule == "daily")
				ebz.push(CT.dom.button(ds, eslot("offday"), "w1 block"));
			return ebz;
		},
		eslots: function(slotter, cb) {
			var ez = slotter.timeslots.filter(function(s) {
				return s.schedule == "exception" || s.schedule == "offday";
			}), eline = function(ex) {
				return CT.dom.div([
					CT.dom.button("remove exception", function() {
						CT.data.remove(slotter.timeslots, ex);
						cal.util.rm(ex.key, function() {
							cb(ex);
						});
					}, "right"),
					(ex.schedule == "exception") ? ex.when.toDateString()
						: (CT.cal.days[ex.when.getDay()] + "s")
				], "bordered padded margined round");
			};
			return ez.length && [
				"exceptions",
				ez.map(eline)
			];
		}
	},
	click: {
		once: function(date, month, year) {
			var thaz = this, slotter = function(variety) {
				thaz.task(function(task) {
					thaz.timeslot(task, variety, new Date(year, month, date));
				});
			};
			CT.modal.choice({
				data: ["once", "monthly"],
				cb: function(variety) {
					if (variety == "once")
						return slotter(variety);
					CT.modal.choice({
						data: ["date", "day"],
						cb: subvar => slotter(variety + " (" + subvar + ")")
					});
				}
			});
		},
		weekly: function(day, dayindex) {
			var tslot = this.timeslot, d = new Date();
			d.setDate(d.getDate() + dayindex - d.getDay());
			CT.modal.choice({
				data: ["weekly", "biweekly (even)", "biweekly (odd)"],
				cb: variety => this.task(task => tslot(task, variety, d))
			});
		},
		daily: function() {
			var tslot = this.timeslot;
			this.task(function(task) {
				tslot(task, "daily");
			});
		},
		volunteer: function(slot, date, slots) {
			var thaz = this, schedz = slots.map(function(s) {
				return s.schedule;
			}), vbutt = function(schedule) {
				if (schedz.includes(schedule))
					return CT.dom.button(schedule + " -- unparticipate",
						thaz.unvolunteer(schedule, slot, date, slots));
				return CT.dom.button(schedule,
					thaz.volunteer(schedule, slot, date, slots));
			}, buttz = [ vbutt("once") ], eslots;
			if (slot.schedule == "daily")
				buttz.push(vbutt("daily"));
			if (slot.schedule.startsWith("monthly") || slot.schedule.startsWith("biweekly"))
				buttz.push(vbutt(slot.schedule));
			else if (slot.schedule != "once") {
				buttz.push(vbutt("weekly"));
				buttz.push(vbutt("biweekly (odd)"));
				buttz.push(vbutt("biweekly (even)"));
				if (slots.length) {
					eslots = this._.eslots(slots[0].task, function(ex) {
						thaz.cal.uncommit(ex);
						thaz.cal.orient();
					});
					eslots && buttz.push(eslots);
					slots.forEach(function(cslot, i) {
						if (cslot.schedule != "once")
							buttz.push(thaz._.exceptions(cslot, date));
					});
				}
			}
			return CT.dom.div(buttz, "centered");
		},
		exception: function(slot, date) {
			return [
				CT.dom.div("Exceptions", "big"),
				this._.exceptions(slot, date)
			];
		},
		edit: function(slot, date) {
			new cal.Editor({
				slot: slot,
				date: date,
				cal: this.cal,
				eslots: this._.eslots,
				reschedule: this._.reschedule,
				modes: this.opts.mode.choices,
				editors: this.opts.on.editors,
				untask: this.opts.on.untask
			});
		},
		help: function() {
			var steps = this.opts.nonew ? [] : [
				"Click the 'daily task' button to create a new daily task",
				"Click a day name to set up a weekly or biweekly task.",
				"Click a date to set up a monthly or non-recurring task."
			];
			steps.push("Click a timeslot to edit or participate.");
			CT.modal.modal([
				CT.dom.div("How does this work?", "biggest centered"),
				CT.dom.div(steps, "subpadded")
			]);
		}
	},
	commit: function(schedule, slot, date, commitment) {
		date.setHours(slot.when.getHours());
		date.setMinutes(slot.when.getMinutes());
		this.slot(commitment, schedule, date, slot.duration, slot.task);
	},
	unvolunteer: function(schedule, slot, date, cslots) {
		var c = this.cal,
			cslot = cslots[0], // there can be only one? (think so?)
			stew = cslot.task; // should change that name....
		return function() {
			CT.data.remove(stew.timeslots, cslot);
			cal.util.rm(cslot.key, function() {
				c.unsteward(stew.steward, slot.task, cslot);
				c.uncommit(cslot);
				c.orient();
			});
		};
	},
	volunteer: function(schedule, slot, date, cslots) {
		var thaz = this, _ = this._;
		return function() {
			if (cslots && cslots.length) {
				slot = cslots[0]; // hm...
				return cal.util.edit({
					key: slot.key,
					schedule: schedule
				}, function() {
					_.reschedule(slot, schedule, "commit");
				});
			}
			var u = user.core.get(),
				commitment = thaz.cal.stewardship(u, slot.task);
			if (commitment)
				return thaz.commit(schedule, slot, date, commitment);
			cal.util.edit({
				modelName: "stewardship",
				steward: u.key
			}, function(commitment) {
				commitment.steward = u;
				slot.task.commitments.push(commitment);
				cal.util.edit({
					key: slot.task.key,
					commitments: slot.task.commitments.map(function(c) {
						return c.key;
					})
				}, function() {
					thaz.commit(schedule, slot, date, commitment);
				});
			});
		};
	},
	slot: function(slotter, schedule, when, duration, task) {
		var c = this.cal;
		cal.util.edit({
			modelName: "timeslot",
			duration: duration,
			schedule: schedule,
			when: CT.parse.date2string(when, true)
		}, function(slot) {
			CT.data.add(slot);
			slotter.timeslots.push(slot);
			cal.util.edit({
				key: slotter.key,
				timeslots: slotter.timeslots.map(function(ts) {
					return ts.key;
				})
			}, function() {
				c[task ? "commitment" : "appointment"](slotter, task);
				c.orient();
			});
		});
	},
	timeslot: function(task, schedule, when) {
		var hours, minutes, slot = this.slot;
		CT.modal.prompt({
			prompt: "what time does it start?",
			style: "time",
			cb: function(time) {
				[hours, minutes] = time.split(":");
				when = when || new Date();
				when.setHours(hours);
				when.setMinutes(minutes);
				CT.modal.prompt({
					prompt: "how many hours does it last?",
					style: "number",
					max: 24,
					cb: function(duration) {
						slot(task, schedule, when, duration);
					}
				});
			}
		});
	},
	task: function(cb) {
		var task = this._.task;
		if (!this.opts.mode)
			return task(cb);
		CT.modal.choice({
			prompt: this.opts.mode.prompt || "select a mode",
			data: this.opts.mode.choices,
			cb: function(mode) {
				task(cb, mode);
			}
		});
	},
	setParent: function(parent) {
		this.opts.parent = parent;
		CT.dom.setContent(parent, this.content);
	},
	build: function() {
		var cz = {
			edit: this.click.edit,
			volunteer: this.click.volunteer,
			exception: this.click.exception
		}, content = this.content = [
			CT.dom.button("help", this.click.help, "right")
		];
		if (!this.opts.nonew) {
			cz.date = this.click.once;
			cz.day = this.click.weekly;
			content.push(CT.dom.button("daily task",
				this.click.daily, "left"));
		}
		this.cal = new CT.cal.Cal({
			appointments: this.tasks,
			click: cz
		});
		content.push(this.cal.node);
		CT.dom.setContent(this.opts.parent, content);
	},
	load: function() {
		var thiz = this, oz = this.opts, doit = function(tasks) {
			thiz.tasks = tasks;
			thiz.build();
		};
		if (oz.gettasks)
			oz.gettasks(doit);
		else
			oz.tasks ? CT.db.multi(oz.tasks, doit) :
				CT.db.get("task", doit, null, null, null, oz.filters);
	},
	init: function(opts) {
		this.opts = opts = CT.merge(opts, {
			parent: "ctmain",
			on: {} // task, untask, editors
		});
		this.load();
	}
});