import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Public settings available to all users
    const publicSettings = await prisma.systemSetting.findMany({
      where: {
        category: { in: ['general', 'public'] },
      },
    });

    // Admin-only settings
    let adminSettings: any[] = [];
    if (canAccessAdmin(session.user.role)) {
      adminSettings = await prisma.systemSetting.findMany({
        where: {
          category: { notIn: ['general', 'public'] },
        },
      });
    }

    const allSettings = [...publicSettings, ...adminSettings];

    // Convert to object format
    const settings: Record<string, any> = {};
    for (const setting of allSettings) {
      let value: any = setting.value;
      if (setting.type === 'number') value = parseFloat(value);
      else if (setting.type === 'boolean') value = value === 'true';
      else if (setting.type === 'json') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if parse fails
        }
      }
      settings[setting.key] = value;
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      let stringValue: string;
      let type = 'string';

      if (typeof value === 'number') {
        stringValue = value.toString();
        type = 'number';
      } else if (typeof value === 'boolean') {
        stringValue = value.toString();
        type = 'boolean';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
        type = 'json';
      } else {
        stringValue = String(value);
      }

      await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value: stringValue,
          type,
        },
        update: {
          value: stringValue,
          type,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { updated: Object.keys(settings).length },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
