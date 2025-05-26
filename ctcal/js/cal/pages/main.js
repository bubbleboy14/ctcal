CT.require("CT.all");
CT.require("core");
CT.require("user.core");
CT.require("cal.core");

CT.onload(function() {
	CT.initCore();
	new cal.Cal(core.config.ctcal);
});
