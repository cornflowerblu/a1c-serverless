// src/app/api/test/delete-user/[id]/route.ts
import { NextResponse } from 'next/server';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const getUserId = async () => params.id;
    const userId = await getUserId();

    // In a real implementation, you would delete the user from your database
    // For this test, we'll just return success
    console.log(`Test user deleted: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `User ${userId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting test user:', error);
    return NextResponse.json({ error: 'Failed to delete test user' }, { status: 500 });
  }
}
