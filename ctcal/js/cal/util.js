cal.util = {
	_edit: function(params, cb, action) {
		CT.net.post({
			path: "/_db",
			params: CT.merge(params, {
				action: action || "edit",
				pw: core.config.keys.storage
			}),
			cb: cb
		});
	},
	edit: function(data, cb) {
		cal.util._edit({ data: data }, cb);
	},
	rm: function(key, cb) {
		cal.util._edit({ key: key }, cb, "delete");
	}
};