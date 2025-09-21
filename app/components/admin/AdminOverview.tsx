"use client";

interface AdminOverviewProps {
	stats: {
		totalUsers: number;
		activeUsers: number;
		totalReferrals: number;
		totalRevenue: number;
		systemLoad: number;
		uptime: string;
	};
}

export default function AdminOverview({ stats }: AdminOverviewProps) {
	const quickStats = [
		{
			title: "Total Users",
			value: stats.totalUsers.toLocaleString(),
			change: "+12%",
			changeType: "positive" as const,
			icon: "👥",
		},
		{
			title: "Active Users",
			value: stats.activeUsers.toLocaleString(),
			change: "+8%",
			changeType: "positive" as const,
			icon: "✅",
		},
		{
			title: "Total Referrals",
			value: stats.totalReferrals.toLocaleString(),
			change: "+23%",
			changeType: "positive" as const,
			icon: "🎯",
		},
		{
			title: "Total Revenue",
			value: `$${stats.totalRevenue.toLocaleString()}`,
			change: "+15%",
			changeType: "positive" as const,
			icon: "💰",
		},
	];

	const recentActivities = [
		{
			type: "user_registration",
			message: "New user registered: john_doe",
			time: "2 minutes ago",
		},
		{
			type: "referral_completed",
			message: "Referral completed: $50 commission earned",
			time: "5 minutes ago",
		},
		{
			type: "achievement_unlocked",
			message: 'User unlocked "Social Butterfly" achievement',
			time: "8 minutes ago",
		},
		{
			type: "team_created",
			message: 'New team created: "Champions"',
			time: "12 minutes ago",
		},
		{
			type: "system_alert",
			message: "System load above 80%",
			time: "15 minutes ago",
		},
	];

	const systemHealth = [
		{ name: "Database", status: "healthy", responseTime: "12ms", icon: "🗄️" },
		{ name: "API", status: "healthy", responseTime: "45ms", icon: "🔌" },
		{ name: "Cache", status: "healthy", responseTime: "3ms", icon: "⚡" },
		{ name: "Storage", status: "warning", responseTime: "120ms", icon: "💾" },
		{ name: "Email", status: "healthy", responseTime: "25ms", icon: "📧" },
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case "healthy":
				return "bg-green-100 text-green-800";
			case "warning":
				return "bg-yellow-100 text-yellow-800";
			case "critical":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="space-y-8">
			{/* Quick Stats */}
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-4">
					Quick Stats
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{quickStats.map((stat, index) => (
						<div key={index} className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center">
								<div className="p-2 bg-blue-100 rounded-lg">
									<span className="text-2xl">{stat.icon}</span>
								</div>
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										{stat.title}
									</p>
									<div className="flex items-center">
										<p className="text-2xl font-bold text-gray-900">
											{stat.value}
										</p>
										<span
											className={`ml-2 text-sm font-medium ${
												stat.changeType === "positive"
													? "text-green-600"
													: "text-red-600"
											}`}
										>
											{stat.change}
										</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Recent Activities */}
				<div>
					<h2 className="text-xl font-semibold text-gray-900 mb-4">
						Recent Activities
					</h2>
					<div className="bg-white rounded-lg shadow">
						<div className="p-6">
							<div className="space-y-4">
								{recentActivities.map((activity, index) => (
									<div key={index} className="flex items-start space-x-3">
										<div className="flex-shrink-0">
											{activity.type === "user_registration" && "👤"}
											{activity.type === "referral_completed" && "🎯"}
											{activity.type === "achievement_unlocked" && "🏆"}
											{activity.type === "team_created" && "🏅"}
											{activity.type === "system_alert" && "⚠️"}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-gray-900">
												{activity.message}
											</p>
											<p className="text-xs text-gray-500">{activity.time}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* System Health */}
				<div>
					<h2 className="text-xl font-semibold text-gray-900 mb-4">
						System Health
					</h2>
					<div className="bg-white rounded-lg shadow">
						<div className="p-6">
							<div className="space-y-4">
								{systemHealth.map((service, index) => (
									<div
										key={index}
										className="flex items-center justify-between"
									>
										<div className="flex items-center space-x-3">
											<span className="text-xl">{service.icon}</span>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{service.name}
												</p>
												<p className="text-xs text-gray-500">
													{service.responseTime}
												</p>
											</div>
										</div>
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}
										>
											{service.status}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Performance Chart */}
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-4">
					Performance Overview
				</h2>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">
								{stats.systemLoad.toFixed(1)}%
							</div>
							<div className="text-sm text-gray-600">Current Load</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-blue-600">
								{stats.uptime}
							</div>
							<div className="text-sm text-gray-600">System Uptime</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-purple-600">
								{stats.activeUsers > 0
									? ((stats.totalReferrals / stats.activeUsers) * 100).toFixed(
											1,
										)
									: 0}
								%
							</div>
							<div className="text-sm text-gray-600">Referral Rate</div>
						</div>
					</div>

					{/* Simple visual representation */}
					<div className="mt-6">
						<div className="flex items-center justify-between text-sm text-gray-600 mb-2">
							<span>System Performance</span>
							<span>{stats.systemLoad.toFixed(1)}%</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-3">
							<div
								className={`h-3 rounded-full transition-all duration-300 ${
									stats.systemLoad > 80
										? "bg-red-600"
										: stats.systemLoad > 60
											? "bg-yellow-600"
											: "bg-green-600"
								}`}
								style={{ width: `${Math.min(stats.systemLoad, 100)}%` }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
