# A1C Estimator - User Roles Specification

This document outlines the different user roles in the A1C Estimator application, their permissions, and responsibilities.

## Overview

The A1C Estimator application supports three distinct user roles:

1. **User** - Standard users who manage their own glucose readings and A1C estimates
2. **Caregiver** - Users who can help manage data for other users
3. **Admin** - System administrators with full access to the application

## Role Definitions

### User Role

The default role assigned to all new accounts.

#### Permissions:

- Create and manage their own profile
- Record and view their own glucose readings
- Create and manage their own runs and months
- View their own A1C estimates and statistics
- Configure personal preferences and settings
- Receive notifications based on their preferences
- Grant access to caregivers

#### Limitations:

- Cannot access other users' data
- Cannot modify system settings
- Cannot access administrative functions

### Caregiver Role

Assigned to users who need to help manage data for other users, such as family members or healthcare providers.

#### Permissions:

- All permissions of the User role for their own account
- View glucose readings for connected users
- Add glucose readings for connected users
- View runs and months for connected users
- Receive notifications about connected users (optional)
- View A1C estimates and statistics for connected users

#### Limitations:

- Can only access data for specifically connected users
- Cannot modify system settings
- Cannot access administrative functions
- Cannot modify user preferences for connected users
- Cannot delete or modify existing readings for connected users (only add new ones)

### Admin Role

Reserved for system administrators and application managers.

#### Permissions:

- All permissions of the User role
- Access to all user accounts and data
- Ability to create, modify, and delete any user account
- Assign and change user roles
- View system statistics and usage metrics
- Configure system-wide settings
- Manage database and application settings
- Access to logs and error reports

## User Connections

### Caregiver-User Connection

1. **Initiation**: A User initiates a connection request to a Caregiver by:
   - Sending an email invitation through the application
   - Sharing a unique connection code

2. **Acceptance**: The Caregiver accepts the connection by:
   - Clicking a link in the invitation email
   - Entering the connection code in their account

3. **Management**: 
   - Users can view and revoke caregiver connections at any time
   - Users can set specific permissions for each caregiver
   - Caregivers can view a list of all users they are connected to

## Implementation Details

### Database Schema

The connection between Caregivers and Users is stored in a dedicated table:

```sql
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  caregiver_id UUID NOT NULL REFERENCES users(id),
  permissions JSONB NOT NULL DEFAULT '{"can_view": true, "can_add": true, "notifications": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, caregiver_id)
);
```

### Row Level Security

Row Level Security (RLS) policies ensure proper data access. Since we're using Clerk for authentication, we need to extract the user ID from the JWT claims:

```sql
-- Helper function to get the current Clerk user ID
CREATE OR REPLACE FUNCTION get_current_clerk_id()
RETURNS TEXT AS $
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'sub');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users can read their own data
CREATE POLICY users_read_own ON glucose_readings 
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = get_current_clerk_id()
    )
  );

-- Caregivers can read connected users' data
CREATE POLICY caregivers_read_connected ON glucose_readings 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_connections uc
      JOIN users caregiver ON caregiver.id = uc.caregiver_id
      WHERE uc.user_id = glucose_readings.user_id 
      AND caregiver.clerk_id = get_current_clerk_id()
      AND uc.permissions->>'can_view' = 'true'
    )
  );

-- Caregivers can insert data for connected users
CREATE POLICY caregivers_insert_connected ON glucose_readings 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_connections uc
      JOIN users caregiver ON caregiver.id = uc.caregiver_id
      WHERE uc.user_id = glucose_readings.user_id 
      AND caregiver.clerk_id = get_current_clerk_id()
      AND uc.permissions->>'can_add' = 'true'
    )
  );

-- Admins can access all data
CREATE POLICY admins_all_access ON glucose_readings 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE clerk_id = get_current_clerk_id()
      AND role = 'admin'
    )
  );
```

## UI Considerations

### User Interface Elements by Role

#### User Dashboard
- Standard glucose tracking and A1C estimation features
- Option to manage caregiver connections
- Personal settings and preferences

#### Caregiver Dashboard
- Toggle between personal account and connected user accounts
- Clear visual indication when viewing/editing another user's data
- Simplified data entry for connected users

#### Admin Dashboard
- User management interface
- System statistics and metrics
- Configuration settings
- Logs and error reports

## Security Considerations

1. **Role Assignment**:
   - Only admins can change user roles
   - Role changes are logged for audit purposes

2. **Data Access**:
   - All data access is controlled by RLS policies
   - Connections between users and caregivers require explicit consent
   - All data access is logged for audit purposes

3. **Authentication**:
   - Multi-factor authentication recommended for admin accounts
   - Session timeouts enforced for all roles
   - IP restrictions optional for admin accounts

## Future Enhancements

1. **Healthcare Provider Role**:
   - Specialized role for medical professionals
   - Enhanced analytics and reporting capabilities
   - Integration with electronic health record systems

2. **Organization Management**:
   - Support for healthcare organizations with multiple caregivers
   - Group-based permissions and access controls
   - Hierarchical administration structure