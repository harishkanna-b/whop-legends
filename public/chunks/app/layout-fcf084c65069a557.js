(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[7177],
	{
		1093: (e, r, s) => {
			Promise.resolve().then(s.bind(s, 5121)),
				Promise.resolve().then(s.t.bind(s, 7780, 23)),
				Promise.resolve().then(s.bind(s, 5946)),
				Promise.resolve().then(s.bind(s, 699)),
				Promise.resolve().then(s.bind(s, 5329)),
				Promise.resolve().then(s.bind(s, 8416)),
				Promise.resolve().then(s.bind(s, 7001)),
				Promise.resolve().then(s.bind(s, 5390)),
				Promise.resolve().then(s.bind(s, 8360)),
				Promise.resolve().then(s.bind(s, 6367)),
				Promise.resolve().then(s.bind(s, 9422)),
				Promise.resolve().then(s.bind(s, 3286)),
				Promise.resolve().then(s.bind(s, 6557)),
				Promise.resolve().then(s.bind(s, 6628)),
				Promise.resolve().then(s.bind(s, 4526)),
				Promise.resolve().then(s.bind(s, 5920)),
				Promise.resolve().then(s.bind(s, 174)),
				Promise.resolve().then(s.bind(s, 3094)),
				Promise.resolve().then(s.bind(s, 430)),
				Promise.resolve().then(s.bind(s, 6613)),
				Promise.resolve().then(s.bind(s, 8439)),
				Promise.resolve().then(s.bind(s, 1843)),
				Promise.resolve().then(s.bind(s, 5012)),
				Promise.resolve().then(s.bind(s, 4983)),
				Promise.resolve().then(s.bind(s, 2001)),
				Promise.resolve().then(s.bind(s, 6315)),
				Promise.resolve().then(s.bind(s, 5573)),
				Promise.resolve().then(s.bind(s, 5522)),
				Promise.resolve().then(s.bind(s, 7796)),
				Promise.resolve().then(s.bind(s, 6790)),
				Promise.resolve().then(s.bind(s, 7125)),
				Promise.resolve().then(s.bind(s, 4599)),
				Promise.resolve().then(s.bind(s, 3340)),
				Promise.resolve().then(s.bind(s, 8619)),
				Promise.resolve().then(s.bind(s, 9972)),
				Promise.resolve().then(s.bind(s, 3057)),
				Promise.resolve().then(s.bind(s, 2545)),
				Promise.resolve().then(s.bind(s, 5485)),
				Promise.resolve().then(s.bind(s, 3279)),
				Promise.resolve().then(s.bind(s, 6205)),
				Promise.resolve().then(s.bind(s, 4327)),
				Promise.resolve().then(s.bind(s, 2886)),
				Promise.resolve().then(s.bind(s, 60)),
				Promise.resolve().then(s.bind(s, 2552)),
				Promise.resolve().then(s.bind(s, 8877)),
				Promise.resolve().then(s.bind(s, 3159)),
				Promise.resolve().then(s.bind(s, 5716)),
				Promise.resolve().then(s.bind(s, 6673)),
				Promise.resolve().then(s.bind(s, 8103)),
				Promise.resolve().then(s.bind(s, 1337)),
				Promise.resolve().then(s.bind(s, 4697)),
				Promise.resolve().then(s.bind(s, 9637)),
				Promise.resolve().then(s.bind(s, 4130)),
				Promise.resolve().then(s.bind(s, 4900)),
				Promise.resolve().then(s.bind(s, 221)),
				Promise.resolve().then(s.bind(s, 8271)),
				Promise.resolve().then(s.bind(s, 5999)),
				Promise.resolve().then(s.bind(s, 2198)),
				Promise.resolve().then(s.bind(s, 5785)),
				Promise.resolve().then(s.bind(s, 4862)),
				Promise.resolve().then(s.bind(s, 9253)),
				Promise.resolve().then(s.bind(s, 3933)),
				Promise.resolve().then(s.bind(s, 2589)),
				Promise.resolve().then(s.bind(s, 1942)),
				Promise.resolve().then(s.bind(s, 9364)),
				Promise.resolve().then(s.bind(s, 8351)),
				Promise.resolve().then(s.bind(s, 9409)),
				Promise.resolve().then(s.bind(s, 7569)),
				Promise.resolve().then(s.bind(s, 5789)),
				Promise.resolve().then(s.bind(s, 7577)),
				Promise.resolve().then(s.bind(s, 1415)),
				Promise.resolve().then(s.bind(s, 6055)),
				Promise.resolve().then(s.bind(s, 9360)),
				Promise.resolve().then(s.bind(s, 236)),
				Promise.resolve().then(s.bind(s, 5157)),
				Promise.resolve().then(s.bind(s, 2378)),
				Promise.resolve().then(s.bind(s, 2668)),
				Promise.resolve().then(s.bind(s, 15)),
				Promise.resolve().then(s.t.bind(s, 6774, 23)),
				Promise.resolve().then(s.t.bind(s, 9602, 23));
		},
		5121: (e, r, s) => {
			s.d(r, { J: () => h, UserProvider: () => d });
			const n = s(5010);
			const i = s(8602);
			const o = s(9030);
			const t = s(1616);
			const l = (0, i.createContext)(void 0);
			function d(e) {
				const { children: r } = e;
				const [s, d] = (0, i.useState)(null);
				const [h, a] = (0, i.useState)(!0);
				const [m, v] = (0, i.useState)(null);
				(0, t.useRouter)();
				const b = async () => {
					try {
						a(!0), v(null);
						const {
							data: { session: r },
							error: s,
						} = await o.N.auth.getSession();
						if (s) throw s;
						if (!r) return void d(null);
						const { data: n, error: i } = await o.N.from("users")
							.select("*")
							.eq("id", r.user.id)
							.single();
						if (i && "PGRST116" !== i.code) throw i;
						if (n) d(n);
						else {
							let e;
							const { data: s, error: n } = await o.N.from("users")
								.insert({
									id: r.user.id,
									username:
										(null == (e = r.user.user_metadata)
											? void 0
											: e.username) || "user_".concat(r.user.id.slice(0, 8)),
									email: r.user.email,
									character_class: "scout",
									level: 1,
									experience_points: 0,
									prestige_level: 0,
									total_referrals: 0,
									total_commission: 0,
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString(),
								})
								.select()
								.single();
							if (n) throw n;
							d(s);
						}
					} catch (e) {
						console.error("Error refreshing user:", e),
							v(e instanceof Error ? e.message : "Unknown error"),
							d(null);
					} finally {
						a(!1);
					}
				};
				const u = async (e) => {
					if (s)
						try {
							const { data: r, error: n } = await o.N.from("users")
								.update({ ...e, updated_at: new Date().toISOString() })
								.eq("id", s.id)
								.select()
								.single();
							if (n) throw n;
							d(r);
						} catch (e) {
							throw (
								(console.error("Error updating user:", e),
								v(e instanceof Error ? e.message : "Unknown error"),
								e)
							);
						}
				};
				return (
					(0, i.useEffect)(() => {
						b();
						const {
							data: { subscription: e },
						} = o.N.auth.onAuthStateChange(async (e, r) => {
							"SIGNED_IN" === e || "TOKEN_REFRESHED" === e
								? await b()
								: "SIGNED_OUT" === e && (d(null), a(!1));
						});
						return () => {
							e.unsubscribe();
						};
					}, []),
					(0, n.jsx)(l.Provider, {
						value: {
							user: s,
							loading: h,
							error: m,
							refreshUser: b,
							updateUser: u,
						},
						children: r,
					})
				);
			}
			function h() {
				const e = (0, i.useContext)(l);
				if (void 0 === e)
					throw Error("useUser must be used within a UserProvider");
				return e;
			}
		},
		5946: (e, r, s) => {
			s.d(r, { default: () => o });
			const n = s(5010);
			const i = s(8602);
			function o(e) {
				const { children: r, fallback: s } = e;
				const [o, t] = (0, i.useState)(!1);
				const [l, d] = (0, i.useState)(null);
				return ((0, i.useEffect)(() => {
					try {
						let e;
						window.parent !== window &&
							(null == (e = window.location.ancestorOrigins)
								? void 0
								: e.length) &&
							t(!0);
					} catch (e) {
						console.log("Not running in Whop iframe context"), t(!1);
					}
					const r = (e) => {
						let r;
						let s;
						((null == (r = e.message) ? void 0 : r.includes("App API Key")) ||
							(null == (s = e.message) ? void 0 : s.includes("user token"))) &&
							(d(
								"Whop authentication required. This app needs to run within Whop.com iframe.",
							),
							console.warn("Whop authentication error:", e.error));
					};
					return (
						window.addEventListener("error", r),
						() => window.removeEventListener("error", r)
					);
				}, []),
				l)
					? (0, n.jsx)("div", {
							className:
								"min-h-screen bg-gray-50 flex items-center justify-center",
							children: (0, n.jsx)("div", {
								className: "max-w-md w-full bg-white shadow-lg rounded-lg p-6",
								children: (0, n.jsxs)("div", {
									className: "text-center",
									children: [
										(0, n.jsx)("div", {
											className: "text-6xl mb-4",
											children: "\uD83D\uDE80",
										}),
										(0, n.jsx)("h1", {
											className: "text-2xl font-bold text-gray-900 mb-4",
											children: "Whop Legends App",
										}),
										(0, n.jsx)("div", {
											className:
												"bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4",
											children: (0, n.jsx)("p", {
												className: "text-yellow-800 text-sm",
												children: l,
											}),
										}),
										(0, n.jsxs)("div", {
											className: "space-y-2 text-sm text-gray-600",
											children: [
												(0, n.jsxs)("p", {
													children: [
														"\uD83D\uDCCB ",
														(0, n.jsx)("strong", {
															children: "Development Mode:",
														}),
														" This app is designed to run within the Whop.com ecosystem.",
													],
												}),
												(0, n.jsxs)("p", {
													children: [
														"\uD83D\uDD27 ",
														(0, n.jsx)("strong", {
															children: "To test locally:",
														}),
														" You can view the static components, but full functionality requires Whop authentication.",
													],
												}),
												(0, n.jsxs)("p", {
													children: [
														"\uD83C\uDF10 ",
														(0, n.jsx)("strong", {
															children: "For full experience:",
														}),
														" Access this app through your Whop dashboard.",
													],
												}),
											],
										}),
										s &&
											(0, n.jsx)("div", {
												className: "mt-6 pt-6 border-t border-gray-200",
												children: s,
											}),
									],
								}),
							}),
						})
					: (0, n.jsx)(n.Fragment, { children: r });
			}
		},
		7780: () => {},
		9030: (e, r, s) => {
			s.d(r, { N: () => l });
			const n = s(2104);
			const i = s(828);
			const o = "https://slftjqvrjdkzvzenmvnq.supabase.co";
			const t = i.env.SUPABASE_SERVICE_ROLE_KEY;
			const l = (0, n.UU)(
				o,
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZnRqcXZyamRrenZ6ZW5tdm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTE2MjAsImV4cCI6MjA3MzY4NzYyMH0.u2TE7n2o6kd1oaZtoCBxDQV09n5dqlcejEMXx7O_XHY",
				{ auth: { persistSession: !1 } },
			);
			(0, n.UU)(o, t, { auth: { persistSession: !1 } });
		},
	},
	(e) => {
		const r = (r) => e((e.s = r));
		e.O(0, [7025, 7181, 3273, 8256, 1473, 769, 7358], () => r(1093)),
			(_N_E = e.O());
	},
]);
