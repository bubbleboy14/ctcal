cal.Editor = CT.Class({
	CLASSNAME: "cal.Editor",
	basics: function() {
		var opts = this.opts, refresh = this.refresh,
			task = this.task, slot = this.slot, when = slot.when,
			tshow = CT.dom.div(slot.duration), content;
		content = [
			CT.dom.div("Edit: " + task.name, "bigger centered"),
			CT.dom.smartField({
				classname: "w1",
				value: task.name,
				cb: function(val) {
					task.name = val;
					cal.util.edit({
						key: task.key,
						name: task.name
					}, refresh);
				}
			}),
			CT.dom.smartField({
				isTA: true,
				classname: "w1",
				value: task.description,
				cb: function(val) {
					task.description = val;
					cal.util.edit({
						key: task.key,
						description: task.description
					}, refresh);
				}
			}),
			CT.dom.div([
				"what time?",
				CT.dom.timeSelector(null,
					when.toTimeString().slice(0, 5), function(time) {
						var hours, minutes;
						[hours, minutes] = time.split(":");
						when.setHours(hours);
						when.setMinutes(minutes);
						cal.util.edit({
							key: slot.key,
							when: CT.parse.date2string(when, true)
						}, refresh);
					})
			], "centered"),
			CT.dom.div([
				"how many hours?",
				tshow,
				CT.dom.range(function(val) {
					CT.dom.setContent(tshow, val);
				}, 0.25, 24, slot.duration, 0.25, null, null, function(val) {
					slot.duration = val;
					cal.util.edit({
						key: slot.key,
						duration: val
					}, refresh)
				})
			], "centered")
		];
		this.modes && content.push(CT.dom.div([
			"what compensation mode?",
			CT.dom.select({
				names: this.modes,
				curvalue: task.mode,
				onchange: function(val) {
					task.mode = val;
					cal.util.edit({
						key: task.key,
						mode: val
					}, mod.hide);
				}
			})
		], "centered"));
		return content;
	},
	schedule: function() {
		var thaz = this, slot = this.slot, content = [
			CT.dom.div([
				"what kind of schedule?",
				CT.dom.select({
					names: ["once", "daily", "weekly",
						"biweekly (even)", "biweekly (odd)",
						"monthly (date)", "monthly (day)"],
					curvalue: slot.schedule,
					onchange: function(val) {
						cal.util.edit({
							key: slot.key,
							schedule: val
						}, function() {
							thaz.reschedule(slot, val);
							thaz.mod.hide();
						});
					}
				})
			], "centered")
		], eslots = this.eslots(this.task, this.unexcept),
			d = slot.when, c = this.cal, dayz = CT.cal.days;
		(slot.schedule == "once") && content.push([
			slot.when.toDateString(),
			CT.dom.button("reschedule", function() {
				CT.modal.prompt({
					style: "date",
					data: slot.when,
					cb: function() {
						cal.util.edit({
							key: slot.key,
							when: CT.parse.date2string(slot.when, true)
						}, function() {
							thaz.reschedule(slot, "once");
							thaz.mod.hide();
						});
					}
				});
			})
		]);
		(slot.schedule == "weekly") && content.push(CT.dom.select({
			names: dayz,
			curvalue: dayz[d.getDay()],
			onchange: function(val) {
				c.unslot(slot);
				d.setDate(d.getDate() + dayz.indexOf(val) - d.getDay());
				c.slot(slot);
				cal.util.edit({
					key: slot.key,
					when: CT.parse.date2string(d, true)
				}, thaz.refresh);
			}
		}));
		eslots && content.push(eslots);
		return content;
	},
	lists: function() {
		var upvals = this.upvals, stepper = CT.dom.fieldList({
			bottomadd: true,
			vals: this.task.steps,
			onchange: function(vals) {
				upvals("steps", vals);
			}
		}), requirer = CT.dom.fieldList({
			vals: this.task.requirements,
			onchange: function(vals) {
				upvals("requirements", vals);
			}
		});
		return [
			CT.dom.div([
				"what are the steps?",
				stepper, stepper.empty, stepper.addButton
			], "centered"),
			CT.dom.div([
				"what are the requirements?",
				requirer.empty, requirer.addButton, requirer
			], "centered")
		];
	},
	editoreditor: function() {
		var edz = CT.dom.div(), content = [
			"who are the editors for this task?",
			edz
		], thaz = this;
		CT.db.multi(this.task.editors, function(ez) {
			CT.dom.setContent(edz, ez.map(function(e) {
				return e.firstName;
			}));
		});
		if (this.editors) {
			content.push(CT.dom.button("add editor", function() {
				thaz.mod.hide();
				thaz.editors(thaz.task);
			}));
		}
		return content;
	},
	remover: function() {
		var thaz = this, task = this.task;
		return CT.dom.button("remove", function() {
			if (confirm("are you sure you want to delete this task and all associated information?")
				&& confirm("are you really sure?")) {
				thaz.untask(task);
				task.timeslots.forEach(thaz.cal.unslot);
				task.commitments.forEach(function(comm) {
					comm.timeslots.forEach(thaz.cal.uncommit);
				});
				thaz.refresh();
				cal.util.rm(task.key);
			}
		}, "left");
	},
	build: function() {
		this.mod = CT.modal.modal([
			this.remover(),
			this.basics(),
			this.schedule(),
			this.lists(),
			this.editoreditor()
		]);
	},
	refresh: function() {
		this.mod.hide();
		this.cal.orient();
	},
	unexcept: function(ex) {
		this.cal.unslot(ex);
		this.refresh();
	},
	upvals: function(key, arr) {
		var eobj = {
			key: this.task.key
		};
		this.task[key] = eobj[key] = arr;
		cal.util.edit(eobj);
	},
	init: function(opts) {
		this.opts = opts;
		this.cal = opts.cal;
		this.date = opts.date;
		this.slot = opts.slot;
		this.modes = opts.modes;
		this.untask = opts.untask;
		this.eslots = opts.eslots;
		this.task = opts.slot.task;
		this.editors = opts.editors;
		this.reschedule = opts.reschedule;
		this.build();
	}
});