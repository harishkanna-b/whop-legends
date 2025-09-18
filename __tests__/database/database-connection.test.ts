import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { checkDatabaseConnection, getCharacterClasses } from '../../lib/database-utils';
import { supabase } from '../../lib/supabase-client';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Test database setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should connect to database successfully', async () => {
    const isConnected = await checkDatabaseConnection();
    expect(isConnected).toBe(true);
  });

  it('should fetch character classes', async () => {
    const classes = await getCharacterClasses();
    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBeGreaterThan(0);

    // Check that all expected character classes exist
    const classNames = classes.map(c => c.name);
    expect(classNames).toContain('scout');
    expect(classNames).toContain('sage');
    expect(classNames).toContain('champion');
  });

  it('should handle database errors gracefully', async () => {
    // Test with invalid table
    const { data, error } = await supabase
      .from('nonexistent_table')
      .select('*')
      .limit(1);

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});