import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { createMonth } from '../utils/month-management';
import { createRun } from '../utils/run-management';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  // Initialize Supabase client with service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key to bypass RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Define our users with new IDs
  const users = [
    {
      email: `user1_${Date.now()}@example.com`, // You'll update this manually later
      id: uuidv4(),
      name: 'Roger U',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: {
        displayUnit: 'A1C',
        targetA1C: 6.5,
        reminderEnabled: true,
        reminderFrequency: 'DAILY',
        theme: 'system'
      },
      medicalProfile: {
        diabetesType: 'TYPE_2',
        birthYear: 1963,
        targetA1C: 6.5,
        preferredUnit: 'MGDL'
      }
    },
    {
      email: `user2_${Date.now()}@example.com`, // You'll update this manually later
      id: uuidv4(),
      name: 'Roger Durich',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: {
        displayUnit: 'AG',
        targetA1C: 7.0,
        reminderEnabled: true,
        reminderFrequency: 'TWICE_DAILY',
        theme: 'dark'
      },
      medicalProfile: {
        diabetesType: 'TYPE_1',
        birthYear: 1985,
        targetA1C: 7.0,
        preferredUnit: 'MGDL'
      }
    }
  ];

  console.log('Starting database seeding...');
  console.log('Created users with IDs:');
  users.forEach(user => {
    console.log(`${user.name}: ${user.id} (${user.email})`);
  });
  
  // Create users and their profiles
  for (const user of users) {
    console.log(`Creating user: ${user.email}`);
    
    // Insert user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        clerk_id: `temp_clerk_${user.id}`, // You'll update this manually later
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user_role: 'user'
      })
      .select()
      .single();
    
    if (userError) {
      console.error(`Error creating user ${user.email}:`, userError);
      continue;
    }
    
    // Insert user preferences
    const { error: prefError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        display_unit: user.preferences.displayUnit,
        target_a1c: user.preferences.targetA1C,
        reminder_enabled: user.preferences.reminderEnabled,
        reminder_frequency: user.preferences.reminderFrequency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        theme: user.preferences.theme,
      });
    
    if (prefError) {
      console.error(`Error creating preferences for ${user.email}:`, prefError);
    }
    
    // Insert medical profile
    const { error: medError } = await supabase
      .from('user_medical_profiles')
      .insert({
        user_id: user.id,
        diabetes_type: user.medicalProfile.diabetesType,
        birth_year: user.medicalProfile.birthYear,
        target_a1c: user.medicalProfile.targetA1C,
        preferred_unit: user.medicalProfile.preferredUnit,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (medError) {
      console.error(`Error creating medical profile for ${user.email}:`, medError);
    }
    
    // Create months for the past 3 months
    const currentDate = new Date();
    const months = [];

    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const month = createMonth(user.id, monthName, startDate, endDate);
      months.push(month);

      // Insert month
      const { data: monthData, error: monthError } = await supabase
        .from('months')
        .insert({
          id: month.id,
          user_id: month.userId,
          name: month.name,
          start_date: month.startDate.toISOString(),
          end_date: month.endDate.toISOString(),
          calculated_a1c: null,
          average_glucose: null,
          created_at: month.createdAt.toISOString(),
          updated_at: month.updatedAt.toISOString()
        })
        .select()
        .single();

      if (monthError) {
        console.error(`Error creating month ${monthName} for ${user.email}:`, monthError);
        continue;
      }

      console.log(`Created month: ${monthName} for ${user.email}`);

      // Create weekly runs for this month
      const weekCount = Math.ceil(endDate.getDate() / 7);
      const runs = [];
      const runIds = [];

      for (let week = 0; week < weekCount; week++) {
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (week * 7));

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Ensure we don't go beyond the month
        if (weekEndDate > endDate) {
          weekEndDate.setTime(endDate.getTime());
        }

        const run = createRun(
          user.id,
          `Week ${week + 1}`,
          weekStartDate,
          weekEndDate
        );
        runs.push(run);
        runIds.push(run.id);

        // Insert run
        const { data: runData, error: runError } = await supabase
          .from('runs')
          .insert({
            id: run.id,
            user_id: run.userId,
            name: run.name,
            start_date: run.startDate.toISOString(),
            end_date: run.endDate.toISOString(),
            calculated_a1c: null,
            average_glucose: null,
            month_id: month.id,
            created_at: run.createdAt.toISOString(),
            updated_at: run.updatedAt.toISOString()
          })
          .select()
          .single();

        if (runError) {
          console.error(`Error creating run ${run.name} for ${user.email}:`, runError);
          continue;
        }

        console.log(`Created run: ${run.name} for ${monthName}`);

        // Create glucose readings for this run
        // Generate 2-3 readings per day
        const readingsCount = Math.floor(Math.random() * 2) + 2; // 2-3 readings
        const dayCount = Math.ceil((weekEndDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (let day = 0; day < dayCount; day++) {
          const readingDate = new Date(weekStartDate);
          readingDate.setDate(readingDate.getDate() + day);

          const mealContexts = ['FASTING', 'BEFORE_BREAKFAST', 'AFTER_BREAKFAST', 'BEFORE_LUNCH', 'AFTER_LUNCH', 'BEFORE_DINNER', 'AFTER_DINNER', 'BEDTIME'];

          for (let r = 0; r < readingsCount; r++) {
            // Generate a realistic glucose value based on user profile
            const baseValue = user.name === 'Roger U' ? 140 : 120;
            const variance = Math.floor(Math.random() * 60) - 30; // -30 to +30
            const value = baseValue + variance;

            // Set time based on meal context
            const hours = 8 + (r * 4); // 8am, 12pm, 4pm, etc.
            readingDate.setHours(hours, Math.floor(Math.random() * 60), 0, 0);

            const mealContext = mealContexts[Math.floor(Math.random() * mealContexts.length)];

            // Insert reading
            const { error: readingError } = await supabase
              .from('glucose_readings')
              .insert({
                id: uuidv4(),
                user_id: user.id,
                value: value,
                timestamp: readingDate.toISOString(),
                meal_context: mealContext,
                notes: Math.random() > 0.7 ? `Reading after ${mealContext.toLowerCase().replace('_', ' ')}` : null,
                run_id: run.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (readingError) {
              console.error(`Error creating reading for ${user.email}:`, readingError);
            }
          }
        }

        console.log(`Created ${readingsCount * dayCount} readings for ${run.name}`);

        // Calculate run statistics
        const { data: readings, error: readingsError } = await supabase
          .from('glucose_readings')
          .select('*')
          .eq('run_id', run.id);

        if (readingsError) {
          console.error(`Error fetching readings for run ${run.name}:`, readingsError);
          continue;
        }

        // Calculate average glucose
        const sum = readings.reduce((total, reading) => total + reading.value, 0);
        const averageGlucose = readings.length > 0 ? sum / readings.length : 0;

        // Calculate A1C using formula: A1C = (Average Glucose + 46.7) / 28.7
        const calculatedA1C = (averageGlucose + 46.7) / 28.7;

        // Update run with calculated values
        const { error: runUpdateError } = await supabase
          .from('runs')
          .update({
            calculated_a1c: calculatedA1C,
            average_glucose: averageGlucose,
            updated_at: new Date().toISOString()
          })
          .eq('id', run.id);

        if (runUpdateError) {
          console.error(`Error updating run ${run.name} statistics:`, runUpdateError);
        }
      }

      // Skip updating month with run IDs as the column doesn't exist
      // We already have the month_id in each run, so this is redundant

      // Calculate month statistics
      const { data: monthRuns, error: monthRunsError } = await supabase
        .from('runs')
        .select('*')
        .eq('month_id', month.id);

      if (monthRunsError) {
        console.error(`Error fetching runs for month ${monthName}:`, monthRunsError);
        continue;
      }

      // Calculate average glucose for month
      const runSum = monthRuns.reduce((total, run) => total + (run.average_glucose || 0), 0);
      const monthAvgGlucose = monthRuns.length > 0 ? runSum / monthRuns.length : 0;

      // Calculate A1C
      const monthA1C = (monthAvgGlucose + 46.7) / 28.7;

      // Update month with calculated values
      const { error: monthUpdateError } = await supabase
        .from('months')
        .update({
          calculated_a1c: monthA1C,
          average_glucose: monthAvgGlucose,
          updated_at: new Date().toISOString()
        })
        .eq('id', month.id);

      if (monthUpdateError) {
        console.error(`Error updating month ${monthName} statistics:`, monthUpdateError);
      }
    }
  }

  console.log('Database seeding completed successfully!');
  console.log('Remember to manually update the email addresses and clerk_ids in the database:');
  users.forEach(user => {
    console.log(`User ID: ${user.id} - Update to the correct email and clerk_id`);
  });
  
  // SQL to update users (for reference)
  console.log('\nSQL to update users:');
  console.log(`UPDATE users SET email = 'rogeru63@gmail.com', clerk_id = 'real_clerk_id_1' WHERE id = '${users[0].id}';`);
  console.log(`UPDATE users SET email = 'rogerdurich@gmail.com', clerk_id = 'real_clerk_id_2' WHERE id = '${users[1].id}';`);
}

// Run the seed function
seedDatabase().catch(console.error);
