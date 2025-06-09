//@ts-nocheck
// src/supabase/functions/a1c-calculator/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateA1C } from '../../../utils/a1c-calculator.ts';

// This function can be invoked directly or via cron
Deno.serve(async req => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get parameters from request or use defaults for cron job
    const {
      userId,
      readingId,
      batchMode = true,
    } = req.method === 'POST'
      ? await req.json()
      : { userId: null, readingId: null, batchMode: true };

    console.log(`Processing A1C calculation: ${batchMode ? 'batch mode' : 'single reading'}`);

    // If specific reading, process just that one
    if (userId && readingId) {
      await processSingleReading(supabase, userId, readingId);
      return new Response(JSON.stringify({ success: true, message: 'Processed single reading' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Otherwise process all pending readings (batch mode)
    const processedCount = await processPendingReadings(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} readings in batch mode`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing A1C calculation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Process a single reading
async function processSingleReading(supabase, userId, readingId) {
  // Get the reading
  const { data: reading, error: readingError } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('id', readingId)
    .single();

  if (readingError) throw new Error(`Reading not found: ${readingError.message}`);

  // Get recent readings for this user
  const { data: readings, error: readingsError } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });

  if (readingsError) throw new Error(`Failed to fetch readings: ${readingsError.message}`);

  // Calculate average glucose first
  const averageGlucose =
    readings.reduce((sum, reading) => sum + reading.value, 0) / readings.length;

  // Calculate A1C from average glucose
  const a1cEstimate = calculateA1C(averageGlucose);

  // Update user's A1C estimate
  const { error: updateError } = await supabase
    .from('user_medical_profiles')
    .update({
      estimated_a1c: a1cEstimate,
    })
    .eq('user_id', userId);

  if (updateError) throw new Error(`Failed to update A1C: ${updateError.message}`);

  return a1cEstimate;
}

// Process all pending readings
async function processPendingReadings(supabase) {
  // Find all users (without requiring a1c_updated_at column)
  const { data: usersToProcess, error: usersError } = await supabase
    .from('users')
    .select('id')
    .order('id');

  if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

  let processedCount = 0;

  // Process each user
  for (const user of usersToProcess) {
    try {
      // Get recent readings for this user
      const { data: readings, error: readingsError } = await supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });

      if (readingsError || !readings?.length) continue;

      // Calculate average glucose first
      const averageGlucose =
        readings.reduce((sum, reading) => sum + reading.value, 0) / readings.length;

      // Calculate A1C from average glucose
      const a1cEstimate = calculateA1C(averageGlucose);

      // Update user's A1C estimate - without a1c_updated_at column
      try {
        await supabase
          .from('user_medical_profiles')
          .update({
            estimated_a1c: a1cEstimate,
          })
          .eq('user_id', user.id);

        processedCount++;
      } catch (updateErr) {
        console.error(`Error updating user ${user.id} profile:`, updateErr);
      }
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err);
      // Continue with next user
    }
  }

  return processedCount;
}
