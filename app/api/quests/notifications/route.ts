import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch user's active quests and their status
    const { data: userQuests, error: questError } = await supabase
      .from('user_quests')
      .select(`
        id,
        user_id,
        quest_id,
        progress_value,
        is_completed,
        completed_at,
        reward_claimed,
        reward_claimed_at,
        created_at,
        updated_at,
        quest:quests (
          id,
          title,
          description,
          quest_type,
          difficulty,
          target_type,
          target_value,
          reward_xp,
          reward_commission,
          end_date
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (questError) {
      console.error('Error fetching user quests:', questError);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    // Generate notifications based on quest status
    const notifications = [];

    for (const userQuest of userQuests || []) {
      const quest = userQuest.quest as any;
      const questData = quest?.[0];

      if (!questData) continue;

      // Quest completed notification
      if (userQuest.is_completed && !userQuest.reward_claimed) {
        notifications.push({
          id: `quest_completed_${userQuest.id}`,
          type: 'quest_completed',
          title: 'Quest Completed!',
          message: `You've completed "${questData.title}"! Claim your rewards now.`,
          questId: userQuest.quest_id,
          timestamp: userQuest.completed_at || userQuest.updated_at,
          read: false,
          action: {
            label: 'Claim Reward',
            callback: () => {} // This would be handled by the client
          }
        });
      }

      // Quest reminder (expiring soon)
      if (questData.end_date && !userQuest.is_completed) {
        const endDate = new Date(questData.end_date);
        const now = new Date();
        const timeUntilEnd = endDate.getTime() - now.getTime();
        const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);

        if (hoursUntilEnd > 0 && hoursUntilEnd <= 24) {
          notifications.push({
            id: `quest_reminder_${userQuest.id}`,
            type: 'quest_reminder',
            title: 'Quest Ending Soon!',
            message: `"${questData.title}" ends in ${Math.round(hoursUntilEnd)} hours. Complete it to earn rewards!`,
            questId: userQuest.quest_id,
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      }
    }

    // Add notification for new daily quests if none exist
    const hasActiveDailyQuests = userQuests?.some(uq =>
      (uq.quest as any)?.[0]?.quest_type === 'daily' && !uq.is_completed
    );

    if (!hasActiveDailyQuests) {
      const today = new Date().toDateString();
      notifications.push({
        id: `new_daily_${today}`,
        type: 'new_quest',
        title: 'New Daily Quests Available!',
        message: 'Generate new daily quests to continue earning rewards.',
        timestamp: new Date().toISOString(),
        read: false,
        action: {
          label: 'Generate Quests',
          callback: () => {} // This would be handled by the client
        }
      });
    }

    return NextResponse.json({
      notifications: notifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    });

  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Mark all notifications as read by updating a timestamp
    // In a real implementation, you'd have a notifications table
    // For now, we'll just return success

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}