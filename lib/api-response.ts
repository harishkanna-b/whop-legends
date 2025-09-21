import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export function createSuccessResponse<T = any>(
	data: T,
	message?: string,
): NextResponse<ApiResponse<T>> {
	return NextResponse.json({
		success: true,
		data,
		message,
	});
}

export function createErrorResponse(
	error: string,
	status = 400,
): NextResponse<ApiResponse> {
	return NextResponse.json(
		{
			success: false,
			error,
		},
		{ status },
	);
}

export function createPaginatedResponse<T = any>(
	data: T[],
	total: number,
	page: number,
	limit: number,
): NextResponse<
	ApiResponse<{
		data: T[];
		pagination: {
			total: number;
			page: number;
			limit: number;
			totalPages: number;
		};
	}>
> {
	const totalPages = Math.ceil(total / limit);

	return NextResponse.json({
		success: true,
		data: {
			data,
			pagination: {
				total,
				page,
				limit,
				totalPages,
			},
		},
	});
}
