(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[2352],
	{
		2352: (e, t, n) => {
			const f = (() => {
				if ("undefined" !== typeof self) return self;
				if ("undefined" !== typeof window) return window;
				if (void 0 !== n.g) return n.g;
				throw Error("unable to locate global object");
			})();
			(e.exports = t = f.fetch),
				f.fetch && (t.default = f.fetch.bind(f)),
				(t.Headers = f.Headers),
				(t.Request = f.Request),
				(t.Response = f.Response);
		},
	},
]);
