(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[2570],
	{
		1616: (e, r, t) => {
			const s = t(9184);
			t.o(s, "useRouter") && t.d(r, { useRouter: () => s.useRouter });
		},
		2303: (e, r, t) => {
			Promise.resolve().then(t.bind(t, 7413));
		},
		7413: (e, r, t) => {
			t.r(r), t.d(r, { default: () => l });
			const s = t(5010);
			const a = t(8602);
			const i = t(1616);
			function l(e) {
				const { params: r } = e;
				const t = (0, i.useRouter)();
				const [l, n] = (0, a.useState)(null);
				const [c, d] = (0, a.useState)(!0);
				const [o, m] = (0, a.useState)(null);
				const [u, x] = (0, a.useState)(null);
				return ((0, a.useEffect)(() => {
					(async () => {
						const { code: e } = await r;
						n(e);
					})();
				}, [r]),
				(0, a.useEffect)(() => {
					(async () => {
						if (l)
							try {
								const e = {
									ip: "",
									userAgent: navigator.userAgent,
									referer: document.referrer,
									utmSource:
										new URLSearchParams(window.location.search).get(
											"utm_source",
										) || void 0,
									utmMedium:
										new URLSearchParams(window.location.search).get(
											"utm_medium",
										) || void 0,
									utmCampaign:
										new URLSearchParams(window.location.search).get(
											"utm_campaign",
										) || void 0,
								};
								await fetch("/api/referral/click", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ code: l, clickData: e }),
								});
								const r = await fetch(
									"/api/referrals?userId=".concat(l, "&action=referrer-info"),
								);
								if (r.ok) {
									const e = await r.json();
									e.success && x(e.data);
								}
								d(!1),
									localStorage.setItem("referralCode", l),
									setTimeout(() => {
										t.push("/");
									}, 3e3);
							} catch (e) {
								console.error("Error handling referral:", e),
									m("Invalid or expired referral link"),
									d(!1),
									setTimeout(() => {
										t.push("/");
									}, 3e3);
							}
					})();
				}, [l, t]),
				c)
					? (0, s.jsx)("div", {
							className:
								"min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center",
							children: (0, s.jsxs)("div", {
								className: "text-center",
								children: [
									(0, s.jsx)("div", {
										className:
											"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4",
									}),
									(0, s.jsx)("p", {
										className: "text-gray-600",
										children: "Processing referral...",
									}),
								],
							}),
						})
					: o
						? (0, s.jsx)("div", {
								className:
									"min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center",
								children: (0, s.jsxs)("div", {
									className: "text-center max-w-md",
									children: [
										(0, s.jsx)("div", {
											className: "text-6xl mb-4",
											children: "⚠️",
										}),
										(0, s.jsx)("h1", {
											className: "text-2xl font-bold text-gray-900 mb-2",
											children: "Referral Error",
										}),
										(0, s.jsx)("p", {
											className: "text-gray-600 mb-4",
											children: o,
										}),
										(0, s.jsx)("p", {
											className: "text-sm text-gray-500",
											children: "Redirecting to main page...",
										}),
									],
								}),
							})
						: (0, s.jsx)("div", {
								className:
									"min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center",
								children: (0, s.jsxs)("div", {
									className: "text-center max-w-md",
									children: [
										(0, s.jsx)("div", {
											className: "text-6xl mb-4",
											children: "\uD83C\uDF89",
										}),
										(0, s.jsxs)("h1", {
											className: "text-2xl font-bold text-gray-900 mb-2",
											children: [
												"Welcome!",
												" ",
												(null == u ? void 0 : u.username)
													? "Invited by ".concat(u.username)
													: "",
											],
										}),
										(0, s.jsx)("p", {
											className: "text-gray-600 mb-4",
											children: "You've been invited to join our platform!",
										}),
										(null == u ? void 0 : u.message) &&
											(0, s.jsx)("div", {
												className: "bg-white rounded-lg p-4 mb-4 shadow-sm",
												children: (0, s.jsxs)("p", {
													className: "text-sm text-gray-700 italic",
													children: ['"', u.message, '"'],
												}),
											}),
										(0, s.jsxs)("div", {
											className: "bg-white rounded-lg p-4 shadow-sm",
											children: [
												(0, s.jsx)("p", {
													className: "text-sm text-gray-600",
													children: "Redirecting to main page...",
												}),
												(0, s.jsx)("div", {
													className: "mt-2 w-full bg-gray-200 rounded-full h-2",
													children: (0, s.jsx)("div", {
														className:
															"bg-blue-600 h-2 rounded-full animate-pulse",
													}),
												}),
											],
										}),
									],
								}),
							});
			}
		},
	},
	(e) => {
		const r = (r) => e((e.s = r));
		e.O(0, [1473, 769, 7358], () => r(2303)), (_N_E = e.O());
	},
]);
