(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[6051],
	{
		3976: (e, t, a) => {
			a.r(t), a.d(t, { default: () => h });
			const r = a(5010);
			const s = a(8602);
			const i = a(9030);
			class n extends Error {
				constructor(e, t) {
					super(e), (this.field = t), (this.name = "ValidationError");
				}
			}
			class l {
				static sanitizeString(e) {
					return "string" !== typeof e
						? ""
						: e
								.replace(/</g, "&lt;")
								.replace(/>/g, "&gt;")
								.replace(/"/g, "&quot;")
								.replace(/'/g, "&#x27;")
								.replace(/\//g, "&#x2F;")
								.replace(/javascript:/gi, "blocked:")
								.replace(/on\w+\s*=/gi, "blocked=");
				}
				static validateUserId(e) {
					const t = [];
					return e && "string" === typeof e
						? (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
								e,
							) || t.push("Invalid user ID format"),
							t.length > 0)
							? { isValid: !1, errors: t }
							: { isValid: !0, sanitized: l.sanitizeString(e) }
						: (t.push("User ID is required and must be a string"),
							{ isValid: !1, errors: t });
				}
				static validateCompanyId(e) {
					const t = [];
					return e && "string" === typeof e
						? (/^[a-zA-Z0-9_-]{3,50}$/.test(e) ||
								t.push("Invalid company ID format"),
							t.length > 0)
							? { isValid: !1, errors: t }
							: { isValid: !0, sanitized: l.sanitizeString(e) }
						: (t.push("Company ID is required and must be a string"),
							{ isValid: !1, errors: t });
				}
				static validateQuestParams(e) {
					const t = [];
					const a = {};
					if (
						(e.title &&
							("string" !== typeof e.title
								? t.push("Title must be a string")
								: e.title.length < 3 || e.title.length > 100
									? t.push("Title must be between 3 and 100 characters")
									: (a.title = l.sanitizeString(e.title))),
						e.description &&
							("string" !== typeof e.description
								? t.push("Description must be a string")
								: e.description.length > 500
									? t.push("Description must be less than 500 characters")
									: (a.description = l.sanitizeString(e.description))),
						void 0 !== e.target_value &&
							("number" !== typeof e.target_value ||
							e.target_value < 1 ||
							e.target_value > 1e4
								? t.push("Target value must be a number between 1 and 10000")
								: (a.target_value = Math.round(e.target_value))),
						void 0 !== e.reward_xp &&
							("number" !== typeof e.reward_xp ||
							e.reward_xp < 0 ||
							e.reward_xp > 1e4
								? t.push("Reward XP must be a number between 0 and 10000")
								: (a.reward_xp = Math.round(e.reward_xp))),
						void 0 !== e.reward_commission &&
							("number" !== typeof e.reward_commission ||
							e.reward_commission < 0 ||
							e.reward_commission > 1e3
								? t.push(
										"Reward commission must be a number between 0 and 1000",
									)
								: (a.reward_commission =
										Math.round(100 * e.reward_commission) / 100)),
						e.quest_type)
					) {
						const r = ["daily", "weekly", "monthly", "special"];
						r.includes(e.quest_type)
							? (a.quest_type = e.quest_type)
							: t.push(
									"Invalid quest type. Must be one of: ".concat(r.join(", ")),
								);
					}
					if (e.difficulty) {
						const r = ["easy", "medium", "hard", "epic"];
						r.includes(e.difficulty)
							? (a.difficulty = e.difficulty)
							: t.push(
									"Invalid difficulty. Must be one of: ".concat(r.join(", ")),
								);
					}
					return {
						isValid: 0 === t.length,
						sanitized: Object.keys(a).length > 0 ? a : void 0,
						errors: t.length > 0 ? t : void 0,
					};
				}
				static validateProgressUpdate(e, t, a) {
					const r = [];
					const s = l.validateUserId(e);
					return (
						s.isValid || r.push(...(s.errors || [])),
						(t && "string" === typeof t) ||
							r.push("Quest ID is required and must be a string"),
						("number" !== typeof a || a < 0 || a > 1e6) &&
							r.push("Progress value must be a number between 0 and 1,000,000"),
						a > 1e3 && r.push("Suspicious progress value detected"),
						{ isValid: 0 === r.length, errors: r.length > 0 ? r : void 0 }
					);
				}
				static validateLeaderboardParams(e) {
					const t = [];
					const a = {};
					if (e.category) {
						const r = [
							"referrals",
							"commission",
							"engagement",
							"quests",
							"retention",
							"overall",
						];
						r.includes(e.category)
							? (a.category = e.category)
							: t.push(
									"Invalid category. Must be one of: ".concat(r.join(", ")),
								);
					}
					if (e.timeframe) {
						const r = ["daily", "weekly", "monthly", "all_time"];
						r.includes(e.timeframe)
							? (a.timeframe = e.timeframe)
							: t.push(
									"Invalid timeframe. Must be one of: ".concat(r.join(", ")),
								);
					}
					return (
						void 0 !== e.limit &&
							("number" !== typeof e.limit || e.limit < 1 || e.limit > 1e3
								? t.push("Limit must be a number between 1 and 1000")
								: (a.limit = Math.round(e.limit))),
						void 0 !== e.offset &&
							("number" !== typeof e.offset || e.offset < 0
								? t.push("Offset must be a non-negative number")
								: (a.offset = Math.round(e.offset))),
						{
							isValid: 0 === t.length,
							sanitized: Object.keys(a).length > 0 ? a : void 0,
							errors: t.length > 0 ? t : void 0,
						}
					);
				}
				static validateAnalyticsParams(e) {
					const t = [];
					const a = {};
					if (e.start_date) {
						const r = new Date(e.start_date);
						Number.isNaN(r.getTime())
							? t.push("Invalid start date format")
							: (a.start_date = r.toISOString());
					}
					if (e.end_date) {
						const r = new Date(e.end_date);
						Number.isNaN(r.getTime())
							? t.push("Invalid end date format")
							: (a.end_date = r.toISOString());
					}
					if (e.start_date && e.end_date) {
						const a = new Date(e.start_date);
						a > new Date(e.end_date) &&
							t.push("Start date must be before end date");
						const r = new Date();
						r.setFullYear(r.getFullYear() - 1),
							a < r && t.push("Date range cannot exceed 1 year");
					}
					if (e.metrics)
						if (Array.isArray(e.metrics)) {
							const r = [
								"referrals",
								"commission",
								"engagement",
								"quests",
								"retention",
								"users",
							];
							const s = e.metrics.filter((e) => !r.includes(e));
							s.length > 0
								? t.push("Invalid metrics: ".concat(s.join(", ")))
								: (a.metrics = e.metrics);
						} else t.push("Metrics must be an array");
					if (e.group_by) {
						const r = ["day", "week", "month", "user", "quest_type"];
						r.includes(e.group_by)
							? (a.group_by = e.group_by)
							: t.push(
									"Invalid group_by. Must be one of: ".concat(r.join(", ")),
								);
					}
					return {
						isValid: 0 === t.length,
						sanitized: Object.keys(a).length > 0 ? a : void 0,
						errors: t.length > 0 ? t : void 0,
					};
				}
				static validate(e, t) {
					const a = [];
					if (t.required && (null == e || "" === e))
						return a.push("Value is required"), { isValid: !1, errors: a };
					if (!t.required && (null == e || "" === e)) return { isValid: !0 };
					if (t.type)
						switch (t.type) {
							case "string":
								"string" !== typeof e && a.push("Value must be a string");
								break;
							case "number":
								("number" !== typeof e || Number.isNaN(e)) &&
									a.push("Value must be a number");
								break;
							case "integer":
								("number" === typeof e && Number.isInteger(e)) ||
									a.push("Value must be an integer");
								break;
							case "boolean":
								"boolean" !== typeof e && a.push("Value must be a boolean");
								break;
							case "object":
								("object" !== typeof e || null === e || Array.isArray(e)) &&
									a.push("Value must be an object");
								break;
							case "array":
								Array.isArray(e) || a.push("Value must be an array");
						}
					if (
						("string" === typeof e &&
							(t.minLength &&
								e.length < t.minLength &&
								a.push(
									"Value must be at least ".concat(
										t.minLength,
										" characters long",
									),
								),
							t.maxLength &&
								e.length > t.maxLength &&
								a.push(
									"Value must be no more than ".concat(
										t.maxLength,
										" characters long",
									),
								),
							t.pattern &&
								!t.pattern.test(e) &&
								a.push("Value format is invalid")),
						"number" === typeof e &&
							!Number.isNaN(e) &&
							(void 0 !== t.min &&
								e < t.min &&
								a.push("Value must be at least ".concat(t.min)),
							void 0 !== t.max &&
								e > t.max &&
								a.push("Value must be no more than ".concat(t.max))),
						t.enum &&
							!t.enum.includes(e) &&
							a.push("Value must be one of: ".concat(t.enum.join(", "))),
						t.custom)
					) {
						const r = t.custom(e);
						!0 !== r &&
							a.push("string" === typeof r ? r : "Custom validation failed");
					}
					return { isValid: 0 === a.length, errors: a.length > 0 ? a : void 0 };
				}
				static validateRateLimit(e, t, a, r) {
					const s = [];
					return (
						(e && "string" === typeof e) ||
							s.push("User ID is required for rate limiting"),
						(t && "string" === typeof t) ||
							s.push("Action is required for rate limiting"),
						("number" !== typeof a || a < 1) &&
							s.push("Rate limit must be a positive number"),
						("number" !== typeof r || r < 1e3) &&
							s.push("Rate limit window must be at least 1000ms"),
						{ isValid: 0 === s.length, errors: s.length > 0 ? s : void 0 }
					);
				}
			}
			class c {
				async calculateLeaderboard(e) {
					const t = e.id.split("_")[0];
					const a = l.validateCompanyId(t);
					if (!a.isValid) {
						let r;
						throw new n(
							"Invalid company ID: ".concat(
								null == (r = a.errors) ? void 0 : r.join(", "),
							),
							"company_id",
						);
					}
					if (
						![
							"overall",
							"referrals",
							"commission",
							"engagement",
							"quests",
							"retention",
						].includes(e.category)
					)
						throw new n("Invalid category: ".concat(e.category), "category");
					if (!["daily", "weekly", "monthly", "all_time"].includes(e.timeframe))
						throw new n("Invalid timeframe: ".concat(e.timeframe), "timeframe");
					const { data: s, error: c } = await i.N.from(
						"member_performance_stats",
					)
						.select("*")
						.eq("company_id", t);
					if (c) throw c;
					if (!s || 0 === s.length) return [];
					const o = s
						.filter((t) => {
							let a;
							let r;
							let s;
							return (
								(null == (a = e.filters) ||
									!a.min_level ||
									!((t.level || 0) < e.filters.min_level)) &&
								(null == (r = e.filters) ||
									!r.character_classes ||
									!!e.filters.character_classes.includes(t.character_class)) &&
								(null == (s = e.filters) ||
									!s.min_activity ||
									!((t.engagement_score || 0) < e.filters.min_activity))
							);
						})
						.map((t) => {
							const a = this.calculateCategoryScore(t, e);
							const r =
								this.CHARACTER_CLASS_MULTIPLIERS[t.character_class] || 1;
							const s = this.getTimeframeWeight(t, e.timeframe);
							return { ...t, score: a * r * s };
						});
					o.sort((e, t) => t.score - e.score);
					const d = await this.getPreviousRanks(
						e.id,
						o.map((e) => e.user_id),
					);
					const m = o.map((t, a) => {
						const r = a + 1;
						const s = d[t.user_id];
						let i = "same";
						return (
							s ? (s > r ? (i = "up") : s < r && (i = "down")) : (i = "new"),
							{
								id: "".concat(e.id, "_").concat(t.user_id),
								user_id: t.user_id,
								username: t.username,
								avatar: t.avatar,
								character_class: t.character_class,
								level: t.level || 1,
								rank: r,
								score: t.score,
								previous_rank: s,
								change: i,
								metrics: {
									total_referrals: t.total_referrals || 0,
									total_commission: t.total_commission || 0,
									conversion_rate: t.conversion_rate || 0,
									engagement_score: t.engagement_score || 0,
									quest_completion_rate: t.quest_completion_rate || 0,
									retention_rate: t.retention_rate || 0,
								},
								badges: [],
								join_date: t.join_date,
								last_active: t.last_active,
							}
						);
					});
					return e.max_entries ? m.slice(0, e.max_entries) : m;
				}
				calculateCategoryScore(e, t) {
					const a = t.weights || this.getDefaultWeights(t.category);
					switch (t.category) {
						case "referrals":
							return (e.total_referrals || 0) * (a.referrals || 1);
						case "commission":
							return (e.total_commission || 0) * (a.commission || 1);
						case "engagement":
							return (e.engagement_score || 0) * (a.engagement || 1);
						case "quests":
							return (e.quest_completion_rate || 0) * (a.quests || 1);
						case "retention":
							return (e.retention_rate || 0) * (a.retention || 1);
						default:
							return this.calculateOverallScore(e, a);
					}
				}
				calculateOverallScore(e, t) {
					return (
						(e.total_referrals || 0) * (t.referrals || 0.3) +
						(e.total_commission || 0) * (t.commission || 0.4) +
						(e.engagement_score || 0) * (t.engagement || 0.2) +
						(e.quest_completion_rate || 0) * (t.quests || 0.1) +
						(e.retention_rate || 0) * (t.retention || 0.1)
					);
				}
				getDefaultWeights(e) {
					switch (e) {
						case "referrals":
							return {
								referrals: 1,
								commission: 0,
								engagement: 0,
								quests: 0,
								retention: 0,
							};
						case "commission":
							return {
								referrals: 0,
								commission: 1,
								engagement: 0,
								quests: 0,
								retention: 0,
							};
						case "engagement":
							return {
								referrals: 0,
								commission: 0,
								engagement: 1,
								quests: 0,
								retention: 0,
							};
						case "quests":
							return {
								referrals: 0,
								commission: 0,
								engagement: 0,
								quests: 1,
								retention: 0,
							};
						case "retention":
							return {
								referrals: 0,
								commission: 0,
								engagement: 0,
								quests: 0,
								retention: 1,
							};
						default:
							return {
								referrals: 0.3,
								commission: 0.4,
								engagement: 0.2,
								quests: 0.1,
								retention: 0.1,
							};
					}
				}
				getTimeframeWeight(e, t) {
					return 1;
				}
				async getPreviousRanks(e, t) {
					const a = new Date();
					a.setDate(a.getDate() - 1);
					const { data: r, error: s } = await i.N.from("ranking_history")
						.select("user_id, rank")
						.eq("leaderboard_id", e)
						.gte("date", a.toISOString())
						.in("user_id", t);
					if (s) return {};
					const n = {};
					return (
						null == r ||
							r.forEach((e) => {
								n[e.user_id] = e.rank;
							}),
						n
					);
				}
				async saveRankingHistory(e, t) {
					const a = t.map((t) => ({
						leaderboard_id: e,
						user_id: t.user_id,
						rank: t.rank,
						score: t.score,
						date: new Date().toISOString(),
						metrics: t.metrics,
					}));
					const { error: r } = await i.N.from("ranking_history").insert(a);
					r && console.error("Error saving ranking history:", r);
				}
				async getUserRankings(e, t) {
					const a = {};
					for (const r of t)
						for (const t of await this.getLeaderboardConfigs(r)) {
							if (!t.enabled) continue;
							const r = await this.calculateLeaderboard(t);
							const s = r.find((t) => t.user_id === e);
							s &&
								(a[t.id] = {
									rank: s.rank,
									score: s.score,
									change: s.change,
									total_participants: r.length,
									percentile: ((r.length - s.rank) / r.length) * 100,
								});
						}
					return a;
				}
				async getLeaderboardConfigs(e) {
					return [
						{
							id: "".concat(e, "_overall_daily"),
							name: "Daily Overall",
							description: "Top performers across all metrics today",
							category: "overall",
							timeframe: "daily",
							scoring_method: "weighted",
							max_entries: 100,
							enabled: !0,
						},
						{
							id: "".concat(e, "_overall_weekly"),
							name: "Weekly Overall",
							description: "Top performers across all metrics this week",
							category: "overall",
							timeframe: "weekly",
							scoring_method: "weighted",
							max_entries: 100,
							enabled: !0,
						},
						{
							id: "".concat(e, "_referrals_monthly"),
							name: "Monthly Referrals",
							description: "Top referrers this month",
							category: "referrals",
							timeframe: "monthly",
							scoring_method: "simple",
							max_entries: 50,
							enabled: !0,
						},
						{
							id: "".concat(e, "_commission_all_time"),
							name: "All-Time Commission",
							description: "Highest commission earners of all time",
							category: "commission",
							timeframe: "all_time",
							scoring_method: "simple",
							max_entries: 100,
							enabled: !0,
						},
						{
							id: "".concat(e, "_engagement_weekly"),
							name: "Weekly Engagement",
							description: "Most engaged members this week",
							category: "engagement",
							timeframe: "weekly",
							scoring_method: "simple",
							max_entries: 50,
							enabled: !0,
						},
					];
				}
				async getRankingHistory(e, t) {
					const a =
						arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 30;
					const r = new Date();
					r.setDate(r.getDate() - a);
					const { data: s, error: n } = await i.N.from("ranking_history")
						.select("*")
						.eq("user_id", e)
						.eq("leaderboard_id", t)
						.gte("date", r.toISOString())
						.order("date", { ascending: !0 });
					if (n) throw n;
					return s || [];
				}
				async getLeaderboardStatistics(e) {
					const t = await this.calculateLeaderboard({
						id: e,
						name: "",
						description: "",
						category: "overall",
						timeframe: "weekly",
						scoring_method: "weighted",
						enabled: !0,
					});
					if (0 === t.length)
						return {
							total_entries: 0,
							average_score: 0,
							top_score: 0,
							score_distribution: [],
							class_distribution: [],
							recent_activity: [],
						};
					const a = t.map((e) => e.score);
					const r = a.reduce((e, t) => e + t, 0) / a.length;
					const s = Math.max(...a);
					const i = [
						{ min: 0, max: 0.5 * r, label: "Low" },
						{ min: 0.5 * r, max: r, label: "Medium" },
						{ min: r, max: 1.5 * r, label: "High" },
						{ min: 1.5 * r, max: 1 / 0, label: "Top" },
					].map((e) => ({
						range: e.label,
						count: t.filter((t) => t.score >= e.min && t.score < e.max).length,
						percentage:
							(t.filter((t) => t.score >= e.min && t.score < e.max).length /
								t.length) *
							100,
					}));
					const n = Object.entries(
						t.reduce(
							(e, t) => (
								(e[t.character_class] = (e[t.character_class] || 0) + 1), e
							),
							{},
						),
					).map((e) => {
						const [a, r] = e;
						return { class: a, count: r, percentage: (r / t.length) * 100 };
					});
					const l = t
						.slice(0, 10)
						.map((e) => ({
							user_id: e.user_id,
							username: e.username,
							action: "rank_change",
							value: e.change,
							timestamp: e.last_active,
						}));
					return {
						total_entries: t.length,
						average_score: Math.round(r),
						top_score: Math.round(s),
						score_distribution: i,
						class_distribution: n,
						recent_activity: l,
					};
				}
				async refreshLeaderboard(e) {
					const t = await this.getLeaderboardConfig(e);
					if (!t) throw Error("Leaderboard config not found");
					const a = await this.calculateLeaderboard(t);
					return await this.saveRankingHistory(e, a), a;
				}
				async getLeaderboardConfig(e) {
					const t = e.split("_")[0];
					return (
						(await this.getLeaderboardConfigs(t)).find((t) => t.id === e) ||
						null
					);
				}
				constructor() {
					(this.CHARACTER_CLASS_MULTIPLIERS = {
						scout: 1.2,
						sage: 1.5,
						champion: 1.3,
						merchant: 1.1,
					}),
						(this.TIMEFRAME_WEIGHTS = {
							daily: { recent: 0.8, medium: 0.15, old: 0.05 },
							weekly: { recent: 0.6, medium: 0.3, old: 0.1 },
							monthly: { recent: 0.4, medium: 0.4, old: 0.2 },
							all_time: { recent: 0.2, medium: 0.3, old: 0.5 },
						});
				}
			}
			function o(e) {
				const { companyId: t, category: a, timeframe: i, limit: n = 100 } = e;
				const [l, o] = (0, s.useState)([]);
				const [d, m] = (0, s.useState)(!0);
				const [u, h] = (0, s.useState)(null);
				const [x, g] = (0, s.useState)(1);
				const [p, f] = (0, s.useState)(0);
				const [y, b] = (0, s.useState)(null);
				const [v, _] = (0, s.useState)(!1);
				new c(),
					(0, s.useEffect)(() => {
						w();
					}, [t, a, i, x]);
				const w = async () => {
					try {
						m(!0);
						const e = await fetch(
							"/api/leaderboards/"
								.concat(a, "?companyId=")
								.concat(t, "&timeframe=")
								.concat(i, "&limit=")
								.concat(n, "&page=")
								.concat(x),
						);
						if (e.ok) {
							const t = await e.json();
							o(t.entries), f(t.pagination.total_entries);
						} else h("Failed to load leaderboard");
					} catch (e) {
						console.error("Error fetching leaderboard:", e),
							h("Failed to load leaderboard");
					} finally {
						m(!1);
					}
				};
				const j = async () => {
					try {
						(
							await fetch(
								"/api/leaderboards/"
									.concat(a, "?companyId=")
									.concat(t, "&timeframe=")
									.concat(i, "&action=refresh"),
								{ method: "POST" },
							)
						).ok && (await w());
					} catch (e) {
						console.error("Error refreshing leaderboard:", e);
					}
				};
				const N = (e) =>
					1 === e
						? "\uD83E\uDD47"
						: 2 === e
							? "\uD83E\uDD48"
							: 3 === e
								? "\uD83E\uDD49"
								: e <= 10
									? "⭐"
									: e <= 50
										? "\uD83C\uDFAF"
										: "\uD83D\uDCCA";
				const k = (e) => {
					switch (e) {
						case "up":
							return "\uD83D\uDCC8";
						case "down":
							return "\uD83D\uDCC9";
						case "new":
							return "\uD83C\uDD95";
						default:
							return "➡️";
					}
				};
				const S = (e) => {
					switch (e) {
						case "up":
							return "text-green-600";
						case "down":
							return "text-red-600";
						case "new":
							return "text-blue-600";
						default:
							return "text-gray-600";
					}
				};
				const I = (e) =>
					({
						scout: "\uD83D\uDD0D",
						sage: "\uD83D\uDCDA",
						champion: "\uD83C\uDFC6",
						merchant: "\uD83D\uDCB0",
					})[e] || "\uD83D\uDC64";
				return d
					? (0, r.jsx)("div", {
							className: "flex items-center justify-center h-64",
							children: (0, r.jsx)("div", {
								className:
									"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
							}),
						})
					: u
						? (0, r.jsxs)("div", {
								className: "bg-red-50 border border-red-200 rounded-lg p-4",
								children: [
									(0, r.jsx)("p", { className: "text-red-800", children: u }),
									(0, r.jsx)("button", {
										onClick: w,
										className: "mt-2 text-red-600 hover:text-red-800 underline",
										children: "Try again",
									}),
								],
							})
						: (0, r.jsxs)("div", {
								className: "space-y-6",
								children: [
									(0, r.jsxs)("div", {
										className: "flex justify-between items-center",
										children: [
											(0, r.jsxs)("div", {
												children: [
													(0, r.jsxs)("h2", {
														className: "text-2xl font-bold text-gray-900",
														children: [
															a.charAt(0).toUpperCase() + a.slice(1),
															" Leaderboard",
														],
													}),
													(0, r.jsxs)("p", {
														className: "text-gray-600",
														children: [
															((e) => {
																switch (e) {
																	case "daily":
																		return "Daily";
																	case "weekly":
																		return "Weekly";
																	case "monthly":
																		return "Monthly";
																	case "all_time":
																		return "All Time";
																	default:
																		return e;
																}
															})(i),
															" rankings",
														],
													}),
												],
											}),
											(0, r.jsxs)("div", {
												className: "flex items-center space-x-4",
												children: [
													(0, r.jsx)("button", {
														onClick: j,
														className:
															"border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors",
														children: "Refresh",
													}),
													v &&
														y &&
														(0, r.jsx)("div", {
															className:
																"bg-blue-50 border border-blue-200 rounded-lg px-4 py-2",
															children: (0, r.jsxs)("span", {
																className: "text-sm text-blue-800",
																children: [
																	"Your Rank: #",
																	y.rank,
																	" (",
																	((y.rank / l.length) * 100).toFixed(1),
																	"th percentile)",
																],
															}),
														}),
												],
											}),
										],
									}),
									l.length >= 3 &&
										(0, r.jsxs)("div", {
											className: "flex justify-center items-end space-x-4 py-8",
											children: [
												(0, r.jsxs)("div", {
													className: "flex flex-col items-center",
													children: [
														(0, r.jsx)("div", {
															className: "text-6xl mb-2",
															children: "\uD83E\uDD48",
														}),
														(0, r.jsxs)("div", {
															className:
																"bg-gray-100 rounded-lg p-4 text-center min-w-[120px]",
															children: [
																(0, r.jsx)("div", {
																	className: "text-2xl font-bold text-gray-700",
																	children: l[1].username,
																}),
																(0, r.jsx)("div", {
																	className: "text-sm text-gray-600",
																	children: "2nd Place",
																}),
																(0, r.jsx)("div", {
																	className:
																		"text-lg font-semibold text-gray-800 mt-2",
																	children: Math.round(
																		l[1].score,
																	).toLocaleString(),
																}),
															],
														}),
													],
												}),
												(0, r.jsxs)("div", {
													className: "flex flex-col items-center -mt-4",
													children: [
														(0, r.jsx)("div", {
															className: "text-8xl mb-2",
															children: "\uD83E\uDD47",
														}),
														(0, r.jsxs)("div", {
															className:
																"bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 text-center min-w-[140px]",
															children: [
																(0, r.jsx)("div", {
																	className:
																		"text-3xl font-bold text-yellow-800",
																	children: l[0].username,
																}),
																(0, r.jsx)("div", {
																	className: "text-sm text-yellow-700",
																	children: "1st Place",
																}),
																(0, r.jsx)("div", {
																	className:
																		"text-xl font-bold text-yellow-800 mt-2",
																	children: Math.round(
																		l[0].score,
																	).toLocaleString(),
																}),
															],
														}),
													],
												}),
												(0, r.jsxs)("div", {
													className: "flex flex-col items-center",
													children: [
														(0, r.jsx)("div", {
															className: "text-6xl mb-2",
															children: "\uD83E\uDD49",
														}),
														(0, r.jsxs)("div", {
															className:
																"bg-orange-100 rounded-lg p-4 text-center min-w-[120px]",
															children: [
																(0, r.jsx)("div", {
																	className:
																		"text-2xl font-bold text-orange-700",
																	children: l[2].username,
																}),
																(0, r.jsx)("div", {
																	className: "text-sm text-orange-600",
																	children: "3rd Place",
																}),
																(0, r.jsx)("div", {
																	className:
																		"text-lg font-semibold text-orange-800 mt-2",
																	children: Math.round(
																		l[2].score,
																	).toLocaleString(),
																}),
															],
														}),
													],
												}),
											],
										}),
									(0, r.jsxs)("div", {
										className: "bg-white rounded-lg shadow overflow-hidden",
										children: [
											(0, r.jsx)("div", {
												className: "overflow-x-auto",
												children: (0, r.jsxs)("table", {
													className: "min-w-full divide-y divide-gray-200",
													children: [
														(0, r.jsx)("thead", {
															className: "bg-gray-50",
															children: (0, r.jsxs)("tr", {
																children: [
																	(0, r.jsx)("th", {
																		className:
																			"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
																		children: "Rank",
																	}),
																	(0, r.jsx)("th", {
																		className:
																			"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
																		children: "Member",
																	}),
																	(0, r.jsx)("th", {
																		className:
																			"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
																		children: "Score",
																	}),
																	(0, r.jsx)("th", {
																		className:
																			"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
																		children: "Performance",
																	}),
																	(0, r.jsx)("th", {
																		className:
																			"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
																		children: "Change",
																	}),
																],
															}),
														}),
														(0, r.jsx)("tbody", {
															className: "bg-white divide-y divide-gray-200",
															children: l.map((e, t) =>
																(0, r.jsxs)(
																	"tr",
																	{
																		className: "hover:bg-gray-50 ".concat(
																			e.rank <= 3 ? "bg-yellow-50" : "",
																		),
																		children: [
																			(0, r.jsx)("td", {
																				className:
																					"px-6 py-4 whitespace-nowrap",
																				children: (0, r.jsxs)("div", {
																					className:
																						"flex items-center space-x-2",
																					children: [
																						(0, r.jsx)("span", {
																							className: "text-2xl",
																							children: N(e.rank),
																						}),
																						(0, r.jsxs)("span", {
																							className:
																								"text-lg font-bold text-gray-900",
																							children: ["#", e.rank],
																						}),
																					],
																				}),
																			}),
																			(0, r.jsx)("td", {
																				className:
																					"px-6 py-4 whitespace-nowrap",
																				children: (0, r.jsxs)("div", {
																					className: "flex items-center",
																					children: [
																						(0, r.jsx)("div", {
																							className:
																								"flex-shrink-0 h-10 w-10",
																							children: e.avatar
																								? (0, r.jsx)("img", {
																										className:
																											"h-10 w-10 rounded-full",
																										src: e.avatar,
																										alt: "",
																									})
																								: (0, r.jsx)("div", {
																										className:
																											"h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center",
																										children: (0, r.jsx)(
																											"span",
																											{
																												className:
																													"text-gray-600 font-medium",
																												children: e.username
																													.charAt(0)
																													.toUpperCase(),
																											},
																										),
																									}),
																						}),
																						(0, r.jsxs)("div", {
																							className: "ml-4",
																							children: [
																								(0, r.jsx)("div", {
																									className:
																										"text-sm font-medium text-gray-900",
																									children: e.username,
																								}),
																								(0, r.jsxs)("div", {
																									className:
																										"flex items-center space-x-2 text-xs text-gray-500",
																									children: [
																										(0, r.jsxs)("span", {
																											className:
																												"flex items-center",
																											children: [
																												I(e.character_class),
																												" ",
																												e.character_class,
																											],
																										}),
																										(0, r.jsx)("span", {
																											children: "•",
																										}),
																										(0, r.jsxs)("span", {
																											children: [
																												"Lvl ",
																												e.level,
																											],
																										}),
																									],
																								}),
																							],
																						}),
																					],
																				}),
																			}),
																			(0, r.jsxs)("td", {
																				className:
																					"px-6 py-4 whitespace-nowrap",
																				children: [
																					(0, r.jsx)("div", {
																						className:
																							"text-lg font-bold text-gray-900",
																						children: Math.round(
																							e.score,
																						).toLocaleString(),
																					}),
																					(0, r.jsx)("div", {
																						className: "text-xs text-gray-500",
																						children:
																							1 === e.rank
																								? "\uD83D\uDC51 Champion"
																								: e.rank <= 10
																									? "⭐ Top 10"
																									: e.rank <= 50
																										? "\uD83C\uDFAF Top 50"
																										: "Contender",
																					}),
																				],
																			}),
																			(0, r.jsxs)("td", {
																				className:
																					"px-6 py-4 whitespace-nowrap",
																				children: [
																					(0, r.jsxs)("div", {
																						className: "text-sm text-gray-900",
																						children: [
																							"referrals" === a &&
																								"".concat(
																									e.metrics.total_referrals,
																									" referrals",
																								),
																							"commission" === a &&
																								"$".concat(
																									e.metrics.total_commission.toLocaleString(),
																								),
																							"engagement" === a &&
																								"".concat(
																									e.metrics.engagement_score.toFixed(
																										1,
																									),
																									"% engagement",
																								),
																							"quests" === a &&
																								"".concat(
																									e.metrics.quest_completion_rate.toFixed(
																										1,
																									),
																									"% completion",
																								),
																							"retention" === a &&
																								"".concat(
																									e.metrics.retention_rate.toFixed(
																										1,
																									),
																									"% retention",
																								),
																							"overall" === a &&
																								"Overall performance",
																						],
																					}),
																					(0, r.jsxs)("div", {
																						className: "text-xs text-gray-500",
																						children: [
																							e.metrics.conversion_rate.toFixed(
																								1,
																							),
																							"% conversion",
																						],
																					}),
																				],
																			}),
																			(0, r.jsx)("td", {
																				className:
																					"px-6 py-4 whitespace-nowrap",
																				children: (0, r.jsxs)("div", {
																					className:
																						"flex items-center space-x-2",
																					children: [
																						(0, r.jsx)("span", {
																							className: S(e.change),
																							children: k(e.change),
																						}),
																						e.previous_rank &&
																							(0, r.jsx)("span", {
																								className: "text-sm ".concat(
																									S(e.change),
																								),
																								children:
																									"up" === e.change
																										? "+".concat(
																												e.previous_rank -
																													e.rank,
																											)
																										: "down" === e.change
																											? "-".concat(
																													e.rank -
																														e.previous_rank,
																												)
																											: "new" === e.change
																												? "New"
																												: "Same",
																							}),
																					],
																				}),
																			}),
																		],
																	},
																	e.id,
																),
															),
														}),
													],
												}),
											}),
											p > n &&
												(0, r.jsxs)("div", {
													className:
														"bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6",
													children: [
														(0, r.jsxs)("div", {
															className:
																"flex-1 flex justify-between sm:hidden",
															children: [
																(0, r.jsx)("button", {
																	onClick: () => g(Math.max(1, x - 1)),
																	disabled: 1 === x,
																	className:
																		"relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50",
																	children: "Previous",
																}),
																(0, r.jsx)("button", {
																	onClick: () =>
																		g(Math.min(Math.ceil(p / n), x + 1)),
																	disabled: x >= Math.ceil(p / n),
																	className:
																		"ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50",
																	children: "Next",
																}),
															],
														}),
														(0, r.jsxs)("div", {
															className:
																"hidden sm:flex-1 sm:flex sm:items-center sm:justify-between",
															children: [
																(0, r.jsx)("div", {
																	children: (0, r.jsxs)("p", {
																		className: "text-sm text-gray-700",
																		children: [
																			"Showing ",
																			(0, r.jsx)("span", {
																				className: "font-medium",
																				children: (x - 1) * n + 1,
																			}),
																			" to",
																			" ",
																			(0, r.jsx)("span", {
																				className: "font-medium",
																				children: Math.min(x * n, p),
																			}),
																			" ",
																			"of ",
																			(0, r.jsx)("span", {
																				className: "font-medium",
																				children: p.toLocaleString(),
																			}),
																			" results",
																		],
																	}),
																}),
																(0, r.jsx)("div", {
																	children: (0, r.jsxs)("nav", {
																		className:
																			"relative z-0 inline-flex rounded-md shadow-sm -space-x-px",
																		children: [
																			(0, r.jsx)("button", {
																				onClick: () => g(Math.max(1, x - 1)),
																				disabled: 1 === x,
																				className:
																					"relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50",
																				children: "Previous",
																			}),
																			Array.from(
																				{
																					length: Math.min(5, Math.ceil(p / n)),
																				},
																				(e, t) => {
																					const a =
																						Math.max(
																							1,
																							Math.min(
																								Math.ceil(p / n) - 4,
																								x - 2,
																							),
																						) + t;
																					return (0, r.jsx)(
																						"button",
																						{
																							onClick: () => g(a),
																							className:
																								"relative inline-flex items-center px-4 py-2 border text-sm font-medium ".concat(
																									x === a
																										? "z-10 bg-blue-50 border-blue-500 text-blue-600"
																										: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50",
																								),
																							children: a,
																						},
																						a,
																					);
																				},
																			),
																			(0, r.jsx)("button", {
																				onClick: () =>
																					g(Math.min(Math.ceil(p / n), x + 1)),
																				disabled: x >= Math.ceil(p / n),
																				className:
																					"relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50",
																				children: "Next",
																			}),
																		],
																	}),
																}),
															],
														}),
													],
												}),
										],
									}),
									0 === l.length &&
										(0, r.jsxs)("div", {
											className: "text-center py-12",
											children: [
												(0, r.jsx)("div", {
													className: "text-6xl mb-4",
													children: "\uD83C\uDFC6",
												}),
												(0, r.jsx)("h3", {
													className: "text-lg font-medium text-gray-900 mb-2",
													children: "No Rankings Yet",
												}),
												(0, r.jsx)("p", {
													className: "text-gray-600",
													children:
														"Complete activities to appear on the leaderboard!",
												}),
											],
										}),
								],
							});
			}
			const d = a(4959);
			const m = a(1616);
			const u = a(828);
			function h() {
				let e;
				let t;
				const { user: a, isLoading: i } = (0, d.X)();
				const n = (0, m.useRouter)();
				const [l, c] = (0, s.useState)("overall");
				const [h, x] = (0, s.useState)("weekly");
				if (i)
					return (0, r.jsx)("div", {
						className: "min-h-screen flex items-center justify-center",
						children: (0, r.jsx)("div", {
							className:
								"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600",
						}),
					});
				if (!a) return n.push("/login"), null;
				const g =
					(null == a || null == (e = a.metadata) ? void 0 : e.companyId) ||
					u.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ||
					"default";
				const p = [
					{
						value: "overall",
						label: "Overall",
						icon: "\uD83C\uDFC6",
						description: "Complete performance ranking across all metrics",
					},
					{
						value: "referrals",
						label: "Referrals",
						icon: "\uD83D\uDC65",
						description: "Top referrers by number of successful referrals",
					},
					{
						value: "commission",
						label: "Commission",
						icon: "\uD83D\uDCB0",
						description: "Highest commission earners",
					},
					{
						value: "engagement",
						label: "Engagement",
						icon: "\uD83D\uDCAC",
						description: "Most engaged and active community members",
					},
					{
						value: "quests",
						label: "Quests",
						icon: "\uD83D\uDCDD",
						description: "Top quest completers and achievement earners",
					},
					{
						value: "retention",
						label: "Retention",
						icon: "\uD83D\uDD04",
						description: "Members with highest retention and loyalty",
					},
				];
				return (0, r.jsxs)("div", {
					className: "min-h-screen bg-gray-50",
					children: [
						(0, r.jsx)("header", {
							className: "bg-white shadow-sm border-b border-gray-200",
							children: (0, r.jsx)("div", {
								className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
								children: (0, r.jsxs)("div", {
									className: "flex justify-between items-center h-16",
									children: [
										(0, r.jsxs)("div", {
											className: "flex items-center",
											children: [
												(0, r.jsx)("h1", {
													className: "text-2xl font-bold text-gray-900",
													children: "Leaderboards",
												}),
												(0, r.jsx)("p", {
													className: "ml-2 text-gray-600",
													children: "Compete and climb the ranks",
												}),
											],
										}),
										(0, r.jsx)("div", {
											className: "flex items-center space-x-4",
											children: (0, r.jsxs)("div", {
												className:
													"flex items-center space-x-2 text-sm text-gray-600",
												children: [
													(0, r.jsx)("span", {
														className: "font-medium",
														children: null == a ? void 0 : a.username,
													}),
													(0, r.jsx)("span", { children: "•" }),
													(0, r.jsx)("span", { children: "Member" }),
												],
											}),
										}),
									],
								}),
							}),
						}),
						(0, r.jsx)("div", {
							className: "bg-white border-b border-gray-200",
							children: (0, r.jsx)("div", {
								className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
								children: (0, r.jsx)("nav", {
									className: "flex space-x-8 overflow-x-auto py-4",
									children: p.map((e) =>
										(0, r.jsxs)(
											"button",
											{
												onClick: () => c(e.value),
												className:
													"\n                  flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap\n                  ".concat(
														l === e.value
															? "border-blue-500 text-blue-600"
															: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
														"\n                ",
													),
												children: [
													(0, r.jsx)("span", { children: e.icon }),
													(0, r.jsx)("span", { children: e.label }),
												],
											},
											e.value,
										),
									),
								}),
							}),
						}),
						(0, r.jsx)("div", {
							className: "bg-white border-b border-gray-200",
							children: (0, r.jsx)("div", {
								className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
								children: (0, r.jsxs)("div", {
									className: "flex items-center justify-between py-4",
									children: [
										(0, r.jsxs)("div", {
											className: "flex items-center space-x-4",
											children: [
												(0, r.jsx)("span", {
													className: "text-sm font-medium text-gray-700",
													children: "Timeframe:",
												}),
												(0, r.jsx)("div", {
													className: "flex space-x-2",
													children: [
														{
															value: "daily",
															label: "Daily",
															icon: "\uD83D\uDCC5",
														},
														{
															value: "weekly",
															label: "Weekly",
															icon: "\uD83D\uDCCA",
														},
														{
															value: "monthly",
															label: "Monthly",
															icon: "\uD83D\uDCC8",
														},
														{
															value: "all_time",
															label: "All Time",
															icon: "⏰",
														},
													].map((e) =>
														(0, r.jsxs)(
															"button",
															{
																onClick: () => x(e.value),
																className:
																	"\n                      flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium\n                      ".concat(
																		h === e.value
																			? "bg-blue-100 text-blue-700"
																			: "text-gray-600 hover:bg-gray-100",
																		"\n                    ",
																	),
																children: [
																	(0, r.jsx)("span", { children: e.icon }),
																	(0, r.jsx)("span", { children: e.label }),
																],
															},
															e.value,
														),
													),
												}),
											],
										}),
										(0, r.jsx)("div", {
											className: "text-sm text-gray-600",
											children:
												null == (t = p.find((e) => e.value === l))
													? void 0
													: t.description,
										}),
									],
								}),
							}),
						}),
						(0, r.jsx)("main", {
							className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
							children: (0, r.jsx)(o, {
								companyId: g,
								category: l,
								timeframe: h,
								limit: 50,
							}),
						}),
						(0, r.jsx)("footer", {
							className: "bg-white border-t border-gray-200 mt-16",
							children: (0, r.jsx)("div", {
								className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
								children: (0, r.jsxs)("div", {
									className: "text-center text-gray-600",
									children: [
										(0, r.jsx)("p", {
											className: "text-sm",
											children:
												"Leaderboards update every hour. Rankings are calculated based on performance metrics with character class multipliers.",
										}),
										(0, r.jsxs)("div", {
											className:
												"mt-2 flex items-center justify-center space-x-4 text-xs",
											children: [
												(0, r.jsx)("span", {
													children: "\uD83D\uDD0D Scout: 1.2x multiplier",
												}),
												(0, r.jsx)("span", {
													children: "\uD83D\uDCDA Sage: 1.5x multiplier",
												}),
												(0, r.jsx)("span", {
													children: "\uD83C\uDFC6 Champion: 1.3x multiplier",
												}),
												(0, r.jsx)("span", {
													children: "\uD83D\uDCB0 Merchant: 1.1x multiplier",
												}),
											],
										}),
									],
								}),
							}),
						}),
					],
				});
			}
		},
		4959: (e, t, a) => {
			a.d(t, { X: () => s });
			const r = a(5121);
			function s() {
				const { user: e, loading: t, error: a } = (0, r.J)();
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
					isLoading: t,
					error: a,
				};
			}
		},
		5121: (e, t, a) => {
			a.d(t, { J: () => o, UserProvider: () => c });
			const r = a(5010);
			const s = a(8602);
			const i = a(9030);
			const n = a(1616);
			const l = (0, s.createContext)(void 0);
			function c(e) {
				const { children: t } = e;
				const [a, c] = (0, s.useState)(null);
				const [o, d] = (0, s.useState)(!0);
				const [m, u] = (0, s.useState)(null);
				(0, n.useRouter)();
				const h = async () => {
					try {
						d(!0), u(null);
						const {
							data: { session: t },
							error: a,
						} = await i.N.auth.getSession();
						if (a) throw a;
						if (!t) return void c(null);
						const { data: r, error: s } = await i.N.from("users")
							.select("*")
							.eq("id", t.user.id)
							.single();
						if (s && "PGRST116" !== s.code) throw s;
						if (r) c(r);
						else {
							let e;
							const { data: a, error: r } = await i.N.from("users")
								.insert({
									id: t.user.id,
									username:
										(null == (e = t.user.user_metadata)
											? void 0
											: e.username) || "user_".concat(t.user.id.slice(0, 8)),
									email: t.user.email,
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
							if (r) throw r;
							c(a);
						}
					} catch (e) {
						console.error("Error refreshing user:", e),
							u(e instanceof Error ? e.message : "Unknown error"),
							c(null);
					} finally {
						d(!1);
					}
				};
				const x = async (e) => {
					if (a)
						try {
							const { data: t, error: r } = await i.N.from("users")
								.update({ ...e, updated_at: new Date().toISOString() })
								.eq("id", a.id)
								.select()
								.single();
							if (r) throw r;
							c(t);
						} catch (e) {
							throw (
								(console.error("Error updating user:", e),
								u(e instanceof Error ? e.message : "Unknown error"),
								e)
							);
						}
				};
				return (
					(0, s.useEffect)(() => {
						h();
						const {
							data: { subscription: e },
						} = i.N.auth.onAuthStateChange(async (e, t) => {
							"SIGNED_IN" === e || "TOKEN_REFRESHED" === e
								? await h()
								: "SIGNED_OUT" === e && (c(null), d(!1));
						});
						return () => {
							e.unsubscribe();
						};
					}, []),
					(0, r.jsx)(l.Provider, {
						value: {
							user: a,
							loading: o,
							error: m,
							refreshUser: h,
							updateUser: x,
						},
						children: t,
					})
				);
			}
			function o() {
				const e = (0, s.useContext)(l);
				if (void 0 === e)
					throw Error("useUser must be used within a UserProvider");
				return e;
			}
		},
		9030: (e, t, a) => {
			a.d(t, { N: () => l });
			const r = a(2104);
			const s = a(828);
			const i = "https://slftjqvrjdkzvzenmvnq.supabase.co";
			const n = s.env.SUPABASE_SERVICE_ROLE_KEY;
			const l = (0, r.UU)(
				i,
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZnRqcXZyamRrenZ6ZW5tdm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTE2MjAsImV4cCI6MjA3MzY4NzYyMH0.u2TE7n2o6kd1oaZtoCBxDQV09n5dqlcejEMXx7O_XHY",
				{ auth: { persistSession: !1 } },
			);
			(0, r.UU)(i, n, { auth: { persistSession: !1 } });
		},
		9560: (e, t, a) => {
			Promise.resolve().then(a.bind(a, 3976));
		},
	},
	(e) => {
		const t = (t) => e((e.s = t));
		e.O(0, [3273, 1473, 769, 7358], () => t(9560)), (_N_E = e.O());
	},
]);
