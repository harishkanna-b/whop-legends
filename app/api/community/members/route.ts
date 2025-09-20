import { NextRequest, NextResponse } from 'next/server';
import { MemberDirectory, MemberFilter } from '@/lib/analytics/member-directory';

const memberDirectory = new MemberDirectory();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || undefined;
    const characterClass = searchParams.get('characterClass') || undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = searchParams.get('sortOrder') || undefined;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const filters: MemberFilter = {
      search,
      character_class: characterClass,
      status: status as 'active' | 'inactive' | 'all',
      sort_by: sortBy as any,
      sort_order: sortOrder as any
    };

    // Parse range filters
    const levelRange = searchParams.get('levelRange');
    if (levelRange) {
      const [min, max] = levelRange.split('-').map(Number);
      filters.level_range = [min, max];
    }

    const commissionRange = searchParams.get('commissionRange');
    if (commissionRange) {
      const [min, max] = commissionRange.split('-').map(Number);
      filters.commission_range = [min, max];
    }

    const referralRange = searchParams.get('referralRange');
    if (referralRange) {
      const [min, max] = referralRange.split('-').map(Number);
      filters.referral_range = [min, max];
    }

    const joinDateRange = searchParams.get('joinDateRange');
    if (joinDateRange) {
      const [start, end] = joinDateRange.split(',');
      filters.join_date_range = [start, end];
    }

    const result = await memberDirectory.searchMembers(companyId, filters, page);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, action, data } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    switch (action) {
      case 'export':
        const exportResult = await memberDirectory.exportMembers(companyId, data);
        return NextResponse.json({ success: true, data: exportResult });

      case 'bulkUpdate':
        await memberDirectory.bulkUpdateMembers(companyId, data);
        return NextResponse.json({ success: true });

      case 'getStats':
        const stats = await memberDirectory.getMemberStats(companyId);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing member action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}