(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[4384],
	{
		1145: (e, s, t) => {
			Promise.resolve().then(t.bind(t, 5252));
		},
		4959: (e, s, t) => {
			t.d(s, { X: () => l });
			const a = t(5121);
			function l() {
				const { user: e, loading: s, error: t } = (0, a.J)();
				return {
					user: e
						? {
								id: e.id,
								username: e.username,
								email: e.email,
								avatar_url: e.avatar_url,
								metadata: { companyId: e.company_id, ...e.raw_user_meta },
							}
						: null,
					isLoading: s,
					error: t,
				};
			}
		},
		5121: (e, s, t) => {
			t.d(s, { J: () => c, UserProvider: () => n });
			const a = t(5010);
			const l = t(8602);
			const r = t(9030);
			const i = t(1616);
			const d = (0, l.createContext)(void 0);
			function n(e) {
				const { children: s } = e;
				const [t, n] = (0, l.useState)(null);
				const [c, o] = (0, l.useState)(!0);
				const [x, m] = (0, l.useState)(null);
				(0, i.useRouter)();
				const u = async () => {
					try {
						o(!0), m(null);
						const {
							data: { session: s },
							error: t,
						} = await r.N.auth.getSession();
						if (t) throw t;
						if (!s) return void n(null);
						const { data: a, error: l } = await r.N.from("users")
							.select("*")
							.eq("id", s.user.id)
							.single();
						if (l && "PGRST116" !== l.code) throw l;
						if (a) n(a);
						else {
							let e;
							const { data: t, error: a } = await r.N.from("users")
								.insert({
									id: s.user.id,
									username:
										(null == (e = s.user.user_metadata)
											? void 0
											: e.username) || "user_".concat(s.user.id.slice(0, 8)),
									email: s.user.email,
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
							if (a) throw a;
							n(t);
						}
					} catch (e) {
						console.error("Error refreshing user:", e),
							m(e instanceof Error ? e.message : "Unknown error"),
							n(null);
					} finally {
						o(!1);
					}
				};
				const h = async (e) => {
					if (t)
						try {
							const { data: s, error: a } = await r.N.from("users")
								.update({ ...e, updated_at: new Date().toISOString() })
								.eq("id", t.id)
								.select()
								.single();
							if (a) throw a;
							n(s);
						} catch (e) {
							throw (
								(console.error("Error updating user:", e),
								m(e instanceof Error ? e.message : "Unknown error"),
								e)
							);
						}
				};
				return (
					(0, l.useEffect)(() => {
						u();
						const {
							data: { subscription: e },
						} = r.N.auth.onAuthStateChange(async (e, s) => {
							"SIGNED_IN" === e || "TOKEN_REFRESHED" === e
								? await u()
								: "SIGNED_OUT" === e && (n(null), o(!1));
						});
						return () => {
							e.unsubscribe();
						};
					}, []),
					(0, a.jsx)(d.Provider, {
						value: {
							user: t,
							loading: c,
							error: x,
							refreshUser: u,
							updateUser: h,
						},
						children: s,
					})
				);
			}
			function c() {
				const e = (0, l.useContext)(d);
				if (void 0 === e)
					throw Error("useUser must be used within a UserProvider");
				return e;
			}
		},
		5252: (e, s, t) => {
			t.r(s), t.d(s, { default: () => u });
			const a = t(5010);
			const l = t(8602);
			function r(e) {
				let s;
				const { quest: t, onUpdate: r, userId: i } = e;
				const [d, n] = (0, l.useState)(!1);
				const [c, o] = (0, l.useState)(!1);
				if (!t.quest) return null;
				const { quest: x, progress: m } = t;
				const u = t.is_completed || (null == m ? void 0 : m.is_completed);
				const h = (null == m ? void 0 : m.percentage) || 0;
				const g = async () => {
					try {
						n(!0);
						const e = await fetch("/api/quests/".concat(t.quest_id), {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ userId: i, action: "claim_reward" }),
						});
						e.ok &&
							(await e.json(),
							r(t.id, {
								...t,
								reward_claimed: !0,
								reward_claimed_at: new Date().toISOString(),
							}));
					} catch (e) {
						console.error("Error claiming reward:", e);
					} finally {
						n(!1);
					}
				};
				const p = (e) =>
					({
						daily: "\uD83D\uDCC5",
						weekly: "\uD83D\uDCCA",
						monthly: "\uD83D\uDCC8",
						special: "⭐",
					})[e] || "\uD83D\uDCCB";
				return (0, a.jsx)("div", {
					className:
						"bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden",
					children: (0, a.jsxs)("div", {
						className: "p-6",
						children: [
							(0, a.jsxs)("div", {
								className: "flex justify-between items-start mb-4",
								children: [
									(0, a.jsxs)("div", {
										className: "flex items-start space-x-3",
										children: [
											(0, a.jsx)("div", {
												className: "text-2xl",
												children: p(x.quest_type),
											}),
											(0, a.jsxs)("div", {
												className: "flex-1",
												children: [
													(0, a.jsx)("h3", {
														className: "text-lg font-semibold text-gray-900",
														children: x.title,
													}),
													(0, a.jsx)("p", {
														className: "text-gray-600 text-sm mt-1",
														children: x.description,
													}),
													(0, a.jsxs)("div", {
														className: "flex items-center space-x-2 mt-2",
														children: [
															(0, a.jsx)("span", {
																className:
																	"px-2 py-1 rounded-full text-xs font-medium ".concat(
																		{
																			easy: "text-green-600 bg-green-100",
																			medium: "text-yellow-600 bg-yellow-100",
																			hard: "text-orange-600 bg-orange-100",
																			epic: "text-purple-600 bg-purple-100",
																		}[x.difficulty] ||
																			"text-gray-600 bg-gray-100",
																	),
																children:
																	x.difficulty.charAt(0).toUpperCase() +
																	x.difficulty.slice(1),
															}),
															(0, a.jsxs)("span", {
																className: "text-xs text-gray-500",
																children: [p(x.quest_type), " ", x.quest_type],
															}),
															(null == m ? void 0 : m.time_remaining) &&
																(0, a.jsx)("span", {
																	className: "text-xs text-gray-500",
																	children: (s = m.time_remaining)
																		? "⏰ ".concat(s, " remaining")
																		: "",
																}),
														],
													}),
												],
											}),
										],
									}),
									(0, a.jsxs)("div", {
										className: "text-right",
										children: [
											u &&
												!t.reward_claimed &&
												(0, a.jsx)("span", {
													className:
														"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",
													children: "✅ Ready to Claim",
												}),
											t.reward_claimed &&
												(0, a.jsx)("span", {
													className:
														"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",
													children: "\uD83D\uDC8E Reward Claimed",
												}),
										],
									}),
								],
							}),
							(0, a.jsxs)("div", {
								className: "mb-4",
								children: [
									(0, a.jsxs)("div", {
										className:
											"flex justify-between text-sm text-gray-600 mb-1",
										children: [
											(0, a.jsx)("span", { children: "Progress" }),
											(0, a.jsxs)("span", { children: [Math.round(h), "%"] }),
										],
									}),
									(0, a.jsx)("div", {
										className: "w-full bg-gray-200 rounded-full h-2",
										children: (0, a.jsx)("div", {
											className:
												"h-2 rounded-full transition-all duration-300 ".concat(
													h >= 100
														? "bg-green-500"
														: h >= 75
															? "bg-blue-500"
															: h >= 50
																? "bg-yellow-500"
																: "bg-gray-300",
												),
											style: { width: "".concat(Math.min(h, 100), "%") },
										}),
									}),
									(0, a.jsxs)("div", {
										className:
											"flex justify-between text-xs text-gray-500 mt-1",
										children: [
											(0, a.jsxs)("span", {
												children: [
													(null == m ? void 0 : m.current_value) || 0,
													" / ",
													x.target_value,
													" ",
													x.target_type,
												],
											}),
											(0, a.jsxs)("span", {
												children: [
													"referrals" === x.target_type && "referrals",
													"commission" === x.target_type && "$",
													"level" === x.target_type && "levels",
													"achievements" === x.target_type && "achievements",
												],
											}),
										],
									}),
								],
							}),
							(0, a.jsxs)("div", {
								className: "border-t border-gray-100 pt-4",
								children: [
									(0, a.jsxs)("button", {
										onClick: () => o(!c),
										className:
											"flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900",
										children: [
											(0, a.jsx)("span", { children: "\uD83D\uDC8E Rewards" }),
											(0, a.jsx)("span", { children: c ? "▲" : "▼" }),
										],
									}),
									c &&
										(0, a.jsxs)("div", {
											className: "mt-3 grid grid-cols-2 gap-4",
											children: [
												(0, a.jsx)("div", {
													className: "bg-blue-50 rounded-lg p-3",
													children: (0, a.jsxs)("div", {
														className: "flex items-center",
														children: [
															(0, a.jsx)("span", {
																className: "text-2xl mr-2",
																children: "⭐",
															}),
															(0, a.jsxs)("div", {
																children: [
																	(0, a.jsx)("p", {
																		className:
																			"text-sm font-medium text-blue-900",
																		children: "Experience Points",
																	}),
																	(0, a.jsxs)("p", {
																		className:
																			"text-lg font-bold text-blue-700",
																		children: [
																			x.reward_xp.toLocaleString(),
																			" XP",
																		],
																	}),
																],
															}),
														],
													}),
												}),
												(0, a.jsx)("div", {
													className: "bg-green-50 rounded-lg p-3",
													children: (0, a.jsxs)("div", {
														className: "flex items-center",
														children: [
															(0, a.jsx)("span", {
																className: "text-2xl mr-2",
																children: "\uD83D\uDCB0",
															}),
															(0, a.jsxs)("div", {
																children: [
																	(0, a.jsx)("p", {
																		className:
																			"text-sm font-medium text-green-900",
																		children: "Commission",
																	}),
																	(0, a.jsxs)("p", {
																		className:
																			"text-lg font-bold text-green-700",
																		children: [
																			"$",
																			x.reward_commission.toFixed(2),
																		],
																	}),
																],
															}),
														],
													}),
												}),
											],
										}),
								],
							}),
							(0, a.jsxs)("div", {
								className: "mt-4 flex justify-end",
								children: [
									u &&
										!t.reward_claimed &&
										(0, a.jsx)("button", {
											onClick: g,
											disabled: d,
											className:
												"bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
											children: d ? "Claiming..." : "Claim Reward",
										}),
									!u &&
										(0, a.jsx)("button", {
											disabled: !0,
											className:
												"bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed",
											children: "In Progress",
										}),
								],
							}),
						],
					}),
				});
			}
			function i(e) {
				const { userId: s } = e;
				const [t, r] = (0, l.useState)([]);
				const [i, d] = (0, l.useState)(!0);
				const [n, c] = (0, l.useState)(null);
				const [o, x] = (0, l.useState)(1);
				const [m, u] = (0, l.useState)(!0);
				(0, l.useEffect)(() => {
					h();
				}, [o]);
				const h = async () => {
					try {
						d(!0);
						const e = await fetch(
							"/api/quests/history?userId="
								.concat(s, "&limit=")
								.concat(20, "&offset=")
								.concat((o - 1) * 20),
							{
								method: "GET",
								headers: { "Content-Type": "application/json" },
							},
						);
						if (!e.ok) throw Error("Failed to fetch quest history");
						const t = await e.json();
						1 === o ? r(t.quests || []) : r((e) => [...e, ...(t.quests || [])]),
							u(20 === (t.quests || []).length),
							c(null);
					} catch (e) {
						console.error("Error fetching quest history:", e),
							c("Failed to load quest history");
					} finally {
						d(!1);
					}
				};
				const g = (e) =>
					({
						daily: "\uD83D\uDCC5",
						weekly: "\uD83D\uDCCA",
						monthly: "\uD83D\uDCC8",
						special: "⭐",
					})[e] || "\uD83D\uDCCB";
				const p = (e) =>
					({
						easy: "text-green-600 bg-green-100",
						medium: "text-yellow-600 bg-yellow-100",
						hard: "text-orange-600 bg-orange-100",
						epic: "text-purple-600 bg-purple-100",
					})[e] || "text-gray-600 bg-gray-100";
				const j = (e) =>
					new Date(e).toLocaleDateString("en-US", {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					});
				return i && 1 === o
					? (0, a.jsx)("div", {
							className: "flex items-center justify-center h-64",
							children: (0, a.jsx)("div", {
								className:
									"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
							}),
						})
					: n
						? (0, a.jsx)("div", {
								className: "bg-red-50 border border-red-200 rounded-lg p-4",
								children: (0, a.jsx)("p", {
									className: "text-red-800",
									children: n,
								}),
							})
						: (0, a.jsxs)("div", {
								className: "space-y-4",
								children: [
									(0, a.jsxs)("div", {
										className: "flex justify-between items-center",
										children: [
											(0, a.jsx)("h3", {
												className: "text-lg font-semibold text-gray-900",
												children: "Quest History",
											}),
											(0, a.jsxs)("div", {
												className: "text-sm text-gray-600",
												children: ["Showing ", t.length, " completed quests"],
											}),
										],
									}),
									0 === t.length
										? (0, a.jsxs)("div", {
												className: "text-center py-12",
												children: [
													(0, a.jsx)("div", {
														className: "text-6xl mb-4",
														children: "\uD83D\uDCDC",
													}),
													(0, a.jsx)("h3", {
														className: "text-lg font-medium text-gray-900 mb-2",
														children: "No Quest History",
													}),
													(0, a.jsx)("p", {
														className: "text-gray-600",
														children:
															"Complete some quests to see your history here!",
													}),
												],
											})
										: (0, a.jsxs)(a.Fragment, {
												children: [
													(0, a.jsx)("div", {
														className: "space-y-3",
														children: t.map((e) =>
															e.quest
																? (0, a.jsx)(
																		"div",
																		{
																			className:
																				"bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow",
																			children: (0, a.jsxs)("div", {
																				className:
																					"flex justify-between items-start",
																				children: [
																					(0, a.jsxs)("div", {
																						className:
																							"flex items-start space-x-3",
																						children: [
																							(0, a.jsx)("div", {
																								className: "text-xl mt-1",
																								children: g(e.quest.quest_type),
																							}),
																							(0, a.jsxs)("div", {
																								className: "flex-1",
																								children: [
																									(0, a.jsx)("h4", {
																										className:
																											"font-medium text-gray-900",
																										children: e.quest.title,
																									}),
																									(0, a.jsx)("p", {
																										className:
																											"text-sm text-gray-600 mt-1",
																										children:
																											e.quest.description,
																									}),
																									(0, a.jsxs)("div", {
																										className:
																											"flex items-center space-x-3 mt-2",
																										children: [
																											(0, a.jsx)("span", {
																												className:
																													"px-2 py-1 rounded-full text-xs font-medium ".concat(
																														p(
																															e.quest
																																.difficulty,
																														),
																													),
																												children:
																													e.quest.difficulty
																														.charAt(0)
																														.toUpperCase() +
																													e.quest.difficulty.slice(
																														1,
																													),
																											}),
																											(0, a.jsxs)("span", {
																												className:
																													"text-xs text-gray-500",
																												children: [
																													"Completed: ",
																													e.completed_at
																														? j(e.completed_at)
																														: "Unknown",
																												],
																											}),
																										],
																									}),
																								],
																							}),
																						],
																					}),
																					(0, a.jsxs)("div", {
																						className: "text-right",
																						children: [
																							(0, a.jsx)("div", {
																								className:
																									"text-sm text-gray-600",
																								children: "Progress",
																							}),
																							(0, a.jsxs)("div", {
																								className:
																									"text-lg font-semibold text-gray-900",
																								children: [
																									e.progress_value,
																									" / ",
																									e.quest.target_value,
																								],
																							}),
																							(0, a.jsxs)("div", {
																								className: "mt-2 space-y-1",
																								children: [
																									(0, a.jsxs)("div", {
																										className:
																											"text-xs text-blue-600",
																										children: [
																											"⭐ ",
																											e.quest.reward_xp,
																											" XP",
																										],
																									}),
																									(0, a.jsxs)("div", {
																										className:
																											"text-xs text-green-600",
																										children: [
																											"\uD83D\uDCB0 $",
																											e.quest.reward_commission.toFixed(
																												2,
																											),
																										],
																									}),
																									e.reward_claimed &&
																										(0, a.jsxs)("div", {
																											className:
																												"text-xs text-purple-600",
																											children: [
																												"\uD83D\uDC8E Claimed: ",
																												e.reward_claimed_at
																													? j(
																															e.reward_claimed_at,
																														)
																													: "Unknown",
																											],
																										}),
																								],
																							}),
																						],
																					}),
																				],
																			}),
																		},
																		e.id,
																	)
																: null,
														),
													}),
													m &&
														(0, a.jsx)("div", {
															className: "text-center pt-4",
															children: (0, a.jsx)("button", {
																onClick: () => {
																	m && !i && x((e) => e + 1);
																},
																disabled: i,
																className:
																	"bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
																children: i ? "Loading..." : "Load More",
															}),
														}),
												],
											}),
								],
							});
			}
			function d(e) {
				const { userId: s } = e;
				const [t, r] = (0, l.useState)(null);
				const [i, d] = (0, l.useState)(null);
				const [n, c] = (0, l.useState)([]);
				const [o, x] = (0, l.useState)([]);
				const [m, u] = (0, l.useState)(!0);
				const [h, g] = (0, l.useState)(null);
				const [p, j] = (0, l.useState)("overview");
				(0, l.useEffect)(() => {
					b();
				}, [s]);
				const b = async () => {
					try {
						u(!0);
						const e = await fetch(
							"/api/quests/history?userId=".concat(s, "&limit=100"),
							{
								method: "GET",
								headers: { "Content-Type": "application/json" },
							},
						);
						if (!e.ok) throw Error("Failed to fetch quest stats");
						const t = await e.json();
						r(t.stats),
							d(t.reward_stats),
							c(t.progress_history || []),
							x(t.reward_history || []),
							g(null);
					} catch (e) {
						console.error("Error fetching quest stats:", e),
							g("Failed to load statistics");
					} finally {
						u(!1);
					}
				};
				const N = (e) =>
					e >= 7
						? "text-red-600"
						: e >= 3
							? "text-orange-600"
							: e >= 1
								? "text-green-600"
								: "text-gray-600";
				const y = (e) =>
					new Intl.NumberFormat("en-US", {
						style: "currency",
						currency: "USD",
					}).format(e);
				const v = (e) => new Intl.NumberFormat("en-US").format(e);
				return m
					? (0, a.jsx)("div", {
							className: "flex items-center justify-center h-64",
							children: (0, a.jsx)("div", {
								className:
									"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
							}),
						})
					: h
						? (0, a.jsx)("div", {
								className: "bg-red-50 border border-red-200 rounded-lg p-4",
								children: (0, a.jsx)("p", {
									className: "text-red-800",
									children: h,
								}),
							})
						: (0, a.jsxs)("div", {
								className: "space-y-6",
								children: [
									(0, a.jsx)("div", {
										className: "border-b border-gray-200",
										children: (0, a.jsx)("nav", {
											className: "-mb-px flex space-x-8",
											children: [
												{ key: "overview", label: "Overview" },
												{ key: "rewards", label: "Rewards" },
												{ key: "history", label: "Progress History" },
											].map((e) => {
												const { key: s, label: t } = e;
												return (0, a.jsx)(
													"button",
													{
														onClick: () => j(s),
														className:
															"\n                py-2 px-1 border-b-2 font-medium text-sm\n                ".concat(
																p === s
																	? "border-blue-500 text-blue-600"
																	: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
																"\n              ",
															),
														children: t,
													},
													s,
												);
											}),
										}),
									}),
									"overview" === p &&
										t &&
										(0, a.jsxs)("div", {
											className: "space-y-6",
											children: [
												(0, a.jsxs)("div", {
													className:
														"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
													children: [
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "flex items-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "p-3 bg-blue-100 rounded-lg",
																		children: (0, a.jsx)("span", {
																			className: "text-2xl",
																			children: "\uD83D\uDCCA",
																		}),
																	}),
																	(0, a.jsxs)("div", {
																		className: "ml-4",
																		children: [
																			(0, a.jsx)("p", {
																				className: "text-sm text-gray-600",
																				children: "Total Quests",
																			}),
																			(0, a.jsx)("p", {
																				className:
																					"text-2xl font-bold text-gray-900",
																				children: t.total_quests,
																			}),
																		],
																	}),
																],
															}),
														}),
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "flex items-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "p-3 bg-green-100 rounded-lg",
																		children: (0, a.jsx)("span", {
																			className: "text-2xl",
																			children: "✅",
																		}),
																	}),
																	(0, a.jsxs)("div", {
																		className: "ml-4",
																		children: [
																			(0, a.jsx)("p", {
																				className: "text-sm text-gray-600",
																				children: "Completed",
																			}),
																			(0, a.jsx)("p", {
																				className:
																					"text-2xl font-bold text-gray-900",
																				children: t.completed_quests,
																			}),
																		],
																	}),
																],
															}),
														}),
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "flex items-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "p-3 bg-purple-100 rounded-lg",
																		children: (0, a.jsx)("span", {
																			className: "text-2xl",
																			children: "⭐",
																		}),
																	}),
																	(0, a.jsxs)("div", {
																		className: "ml-4",
																		children: [
																			(0, a.jsx)("p", {
																				className: "text-sm text-gray-600",
																				children: "Total XP",
																			}),
																			(0, a.jsx)("p", {
																				className:
																					"text-2xl font-bold text-gray-900",
																				children: v(t.total_xp_earned),
																			}),
																		],
																	}),
																],
															}),
														}),
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "flex items-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "p-3 bg-yellow-100 rounded-lg",
																		children: (0, a.jsx)("span", {
																			className: "text-2xl",
																			children: "\uD83D\uDD25",
																		}),
																	}),
																	(0, a.jsxs)("div", {
																		className: "ml-4",
																		children: [
																			(0, a.jsx)("p", {
																				className: "text-sm text-gray-600",
																				children: "Current Streak",
																			}),
																			(0, a.jsxs)("p", {
																				className: "text-2xl font-bold ".concat(
																					N(t.current_streak),
																				),
																				children: [t.current_streak, " days"],
																			}),
																		],
																	}),
																],
															}),
														}),
													],
												}),
												(0, a.jsxs)("div", {
													className: "bg-white rounded-lg shadow p-6",
													children: [
														(0, a.jsx)("h3", {
															className:
																"text-lg font-semibold text-gray-900 mb-4",
															children: "Progress Overview",
														}),
														(0, a.jsxs)("div", {
															className: "space-y-4",
															children: [
																(0, a.jsxs)("div", {
																	children: [
																		(0, a.jsxs)("div", {
																			className:
																				"flex justify-between text-sm text-gray-600 mb-1",
																			children: [
																				(0, a.jsx)("span", {
																					children: "Completion Rate",
																				}),
																				(0, a.jsxs)("span", {
																					children: [
																						t.completion_rate.toFixed(1),
																						"%",
																					],
																				}),
																			],
																		}),
																		(0, a.jsx)("div", {
																			className:
																				"w-full bg-gray-200 rounded-full h-3",
																			children: (0, a.jsx)("div", {
																				className:
																					"bg-blue-500 h-3 rounded-full transition-all duration-300",
																				style: {
																					width: "".concat(
																						Math.min(t.completion_rate, 100),
																						"%",
																					),
																				},
																			}),
																		}),
																	],
																}),
																(0, a.jsxs)("div", {
																	className: "grid grid-cols-2 gap-4",
																	children: [
																		(0, a.jsxs)("div", {
																			className: "bg-gray-50 rounded-lg p-4",
																			children: [
																				(0, a.jsx)("p", {
																					className: "text-sm text-gray-600",
																					children: "In Progress",
																				}),
																				(0, a.jsx)("p", {
																					className:
																						"text-xl font-bold text-gray-900",
																					children: t.in_progress_quests,
																				}),
																			],
																		}),
																		(0, a.jsxs)("div", {
																			className: "bg-gray-50 rounded-lg p-4",
																			children: [
																				(0, a.jsx)("p", {
																					className: "text-sm text-gray-600",
																					children: "Total Commission",
																				}),
																				(0, a.jsx)("p", {
																					className:
																						"text-xl font-bold text-gray-900",
																					children: y(
																						t.total_commission_earned,
																					),
																				}),
																			],
																		}),
																	],
																}),
															],
														}),
													],
												}),
											],
										}),
									"rewards" === p &&
										i &&
										(0, a.jsxs)("div", {
											className: "space-y-6",
											children: [
												(0, a.jsxs)("div", {
													className: "grid grid-cols-1 md:grid-cols-3 gap-4",
													children: [
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "text-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "text-3xl mb-2",
																		children: "⭐",
																	}),
																	(0, a.jsx)("p", {
																		className: "text-sm text-gray-600",
																		children: "Total XP Earned",
																	}),
																	(0, a.jsx)("p", {
																		className:
																			"text-2xl font-bold text-gray-900",
																		children: v(i.total_xp_earned),
																	}),
																],
															}),
														}),
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "text-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "text-3xl mb-2",
																		children: "\uD83D\uDCB0",
																	}),
																	(0, a.jsx)("p", {
																		className: "text-sm text-gray-600",
																		children: "Total Commission",
																	}),
																	(0, a.jsx)("p", {
																		className:
																			"text-2xl font-bold text-gray-900",
																		children: y(i.total_commission_earned),
																	}),
																],
															}),
														}),
														(0, a.jsx)("div", {
															className: "bg-white rounded-lg shadow p-6",
															children: (0, a.jsxs)("div", {
																className: "text-center",
																children: [
																	(0, a.jsx)("div", {
																		className: "text-3xl mb-2",
																		children: "\uD83C\uDFC6",
																	}),
																	(0, a.jsx)("p", {
																		className: "text-sm text-gray-600",
																		children: "Reward Streak",
																	}),
																	(0, a.jsxs)("p", {
																		className: "text-2xl font-bold ".concat(
																			N(i.reward_streak),
																		),
																		children: [i.reward_streak, " days"],
																	}),
																],
															}),
														}),
													],
												}),
												(0, a.jsxs)("div", {
													className: "bg-white rounded-lg shadow p-6",
													children: [
														(0, a.jsx)("h3", {
															className:
																"text-lg font-semibold text-gray-900 mb-4",
															children: "Reward Averages",
														}),
														(0, a.jsxs)("div", {
															className:
																"grid grid-cols-1 md:grid-cols-2 gap-4",
															children: [
																(0, a.jsxs)("div", {
																	className: "bg-blue-50 rounded-lg p-4",
																	children: [
																		(0, a.jsx)("p", {
																			className: "text-sm text-blue-600 mb-1",
																			children: "Average XP per Quest",
																		}),
																		(0, a.jsxs)("p", {
																			className:
																				"text-xl font-bold text-blue-900",
																			children: [
																				v(Math.round(i.average_xp_per_quest)),
																				" XP",
																			],
																		}),
																	],
																}),
																(0, a.jsxs)("div", {
																	className: "bg-green-50 rounded-lg p-4",
																	children: [
																		(0, a.jsx)("p", {
																			className: "text-sm text-green-600 mb-1",
																			children: "Average Commission per Quest",
																		}),
																		(0, a.jsx)("p", {
																			className:
																				"text-xl font-bold text-green-900",
																			children: y(
																				i.average_commission_per_quest,
																			),
																		}),
																	],
																}),
															],
														}),
														(0, a.jsxs)("div", {
															className: "mt-4 p-4 bg-purple-50 rounded-lg",
															children: [
																(0, a.jsx)("p", {
																	className: "text-sm text-purple-600 mb-1",
																	children: "Most Profitable Quest Type",
																}),
																(0, a.jsx)("p", {
																	className:
																		"text-lg font-bold text-purple-900 capitalize",
																	children: i.most_profitable_quest_type,
																}),
															],
														}),
													],
												}),
												(0, a.jsxs)("div", {
													className: "bg-white rounded-lg shadow p-6",
													children: [
														(0, a.jsx)("h3", {
															className:
																"text-lg font-semibold text-gray-900 mb-4",
															children: "Recent Rewards",
														}),
														(0, a.jsxs)("div", {
															className: "space-y-3",
															children: [
																o
																	.slice(0, 5)
																	.map((e) =>
																		(0, a.jsxs)(
																			"div",
																			{
																				className:
																					"flex justify-between items-center p-3 bg-gray-50 rounded-lg",
																				children: [
																					(0, a.jsxs)("div", {
																						children: [
																							(0, a.jsx)("p", {
																								className:
																									"font-medium text-gray-900",
																								children: e.quest_title,
																							}),
																							(0, a.jsxs)("p", {
																								className:
																									"text-sm text-gray-600",
																								children: [
																									e.quest_type,
																									" • ",
																									e.character_class,
																								],
																							}),
																						],
																					}),
																					(0, a.jsxs)("div", {
																						className: "text-right",
																						children: [
																							(0, a.jsxs)("div", {
																								className:
																									"text-sm text-blue-600",
																								children: [
																									"⭐ ",
																									e.xp_earned,
																									" XP",
																								],
																							}),
																							(0, a.jsxs)("div", {
																								className:
																									"text-sm text-green-600",
																								children: [
																									"\uD83D\uDCB0 ",
																									y(e.commission_earned),
																								],
																							}),
																						],
																					}),
																				],
																			},
																			e.id,
																		),
																	),
																0 === o.length &&
																	(0, a.jsx)("p", {
																		className: "text-center text-gray-500 py-4",
																		children: "No rewards claimed yet",
																	}),
															],
														}),
													],
												}),
											],
										}),
									"history" === p &&
										(0, a.jsxs)("div", {
											className: "bg-white rounded-lg shadow p-6",
											children: [
												(0, a.jsx)("h3", {
													className: "text-lg font-semibold text-gray-900 mb-4",
													children: "Progress History (Last 30 Days)",
												}),
												n.length > 0
													? (0, a.jsx)("div", {
															className: "space-y-3",
															children: n
																.slice(-7)
																.reverse()
																.map((e) =>
																	(0, a.jsxs)(
																		"div",
																		{
																			className:
																				"flex justify-between items-center p-3 bg-gray-50 rounded-lg",
																			children: [
																				(0, a.jsx)("div", {
																					children: (0, a.jsx)("p", {
																						className:
																							"font-medium text-gray-900",
																						children: e.date,
																					}),
																				}),
																				(0, a.jsxs)("div", {
																					className: "text-right",
																					children: [
																						(0, a.jsxs)("div", {
																							className:
																								"text-sm text-green-600",
																							children: [
																								"✅ ",
																								e.completed_quests,
																								" completed",
																							],
																						}),
																						(0, a.jsxs)("div", {
																							className:
																								"text-sm text-blue-600",
																							children: [
																								"\uD83D\uDCCA ",
																								e.total_progress,
																								" progress",
																							],
																						}),
																					],
																				}),
																			],
																		},
																		e.date,
																	),
																),
														})
													: (0, a.jsx)("p", {
															className: "text-center text-gray-500 py-4",
															children: "No progress history available",
														}),
											],
										}),
								],
							});
			}
			const n = t(4959);
			function c(e) {
				const { companyId: s } = e;
				const [t, c] = (0, l.useState)([]);
				const [o, x] = (0, l.useState)(!0);
				const [m, u] = (0, l.useState)(null);
				const [h, g] = (0, l.useState)("active");
				const { user: p } = (0, n.X)();
				(0, l.useEffect)(() => {
					(null == p ? void 0 : p.id) && j();
				}, [p, s]);
				const j = async () => {
					try {
						x(!0);
						const e = await fetch(
							"/api/quests/active?userId=".concat(null == p ? void 0 : p.id),
							{
								method: "GET",
								headers: { "Content-Type": "application/json" },
							},
						);
						if (!e.ok) throw Error("Failed to fetch active quests");
						const s = await e.json();
						c(s.quests || []), u(null);
					} catch (e) {
						console.error("Error fetching active quests:", e),
							u("Failed to load quests");
					} finally {
						x(!1);
					}
				};
				const b = (e, s) => {
					c((t) => t.map((t) => (t.id === e ? s : t)));
				};
				const N = async () => {
					try {
						(
							await fetch("/api/quests/active", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									userId: null == p ? void 0 : p.id,
									companyId: s,
									userLevel: 1,
									characterClass: "scout",
									questType: "daily",
								}),
							})
						).ok && (await j());
					} catch (e) {
						console.error("Error generating new quests:", e);
					}
				};
				return o
					? (0, a.jsx)("div", {
							className: "flex items-center justify-center h-64",
							children: (0, a.jsx)("div", {
								className:
									"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
							}),
						})
					: m
						? (0, a.jsx)("div", {
								className: "bg-red-50 border border-red-200 rounded-lg p-4",
								children: (0, a.jsx)("p", {
									className: "text-red-800",
									children: m,
								}),
							})
						: (0, a.jsxs)("div", {
								className: "space-y-6",
								children: [
									(0, a.jsxs)("div", {
										className: "flex justify-between items-center",
										children: [
											(0, a.jsxs)("div", {
												children: [
													(0, a.jsx)("h2", {
														className: "text-2xl font-bold text-gray-900",
														children: "Quest Dashboard",
													}),
													(0, a.jsx)("p", {
														className: "text-gray-600",
														children: "Complete quests to earn XP and rewards",
													}),
												],
											}),
											(0, a.jsx)("button", {
												onClick: N,
												className:
													"bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors",
												children: "Generate New Quests",
											}),
										],
									}),
									(0, a.jsxs)("div", {
										className: "grid grid-cols-1 md:grid-cols-3 gap-4",
										children: [
											(0, a.jsx)("div", {
												className: "bg-white rounded-lg shadow p-6",
												children: (0, a.jsxs)("div", {
													className: "flex items-center",
													children: [
														(0, a.jsx)("div", {
															className: "p-2 bg-blue-100 rounded-lg",
															children: (0, a.jsx)("span", {
																className: "text-2xl",
																children: "\uD83D\uDCCB",
															}),
														}),
														(0, a.jsxs)("div", {
															className: "ml-4",
															children: [
																(0, a.jsx)("p", {
																	className: "text-sm text-gray-600",
																	children: "Active Quests",
																}),
																(0, a.jsx)("p", {
																	className: "text-2xl font-bold text-gray-900",
																	children: t.length,
																}),
															],
														}),
													],
												}),
											}),
											(0, a.jsx)("div", {
												className: "bg-white rounded-lg shadow p-6",
												children: (0, a.jsxs)("div", {
													className: "flex items-center",
													children: [
														(0, a.jsx)("div", {
															className: "p-2 bg-green-100 rounded-lg",
															children: (0, a.jsx)("span", {
																className: "text-2xl",
																children: "✅",
															}),
														}),
														(0, a.jsxs)("div", {
															className: "ml-4",
															children: [
																(0, a.jsx)("p", {
																	className: "text-sm text-gray-600",
																	children: "Completed Today",
																}),
																(0, a.jsx)("p", {
																	className: "text-2xl font-bold text-gray-900",
																	children: t.filter((e) => e.is_completed)
																		.length,
																}),
															],
														}),
													],
												}),
											}),
											(0, a.jsx)("div", {
												className: "bg-white rounded-lg shadow p-6",
												children: (0, a.jsxs)("div", {
													className: "flex items-center",
													children: [
														(0, a.jsx)("div", {
															className: "p-2 bg-purple-100 rounded-lg",
															children: (0, a.jsx)("span", {
																className: "text-2xl",
																children: "\uD83D\uDC8E",
															}),
														}),
														(0, a.jsxs)("div", {
															className: "ml-4",
															children: [
																(0, a.jsx)("p", {
																	className: "text-sm text-gray-600",
																	children: "Total Rewards",
																}),
																(0, a.jsxs)("p", {
																	className: "text-2xl font-bold text-gray-900",
																	children: [
																		t.reduce((e, s) => {
																			let t;
																			return (
																				e +
																				((null == (t = s.quest)
																					? void 0
																					: t.reward_xp) || 0)
																			);
																		}, 0),
																		" ",
																		"XP",
																	],
																}),
															],
														}),
													],
												}),
											}),
										],
									}),
									(0, a.jsx)("div", {
										className: "border-b border-gray-200",
										children: (0, a.jsx)("nav", {
											className: "-mb-px flex space-x-8",
											children: [
												{
													key: "active",
													label: "Active Quests",
													count: t.length,
												},
												{ key: "history", label: "History", count: 0 },
												{ key: "stats", label: "Statistics", count: 0 },
											].map((e) => {
												const { key: s, label: t, count: l } = e;
												return (0, a.jsxs)(
													"button",
													{
														onClick: () => g(s),
														className:
															"\n                py-2 px-1 border-b-2 font-medium text-sm\n                ".concat(
																h === s
																	? "border-blue-500 text-blue-600"
																	: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
																"\n              ",
															),
														children: [
															t,
															l > 0 &&
																(0, a.jsx)("span", {
																	className:
																		"ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs",
																	children: l,
																}),
														],
													},
													s,
												);
											}),
										}),
									}),
									(0, a.jsxs)("div", {
										className: "mt-6",
										children: [
											"active" === h &&
												(0, a.jsx)("div", {
													className: "space-y-4",
													children:
														0 === t.length
															? (0, a.jsxs)("div", {
																	className: "text-center py-12",
																	children: [
																		(0, a.jsx)("div", {
																			className: "text-6xl mb-4",
																			children: "\uD83D\uDCDD",
																		}),
																		(0, a.jsx)("h3", {
																			className:
																				"text-lg font-medium text-gray-900 mb-2",
																			children: "No Active Quests",
																		}),
																		(0, a.jsx)("p", {
																			className: "text-gray-600 mb-4",
																			children:
																				"Generate new quests to start earning rewards!",
																		}),
																		(0, a.jsx)("button", {
																			onClick: N,
																			className:
																				"bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors",
																			children: "Generate Quests",
																		}),
																	],
																})
															: (0, a.jsx)("div", {
																	className: "grid gap-4",
																	children: t.map((e) =>
																		(0, a.jsx)(
																			r,
																			{
																				quest: e,
																				onUpdate: b,
																				userId:
																					(null == p ? void 0 : p.id) || "",
																			},
																			e.id,
																		),
																	),
																}),
												}),
											"history" === h &&
												(0, a.jsx)(i, {
													userId: (null == p ? void 0 : p.id) || "",
												}),
											"stats" === h &&
												(0, a.jsx)(d, {
													userId: (null == p ? void 0 : p.id) || "",
												}),
										],
									}),
								],
							});
			}
			function o(e) {
				const { userId: s, onQuestComplete: t, onRewardClaim: r } = e;
				const [i, d] = (0, l.useState)([]);
				const [n, c] = (0, l.useState)(!1);
				const [o, x] = (0, l.useState)(0);
				(0, l.useEffect)(() => {
					m();
					const e = u();
					return () => (null == e ? void 0 : e.unsubscribe());
				}, [s]);
				const m = async () => {
					try {
						const e = await fetch(
							"/api/quests/notifications?userId=".concat(s),
							{
								method: "GET",
								headers: { "Content-Type": "application/json" },
							},
						);
						if (e.ok) {
							const s = await e.json();
							d(s.notifications || []), h(s.notifications || []);
						}
					} catch (e) {
						console.error("Error fetching notifications:", e);
					}
				};
				const u = () => {
					const e = setInterval(m, 3e4);
					return { unsubscribe: () => clearInterval(e) };
				};
				const h = (e) => {
					x(e.filter((e) => !e.read).length);
				};
				const g = async (e) => {
					try {
						await fetch("/api/quests/notifications/".concat(e, "/read"), {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
						}),
							d((s) => s.map((s) => (s.id === e ? { ...s, read: !0 } : s))),
							h(i.map((s) => (s.id === e ? { ...s, read: !0 } : s)));
					} catch (e) {
						console.error("Error marking notification as read:", e);
					}
				};
				const p = async () => {
					try {
						await fetch("/api/quests/notifications/read-all", {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ userId: s }),
						}),
							d((e) => e.map((e) => ({ ...e, read: !0 }))),
							x(0);
					} catch (e) {
						console.error("Error marking all notifications as read:", e);
					}
				};
				const j = (e) =>
					({
						quest_completed: "\uD83C\uDF89",
						reward_available: "\uD83D\uDC8E",
						new_quest: "\uD83D\uDCDD",
						quest_reminder: "⏰",
					})[e] || "\uD83D\uDCE2";
				const b = (e) =>
					({
						quest_completed: "border-green-200 bg-green-50",
						reward_available: "border-purple-200 bg-purple-50",
						new_quest: "border-blue-200 bg-blue-50",
						quest_reminder: "border-yellow-200 bg-yellow-50",
					})[e] || "border-gray-200 bg-gray-50";
				const N = (e) => {
					e.action?.callback(), g(e.id), c(!1);
				};
				return (0, a.jsxs)("div", {
					className: "relative",
					children: [
						(0, a.jsxs)("button", {
							onClick: () => c(!n),
							className:
								"relative p-2 text-gray-600 hover:text-gray-900 transition-colors",
							children: [
								(0, a.jsx)("span", {
									className: "text-xl",
									children: "\uD83D\uDD14",
								}),
								o > 0 &&
									(0, a.jsx)("span", {
										className:
											"absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center",
										children: o > 99 ? "99+" : o,
									}),
							],
						}),
						n &&
							(0, a.jsxs)("div", {
								className:
									"absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50",
								children: [
									(0, a.jsxs)("div", {
										className:
											"flex items-center justify-between p-4 border-b border-gray-200",
										children: [
											(0, a.jsx)("h3", {
												className: "text-lg font-semibold text-gray-900",
												children: "Quest Notifications",
											}),
											o > 0 &&
												(0, a.jsx)("button", {
													onClick: p,
													className:
														"text-sm text-blue-600 hover:text-blue-700",
													children: "Mark all as read",
												}),
										],
									}),
									(0, a.jsx)("div", {
										className: "max-h-96 overflow-y-auto",
										children:
											0 === i.length
												? (0, a.jsxs)("div", {
														className: "p-8 text-center",
														children: [
															(0, a.jsx)("div", {
																className: "text-4xl mb-2",
																children: "\uD83D\uDCED",
															}),
															(0, a.jsx)("p", {
																className: "text-gray-600",
																children: "No notifications",
															}),
														],
													})
												: (0, a.jsx)("div", {
														className: "divide-y divide-gray-200",
														children: i.map((e) =>
															(0, a.jsx)(
																"div",
																{
																	className: "p-4 border-l-4 "
																		.concat(b(e.type), " ")
																		.concat(e.read ? "" : "bg-blue-50"),
																	children: (0, a.jsxs)("div", {
																		className: "flex items-start space-x-3",
																		children: [
																			(0, a.jsx)("div", {
																				className: "text-xl",
																				children: j(e.type),
																			}),
																			(0, a.jsxs)("div", {
																				className: "flex-1",
																				children: [
																					(0, a.jsxs)("div", {
																						className:
																							"flex items-center justify-between",
																						children: [
																							(0, a.jsx)("h4", {
																								className:
																									"font-medium text-gray-900",
																								children: e.title,
																							}),
																							!e.read &&
																								(0, a.jsx)("div", {
																									className:
																										"w-2 h-2 bg-blue-500 rounded-full",
																								}),
																						],
																					}),
																					(0, a.jsx)("p", {
																						className:
																							"text-sm text-gray-600 mt-1",
																						children: e.message,
																					}),
																					(0, a.jsxs)("div", {
																						className:
																							"flex items-center justify-between mt-2",
																						children: [
																							(0, a.jsx)("span", {
																								className:
																									"text-xs text-gray-500",
																								children: new Date(
																									e.timestamp,
																								).toLocaleString(),
																							}),
																							e.action &&
																								(0, a.jsx)("button", {
																									onClick: () => N(e),
																									className:
																										"text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors",
																									children: e.action.label,
																								}),
																						],
																					}),
																				],
																			}),
																			!e.read &&
																				(0, a.jsx)("button", {
																					onClick: () => g(e.id),
																					className:
																						"text-gray-400 hover:text-gray-600",
																					children: (0, a.jsx)("span", {
																						className: "text-sm",
																						children: "\xd7",
																					}),
																				}),
																		],
																	}),
																},
																e.id,
															),
														),
													}),
									}),
								],
							}),
					],
				});
			}
			const x = t(1616);
			const m = t(828);
			function u() {
				let e;
				const { user: s, isLoading: t } = (0, n.X)();
				const l = (0, x.useRouter)();
				if (t)
					return (0, a.jsx)("div", {
						className: "min-h-screen flex items-center justify-center",
						children: (0, a.jsx)("div", {
							className:
								"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
						}),
					});
				if (!s) return l.push("/login"), null;
				const r =
					(null == s || null == (e = s.metadata) ? void 0 : e.companyId) ||
					m.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ||
					"default";
				return (0, a.jsxs)("div", {
					className: "min-h-screen bg-gray-50",
					children: [
						(0, a.jsx)("header", {
							className: "bg-white shadow-sm border-b border-gray-200",
							children: (0, a.jsx)("div", {
								className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
								children: (0, a.jsxs)("div", {
									className: "flex justify-between items-center h-16",
									children: [
										(0, a.jsxs)("div", {
											className: "flex items-center",
											children: [
												(0, a.jsx)("h1", {
													className: "text-2xl font-bold text-gray-900",
													children: "Quests",
												}),
												(0, a.jsx)("p", {
													className: "ml-2 text-gray-600",
													children: "Complete challenges to earn rewards",
												}),
											],
										}),
										(0, a.jsx)("div", {
											className: "flex items-center space-x-4",
											children: (0, a.jsx)(o, {
												userId: s.id,
												onQuestComplete: (e) => {
													console.log("Quest completed:", e);
												},
												onRewardClaim: (e) => {
													console.log("Reward claimed:", e);
												},
											}),
										}),
									],
								}),
							}),
						}),
						(0, a.jsx)("main", {
							className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
							children: (0, a.jsx)(c, { companyId: r }),
						}),
					],
				});
			}
		},
		9030: (e, s, t) => {
			t.d(s, { N: () => d });
			const a = t(2104);
			const l = t(828);
			const r = "https://slftjqvrjdkzvzenmvnq.supabase.co";
			const i = l.env.SUPABASE_SERVICE_ROLE_KEY;
			const d = (0, a.UU)(
				r,
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZnRqcXZyamRrenZ6ZW5tdm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTE2MjAsImV4cCI6MjA3MzY4NzYyMH0.u2TE7n2o6kd1oaZtoCBxDQV09n5dqlcejEMXx7O_XHY",
				{ auth: { persistSession: !1 } },
			);
			(0, a.UU)(r, i, { auth: { persistSession: !1 } });
		},
	},
	(e) => {
		const s = (s) => e((e.s = s));
		e.O(0, [3273, 1473, 769, 7358], () => s(1145)), (_N_E = e.O());
	},
]);
